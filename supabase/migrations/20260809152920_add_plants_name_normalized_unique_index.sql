-- plants.name の正規化キーに一意インデックスを追加する (表記揺れによる重複植物の防止)
--
-- 背景:
-- 1. plants.name には制約・インデックスが一切なく、「モンステラ」「モンステラ 」
--    「Monstera」「ｍｏｎｓｔｅｒａ」が別レコードとして共存できた。plants は
--    投稿フォームから誰でも addPlant できる全ユーザー共有のカタログなので、
--    表記揺れの重複は共存実績 (post_plants × post_pets のユニーク猫数) を分断し、
--    サービスの中核指標を壊す。
-- 2. addPlant / updatePlant の重複チェックは name の完全一致 (バイト比較) で、
--    trim すらしていなかった。DB 側に最終防壁がないため競合状態でも重複が入る。
-- 3. AI判定は候補名を plants.name の完全一致でしか引き当てておらず、AIが
--    'monstera' と返すと既存の 'Monstera' に当たらず新規登録に進んでいた
--    (= AI判定自体が重複製造機になっていた)。
--
-- 正規化キー:
--   lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g')))
--   - normalize(NFKC) を最初に適用するのが要点。全角スペース(U+3000)・NBSP・半角カナは
--     NFKC で半角スペース／全角カナに畳まれ、その後の \s+ で初めて拾える。
--     順序を逆にすると '　' が空白として扱われない。
--   - PG15 で normalize / regexp_replace / btrim / lower はすべて IMMUTABLE。
--   - 保存する表示名は大文字小文字を保持し、キーだけ lower する。
--   アプリ側の同一実装は src/lib/plant-name.ts と src/lib/plant-name-query.ts。
--   式を変えるならこの3箇所を必ず同時に変更し、インデックスを張り替えること。

-- ---------------------------------------------------------------------------
-- 1. 既存の重複を id 最小の行 (keeper) に統合する
--    共存実績を失わないよう、重複行を削除するのではなく post_plants /
--    post_image_plants の plant_id を付け替える。両表は (post_id, plant_id) /
--    (post_image_id, plant_id) が UNIQUE なので、付け替えると衝突する行
--    (= 同じ投稿/写真に重複した2つの植物が付いていた) は先に DELETE する。
--    どの行がどこへ寄ったかは RAISE NOTICE でログに残す (本番の適用ログで追える)。
-- ---------------------------------------------------------------------------
do $$
declare
    v_group record;
    v_loser record;
begin
    for v_group in
        select lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g'))) as norm_key,
               min(id) as keeper_id,
               count(*) as dup_count
          from public.plants
         group by 1
        having count(*) > 1
         order by 2
    loop
        raise notice 'plants 重複統合: key=% 件数=% 統合先id=%',
            v_group.norm_key, v_group.dup_count, v_group.keeper_id;

        for v_loser in
            select id, name
              from public.plants
             where lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g'))) = v_group.norm_key
               and id <> v_group.keeper_id
             order by id
        loop
            raise notice '  統合元: id=% name=%', v_loser.id, v_loser.name;

            -- (post_id, plant_id) が衝突する行を先に落とす
            delete from public.post_plants pp
             where pp.plant_id = v_loser.id
               and exists (
                   select 1 from public.post_plants keep
                    where keep.post_id  = pp.post_id
                      and keep.plant_id = v_group.keeper_id
               );
            update public.post_plants
               set plant_id = v_group.keeper_id
             where plant_id = v_loser.id;

            -- (post_image_id, plant_id) が衝突する行を先に落とす
            delete from public.post_image_plants pip
             where pip.plant_id = v_loser.id
               and exists (
                   select 1 from public.post_image_plants keep
                    where keep.post_image_id = pip.post_image_id
                      and keep.plant_id      = v_group.keeper_id
               );
            update public.post_image_plants
               set plant_id = v_group.keeper_id
             where plant_id = v_loser.id;

            -- plants を参照する FK はこの2つだけなので、ここで残存参照はゼロ
            -- (= ON DELETE CASCADE は発火せず、投稿タグを失わない)
            delete from public.plants where id = v_loser.id;
        end loop;
    end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. 表示名を正規化する (NFKC + 連続空白の1個化 + 前後の空白除去。大文字小文字は保持)
--    1. の後に実行しても新たな重複は生まれない:
--    D(x) = btrim(regexp_replace(normalize(x,NFKC),'\s+',' ','g')) は冪等 (D(D(x))=D(x))
--    なので K(D(name)) = lower(D(D(name))) = lower(D(name)) = K(name)。
--    つまりこの UPDATE は各行のキーを一切変えず、1. で確立した一意性が保たれる。
--    updated_at は機械的な整形なので意図的に触らない (人手の編集時刻を保つ)。
-- ---------------------------------------------------------------------------
update public.plants
   set name = btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g'))
 where name <> btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g'));

-- ---------------------------------------------------------------------------
-- 3. 正規化キーに一意インデックスを張る
--    マイグレーションはトランザクション内で走るため CONCURRENTLY は使えない。
--    plants は数百行規模なので ACCESS EXCLUSIVE の一瞬のロックで問題ない。
--    命名は既存の式インデックス users_alias_id_lower_key に倣い
--    {table}_{col}_{変換}_key とする (plants_name_key は将来の素の一意制約用に空ける)。
--    注: Prisma は式インデックスを @@unique として表現できないため、
--        prisma db pull しても schema.prisma には doc コメントしか現れない。
--        prisma migrate / db push はこのインデックスを黙って DROP するので使わない。
-- ---------------------------------------------------------------------------
create unique index if not exists plants_name_normalized_key
    on public.plants (lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g'))));

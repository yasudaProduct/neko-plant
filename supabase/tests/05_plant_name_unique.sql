-- =============================================================
-- plants 正規化キー一意インデックスの挙動テスト
--
-- plants_name_normalized_key の式
--   lower(btrim(regexp_replace(normalize(name, NFKC), '\s+', ' ', 'g')))
-- が「NFKC + 連続空白の畳み込み + 大文字小文字無視」で重複を弾くことを、
-- カタログではなく実際の INSERT の結果として固定する
-- （インデックスの存在自体は 01_rls_structure.sql の第7節が担保する）。
--
-- アプリ側の同一実装は src/lib/plant-name.ts / src/lib/plant-name-query.ts。
-- 正規化を変えるならマイグレーション・TS・このテストをセットで更新すること。
--
-- fixture は pgtap プレフィックス付きで、rollback により消える。
-- 実行: supabase test db（ローカルスタック起動中に）
-- =============================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into public.plants (name) values ('pgtap Monstera Deliciosa');

-- 全角英字・全角スペース・連続空白・大文字小文字が違うだけの名前は弾く。
-- throws_ok は 4引数形で呼ぶ（3引数形は第3引数を errmsg として扱う仕様のため）
select throws_ok(
    $$insert into public.plants (name) values ('ｐｇｔａｐ　ｍｏｎｓｔｅｒａ　　ｄｅｌｉｃｉｏｓａ ')$$,
    '23505'::char(5),
    null,
    'NFKC・連続空白・大文字小文字の違いだけの植物名は一意違反になる'
);

-- 別種の植物名は登録できる（過剰に畳んでいないことの確認）
select lives_ok(
    $$insert into public.plants (name) values ('pgtap Monstera Adansonii')$$,
    '別種の植物名は登録できる'
);

select * from finish();
rollback;

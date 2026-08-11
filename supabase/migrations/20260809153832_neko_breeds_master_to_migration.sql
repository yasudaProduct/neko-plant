-- 猫種マスタを seeds からマイグレーションへ移管し、誤字を修正して品種を拡充する
--
-- 背景:
-- 1. 猫種マスタは supabase/seeds/neko.sql にあり、supabase db reset のときだけ
--    投入されていた。seeds はリモートへ push されないため (Deploy Supabase が
--    実行するのは supabase db push = マイグレーションのみ)、本番の中身が
--    リポジトリと一致している保証がなかった。neko は pets.neko_id が参照する
--    運用マスタなので、UGCマスタの plants とは違い内容をマイグレーションで固定する。
-- 2. 4件の誤字が入っていた
--    (エジプシャンウマ / オリエンタルショートエアー /
--     アメリカンショートヘアー / アメリカンワイヤーヘアー)。
-- 3. 五十音の「コラット」で途切れた16件の未完成リストで、ユーザーは実質
--    「雑種」しか選べなかった。
--
-- 誤字修正 (UPDATE) を INSERT より先に行うこと。順序を逆にすると
-- ON CONFLICT (name) DO NOTHING が正しい表記を新規行として作り、
-- 誤記の行と新旧2件が並んで残ってしまう。
--
-- supabase/seeds/neko.sql は同じコミットで削除する。残すと
-- supabase db reset がマイグレーション適用後に seed を走らせ、
-- neko_name_key 違反で失敗する (config.toml の sql_paths = ["./seeds/*.sql"])。
-- あわせて scripts/e2e-seed.ts の neko.deleteMany() と neko.sql 読み込みも外す。

-- ---------------------------------------------------------------------------
-- 1. 既存行の誤字・表記を修正する
--    pets.neko_id は id 参照なので name の変更は FK に影響しない。
--    正しい表記が既に存在する場合はリネームできない (neko_name_key 違反) ので、
--    飼い猫の参照を正しい行へ寄せてから誤記の行を削除する。
--    どちらの経路も RAISE NOTICE でログに残す (本番の適用ログで追える)。
-- ---------------------------------------------------------------------------
do $$
declare
    v_pair   record;
    v_old_id int;
    v_new_id int;
begin
    for v_pair in
        select * from (values
            ('アメリカンショートヘアー',   'アメリカンショートヘア'),
            ('アメリカンワイヤーヘアー',   'アメリカンワイヤーヘア'),
            ('エジプシャンウマ',           'エジプシャンマウ'),
            ('オリエンタルショートエアー', 'オリエンタルショートヘア'),
            -- 表記統一: 他の品種に中黒を使っていないため合わせる。
            -- ここでリネームしないと 2. で 'コーニッシュレックス' が別行として増える
            ('コーニッシュ・レックス',     'コーニッシュレックス')
        ) as v(old_name, new_name)
    loop
        select id into v_old_id from public.neko where name = v_pair.old_name;
        continue when v_old_id is null;

        select id into v_new_id from public.neko where name = v_pair.new_name;

        if v_new_id is null then
            update public.neko set name = v_pair.new_name where id = v_old_id;
            raise notice 'neko 表記修正: % -> % (id=%)',
                v_pair.old_name, v_pair.new_name, v_old_id;
        else
            update public.pets set neko_id = v_new_id where neko_id = v_old_id;
            delete from public.neko where id = v_old_id;
            raise notice 'neko 統合: %(id=%) -> %(id=%)',
                v_pair.old_name, v_old_id, v_pair.new_name, v_new_id;
        end if;
    end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. 主要品種を投入する (TICA/CFA 公認品種を中心に五十音順 + 「雑種」)
--    ON CONFLICT (name) DO NOTHING = 既存行は触らず不足分だけ入る (冪等)。
--    image は現状どの猫種も持たないため省略 (NULL)。
--    表示順は getNekoSpecies() の ORDER BY name が決めるので、ここでの並びは
--    人が読むためのもの。
--    「エキゾチック」は CFA 公式品種名 Exotic に対応するためこの表記のまま。
--    「エキゾチックショートヘア」を足すと実質同一品種が2行になるので入れない。
-- ---------------------------------------------------------------------------
insert into public.neko (name) values
    ('アビシニアン'), ('アメリカンカール'), ('アメリカンショートヘア'),
    ('アメリカンボブテイル'), ('アメリカンワイヤーヘア'), ('エキゾチック'),
    ('エジプシャンマウ'), ('オシキャット'), ('オリエンタルショートヘア'),
    ('キムリック'), ('コーニッシュレックス'), ('コラット'),
    ('サイベリアン'), ('サバンナ'), ('シャム'), ('シャルトリュー'),
    ('ジャパニーズボブテイル'), ('シンガプーラ'), ('スコティッシュフォールド'),
    ('スノーシュー'), ('スフィンクス'), ('セルカークレックス'), ('ソマリ'),
    ('ターキッシュアンゴラ'), ('ターキッシュバン'), ('デボンレックス'),
    ('トイガー'), ('トンキニーズ'), ('ネベロング'),
    ('ノルウェージャンフォレストキャット'), ('ハバナブラウン'), ('バーマン'),
    ('バーミーズ'), ('バリニーズ'), ('ピクシーボブ'),
    ('ブリティッシュショートヘア'), ('ブリティッシュロングヘア'), ('ベンガル'),
    ('ペルシャ'), ('ボンベイ'), ('マンクス'), ('マンチカン'), ('ミヌエット'),
    ('メインクーン'), ('ラガマフィン'), ('ラグドール'), ('ラパーム'),
    ('ロシアンブルー'), ('雑種')
on conflict (name) do nothing;

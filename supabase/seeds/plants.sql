-- 植物マスタ（開発・E2E用のサンプルデータ）
--
-- plants は addPlant でユーザーが増やす UGC マスタなので、本番と dev で ID が
-- 揃う必要がなく、マイグレーションには入れない（本番へサンプルを押し込まない）。
-- 一方 neko（猫種マスタ）は pets.neko_id が参照する運用マスタなので、
-- マイグレーションで版管理している（supabase/migrations/*_neko_breeds_master_to_migration.sql）。
--
-- 一意インデックス plants_name_normalized_key があるため、二重投入で
-- 一意違反にならないよう ON CONFLICT DO NOTHING を付ける
-- （式インデックスの推論句を書くと式が二重管理になるのでターゲットは指定しない）。
--
-- 名前は E2E が名指ししている（e2e/plant-page.test.ts, e2e/post-flow.test.ts,
-- e2e/search-zukan.test.ts, e2e/feed.test.ts）。変更する場合はそれらもあわせて更新すること。
insert into plants (name) values
    ('ネコマダラ'),
    ('パキラ'),
    ('エバーフレッシュ'),
    ('モンステラ'),
    ('マドカズラ'),
    ('クワズイモ'),
    ('アロエ'),
    ('アグラオネマ'),
    ('ビカクシダ'),
    ('カラテア'),
    ('ペペロミア'),
    ('フィカス'),
    ('ガジュマル')
on conflict do nothing;

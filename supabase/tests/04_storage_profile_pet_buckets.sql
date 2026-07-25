-- =============================================================
-- storage.objects の RLS 挙動テスト: user_profiles / user_pets バケット
--
-- プロフィール画像・飼い猫画像もブラウザから直接アップロードされる。
-- この2バケットの書き込みポリシー（INSERT/UPDATE/DELETE）には TO 句が
-- なく public ロール（anon 含む）に適用される点が posts バケットと
-- 異なる。anon は WITH CHECK 評価まで到達するが auth.uid() が NULL の
-- ため必ず違反になる、という経路で拒否されることを確認する。
-- SELECT（一覧）ポリシーのみ TO authenticated。
-- =============================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- 影響行数ヘルパー（03 と同じ。USING で弾かれる UPDATE/DELETE は
-- エラーにならず 0 行になるため、行数で検証する）
create function pg_temp.rls_affected(sql text) returns int
language plpgsql as $$
declare n int;
begin
    execute sql;
    get diagnostics n = row_count;
    return n;
end $$;

-- -------------------------------------------------------------
-- fixtures（postgres として作成）
-- -------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'rls-a@test.invalid',
     '{"name":"RLS Test A","alias_id":"rlstesta"}'::jsonb, now(), now()),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'rls-b@test.invalid',
     '{"name":"RLS Test B","alias_id":"rlstestb"}'::jsonb, now(), now());

insert into storage.objects (bucket_id, name) values
    ('user_profiles', '11111111-1111-1111-1111-111111111111/rls-avatar.jpg'),
    ('user_profiles', '22222222-2222-2222-2222-222222222222/rls-avatar.jpg'),
    ('user_pets', '11111111-1111-1111-1111-111111111111/rls-pet.jpg'),
    ('user_pets', '22222222-2222-2222-2222-222222222222/rls-pet.jpg');

-- DELETE 検証のために Storage API と同じ GUC を設定（03 参照）
select set_config('storage.allow_delete_query', 'true', true);

-- postgres: fixture の健全性（1）
select is(
    (select count(*)::int from storage.objects
     where bucket_id in ('user_profiles', 'user_pets') and name like '%/rls-%'),
    4, 'user_profiles / user_pets に fixture が計4件ある');

-- =============================================================
-- user_profiles バケット
-- =============================================================

-- anon（4）
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is((select count(*)::int from storage.objects where bucket_id = 'user_profiles'),
          0, 'anon: user_profiles は一覧できない');

-- TO 句なしポリシーの非対称: anon も WITH CHECK に到達するが
-- auth.uid() IS NULL → 違反で拒否される
select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''user_profiles'', ''rls-anon-avatar.jpg'')',
    '42501', NULL, 'anon: user_profiles へのアップロード拒否（auth.uid() が NULL）');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''user_profiles'' and name = ''11111111-1111-1111-1111-111111111111/rls-avatar.jpg'''),
    0, 'anon: 他人のプロフィール画像を UPDATE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_profiles'' and name = ''11111111-1111-1111-1111-111111111111/rls-avatar.jpg'''),
    0, 'anon: 他人のプロフィール画像を DELETE できない（0行）');

-- authenticated: ユーザーA（7）
reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(exists(select 1 from storage.objects
                 where bucket_id = 'user_profiles' and name = '11111111-1111-1111-1111-111111111111/rls-avatar.jpg'),
          'A: 自分のプロフィール画像は見える');
select ok(not exists(select 1 from storage.objects
                     where bucket_id = 'user_profiles' and name = '22222222-2222-2222-2222-222222222222/rls-avatar.jpg'),
          'A: B のプロフィール画像は見えない');

select lives_ok(
    'insert into storage.objects (bucket_id, name) values (''user_profiles'', ''11111111-1111-1111-1111-111111111111/rls-new-avatar.jpg'')',
    'A: 自分のフォルダへはアップロードできる');

select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''user_profiles'', ''22222222-2222-2222-2222-222222222222/rls-invade.jpg'')',
    '42501', NULL, 'A: B のフォルダへのアップロードは拒否');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''user_profiles'' and name = ''22222222-2222-2222-2222-222222222222/rls-avatar.jpg'''),
    0, 'A: B のプロフィール画像を UPDATE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_profiles'' and name = ''22222222-2222-2222-2222-222222222222/rls-avatar.jpg'''),
    0, 'A: B のプロフィール画像を DELETE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_profiles'' and name = ''11111111-1111-1111-1111-111111111111/rls-avatar.jpg'''),
    1, 'A: 自分のプロフィール画像は DELETE できる（1行）');

-- =============================================================
-- user_pets バケット（user_profiles と同一構成の確認）
-- =============================================================

-- anon（4）
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is((select count(*)::int from storage.objects where bucket_id = 'user_pets'),
          0, 'anon: user_pets は一覧できない');

select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''user_pets'', ''rls-anon-pet.jpg'')',
    '42501', NULL, 'anon: user_pets へのアップロード拒否（auth.uid() が NULL）');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''user_pets'' and name = ''11111111-1111-1111-1111-111111111111/rls-pet.jpg'''),
    0, 'anon: 他人の飼い猫画像を UPDATE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_pets'' and name = ''11111111-1111-1111-1111-111111111111/rls-pet.jpg'''),
    0, 'anon: 他人の飼い猫画像を DELETE できない（0行）');

-- authenticated: ユーザーA（7）
reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(exists(select 1 from storage.objects
                 where bucket_id = 'user_pets' and name = '11111111-1111-1111-1111-111111111111/rls-pet.jpg'),
          'A: 自分の飼い猫画像は見える');
select ok(not exists(select 1 from storage.objects
                     where bucket_id = 'user_pets' and name = '22222222-2222-2222-2222-222222222222/rls-pet.jpg'),
          'A: B の飼い猫画像は見えない');

select lives_ok(
    'insert into storage.objects (bucket_id, name) values (''user_pets'', ''11111111-1111-1111-1111-111111111111/rls-new-pet.jpg'')',
    'A: 自分のフォルダへはアップロードできる');

select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''user_pets'', ''22222222-2222-2222-2222-222222222222/rls-invade.jpg'')',
    '42501', NULL, 'A: B のフォルダへのアップロードは拒否');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''user_pets'' and name = ''22222222-2222-2222-2222-222222222222/rls-pet.jpg'''),
    0, 'A: B の飼い猫画像を UPDATE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_pets'' and name = ''22222222-2222-2222-2222-222222222222/rls-pet.jpg'''),
    0, 'A: B の飼い猫画像を DELETE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''user_pets'' and name = ''11111111-1111-1111-1111-111111111111/rls-pet.jpg'''),
    1, 'A: 自分の飼い猫画像は DELETE できる（1行）');

-- -------------------------------------------------------------
-- postgres: クロスユーザー攻撃の後も B の fixture が無傷（2）
-- -------------------------------------------------------------
reset role;
select ok(exists(select 1 from storage.objects
                 where bucket_id = 'user_profiles' and name = '22222222-2222-2222-2222-222222222222/rls-avatar.jpg'),
          'B のプロフィール画像は無傷で残っている');
select ok(exists(select 1 from storage.objects
                 where bucket_id = 'user_pets' and name = '22222222-2222-2222-2222-222222222222/rls-pet.jpg'),
          'B の飼い猫画像は無傷で残っている');

select * from finish();
rollback;

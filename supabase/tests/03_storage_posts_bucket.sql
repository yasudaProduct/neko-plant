-- =============================================================
-- storage.objects の RLS 挙動テスト: posts バケット
--
-- 投稿画像はブラウザから anon キー + ユーザー JWT で直接アップロード
-- される（src/lib/client-image.ts）ため、ここの RLS が唯一の防衛線。
-- own-folder 方式（パス先頭セグメント = auth.uid()）を検証する。
--
-- 注意: storage-api は storage.objects への直接 DELETE を
-- protect_objects_delete トリガーで塞いでいる。テストでは Storage API
-- 自身が使うトランザクションローカル GUC（storage.allow_delete_query）
-- を設定して DELETE の RLS 挙動を検証する。この GUC はセキュリティ
-- 境界ではなく（誰でも設定できる）、境界はあくまで RLS ポリシー。
-- =============================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- USING で弾かれる UPDATE / DELETE はエラーにならず 0 行になるため、
-- 影響行数を返すヘルパーで検証する（データ変更 CTE はスカラサブクエリに
-- 埋め込めないので関数化）。SECURITY INVOKER（既定）なので実行時の
-- ロールで RLS が適用される。pg_temp のため rollback とセッション終了で消える。
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
    ('posts', '11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'),
    ('posts', '22222222-2222-2222-2222-222222222222/rls-fixture-b.jpg');

-- postgres: fixture の健全性（1）
select is(
    (select count(*)::int from storage.objects where bucket_id = 'posts' and name like '%rls-fixture-%'),
    2, 'posts バケットに fixture が2件ある');

-- カナリア: GUC 未設定の直接 DELETE は protect_objects_delete が拒否（1）
select throws_ok(
    'delete from storage.objects where bucket_id = ''posts'' and name = ''rls-canary-nonexistent''',
    '42501', NULL, 'GUC 未設定の直接 DELETE はトリガーが拒否する');

-- ここから先の DELETE 検証のために Storage API と同じ GUC を設定
select set_config('storage.allow_delete_query', 'true', true);

-- -------------------------------------------------------------
-- anon ロール（4）
-- -------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

-- SELECT ポリシーは authenticated のみ → anon はバケット全体で0件
select is((select count(*)::int from storage.objects where bucket_id = 'posts'),
          0, 'anon: posts バケットは一覧できない');

select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''posts'', ''rls-anon-upload.jpg'')',
    '42501', NULL, 'anon: posts バケットへのアップロード拒否');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''posts'' and name = ''11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'''),
    0, 'anon: 他人のオブジェクトを UPDATE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''posts'' and name = ''11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'''),
    0, 'anon: 他人のオブジェクトを DELETE できない（0行）');

-- -------------------------------------------------------------
-- authenticated ロール: ユーザーA（10）
-- -------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(exists(select 1 from storage.objects
                 where bucket_id = 'posts' and name = '11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'),
          'A: 自分のオブジェクトは見える');
select ok(not exists(select 1 from storage.objects
                     where bucket_id = 'posts' and name = '22222222-2222-2222-2222-222222222222/rls-fixture-b.jpg'),
          'A: B のオブジェクトは見えない');

select lives_ok(
    'insert into storage.objects (bucket_id, name) values (''posts'', ''11111111-1111-1111-1111-111111111111/rls-new-upload.jpg'')',
    'A: 自分のフォルダへはアップロードできる');
select ok(exists(select 1 from storage.objects
                 where bucket_id = 'posts' and name = '11111111-1111-1111-1111-111111111111/rls-new-upload.jpg'),
          'A: アップロードしたオブジェクトが見える');

select throws_ok(
    'insert into storage.objects (bucket_id, name) values (''posts'', ''22222222-2222-2222-2222-222222222222/rls-invade.jpg'')',
    '42501', NULL, 'A: B のフォルダへのアップロードは拒否');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''posts'' and name = ''11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'''),
    1, 'A: 自分のオブジェクトは UPDATE できる（1行）');

select is(
    pg_temp.rls_affected(
        'update storage.objects set name = name '
        'where bucket_id = ''posts'' and name = ''22222222-2222-2222-2222-222222222222/rls-fixture-b.jpg'''),
    0, 'A: B のオブジェクトは UPDATE できない（0行）');

-- UPDATE の暗黙 WITH CHECK（= USING）により、自分のオブジェクトを
-- 他人のフォルダへ移動することもできない
select throws_ok(
    'update storage.objects set name = ''22222222-2222-2222-2222-222222222222/rls-moved.jpg'' '
    'where bucket_id = ''posts'' and name = ''11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg''',
    '42501', NULL, 'A: 自分のオブジェクトを B のフォルダへ移動できない');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''posts'' and name = ''22222222-2222-2222-2222-222222222222/rls-fixture-b.jpg'''),
    0, 'A: B のオブジェクトは DELETE できない（0行）');

select is(
    pg_temp.rls_affected(
        'delete from storage.objects '
        'where bucket_id = ''posts'' and name = ''11111111-1111-1111-1111-111111111111/rls-fixture-a.jpg'''),
    1, 'A: 自分のオブジェクトは DELETE できる（1行）');

-- -------------------------------------------------------------
-- postgres: クロスユーザー攻撃の後も B の fixture が無傷（1）
-- -------------------------------------------------------------
reset role;
select ok(exists(select 1 from storage.objects
                 where bucket_id = 'posts' and name = '22222222-2222-2222-2222-222222222222/rls-fixture-b.jpg'),
          'B の fixture オブジェクトは無傷で残っている');

select * from finish();
rollback;

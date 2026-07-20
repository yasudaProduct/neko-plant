-- =============================================================
-- public テーブルの RLS 挙動テスト
--
-- anon キーで PostgREST を直接叩かれた場合を想定し、
-- anon / authenticated ロールで「見えるべきものだけ見え、
-- 書き込みは一切できない」ことを検証する。
--
-- ロール切替の約束事:
--   - トランザクションローカル設定（request.jwt.claims）は reset role を
--     跨いで残留するため、各ブロックの先頭で必ず再設定する
--   - postgres（superuser）は RLS をバイパスするので fixture 作成用
--
-- fixture は全て rls- プレフィックス付きで、rollback で消える。
-- グローバル件数はポリシーがゼロを保証する場合のみ断言する
-- （seed や開発データが存在しても成立するデータ非依存の設計）。
-- =============================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- -------------------------------------------------------------
-- fixtures（postgres として作成）
-- auth.users への INSERT で create_user_for_auth トリガーが発火し
-- public.users が作られる。raw_user_meta_data の name は必須
-- （public.users.name が NOT NULL のため）。alias_id は衝突時に
-- ランダム値へフォールバックするため、テストでは断言しない。
-- -------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'rls-a@test.invalid',
     '{"name":"RLS Test A","alias_id":"rlstesta"}'::jsonb, now(), now()),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'rls-b@test.invalid',
     '{"name":"RLS Test B","alias_id":"rlstestb"}'::jsonb, now(), now());

insert into public.neko (name) values ('rls-test-neko');
insert into public.plants (name) values ('rls-test-plant');

insert into public.pets (user_id, neko_id, name)
select u.id, n.id, 'rls-pet-a'
from public.users u, public.neko n
where u.auth_id = '11111111-1111-1111-1111-111111111111' and n.name = 'rls-test-neko';

insert into public.pets (user_id, neko_id, name)
select u.id, n.id, 'rls-pet-b'
from public.users u, public.neko n
where u.auth_id = '22222222-2222-2222-2222-222222222222' and n.name = 'rls-test-neko';

insert into public.posts (user_id, comment)
select id, 'rls-fixture-post-a' from public.users
where auth_id = '11111111-1111-1111-1111-111111111111';

insert into public.post_images (post_id, image_url)
select id, 'rls-fixture-image' from public.posts where comment = 'rls-fixture-post-a';

insert into public.post_likes (post_id, user_id)
select p.id, u.id from public.posts p, public.users u
where p.comment = 'rls-fixture-post-a' and u.auth_id = '22222222-2222-2222-2222-222222222222';

insert into public.post_pets (post_id, pet_id)
select p.id, pe.id from public.posts p, public.pets pe
where p.comment = 'rls-fixture-post-a' and pe.name = 'rls-pet-a';

insert into public.post_plants (post_id, plant_id)
select p.id, pl.id from public.posts p, public.plants pl
where p.comment = 'rls-fixture-post-a' and pl.name = 'rls-test-plant';

-- -------------------------------------------------------------
-- postgres: fixture の健全性（2）
-- -------------------------------------------------------------
select is(
    (select count(*)::int from public.users
     where auth_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
    2, 'トリガーで public.users に fixture ユーザーが2件作られる');

select is(
    (select name::text from public.users where auth_id = '11111111-1111-1111-1111-111111111111'),
    'RLS Test A', 'トリガーが raw_user_meta_data の name を伝播する');

-- -------------------------------------------------------------
-- anon ロール（16）
-- -------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

-- 公開テーブルは読める（7）
select ok(exists(select 1 from public.plants where name = 'rls-test-plant'), 'anon: plants を読める');
select ok(exists(select 1 from public.neko where name = 'rls-test-neko'), 'anon: neko を読める');
select ok(exists(select 1 from public.posts where comment = 'rls-fixture-post-a'), 'anon: posts を読める');
select ok(exists(select 1 from public.post_images where image_url = 'rls-fixture-image'), 'anon: post_images を読める');
select ok(exists(select 1 from public.post_likes pl join public.posts p on p.id = pl.post_id
                 where p.comment = 'rls-fixture-post-a'), 'anon: post_likes を読める');
select ok(exists(select 1 from public.post_pets pp join public.posts p on p.id = pp.post_id
                 where p.comment = 'rls-fixture-post-a'), 'anon: post_pets を読める');
select ok(exists(select 1 from public.post_plants pp join public.posts p on p.id = pp.post_id
                 where p.comment = 'rls-fixture-post-a'), 'anon: post_plants を読める');

-- ユーザー固有データは1行も見えない（ポリシーが anon に SELECT を許可していない）（2）
select is((select count(*)::int from public.users), 0, 'anon: users は1行も見えない');
select is((select count(*)::int from public.pets), 0, 'anon: pets は1行も見えない');

-- plant_identification_logs は SELECT すら拒否（REVOKE ALL）（1）
select throws_ok(
    'select count(*) from public.plant_identification_logs',
    '42501', NULL, 'anon: plant_identification_logs は SELECT も拒否');

-- 書き込みは権限層（GRANT 剥奪）で全拒否（6）
select throws_ok('insert into public.plants (name) values (''rls-hack'')', '42501', NULL, 'anon: plants INSERT 拒否');
select throws_ok('insert into public.posts (user_id, comment) values (999999, ''rls-hack'')', '42501', NULL, 'anon: posts INSERT 拒否');
select throws_ok('insert into public.pets (user_id, neko_id, name) values (999999, 999999, ''rls-hack'')', '42501', NULL, 'anon: pets INSERT 拒否');
select throws_ok('insert into public.post_likes (post_id, user_id) values (999999, 999999)', '42501', NULL, 'anon: post_likes INSERT 拒否');
select throws_ok('update public.plants set name = ''rls-hack''', '42501', NULL, 'anon: plants UPDATE 拒否');
select throws_ok('delete from public.posts', '42501', NULL, 'anon: posts DELETE 拒否');

-- -------------------------------------------------------------
-- authenticated ロール: ユーザーA（13）
-- -------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 自分の行だけが見える（seed 済みユーザーがいても結果は自分の1行のみ）（2）
select results_eq(
    'select auth_id from public.users',
    array['11111111-1111-1111-1111-111111111111']::uuid[],
    'A: users は自分の1行だけ見える');
select results_eq(
    'select name::text from public.pets',
    array['rls-pet-a'::text],
    'A: pets は自分の猫だけ見える');

-- 他人の行は見えない（2）
select ok(not exists(select 1 from public.users where auth_id = '22222222-2222-2222-2222-222222222222'),
          'A: B の users 行は見えない');
select ok(not exists(select 1 from public.pets where name = 'rls-pet-b'),
          'A: B の pets 行は見えない');

-- 公開テーブルは引き続き読める（2）
select ok(exists(select 1 from public.plants where name = 'rls-test-plant'), 'A: plants を読める');
select ok(exists(select 1 from public.posts where comment = 'rls-fixture-post-a'), 'A: posts を読める');

-- plant_identification_logs は authenticated でも拒否（1）
select throws_ok(
    'select count(*) from public.plant_identification_logs',
    '42501', NULL, 'A: plant_identification_logs は SELECT も拒否');

-- 書き込みは自分のデータに対しても全拒否（正しい書き込み経路は Server Action + Prisma のみ）（6）
select throws_ok('insert into public.plants (name) values (''rls-hack'')', '42501', NULL, 'A: plants INSERT 拒否');
select throws_ok('insert into public.posts (user_id, comment) values (999999, ''rls-hack'')', '42501', NULL, 'A: posts INSERT 拒否');
select throws_ok('insert into public.pets (user_id, neko_id, name) values (999999, 999999, ''rls-hack'')', '42501', NULL, 'A: pets INSERT 拒否');
select throws_ok('insert into public.post_likes (post_id, user_id) values (999999, 999999)', '42501', NULL, 'A: post_likes INSERT 拒否');
select throws_ok('update public.posts set comment = ''rls-hack''', '42501', NULL, 'A: 自分の投稿でも UPDATE 拒否');
select throws_ok('delete from public.posts', '42501', NULL, 'A: 自分の投稿でも DELETE 拒否');

-- -------------------------------------------------------------
-- authenticated ロール: ユーザーB（対称性の確認）（2）
-- -------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
set local role authenticated;

select results_eq(
    'select auth_id from public.users',
    array['22222222-2222-2222-2222-222222222222']::uuid[],
    'B: users は自分の1行だけ見える');
select results_eq(
    'select name::text from public.pets',
    array['rls-pet-b'::text],
    'B: pets は自分の猫だけ見える');

reset role;
select * from finish();
rollback;

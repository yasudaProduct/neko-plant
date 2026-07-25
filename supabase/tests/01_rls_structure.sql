-- =============================================================
-- RLS 構造テスト（ドリフト検知）
--
-- テーブル一覧・RLS有効化状態・ポリシーの一覧・対象コマンド・対象ロール・
-- テーブル権限をカタログから検証し、マイグレーションによる意図しない変更
-- （テーブルの追加/削除、RLS無効化、ポリシーの追加/削除/拡大、GRANT の
-- 復活）を検知する。
-- テーブルを追加・削除・リネームする、またはポリシーを追加・変更する
-- マイグレーションを書いたら、このファイルの一覧もセットで更新すること
-- （それがこのテストの目的）。
--
-- 実行: supabase test db（ローカルスタック起動中に）
-- =============================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(76);

-- -------------------------------------------------------------
-- 1. public スキーマ: テーブル一覧が想定どおり、かつ全テーブルで RLS が有効
--    (a) tables_are: テーブルの追加・削除・リネームを検知する。
--        新しいテーブルができたらここに追加しない限り必ず失敗する
--        ＝ 2〜5節のポリシー断言を追加し忘れる事故を防ぐ仕掛け。
--    (b) is_empty: このリストに載っているかどうかを問わず、RLS が
--        無効なテーブルを検知する（新規テーブルの設定漏れ／既存
--        テーブルの無効化への退行のどちらも拾う）。
-- -------------------------------------------------------------
select tables_are(
    'public',
    array[
        'plants', 'neko', 'users', 'pets', 'posts',
        'post_images', 'post_likes', 'post_pets', 'post_plants',
        'plant_identification_logs'
    ],
    'public スキーマのテーブルは想定の10個のみ'
);

select is_empty(
    $$select relname from pg_class
      where relnamespace = 'public'::regnamespace
        and relkind = 'r'
        and not relrowsecurity$$,
    'public スキーマの全テーブルで RLS が有効（新規・既存を問わず検知）'
);
-- 注: relkind = 'r'（通常テーブル）のみ対象。パーティションテーブル（'p'）や
-- ビューはこの2つの断言の対象外（tables_are 自体の仕様、かつ現状どちらも
-- 存在しない）。将来パーティションテーブルを導入する場合はこのセクションの
-- 見直しが必要。

-- -------------------------------------------------------------
-- 2. public スキーマ: ポリシーの完全一覧（過不足を検知）
-- -------------------------------------------------------------
select policies_are('public', 'plants', array['plants_select_all'], 'plants のポリシーは plants_select_all のみ');
select policies_are('public', 'neko', array['neko_select_all'], 'neko のポリシーは neko_select_all のみ');
select policies_are('public', 'users', array['users_select_own'], 'users のポリシーは users_select_own のみ');
select policies_are('public', 'pets', array['pets_select_own'], 'pets のポリシーは pets_select_own のみ');
select policies_are('public', 'posts', array['Posts are viewable by everyone'], 'posts のポリシーは閲覧のみ');
select policies_are('public', 'post_images', array['Post images are viewable by everyone'], 'post_images のポリシーは閲覧のみ');
select policies_are('public', 'post_likes', array['Post likes are viewable by everyone'], 'post_likes のポリシーは閲覧のみ');
select policies_are('public', 'post_pets', array['Post pets are viewable by everyone'], 'post_pets のポリシーは閲覧のみ');
select policies_are('public', 'post_plants', array['Post plants are viewable by everyone'], 'post_plants のポリシーは閲覧のみ');
select policies_are('public', 'plant_identification_logs', array[]::name[], 'plant_identification_logs にポリシーはない（全拒否）');

-- -------------------------------------------------------------
-- 3. public スキーマ: 全ポリシーが SELECT のみ（FOR ALL への拡大を検知）
-- -------------------------------------------------------------
select policy_cmd_is('public', 'plants', 'plants_select_all', 'SELECT', 'plants_select_all は SELECT のみ');
select policy_cmd_is('public', 'neko', 'neko_select_all', 'SELECT', 'neko_select_all は SELECT のみ');
select policy_cmd_is('public', 'users', 'users_select_own', 'SELECT', 'users_select_own は SELECT のみ');
select policy_cmd_is('public', 'pets', 'pets_select_own', 'SELECT', 'pets_select_own は SELECT のみ');
select policy_cmd_is('public', 'posts', 'Posts are viewable by everyone', 'SELECT', 'posts の閲覧ポリシーは SELECT のみ');
select policy_cmd_is('public', 'post_images', 'Post images are viewable by everyone', 'SELECT', 'post_images の閲覧ポリシーは SELECT のみ');
select policy_cmd_is('public', 'post_likes', 'Post likes are viewable by everyone', 'SELECT', 'post_likes の閲覧ポリシーは SELECT のみ');
select policy_cmd_is('public', 'post_pets', 'Post pets are viewable by everyone', 'SELECT', 'post_pets の閲覧ポリシーは SELECT のみ');
select policy_cmd_is('public', 'post_plants', 'Post plants are viewable by everyone', 'SELECT', 'post_plants の閲覧ポリシーは SELECT のみ');

-- -------------------------------------------------------------
-- 4. public スキーマ: ポリシーの対象ロール
-- -------------------------------------------------------------
select policy_roles_are('public', 'plants', 'plants_select_all', array['anon', 'authenticated'], 'plants_select_all は anon + authenticated');
select policy_roles_are('public', 'neko', 'neko_select_all', array['anon', 'authenticated'], 'neko_select_all は anon + authenticated');
select policy_roles_are('public', 'users', 'users_select_own', array['authenticated'], 'users_select_own は authenticated のみ');
select policy_roles_are('public', 'pets', 'pets_select_own', array['authenticated'], 'pets_select_own は authenticated のみ');
select policy_roles_are('public', 'posts', 'Posts are viewable by everyone', array['anon', 'authenticated'], 'posts の閲覧は anon + authenticated');
select policy_roles_are('public', 'post_images', 'Post images are viewable by everyone', array['anon', 'authenticated'], 'post_images の閲覧は anon + authenticated');
select policy_roles_are('public', 'post_likes', 'Post likes are viewable by everyone', array['anon', 'authenticated'], 'post_likes の閲覧は anon + authenticated');
select policy_roles_are('public', 'post_pets', 'Post pets are viewable by everyone', array['anon', 'authenticated'], 'post_pets の閲覧は anon + authenticated');
select policy_roles_are('public', 'post_plants', 'Post plants are viewable by everyone', array['anon', 'authenticated'], 'post_plants の閲覧は anon + authenticated');

-- -------------------------------------------------------------
-- 5. public スキーマ: テーブル権限（20260712030221 の REVOKE の退行検知）
--    書き込み権限（INSERT/UPDATE/DELETE/TRUNCATE）は剥奪済みで、
--    SELECT / REFERENCES / TRIGGER だけが残っているのが正。
-- -------------------------------------------------------------
select table_privs_are('public', 'plants', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の plants 権限は SELECT 系のみ');
select table_privs_are('public', 'plants', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の plants 権限は SELECT 系のみ');
select table_privs_are('public', 'neko', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の neko 権限は SELECT 系のみ');
select table_privs_are('public', 'neko', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の neko 権限は SELECT 系のみ');
select table_privs_are('public', 'users', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の users 権限は SELECT 系のみ');
select table_privs_are('public', 'users', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の users 権限は SELECT 系のみ');
select table_privs_are('public', 'pets', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の pets 権限は SELECT 系のみ');
select table_privs_are('public', 'pets', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の pets 権限は SELECT 系のみ');
select table_privs_are('public', 'posts', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の posts 権限は SELECT 系のみ');
select table_privs_are('public', 'posts', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の posts 権限は SELECT 系のみ');
select table_privs_are('public', 'post_images', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の post_images 権限は SELECT 系のみ');
select table_privs_are('public', 'post_images', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の post_images 権限は SELECT 系のみ');
select table_privs_are('public', 'post_likes', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の post_likes 権限は SELECT 系のみ');
select table_privs_are('public', 'post_likes', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の post_likes 権限は SELECT 系のみ');
select table_privs_are('public', 'post_pets', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の post_pets 権限は SELECT 系のみ');
select table_privs_are('public', 'post_pets', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の post_pets 権限は SELECT 系のみ');
select table_privs_are('public', 'post_plants', 'anon', array['SELECT', 'REFERENCES', 'TRIGGER'], 'anon の post_plants 権限は SELECT 系のみ');
select table_privs_are('public', 'post_plants', 'authenticated', array['SELECT', 'REFERENCES', 'TRIGGER'], 'authenticated の post_plants 権限は SELECT 系のみ');
select table_privs_are('public', 'plant_identification_logs', 'anon', array[]::name[], 'anon は plant_identification_logs に一切の権限なし');
select table_privs_are('public', 'plant_identification_logs', 'authenticated', array[]::name[], 'authenticated は plant_identification_logs に一切の権限なし');

-- -------------------------------------------------------------
-- 6. storage.objects: RLS + ポリシー完全一覧
--    （storage の GRANT・トリガー・カラムは storage-api / CLI バージョン
--      管理下のため断言しない。リポジトリ管理下のポリシーのみ固定する。
--      同じ理由で storage スキーマのテーブル一覧そのものも断言しない）
-- -------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'storage.objects'::regclass), 'RLS 有効: storage.objects');

select policies_are('storage', 'objects', array[
    'Users can upload their own post images',
    'Users can update their own post images',
    'Users can delete their own post images',
    'Users can list their own post images',
    'Users can upload their own profile images',
    'Users can update their own profile images',
    'Users can delete their own profile images',
    'Users can list their own profile images',
    'Users can upload their own pet images',
    'Users can update their own pet images',
    'Users can delete their own pet images',
    'Users can list their own pet images'
], 'storage.objects のポリシーは12本ちょうど');

-- posts バケット（すべて TO authenticated）
select policy_cmd_is('storage', 'objects', 'Users can upload their own post images', 'INSERT', 'posts アップロードは INSERT');
select policy_roles_are('storage', 'objects', 'Users can upload their own post images', array['authenticated'], 'posts アップロードは authenticated のみ');
select policy_cmd_is('storage', 'objects', 'Users can update their own post images', 'UPDATE', 'posts 更新は UPDATE');
select policy_roles_are('storage', 'objects', 'Users can update their own post images', array['authenticated'], 'posts 更新は authenticated のみ');
select policy_cmd_is('storage', 'objects', 'Users can delete their own post images', 'DELETE', 'posts 削除は DELETE');
select policy_roles_are('storage', 'objects', 'Users can delete their own post images', array['authenticated'], 'posts 削除は authenticated のみ');
select policy_cmd_is('storage', 'objects', 'Users can list their own post images', 'SELECT', 'posts 一覧は SELECT');
select policy_roles_are('storage', 'objects', 'Users can list their own post images', array['authenticated'], 'posts 一覧は authenticated のみ');

-- user_profiles バケット（書き込み系は TO 句なし = public ロール）
-- 注: TO 句なしポリシーの polroles は {0}（暗黙の PUBLIC）で、
-- policy_roles_are は pg_roles と JOIN する実装のため解決できない。
-- そのため roles は pg_policies ビューを直接検証する。
select policy_cmd_is('storage', 'objects', 'Users can upload their own profile images', 'INSERT', 'profile アップロードは INSERT');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can upload their own profile images'),
    '{public}', 'profile アップロードは TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can update their own profile images', 'UPDATE', 'profile 更新は UPDATE');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can update their own profile images'),
    '{public}', 'profile 更新は TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can delete their own profile images', 'DELETE', 'profile 削除は DELETE');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can delete their own profile images'),
    '{public}', 'profile 削除は TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can list their own profile images', 'SELECT', 'profile 一覧は SELECT');
select policy_roles_are('storage', 'objects', 'Users can list their own profile images', array['authenticated'], 'profile 一覧は authenticated のみ');

-- user_pets バケット（書き込み系は TO 句なし = public ロール）
select policy_cmd_is('storage', 'objects', 'Users can upload their own pet images', 'INSERT', 'pet アップロードは INSERT');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can upload their own pet images'),
    '{public}', 'pet アップロードは TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can update their own pet images', 'UPDATE', 'pet 更新は UPDATE');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can update their own pet images'),
    '{public}', 'pet 更新は TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can delete their own pet images', 'DELETE', 'pet 削除は DELETE');
select is(
    (select roles::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Users can delete their own pet images'),
    '{public}', 'pet 削除は TO 句なし（public）');
select policy_cmd_is('storage', 'objects', 'Users can list their own pet images', 'SELECT', 'pet 一覧は SELECT');
select policy_roles_are('storage', 'objects', 'Users can list their own pet images', array['authenticated'], 'pet 一覧は authenticated のみ');

select * from finish();
rollback;

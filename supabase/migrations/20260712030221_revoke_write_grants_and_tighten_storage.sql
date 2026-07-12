-- 権限とストレージポリシーの強化 (セキュリティレビュー対応)
--
-- アプリの書き込みはすべて Prisma (特権接続) 経由で、PostgREST 経由の書き込みは
-- 使用していない。しかし歴代マイグレーションで anon / authenticated に GRANT ALL が
-- 付与されたままのため、「RLS有効 + 書き込みポリシーなし」の一枚壁で守られている
-- 状態だった (将来誰かが緩いポリシーを1つ足すと即座に直接書き込みが開放される)。
-- GRANT レベルでも書き込みを剥奪し、二重の防壁にする。

-- ---------------------------------------------------------------------------
-- 1. public スキーマの全テーブルから anon / authenticated の書き込み権限を剥奪
--    (SELECT は RLS ポリシーによる制御を維持するため残す)
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. トリガー専用関数の EXECUTE を anon / authenticated から剥奪
--    (auth.users のトリガーとして実行されるもので、クライアントが直接呼ぶ必要はない)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_user_for_auth() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_for_auth() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_random_alias_id() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. 廃止機能のストレージポリシーを削除
--    evaluations: 機能ごと削除済み (20260709230949) だがポリシーだけ残っていた
--    plants バケット: アプリにアップロード経路がなく、"insert Only authenticated users"
--      はフォルダ制限なしで任意の認証ユーザーが公開ホスティングに使えてしまうため全廃
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public evaluations are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own evaluation images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own evaluation images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own evaluation images" ON storage.objects;

DROP POLICY IF EXISTS "select everyone" ON storage.objects;
DROP POLICY IF EXISTS "insert Only authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "update Only authenticated users and own" ON storage.objects;
DROP POLICY IF EXISTS "delete Only authenticated users and own" ON storage.objects;

-- ---------------------------------------------------------------------------
-- 4. 画像バケットの一覧 (list) を匿名から遮断
--    パスに auth_id を含むため、anon の SELECT を許すと Storage list API で
--    全ユーザーの auth_id を機械的に収集できてしまう。公開バケットのオブジェクト
--    配信 (/storage/v1/object/public/...) は RLS を通らないため表示には影響しない。
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public post images are viewable by everyone" ON storage.objects;
CREATE POLICY "Post images are listable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Public user profiles are viewable by everyone" ON storage.objects;
CREATE POLICY "Profile images are listable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_profiles');

DROP POLICY IF EXISTS "Public user pets are viewable by everyone" ON storage.objects;
CREATE POLICY "Pet images are listable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_pets');

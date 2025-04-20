-- SELECT (読み取り) ポリシー - 植物の画像は誰でも閲覧可能
CREATE POLICY "select everyone" 
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'plants');

-- INSERT (アップロード) ポリシー - 認証済みユーザーのみが植物画像をアップロード可能
CREATE POLICY "insert Only authenticated users" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plants' AND
  auth.uid() IS NOT NULL
);

-- UPDATE (更新) ポリシー - 認証済みユーザーのみが自分がアップロードした植物画像を更新可能
CREATE POLICY "update Only authenticated users and own" 
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'plants' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'plants' AND
  auth.uid() = owner
);

-- DELETE (削除) ポリシー - 認証済みユーザーのみが自分がアップロードした植物画像を削除可能
CREATE POLICY "delete Only authenticated users and own" 
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'plants' AND
  auth.uid() = owner
);

-- user_profilesバケットのストレージポリシーを設定
-- すべてのファイルがパブリックに閲覧可能
CREATE POLICY "Public user profiles are viewable by everyone" 
ON storage.objects
FOR SELECT
USING (bucket_id = 'user_profiles');

-- 認証済みユーザーは自分のフォルダにのみファイルをアップロード可能
CREATE POLICY "Users can upload their own profile images" 
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user_profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のフォルダのファイルのみ更新可能
CREATE POLICY "Users can update their own profile images" 
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user_profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のフォルダのファイルのみ削除可能
CREATE POLICY "Users can delete their own profile images" 
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user_profiles' AND
  auth.uid()::text = (storage.foldername(name))[1]
);


-- user_petsバケットのストレージポリシーを設定

-- すべてのファイルがパブリックに閲覧可能
CREATE POLICY "Public user pets are viewable by everyone" 
ON storage.objects
FOR SELECT
USING (bucket_id = 'user_pets');

-- 認証済みユーザーは自分のフォルダにのみファイルをアップロード可能
CREATE POLICY "Users can upload their own pet images" 
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user_pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のフォルダのファイルのみ更新可能
CREATE POLICY "Users can update their own pet images" 
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user_pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 認証済みユーザーは自分のフォルダのファイルのみ削除可能
CREATE POLICY "Users can delete their own pet images" 
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user_pets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

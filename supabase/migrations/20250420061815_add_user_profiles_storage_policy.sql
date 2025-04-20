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

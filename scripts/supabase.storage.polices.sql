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
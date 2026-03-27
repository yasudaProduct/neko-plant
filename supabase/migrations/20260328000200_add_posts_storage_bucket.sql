-- コミュニティ投稿画像用の Storage バケットとポリシー（アプリは storage.from('posts') を使用）

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Post images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own post images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'posts' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'posts' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'posts' AND auth.uid() = owner);

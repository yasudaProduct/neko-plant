-- 画像バケットの上限強化
-- クライアント直接アップロード化により、サイズ・形式の制御はクライアント側
-- (src/lib/client-image.ts: 長辺2048px縮小 + JPEG化で実質1〜2MB) が担うため、
-- バケット側の file_size_limit をバックストップとして 10MB に締める。
-- user_profiles / user_pets は本番で手動作成されていたため、
-- ここでマイグレーション管理下に置く (既存バケットには do update で適用される)。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('posts', 'posts', true, 10485760, array['image/jpeg', 'image/png']),
    ('user_profiles', 'user_profiles', true, 10485760, array['image/jpeg', 'image/png']),
    ('user_pets', 'user_pets', true, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

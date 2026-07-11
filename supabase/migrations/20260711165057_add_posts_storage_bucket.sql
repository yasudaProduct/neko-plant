-- posts バケットの実体作成
-- ※ supabase/config.toml の [storage.buckets.posts] はローカルCLI専用の設定であり、
--   supabase db push ではリモート(本番)プロジェクトに反映されない。
--   RLSポリシーは 20260709230949_photo_sns_redesign.sql で定義済みだが、
--   バケット自体を作る INSERT が無かったため本番アップロードが失敗していた。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 52428800, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

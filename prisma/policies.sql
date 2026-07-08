-- =====================================================================
-- フォトSNS (posts / post_images / post_likes) の RLS・ストレージポリシー
--
-- 適用方法: npm run db:policies
-- 注意: `supabase db reset` は Prisma 管理のテーブルを消すため、
--       リセット後は `npm run db:setup` (push → policies → seed) を実行すること。
--
-- 設計方針 (既存テーブルの RLS と同じ):
--   - 読み取りは全員可 (anon / authenticated)
--   - 書き込みポリシーは定義しない = PostgREST 経由の書き込みは全拒否。
--     書き込みは Server Action (Prisma / postgres ロール) 経由のみ。
--   - storage.objects は「自分のフォルダ ({auth_id}/...) のみ書き込み可」
-- =====================================================================

-- ---- RLS 有効化 ----
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_plants enable row level security;
alter table public.post_pets enable row level security;

-- ---- posts: 全員読み取り可 ----
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
on public.posts for select
to anon, authenticated
using (true);

-- ---- post_images: 全員読み取り可 ----
drop policy if exists "Post images are viewable by everyone" on public.post_images;
create policy "Post images are viewable by everyone"
on public.post_images for select
to anon, authenticated
using (true);

-- ---- post_likes: 全員読み取り可 (いいね数は公開情報) ----
drop policy if exists "Post likes are viewable by everyone" on public.post_likes;
create policy "Post likes are viewable by everyone"
on public.post_likes for select
to anon, authenticated
using (true);

-- ---- post_plants: 全員読み取り可 ----
drop policy if exists "Post plants are viewable by everyone" on public.post_plants;
create policy "Post plants are viewable by everyone"
on public.post_plants for select
to anon, authenticated
using (true);

-- ---- post_pets: 全員読み取り可 ----
drop policy if exists "Post pets are viewable by everyone" on public.post_pets;
create policy "Post pets are viewable by everyone"
on public.post_pets for select
to anon, authenticated
using (true);

-- ---- storage: posts バケット ----
drop policy if exists "Public post images are viewable by everyone" on storage.objects;
create policy "Public post images are viewable by everyone"
on storage.objects for select
using (bucket_id = 'posts');

drop policy if exists "Users can upload their own post images" on storage.objects;
create policy "Users can upload their own post images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own post images" on storage.objects;
create policy "Users can update their own post images"
on storage.objects for update
to authenticated
using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own post images" on storage.objects;
create policy "Users can delete their own post images"
on storage.objects for delete
to authenticated
using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

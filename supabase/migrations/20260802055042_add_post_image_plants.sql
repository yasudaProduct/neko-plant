-- 写真ごとの植物タグ (issue #102)
--
-- 投稿単位の post_plants は共存実績の集計・表示用にそのまま残し、
-- 「どの写真にどの植物が写っているか」を post_image_plants に持つ。
-- createPost が両方を書き込む (post_plants は重複排除した和集合)。
-- 投稿に編集機能はないため、二重書き込みは createPost の1箇所で完結する。
--
-- 注: ALTER DEFAULT PRIVILEGES により新規テーブルには anon/authenticated への
-- 書き込みGRANTが自動付与されるため、他の post_* テーブルと同様に
-- RLS有効 + SELECTのみのポリシー + 書き込み権限のREVOKEを必ずセットで行う。

create table public.post_image_plants (
    id serial primary key,
    post_image_id integer not null references public.post_images(id) on delete cascade,
    plant_id integer not null references public.plants(id) on delete cascade
);

create unique index post_image_plants_post_image_id_plant_id_key
    on public.post_image_plants (post_image_id, plant_id);

create index post_image_plants_plant_id_idx
    on public.post_image_plants (plant_id);

alter table public.post_image_plants enable row level security;

create policy "Post image plants are viewable by everyone"
    on public.post_image_plants
    for select
    to anon, authenticated
    using (true);

-- 書き込みはアプリの Prisma (特権接続) のみ。PostgREST 経由の書き込みを遮断する
revoke insert, update, delete, truncate on table public.post_image_plants from anon, authenticated;

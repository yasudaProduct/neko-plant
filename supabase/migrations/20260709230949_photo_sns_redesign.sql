create sequence "public"."post_images_id_seq";

create sequence "public"."post_likes_id_seq";

create sequence "public"."post_pets_id_seq";

create sequence "public"."post_plants_id_seq";

create sequence "public"."posts_id_seq";

drop policy "evaluation_reactions_select_all" on "public"."evaluation_reactions";

drop policy "evaluations_select_all" on "public"."evaluations";

drop policy "plant_favorites_select_own" on "public"."plant_favorites";

drop policy "plant_have_select_own" on "public"."plant_have";

drop policy "plant_images_select_approved" on "public"."plant_images";

drop policy "plant_images_select_own" on "public"."plant_images";

revoke delete on table "public"."evaluation_reactions" from "anon";

revoke insert on table "public"."evaluation_reactions" from "anon";

revoke references on table "public"."evaluation_reactions" from "anon";

revoke select on table "public"."evaluation_reactions" from "anon";

revoke trigger on table "public"."evaluation_reactions" from "anon";

revoke truncate on table "public"."evaluation_reactions" from "anon";

revoke update on table "public"."evaluation_reactions" from "anon";

revoke delete on table "public"."evaluation_reactions" from "authenticated";

revoke insert on table "public"."evaluation_reactions" from "authenticated";

revoke references on table "public"."evaluation_reactions" from "authenticated";

revoke select on table "public"."evaluation_reactions" from "authenticated";

revoke trigger on table "public"."evaluation_reactions" from "authenticated";

revoke truncate on table "public"."evaluation_reactions" from "authenticated";

revoke update on table "public"."evaluation_reactions" from "authenticated";

revoke delete on table "public"."evaluation_reactions" from "service_role";

revoke insert on table "public"."evaluation_reactions" from "service_role";

revoke references on table "public"."evaluation_reactions" from "service_role";

revoke select on table "public"."evaluation_reactions" from "service_role";

revoke trigger on table "public"."evaluation_reactions" from "service_role";

revoke truncate on table "public"."evaluation_reactions" from "service_role";

revoke update on table "public"."evaluation_reactions" from "service_role";

revoke delete on table "public"."evaluations" from "anon";

revoke insert on table "public"."evaluations" from "anon";

revoke references on table "public"."evaluations" from "anon";

revoke select on table "public"."evaluations" from "anon";

revoke trigger on table "public"."evaluations" from "anon";

revoke truncate on table "public"."evaluations" from "anon";

revoke update on table "public"."evaluations" from "anon";

revoke delete on table "public"."evaluations" from "authenticated";

revoke insert on table "public"."evaluations" from "authenticated";

revoke references on table "public"."evaluations" from "authenticated";

revoke select on table "public"."evaluations" from "authenticated";

revoke trigger on table "public"."evaluations" from "authenticated";

revoke truncate on table "public"."evaluations" from "authenticated";

revoke update on table "public"."evaluations" from "authenticated";

revoke delete on table "public"."evaluations" from "service_role";

revoke insert on table "public"."evaluations" from "service_role";

revoke references on table "public"."evaluations" from "service_role";

revoke select on table "public"."evaluations" from "service_role";

revoke trigger on table "public"."evaluations" from "service_role";

revoke truncate on table "public"."evaluations" from "service_role";

revoke update on table "public"."evaluations" from "service_role";

revoke delete on table "public"."plant_favorites" from "anon";

revoke insert on table "public"."plant_favorites" from "anon";

revoke references on table "public"."plant_favorites" from "anon";

revoke select on table "public"."plant_favorites" from "anon";

revoke trigger on table "public"."plant_favorites" from "anon";

revoke truncate on table "public"."plant_favorites" from "anon";

revoke update on table "public"."plant_favorites" from "anon";

revoke delete on table "public"."plant_favorites" from "authenticated";

revoke insert on table "public"."plant_favorites" from "authenticated";

revoke references on table "public"."plant_favorites" from "authenticated";

revoke select on table "public"."plant_favorites" from "authenticated";

revoke trigger on table "public"."plant_favorites" from "authenticated";

revoke truncate on table "public"."plant_favorites" from "authenticated";

revoke update on table "public"."plant_favorites" from "authenticated";

revoke delete on table "public"."plant_favorites" from "service_role";

revoke insert on table "public"."plant_favorites" from "service_role";

revoke references on table "public"."plant_favorites" from "service_role";

revoke select on table "public"."plant_favorites" from "service_role";

revoke trigger on table "public"."plant_favorites" from "service_role";

revoke truncate on table "public"."plant_favorites" from "service_role";

revoke update on table "public"."plant_favorites" from "service_role";

revoke delete on table "public"."plant_have" from "anon";

revoke insert on table "public"."plant_have" from "anon";

revoke references on table "public"."plant_have" from "anon";

revoke select on table "public"."plant_have" from "anon";

revoke trigger on table "public"."plant_have" from "anon";

revoke truncate on table "public"."plant_have" from "anon";

revoke update on table "public"."plant_have" from "anon";

revoke delete on table "public"."plant_have" from "authenticated";

revoke insert on table "public"."plant_have" from "authenticated";

revoke references on table "public"."plant_have" from "authenticated";

revoke select on table "public"."plant_have" from "authenticated";

revoke trigger on table "public"."plant_have" from "authenticated";

revoke truncate on table "public"."plant_have" from "authenticated";

revoke update on table "public"."plant_have" from "authenticated";

revoke delete on table "public"."plant_have" from "service_role";

revoke insert on table "public"."plant_have" from "service_role";

revoke references on table "public"."plant_have" from "service_role";

revoke select on table "public"."plant_have" from "service_role";

revoke trigger on table "public"."plant_have" from "service_role";

revoke truncate on table "public"."plant_have" from "service_role";

revoke update on table "public"."plant_have" from "service_role";

revoke delete on table "public"."plant_images" from "anon";

revoke insert on table "public"."plant_images" from "anon";

revoke references on table "public"."plant_images" from "anon";

revoke select on table "public"."plant_images" from "anon";

revoke trigger on table "public"."plant_images" from "anon";

revoke truncate on table "public"."plant_images" from "anon";

revoke update on table "public"."plant_images" from "anon";

revoke delete on table "public"."plant_images" from "authenticated";

revoke insert on table "public"."plant_images" from "authenticated";

revoke references on table "public"."plant_images" from "authenticated";

revoke select on table "public"."plant_images" from "authenticated";

revoke trigger on table "public"."plant_images" from "authenticated";

revoke truncate on table "public"."plant_images" from "authenticated";

revoke update on table "public"."plant_images" from "authenticated";

revoke delete on table "public"."plant_images" from "service_role";

revoke insert on table "public"."plant_images" from "service_role";

revoke references on table "public"."plant_images" from "service_role";

revoke select on table "public"."plant_images" from "service_role";

revoke trigger on table "public"."plant_images" from "service_role";

revoke truncate on table "public"."plant_images" from "service_role";

revoke update on table "public"."plant_images" from "service_role";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_user_id_fkey";

alter table "public"."evaluations" drop constraint "evaluations_plant_id_fkey";

alter table "public"."evaluations" drop constraint "evaluations_user_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_user_id_fkey";

alter table "public"."plant_have" drop constraint "plant_have_plant_id_fkey";

alter table "public"."plant_have" drop constraint "plant_have_user_id_fkey";

alter table "public"."plant_images" drop constraint "fk_plant";

alter table "public"."plant_images" drop constraint "plant_images_user_id_fkey";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_pkey";

alter table "public"."evaluations" drop constraint "evaluations_pkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_pkey";

alter table "public"."plant_have" drop constraint "plant_ have_pkey";

alter table "public"."plant_images" drop constraint "plants_images_pkey";

drop index if exists "public"."evaluation_reactions_pkey";

drop index if exists "public"."evaluations_pkey";

drop index if exists "public"."idx_plant_images_plant_id";

drop index if exists "public"."idx_plant_images_user_id";

drop index if exists "public"."idx_users_role";

drop index if exists "public"."plant_ have_pkey";

drop index if exists "public"."plant_favorites_pkey";

drop index if exists "public"."plants_images_pkey";

drop table "public"."evaluation_reactions";

drop table "public"."evaluations";

drop table "public"."plant_favorites";

drop table "public"."plant_have";

drop table "public"."plant_images";


  create table "public"."post_images" (
    "id" integer not null default nextval('public.post_images_id_seq'::regclass),
    "post_id" integer not null,
    "image_url" character varying not null,
    "order" integer not null default 0,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."post_images" enable row level security;


  create table "public"."post_likes" (
    "id" integer not null default nextval('public.post_likes_id_seq'::regclass),
    "post_id" integer not null,
    "user_id" integer not null,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."post_likes" enable row level security;


  create table "public"."post_pets" (
    "id" integer not null default nextval('public.post_pets_id_seq'::regclass),
    "post_id" integer not null,
    "pet_id" integer not null
      );


alter table "public"."post_pets" enable row level security;


  create table "public"."post_plants" (
    "id" integer not null default nextval('public.post_plants_id_seq'::regclass),
    "post_id" integer not null,
    "plant_id" integer not null
      );


alter table "public"."post_plants" enable row level security;


  create table "public"."posts" (
    "id" integer not null default nextval('public.posts_id_seq'::regclass),
    "user_id" integer not null,
    "comment" character varying,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."posts" enable row level security;

alter sequence "public"."post_images_id_seq" owned by "public"."post_images"."id";

alter sequence "public"."post_likes_id_seq" owned by "public"."post_likes"."id";

alter sequence "public"."post_pets_id_seq" owned by "public"."post_pets"."id";

alter sequence "public"."post_plants_id_seq" owned by "public"."post_plants"."id";

alter sequence "public"."posts_id_seq" owned by "public"."posts"."id";

drop sequence if exists "public"."plants_images_id_seq";

drop type "public"."evaluation_type";

drop type "public"."mood";

drop type "public"."reaction_type";

CREATE UNIQUE INDEX post_images_pkey ON public.post_images USING btree (id);

CREATE INDEX post_images_post_id_idx ON public.post_images USING btree (post_id);

CREATE UNIQUE INDEX post_likes_pkey ON public.post_likes USING btree (id);

CREATE UNIQUE INDEX post_likes_post_id_user_id_key ON public.post_likes USING btree (post_id, user_id);

CREATE INDEX post_likes_user_id_idx ON public.post_likes USING btree (user_id);

CREATE INDEX post_pets_pet_id_idx ON public.post_pets USING btree (pet_id);

CREATE UNIQUE INDEX post_pets_pkey ON public.post_pets USING btree (id);

CREATE UNIQUE INDEX post_pets_post_id_pet_id_key ON public.post_pets USING btree (post_id, pet_id);

CREATE UNIQUE INDEX post_plants_pkey ON public.post_plants USING btree (id);

CREATE INDEX post_plants_plant_id_idx ON public.post_plants USING btree (plant_id);

CREATE UNIQUE INDEX post_plants_post_id_plant_id_key ON public.post_plants USING btree (post_id, plant_id);

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at DESC);

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE INDEX posts_user_id_idx ON public.posts USING btree (user_id);

CREATE UNIQUE INDEX users_auth_id_key ON public.users USING btree (auth_id);

alter table "public"."post_images" add constraint "post_images_pkey" PRIMARY KEY using index "post_images_pkey";

alter table "public"."post_likes" add constraint "post_likes_pkey" PRIMARY KEY using index "post_likes_pkey";

alter table "public"."post_pets" add constraint "post_pets_pkey" PRIMARY KEY using index "post_pets_pkey";

alter table "public"."post_plants" add constraint "post_plants_pkey" PRIMARY KEY using index "post_plants_pkey";

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."post_images" add constraint "post_images_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_images" validate constraint "post_images_post_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_post_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_user_id_fkey";

alter table "public"."post_pets" add constraint "post_pets_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE not valid;

alter table "public"."post_pets" validate constraint "post_pets_pet_id_fkey";

alter table "public"."post_pets" add constraint "post_pets_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_pets" validate constraint "post_pets_post_id_fkey";

alter table "public"."post_plants" add constraint "post_plants_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE not valid;

alter table "public"."post_plants" validate constraint "post_plants_plant_id_fkey";

alter table "public"."post_plants" add constraint "post_plants_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_plants" validate constraint "post_plants_post_id_fkey";

alter table "public"."posts" add constraint "posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_user_id_fkey";

grant delete on table "public"."post_images" to "anon";

grant insert on table "public"."post_images" to "anon";

grant references on table "public"."post_images" to "anon";

grant select on table "public"."post_images" to "anon";

grant trigger on table "public"."post_images" to "anon";

grant truncate on table "public"."post_images" to "anon";

grant update on table "public"."post_images" to "anon";

grant delete on table "public"."post_images" to "authenticated";

grant insert on table "public"."post_images" to "authenticated";

grant references on table "public"."post_images" to "authenticated";

grant select on table "public"."post_images" to "authenticated";

grant trigger on table "public"."post_images" to "authenticated";

grant truncate on table "public"."post_images" to "authenticated";

grant update on table "public"."post_images" to "authenticated";

grant delete on table "public"."post_images" to "service_role";

grant insert on table "public"."post_images" to "service_role";

grant references on table "public"."post_images" to "service_role";

grant select on table "public"."post_images" to "service_role";

grant trigger on table "public"."post_images" to "service_role";

grant truncate on table "public"."post_images" to "service_role";

grant update on table "public"."post_images" to "service_role";

grant delete on table "public"."post_likes" to "anon";

grant insert on table "public"."post_likes" to "anon";

grant references on table "public"."post_likes" to "anon";

grant select on table "public"."post_likes" to "anon";

grant trigger on table "public"."post_likes" to "anon";

grant truncate on table "public"."post_likes" to "anon";

grant update on table "public"."post_likes" to "anon";

grant delete on table "public"."post_likes" to "authenticated";

grant insert on table "public"."post_likes" to "authenticated";

grant references on table "public"."post_likes" to "authenticated";

grant select on table "public"."post_likes" to "authenticated";

grant trigger on table "public"."post_likes" to "authenticated";

grant truncate on table "public"."post_likes" to "authenticated";

grant update on table "public"."post_likes" to "authenticated";

grant delete on table "public"."post_likes" to "service_role";

grant insert on table "public"."post_likes" to "service_role";

grant references on table "public"."post_likes" to "service_role";

grant select on table "public"."post_likes" to "service_role";

grant trigger on table "public"."post_likes" to "service_role";

grant truncate on table "public"."post_likes" to "service_role";

grant update on table "public"."post_likes" to "service_role";

grant delete on table "public"."post_pets" to "anon";

grant insert on table "public"."post_pets" to "anon";

grant references on table "public"."post_pets" to "anon";

grant select on table "public"."post_pets" to "anon";

grant trigger on table "public"."post_pets" to "anon";

grant truncate on table "public"."post_pets" to "anon";

grant update on table "public"."post_pets" to "anon";

grant delete on table "public"."post_pets" to "authenticated";

grant insert on table "public"."post_pets" to "authenticated";

grant references on table "public"."post_pets" to "authenticated";

grant select on table "public"."post_pets" to "authenticated";

grant trigger on table "public"."post_pets" to "authenticated";

grant truncate on table "public"."post_pets" to "authenticated";

grant update on table "public"."post_pets" to "authenticated";

grant delete on table "public"."post_pets" to "service_role";

grant insert on table "public"."post_pets" to "service_role";

grant references on table "public"."post_pets" to "service_role";

grant select on table "public"."post_pets" to "service_role";

grant trigger on table "public"."post_pets" to "service_role";

grant truncate on table "public"."post_pets" to "service_role";

grant update on table "public"."post_pets" to "service_role";

grant delete on table "public"."post_plants" to "anon";

grant insert on table "public"."post_plants" to "anon";

grant references on table "public"."post_plants" to "anon";

grant select on table "public"."post_plants" to "anon";

grant trigger on table "public"."post_plants" to "anon";

grant truncate on table "public"."post_plants" to "anon";

grant update on table "public"."post_plants" to "anon";

grant delete on table "public"."post_plants" to "authenticated";

grant insert on table "public"."post_plants" to "authenticated";

grant references on table "public"."post_plants" to "authenticated";

grant select on table "public"."post_plants" to "authenticated";

grant trigger on table "public"."post_plants" to "authenticated";

grant truncate on table "public"."post_plants" to "authenticated";

grant update on table "public"."post_plants" to "authenticated";

grant delete on table "public"."post_plants" to "service_role";

grant insert on table "public"."post_plants" to "service_role";

grant references on table "public"."post_plants" to "service_role";

grant select on table "public"."post_plants" to "service_role";

grant trigger on table "public"."post_plants" to "service_role";

grant truncate on table "public"."post_plants" to "service_role";

grant update on table "public"."post_plants" to "service_role";

grant delete on table "public"."posts" to "anon";

grant insert on table "public"."posts" to "anon";

grant references on table "public"."posts" to "anon";

grant select on table "public"."posts" to "anon";

grant trigger on table "public"."posts" to "anon";

grant truncate on table "public"."posts" to "anon";

grant update on table "public"."posts" to "anon";

grant delete on table "public"."posts" to "authenticated";

grant insert on table "public"."posts" to "authenticated";

grant references on table "public"."posts" to "authenticated";

grant select on table "public"."posts" to "authenticated";

grant trigger on table "public"."posts" to "authenticated";

grant truncate on table "public"."posts" to "authenticated";

grant update on table "public"."posts" to "authenticated";

grant delete on table "public"."posts" to "service_role";

grant insert on table "public"."posts" to "service_role";

grant references on table "public"."posts" to "service_role";

grant select on table "public"."posts" to "service_role";

grant trigger on table "public"."posts" to "service_role";

grant truncate on table "public"."posts" to "service_role";

grant update on table "public"."posts" to "service_role";


  create policy "Post images are viewable by everyone"
  on "public"."post_images"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Post likes are viewable by everyone"
  on "public"."post_likes"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Post pets are viewable by everyone"
  on "public"."post_pets"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Post plants are viewable by everyone"
  on "public"."post_plants"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Posts are viewable by everyone"
  on "public"."posts"
  as permissive
  for select
  to anon, authenticated
using (true);





-- =====================================================================
-- ストレージ (posts バケット) のポリシー
-- ※ supabase db diff --schema public では storage スキーマが差分に含まれないため手動で追記
--   読み取りは全員可 / 書き込みは自分のフォルダ ({auth_id}/...) のみ
-- =====================================================================

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

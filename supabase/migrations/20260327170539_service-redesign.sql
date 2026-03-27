create sequence if not exists "public"."neko_id_seq";

create sequence if not exists "public"."pets_id_seq";

create sequence if not exists "public"."plants_id_seq";

create sequence if not exists "public"."post_images_id_seq";

create sequence if not exists "public"."post_likes_id_seq";

create sequence if not exists "public"."posts_id_seq";

create sequence if not exists "public"."users_id_seq";

drop policy "evaluation_reactions_select_all" on "public"."evaluation_reactions";

drop policy "evaluations_select_all" on "public"."evaluations";

drop policy "neko_select_all" on "public"."neko";

drop policy "pets_select_own" on "public"."pets";

drop policy "plant_favorites_select_own" on "public"."plant_favorites";

drop policy "plant_have_select_own" on "public"."plant_have";

drop policy "plant_images_select_approved" on "public"."plant_images";

drop policy "plant_images_select_own" on "public"."plant_images";

drop policy "plants_select_all" on "public"."plants";

drop policy "users_select_own" on "public"."users";

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

revoke delete on table "public"."neko" from "anon";

revoke insert on table "public"."neko" from "anon";

revoke references on table "public"."neko" from "anon";

revoke select on table "public"."neko" from "anon";

revoke trigger on table "public"."neko" from "anon";

revoke truncate on table "public"."neko" from "anon";

revoke update on table "public"."neko" from "anon";

revoke delete on table "public"."neko" from "authenticated";

revoke insert on table "public"."neko" from "authenticated";

revoke references on table "public"."neko" from "authenticated";

revoke select on table "public"."neko" from "authenticated";

revoke trigger on table "public"."neko" from "authenticated";

revoke truncate on table "public"."neko" from "authenticated";

revoke update on table "public"."neko" from "authenticated";

revoke delete on table "public"."neko" from "service_role";

revoke insert on table "public"."neko" from "service_role";

revoke references on table "public"."neko" from "service_role";

revoke select on table "public"."neko" from "service_role";

revoke trigger on table "public"."neko" from "service_role";

revoke truncate on table "public"."neko" from "service_role";

revoke update on table "public"."neko" from "service_role";

revoke delete on table "public"."pets" from "anon";

revoke insert on table "public"."pets" from "anon";

revoke references on table "public"."pets" from "anon";

revoke select on table "public"."pets" from "anon";

revoke trigger on table "public"."pets" from "anon";

revoke truncate on table "public"."pets" from "anon";

revoke update on table "public"."pets" from "anon";

revoke delete on table "public"."pets" from "authenticated";

revoke insert on table "public"."pets" from "authenticated";

revoke references on table "public"."pets" from "authenticated";

revoke select on table "public"."pets" from "authenticated";

revoke trigger on table "public"."pets" from "authenticated";

revoke truncate on table "public"."pets" from "authenticated";

revoke update on table "public"."pets" from "authenticated";

revoke delete on table "public"."pets" from "service_role";

revoke insert on table "public"."pets" from "service_role";

revoke references on table "public"."pets" from "service_role";

revoke select on table "public"."pets" from "service_role";

revoke trigger on table "public"."pets" from "service_role";

revoke truncate on table "public"."pets" from "service_role";

revoke update on table "public"."pets" from "service_role";

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

revoke delete on table "public"."plants" from "anon";

revoke insert on table "public"."plants" from "anon";

revoke references on table "public"."plants" from "anon";

revoke select on table "public"."plants" from "anon";

revoke trigger on table "public"."plants" from "anon";

revoke truncate on table "public"."plants" from "anon";

revoke update on table "public"."plants" from "anon";

revoke delete on table "public"."plants" from "authenticated";

revoke insert on table "public"."plants" from "authenticated";

revoke references on table "public"."plants" from "authenticated";

revoke select on table "public"."plants" from "authenticated";

revoke trigger on table "public"."plants" from "authenticated";

revoke truncate on table "public"."plants" from "authenticated";

revoke update on table "public"."plants" from "authenticated";

revoke delete on table "public"."plants" from "service_role";

revoke insert on table "public"."plants" from "service_role";

revoke references on table "public"."plants" from "service_role";

revoke select on table "public"."plants" from "service_role";

revoke trigger on table "public"."plants" from "service_role";

revoke truncate on table "public"."plants" from "service_role";

revoke update on table "public"."plants" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."users" from "supabase_auth_admin";

revoke insert on table "public"."users" from "supabase_auth_admin";

revoke references on table "public"."users" from "supabase_auth_admin";

revoke select on table "public"."users" from "supabase_auth_admin";

revoke trigger on table "public"."users" from "supabase_auth_admin";

revoke truncate on table "public"."users" from "supabase_auth_admin";

revoke update on table "public"."users" from "supabase_auth_admin";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_user_id_fkey";

alter table "public"."evaluations" drop constraint "evaluations_plant_id_fkey";

alter table "public"."evaluations" drop constraint "evaluations_user_id_fkey";

alter table "public"."neko" drop constraint "neko_name_key";

alter table "public"."plant_favorites" drop constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_user_id_fkey";

alter table "public"."plant_have" drop constraint "plant_have_plant_id_fkey";

alter table "public"."plant_have" drop constraint "plant_have_user_id_fkey";

alter table "public"."plant_images" drop constraint "fk_plant";

alter table "public"."plant_images" drop constraint "plant_images_user_id_fkey";

alter table "public"."users" drop constraint "check_user_role";

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


  create table "public"."_prisma_migrations" (
    "id" character varying(36) not null,
    "checksum" character varying(64) not null,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) not null,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone not null default now(),
    "applied_steps_count" integer not null default 0
      );



  create table "public"."post_images" (
    "id" integer not null default nextval('public.post_images_id_seq'::regclass),
    "post_id" integer not null,
    "image_url" character varying not null,
    "order" integer not null default 0,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."post_likes" (
    "id" integer not null default nextval('public.post_likes_id_seq'::regclass),
    "post_id" integer not null,
    "user_id" integer not null,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."posts" (
    "id" integer not null default nextval('public.posts_id_seq'::regclass),
    "user_id" integer not null,
    "plant_id" integer not null,
    "pet_id" integer,
    "comment" character varying,
    "created_at" timestamp(6) with time zone not null default CURRENT_TIMESTAMP
      );


alter table "public"."neko" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."neko" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."neko" alter column "id" drop identity;

create sequence if not exists "public"."neko_id_seq";

alter table "public"."neko" alter column "id" set default nextval('public.neko_id_seq'::regclass);

alter table "public"."neko" disable row level security;

alter table "public"."pets" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."pets" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."pets" alter column "id" drop identity;

create sequence if not exists "public"."pets_id_seq";

alter table "public"."pets" alter column "id" set default nextval('public.pets_id_seq'::regclass);

alter table "public"."pets" disable row level security;

alter table "public"."plants" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."plants" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."plants" alter column "id" drop identity;

create sequence if not exists "public"."plants_id_seq";

alter table "public"."plants" alter column "id" set default nextval('public.plants_id_seq'::regclass);

alter table "public"."plants" alter column "updated_at" set default CURRENT_TIMESTAMP;

alter table "public"."plants" alter column "updated_at" set data type timestamp(6) with time zone using "updated_at"::timestamp(6) with time zone;

alter table "public"."plants" disable row level security;

alter table "public"."users" alter column "created_at" set default CURRENT_TIMESTAMP;

alter table "public"."users" alter column "created_at" set data type timestamp(6) with time zone using "created_at"::timestamp(6) with time zone;

alter table "public"."users" alter column "id" drop identity;

create sequence if not exists "public"."users_id_seq";

alter table "public"."users" alter column "id" set default nextval('public.users_id_seq'::regclass);

alter table "public"."users" disable row level security;

alter sequence "public"."neko_id_seq" owned by "public"."neko"."id";

alter sequence "public"."pets_id_seq" owned by "public"."pets"."id";

alter sequence "public"."plants_id_seq" owned by "public"."plants"."id";

alter sequence "public"."post_images_id_seq" owned by "public"."post_images"."id";

alter sequence "public"."post_likes_id_seq" owned by "public"."post_likes"."id";

alter sequence "public"."posts_id_seq" owned by "public"."posts"."id";

alter sequence "public"."users_id_seq" owned by "public"."users"."id";

drop sequence if exists "public"."plants_images_id_seq";

drop type "public"."evaluation_type";

drop type "public"."mood";

drop type "public"."reaction_type";

CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

CREATE UNIQUE INDEX post_images_pkey ON public.post_images USING btree (id);

CREATE INDEX post_images_post_id_idx ON public.post_images USING btree (post_id);

CREATE UNIQUE INDEX post_likes_pkey ON public.post_likes USING btree (id);

CREATE UNIQUE INDEX post_likes_post_id_user_id_key ON public.post_likes USING btree (post_id, user_id);

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at DESC);

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE INDEX posts_plant_id_idx ON public.posts USING btree (plant_id);

CREATE INDEX posts_user_id_idx ON public.posts USING btree (user_id);

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

alter table "public"."post_images" add constraint "post_images_pkey" PRIMARY KEY using index "post_images_pkey";

alter table "public"."post_likes" add constraint "post_likes_pkey" PRIMARY KEY using index "post_likes_pkey";

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."post_images" add constraint "post_images_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_images" validate constraint "post_images_post_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_post_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_user_id_fkey";

alter table "public"."posts" add constraint "posts_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL not valid;

alter table "public"."posts" validate constraint "posts_pet_id_fkey";

alter table "public"."posts" add constraint "posts_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_plant_id_fkey";

alter table "public"."posts" add constraint "posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_user_id_fkey";

drop trigger if exists "new_user_for_auth_trigger" on "auth"."users";

drop trigger if exists "update_user_for_auth_trigger" on "auth"."users";

drop function if exists "public"."create_user_for_auth"();

drop function if exists "public"."generate_random_alias_id"();

drop function if exists "public"."update_user_for_auth"();



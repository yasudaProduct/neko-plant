create sequence "public"."plants_images_id_seq";

create table "public"."plant_images" (
    "id" integer not null default nextval('plants_images_id_seq'::regclass),
    "plant_id" integer not null,
    "user_id" integer not null,
    "image_url" character varying not null,
    "caption" character varying,
    "alt_text" character varying,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_approved" boolean not null default false,
    "order" integer not null default 0
);


alter sequence "public"."plants_images_id_seq" owned by "public"."plant_images"."id";

CREATE INDEX idx_plant_images_plant_id ON public.plant_images USING btree (plant_id);

CREATE INDEX idx_plant_images_user_id ON public.plant_images USING btree (user_id);

CREATE UNIQUE INDEX plants_images_pkey ON public.plant_images USING btree (id);

alter table "public"."plant_images" add constraint "plants_images_pkey" PRIMARY KEY using index "plants_images_pkey";

alter table "public"."plant_images" add constraint "fk_plant" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE not valid;

alter table "public"."plant_images" validate constraint "fk_plant";

alter table "public"."plant_images" add constraint "fk_user" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."plant_images" validate constraint "fk_user";

grant delete on table "public"."plant_images" to "anon";

grant insert on table "public"."plant_images" to "anon";

grant references on table "public"."plant_images" to "anon";

grant select on table "public"."plant_images" to "anon";

grant trigger on table "public"."plant_images" to "anon";

grant truncate on table "public"."plant_images" to "anon";

grant update on table "public"."plant_images" to "anon";

grant delete on table "public"."plant_images" to "authenticated";

grant insert on table "public"."plant_images" to "authenticated";

grant references on table "public"."plant_images" to "authenticated";

grant select on table "public"."plant_images" to "authenticated";

grant trigger on table "public"."plant_images" to "authenticated";

grant truncate on table "public"."plant_images" to "authenticated";

grant update on table "public"."plant_images" to "authenticated";

grant delete on table "public"."plant_images" to "service_role";

grant insert on table "public"."plant_images" to "service_role";

grant references on table "public"."plant_images" to "service_role";

grant select on table "public"."plant_images" to "service_role";

grant trigger on table "public"."plant_images" to "service_role";

grant truncate on table "public"."plant_images" to "service_role";

grant update on table "public"."plant_images" to "service_role";



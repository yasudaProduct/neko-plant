alter table "public"."evaluations" drop constraint "evaluations_plant_id_fkey";

alter table "public"."evaluations" add constraint "evaluations_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE not valid;

alter table "public"."evaluations" validate constraint "evaluations_plant_id_fkey";



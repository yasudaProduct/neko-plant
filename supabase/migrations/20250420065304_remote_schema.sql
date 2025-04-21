alter table "public"."plant_have" drop constraint "plant_have_plant_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_have" add constraint "plant_ have_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) not valid;

alter table "public"."plant_have" validate constraint "plant_ have_plant_id_fkey";

alter table "public"."plant_favorites" add constraint "plant_favorites_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) not valid;

alter table "public"."plant_favorites" validate constraint "plant_favorites_plant_id_fkey";



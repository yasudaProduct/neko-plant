alter table "public"."plant_have" drop constraint "plant_have_plant_id_fkey";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_have" add constraint "plant_have_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE not valid;

alter table "public"."plant_have" validate constraint "plant_have_plant_id_fkey";

alter table "public"."evaluation_reactions" add constraint "evaluation_reactions_evaluation_id_fkey" FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE not valid;

alter table "public"."evaluation_reactions" validate constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."plant_favorites" add constraint "plant_favorites_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE not valid;

alter table "public"."plant_favorites" validate constraint "plant_favorites_plant_id_fkey";



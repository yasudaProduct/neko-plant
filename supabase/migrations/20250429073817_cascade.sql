alter table "public"."plant_images" drop constraint "fk_user";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."evaluation_reactions" drop constraint "evaluation_reactions_user_id_fkey";

alter table "public"."evaluations" drop constraint "evaluations_user_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_favorites" drop constraint "plant_favorites_user_id_fkey";

alter table "public"."evaluations" alter column "user_id" set not null;

alter table "public"."plant_have" add constraint "plant_have_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."plant_have" validate constraint "plant_have_user_id_fkey";

alter table "public"."plant_images" add constraint "plant_images_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."plant_images" validate constraint "plant_images_user_id_fkey";

alter table "public"."evaluation_reactions" add constraint "evaluation_reactions_evaluation_id_fkey" FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE not valid;

alter table "public"."evaluation_reactions" validate constraint "evaluation_reactions_evaluation_id_fkey";

alter table "public"."evaluation_reactions" add constraint "evaluation_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."evaluation_reactions" validate constraint "evaluation_reactions_user_id_fkey";

alter table "public"."evaluations" add constraint "evaluations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."evaluations" validate constraint "evaluations_user_id_fkey";

alter table "public"."plant_favorites" add constraint "plant_favorites_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE not valid;

alter table "public"."plant_favorites" validate constraint "plant_favorites_plant_id_fkey";

alter table "public"."plant_favorites" add constraint "plant_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."plant_favorites" validate constraint "plant_favorites_user_id_fkey";



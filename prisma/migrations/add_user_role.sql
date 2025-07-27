-- DropForeignKey
ALTER TABLE "public"."plant_have" DROP CONSTRAINT "plant_ have_plant_id_fkey";

-- CreateIndex
CREATE INDEX "idx_users_role" ON "public"."users"("role" ASC);

-- RenameForeignKey
ALTER TABLE "public"."evaluations" RENAME CONSTRAINT "fk_plant" TO "evaluations_plant_id_fkey";

-- RenameForeignKey
ALTER TABLE "public"."plant_have" RENAME CONSTRAINT "plant_ have_user_id_fkey" TO "plant_have_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "public"."plant_images" RENAME CONSTRAINT "fk_user" TO "plant_images_user_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."plant_have" ADD CONSTRAINT "plant_ have_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."plant_have" ADD CONSTRAINT "plant_ have_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


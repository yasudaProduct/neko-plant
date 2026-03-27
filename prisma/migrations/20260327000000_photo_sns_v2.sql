-- photo SNS v2 schema migration (no data migration)
-- note: generated manually because local DB env is unavailable in this environment.

DROP TABLE IF EXISTS "public"."evaluation_reactions" CASCADE;
DROP TABLE IF EXISTS "public"."evaluations" CASCADE;
DROP TABLE IF EXISTS "public"."plant_images" CASCADE;
DROP TABLE IF EXISTS "public"."plant_favorites" CASCADE;
DROP TABLE IF EXISTS "public"."plant_have" CASCADE;

DROP TYPE IF EXISTS "public"."evaluation_type" CASCADE;
DROP TYPE IF EXISTS "public"."reaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."mood" CASCADE;

CREATE TABLE "public"."posts" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "plant_id" INTEGER NOT NULL,
  "pet_id" INTEGER,
  "comment" VARCHAR,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."post_images" (
  "id" SERIAL NOT NULL,
  "post_id" INTEGER NOT NULL,
  "image_url" VARCHAR NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."post_likes" (
  "id" SERIAL NOT NULL,
  "post_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "posts_plant_id_idx" ON "public"."posts" ("plant_id");
CREATE INDEX "posts_user_id_idx" ON "public"."posts" ("user_id");
CREATE INDEX "posts_created_at_desc_idx" ON "public"."posts" ("created_at" DESC);
CREATE INDEX "post_images_post_id_idx" ON "public"."post_images" ("post_id");
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "public"."post_likes" ("post_id", "user_id");

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id")
  REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_plant_id_fkey" FOREIGN KEY ("plant_id")
  REFERENCES "public"."plants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id")
  REFERENCES "public"."pets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "public"."post_images"
  ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id")
  REFERENCES "public"."posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."post_likes"
  ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id")
  REFERENCES "public"."posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."post_likes"
  ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id")
  REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."sex" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "public"."neko" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "image" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "neko_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image" VARCHAR,
    "name" VARCHAR NOT NULL,
    "age" INTEGER,
    "birthday" DATE,
    "sex" "public"."sex",

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plant_id" INTEGER NOT NULL,
    "pet_id" INTEGER,
    "comment" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_images" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "image_url" VARCHAR NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_likes" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plants" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scientific_name" VARCHAR(255),
    "family" VARCHAR(100),
    "genus" VARCHAR(100),
    "species" VARCHAR(100),
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "auth_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alias_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "image" VARCHAR,
    "role" VARCHAR(50) DEFAULT 'user',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "neko_name_key" ON "public"."neko"("name");

-- CreateIndex
CREATE INDEX "posts_plant_id_idx" ON "public"."posts"("plant_id");

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "public"."posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "public"."posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "post_images_post_id_idx" ON "public"."post_images"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "public"."post_likes"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_neko_id_fkey" FOREIGN KEY ("neko_id") REFERENCES "public"."neko"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_images" ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

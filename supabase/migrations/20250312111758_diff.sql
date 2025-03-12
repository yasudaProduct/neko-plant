create type "public"."sex" as enum ('male', 'female');

alter table "public"."pets" add column "age" integer;

alter table "public"."pets" add column "birthday" date;

alter table "public"."pets" add column "sex" sex;



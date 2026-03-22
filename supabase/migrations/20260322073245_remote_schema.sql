drop extension if exists "pg_net";

alter table "public"."plant_have" drop constraint "plant_ have_plant_id_fkey";

alter table "public"."plant_have" drop constraint "plant_ have_user_id_fkey";

alter table "public"."plant_have" add constraint "plant_have_plant_id_fkey" FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE not valid;

alter table "public"."plant_have" validate constraint "plant_have_plant_id_fkey";


  create policy "Public evaluations are viewable by everyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'evaluations'::text));



  create policy "Users can delete their own evaluation images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'evaluations'::text) AND (auth.uid() = owner)));



  create policy "Users can update their own evaluation images"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'evaluations'::text) AND (auth.uid() = owner)));



  create policy "Users can upload their own evaluation images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'evaluations'::text) AND (auth.uid() IS NOT NULL)));



  create policy "delete Only authenticated users and own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'plants'::text) AND (auth.uid() = owner)));



  create policy "insert Only authenticated users"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'plants'::text) AND (auth.uid() IS NOT NULL)));



  create policy "select everyone"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'plants'::text));



  create policy "update Only authenticated users and own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'plants'::text) AND (auth.uid() = owner)))
with check (((bucket_id = 'plants'::text) AND (auth.uid() = owner)));




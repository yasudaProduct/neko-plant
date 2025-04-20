-- plantテーブルからimage_srcとenglish_nameカラムを削除
ALTER TABLE public.plants
  DROP COLUMN image_src,
  DROP COLUMN english_name;


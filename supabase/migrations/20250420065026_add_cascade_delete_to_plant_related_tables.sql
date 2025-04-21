-- plantsテーブルに紐づくテーブルの外部キー制約をCASCADE削除に変更

-- plant_favorites テーブルの外部キー制約を変更
ALTER TABLE "public"."plant_favorites" DROP CONSTRAINT IF EXISTS "plant_favorites_plant_id_fkey";
ALTER TABLE "public"."plant_favorites" ADD CONSTRAINT "plant_favorites_plant_id_fkey" 
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE;

-- plant_have テーブルの外部キー制約を変更
-- 特殊な空白が入っている場合と通常の場合の両方を考慮
ALTER TABLE "public"."plant_have" DROP CONSTRAINT IF EXISTS "plant_ have_plant_id_fkey";
ALTER TABLE "public"."plant_have" DROP CONSTRAINT IF EXISTS "plant_have_plant_id_fkey";
ALTER TABLE "public"."plant_have" ADD CONSTRAINT "plant_have_plant_id_fkey" 
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE;

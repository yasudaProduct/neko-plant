-- plantテーブルに分類学的情報のカラムを追加
ALTER TABLE public.plants 
  ADD COLUMN scientific_name VARCHAR(255),
  ADD COLUMN english_name VARCHAR(255),
  ADD COLUMN family VARCHAR(100),
  ADD COLUMN genus VARCHAR(100),
  ADD COLUMN species VARCHAR(100),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

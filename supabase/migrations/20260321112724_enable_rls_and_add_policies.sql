-- =============================================================
-- RLS 有効化 + ポリシー設定（public スキーマ全9テーブル）
-- =============================================================

-- -------------------------------------------------------------
-- 1. 全テーブルで RLS を有効化
-- -------------------------------------------------------------
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_have ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 2. カテゴリ1: 公開データ（誰でも読み取り可）
--    書き込みポリシーなし = PostgREST 経由の書き込みは拒否
-- -------------------------------------------------------------

-- plants: 植物カタログは誰でも閲覧可能
CREATE POLICY "plants_select_all"
  ON public.plants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- neko: 猫種マスタは誰でも閲覧可能
CREATE POLICY "neko_select_all"
  ON public.neko
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- evaluations: 安全性評価は誰でも閲覧可能
CREATE POLICY "evaluations_select_all"
  ON public.evaluations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- evaluation_reactions: リアクションは誰でも閲覧可能
CREATE POLICY "evaluation_reactions_select_all"
  ON public.evaluation_reactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- -------------------------------------------------------------
-- 3. カテゴリ2: 条件付き公開データ
-- -------------------------------------------------------------

-- plant_images: 承認済み画像は誰でも閲覧可能
CREATE POLICY "plant_images_select_approved"
  ON public.plant_images
  FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- plant_images: 認証済みユーザーは自分がアップロードした画像も閲覧可能（未承認含む）
CREATE POLICY "plant_images_select_own"
  ON public.plant_images
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- -------------------------------------------------------------
-- 4. カテゴリ3: ユーザー固有データ（自分のデータのみ閲覧可）
-- -------------------------------------------------------------

-- users: 認証済みユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- pets: 認証済みユーザーは自分のペットのみ閲覧可能
CREATE POLICY "pets_select_own"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- plant_favorites: 認証済みユーザーは自分のお気に入りのみ閲覧可能
CREATE POLICY "plant_favorites_select_own"
  ON public.plant_favorites
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- plant_have: 認証済みユーザーは自分の所持植物のみ閲覧可能
CREATE POLICY "plant_have_select_own"
  ON public.plant_have
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

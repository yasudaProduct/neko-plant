-- storage list の自フォルダ限定 + signup name の長さ制限 (セキュリティレビュー対応 issue #91)

-- ---------------------------------------------------------------------------
-- 1. 画像バケットの SELECT (list/API取得) を自分のフォルダに限定
--    20260712030221 で anon の list は遮断済みだが、authenticated には
--    バケット全体の SELECT が残っており、誰でもサインアップ1回で Storage list API
--    から全ユーザーの auth_id (パス1階層目) を機械的に収集できてしまう。
--    アプリは公開URL配信 (/storage/v1/object/public/... は RLS を通らない) と
--    upload/remove しか使わず、他人フォルダの list は不要なため自フォルダに絞る。
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Post images are listable by authenticated users" ON storage.objects;
CREATE POLICY "Users can list their own post images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Profile images are listable by authenticated users" ON storage.objects;
CREATE POLICY "Users can list their own profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Pet images are listable by authenticated users" ON storage.objects;
CREATE POLICY "Users can list their own pet images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_pets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 2. signup メタデータの name を長さ制限する
--    UIは name 20文字制限だが、supabase.auth.signUp は anon key で誰でも直接呼べ、
--    raw_user_meta_data.name は無検証で public.users.name (長さ無制限varchar) に
--    入っていた。巨大な name でプロフィール/フィード/管理画面の表示を破壊できるため、
--    トリガー側で 50 文字にバックストップを設ける (alias 検証ロジックは 20260712030220 を踏襲)。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_meta_alias TEXT := new.raw_user_meta_data->>'alias_id';
  v_alias TEXT;
BEGIN
  IF v_meta_alias IS NOT NULL
     AND v_meta_alias ~ '^[a-zA-Z]{1,10}$'
     AND lower(v_meta_alias) NOT IN (
       'admin', 'api', 'auth', 'contact', 'news', 'plants', 'posts',
       'privacy', 'settings', 'signin', 'signup', 'terms', 'zukan'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.users u WHERE lower(u.alias_id) = lower(v_meta_alias)
     )
  THEN
    v_alias := v_meta_alias;
  ELSE
    v_alias := public.generate_random_alias_id();
  END IF;

  INSERT INTO public.users (auth_id, alias_id, name)
  VALUES (
    new.id,
    v_alias,
    left(new.raw_user_meta_data->>'name', 50)
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
    SET name = COALESCE(left(new.raw_user_meta_data->>'name', 50), name)
    WHERE auth_id = new.id;

  RETURN new;
END;
$$;

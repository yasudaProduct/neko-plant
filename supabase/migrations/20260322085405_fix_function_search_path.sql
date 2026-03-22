-- logging 関数の削除（デバッグ専用・本番不要）
DROP FUNCTION IF EXISTS public.logging(text);

-- create_user_for_auth: SET search_path = '' を追加、デバッグログを除去
CREATE OR REPLACE FUNCTION public.create_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  alias_id TEXT;
BEGIN
  alias_id := COALESCE(
    new.raw_user_meta_data->>'alias_id',
    public.generate_random_alias_id()
  );

  INSERT INTO public.users (auth_id, alias_id, name)
  VALUES (
    new.id,
    alias_id,
    new.raw_user_meta_data->>'name'
  );

  RETURN new;
END;
$$;

-- generate_random_alias_id: SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public.generate_random_alias_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  random_alias_id TEXT;
BEGIN
  SELECT string_agg(chr(97 + (random() * 26)::int), '')
  INTO random_alias_id
  FROM generate_series(1, 5);

  RETURN random_alias_id;
END;
$$;

-- update_user_for_auth: SET search_path = '' を追加、デバッグログを除去
CREATE OR REPLACE FUNCTION public.update_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  up_alias_id TEXT;
BEGIN
  up_alias_id := COALESCE(
    new.raw_user_meta_data->>'alias_id',
    public.generate_random_alias_id()
  );

  UPDATE public.users
    SET name = new.raw_user_meta_data->>'name',
        alias_id = up_alias_id
    WHERE auth_id = new.id;

  RETURN new;
END;
$$;

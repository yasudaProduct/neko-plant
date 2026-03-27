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

CREATE OR REPLACE FUNCTION public.create_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_alias_id TEXT;
  next_name TEXT;
BEGIN
  next_alias_id := COALESCE(
    NULLIF(new.raw_user_meta_data->>'alias_id', ''),
    public.generate_random_alias_id()
  );
  next_name := COALESCE(
    NULLIF(new.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(new.email, ''), '@', 1), ''),
    'ユーザー'
  );

  INSERT INTO public.users (auth_id, alias_id, name, image)
  SELECT
    new.id,
    next_alias_id,
    next_name,
    NULLIF(new.raw_user_meta_data->>'image', '')
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_id = new.id
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  next_alias_id TEXT;
  next_name TEXT;
BEGIN
  next_alias_id := COALESCE(
    NULLIF(new.raw_user_meta_data->>'alias_id', ''),
    public.generate_random_alias_id()
  );
  next_name := COALESCE(
    NULLIF(new.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(new.email, ''), '@', 1), ''),
    'ユーザー'
  );

  UPDATE public.users
  SET
    alias_id = COALESCE(NULLIF(new.raw_user_meta_data->>'alias_id', ''), public.users.alias_id, next_alias_id),
    name = next_name,
    image = COALESCE(NULLIF(new.raw_user_meta_data->>'image', ''), public.users.image)
  WHERE auth_id = new.id;

  IF NOT FOUND THEN
    INSERT INTO public.users (auth_id, alias_id, name, image)
    VALUES (
      new.id,
      next_alias_id,
      next_name,
      NULLIF(new.raw_user_meta_data->>'image', '')
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS new_user_for_auth_trigger ON auth.users;
CREATE TRIGGER new_user_for_auth_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_for_auth();

DROP TRIGGER IF EXISTS update_user_for_auth_trigger ON auth.users;
CREATE TRIGGER update_user_for_auth_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.update_user_for_auth();

INSERT INTO public.users (auth_id, alias_id, name, image)
SELECT
  auth_user.id,
  COALESCE(
    NULLIF(auth_user.raw_user_meta_data->>'alias_id', ''),
    public.generate_random_alias_id()
  ),
  COALESCE(
    NULLIF(auth_user.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(auth_user.email, ''), '@', 1), ''),
    'ユーザー'
  ),
  NULLIF(auth_user.raw_user_meta_data->>'image', '')
FROM auth.users AS auth_user
LEFT JOIN public.users AS public_user
  ON public_user.auth_id = auth_user.id
WHERE public_user.auth_id IS NULL;

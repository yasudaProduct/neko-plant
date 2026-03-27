CREATE OR REPLACE FUNCTION public.update_user_for_auth()
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

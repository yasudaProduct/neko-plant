set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_user_for_auth()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
  up_alias_id TEXT;
begin
  raise log 'logging message: update_user_for_auth start';
  raise log 'logging message: current_user %', current_user;
  raise log 'logging message: session_user %', session_user;
  
  raise log 'logging message: %', new.id;
  raise log 'logging message: %', new.
  raw_user_meta_data->>'default_alias_id';
  raise log 'logging message: %', new.raw_user_meta_data->>'name';

  -- alias_id の決定（NULL ならランダム生成）
  -- up_alias_id := COALESCE(new.raw_user_meta_data->>'alias_id', public.generate_random_alias_id());

  -- UPDATE public.users
  --   SET 
  --     name = new.raw_user_meta_data->>'name',
  --     alias_id = up_alias_id
  --   WHERE auth_id = new.id;
  -- raise log 'logging message: update_user_for_auth end';
  return new;
end;$function$
;



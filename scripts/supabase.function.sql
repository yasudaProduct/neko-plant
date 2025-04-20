CREATE OR REPLACE FUNCTION public.create_user_for_auth()
RETURNS TRIGGER AS $$
BEGIN
  raise log 'logging message: create_user_for_auth start';
  raise log 'logging message: current_user %', current_user;
  raise log 'logging message: session_user %', session_user;

  raise log 'logging message: %', new.id;
  raise log 'logging message: %', new.
  raw_user_meta_data->>'default_alias_id';
  raise log 'logging message: %', new.raw_user_meta_data->>'name';
  insert into public.users (auth_id, alias_id, name)
  values (
    new.id,
    new.raw_user_meta_data->>'alias_id',
    new.raw_user_meta_data->>'name'
    );
  raise log 'logging message: create_user_for_auth end';
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;
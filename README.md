## dotenv

```bash
./node_modules/.bin/dotenv -e .env.local --
```

## prisma

```bash
npx prisma db pull
```

```bash
npx prisma generate
```

## supabase

### create function

````sql
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

### create trigger

```bash
CREATE TRIGGER new_user_for_auth_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_user_for_auth()

CREATE TRIGGER update_user_for_auth_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION update_user_for_auth()
````

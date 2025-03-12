## secret env

```bash
# App
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Google
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
```

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

### supabase cli

```bash

supabase db diff -f <fileName>

```

```bash

supabase db push

```

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

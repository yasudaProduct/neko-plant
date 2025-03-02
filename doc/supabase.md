## Triggers

```sql
-- auth.usersテーブルにユーザーが作成されたとき
CREATE TRIGGER new_user_for_auth_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_user_for_auth()

-- auth.usersテーブルのユーザーが更新されたとき
CREATE TRIGGER update_user_for_auth_trigger AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_user_for_auth()
```

## Functions

### ランダムな alias_id を生成

```sql
CREATE OR REPLACE FUNCTION public.generate_random_alias_id()
RETURNS TEXT AS $$
DECLARE
  random_alias_id TEXT;
BEGIN
  SELECT string_agg(chr(97 + (random() * 26)::int), '')
  INTO random_alias_id
  FROM generate_series(1, 5);

  RETURN random_alias_id;
END;
```

### auth.users から users テーブルにユーザーを作成する

```sql
CREATE OR REPLACE FUNCTION public.create_user_for_auth()
RETURNS TRIGGER AS $$
DECLARE
alias_id TEXT;
BEGIN
-- auth.users への INSERT が発生したときに、users テーブルにも同じユーザーを作成する
-- 必要な情報は auth.users の metadata から取得
raise log 'logging message: create_user_for_auth start';

-- alias_id が NULL ならランダム生成
-- alias_id が NULL でない場合は、その値を使用
-- (provider が google の場合は、alias_id が NULL になる。signInWithOAuth で metadata に alias_id を設定する方法が不明)
alias_id := COALESCE(new.raw_user_meta_data->>'alias_id', public.generate_random_alias_id());

insert into public.users (auth_id, alias_id, name)
values (
new.id,
alias_id,
new.raw_user_meta_data->>'name'
);
raise log 'logging message: create_user_for_auth end';
return new;
end;

$$
LANGUAGE plpgsql SECURITY DEFINER;
```

### auth.users から users テーブルにユーザーを更新する

```sql
CREATE OR REPLACE FUNCTION public.update_user_for_auth()
RETURNS TRIGGER AS $$
DECLARE
  up_alias_id TEXT;
begin
  raise log 'logging message: update_user_for_auth start';

  -- alias_id が NULL ならランダム生成
  -- (provider が google の時update triggerも発生したため追加)
  up_alias_id := COALESCE(new.raw_user_meta_data->>'alias_id', public.generate_random_alias_id());

  UPDATE public.users
    SET name = new.raw_user_meta_data->>'name',
        alias_id = up_alias_id
        -- image = new.raw_user_meta_data->>'image_src'
    WHERE auth_id = new.id;
  raise log 'logging message: update_user_for_auth end';
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

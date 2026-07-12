-- alias_id の一意化と auth トリガーの強化 (issue #85: なりすまし対策)
--
-- 背景:
-- 1. users.alias_id に一意制約がなく、updateUser にも重複チェックがないため、
--    他人と同じ alias_id を設定してプロフィールURL /{aliasId} を乗っ取れた。
-- 2. update_user_for_auth トリガーが auth.users の全UPDATE (ログイン時の
--    last_sign_in_at 更新等) で発火し、alias_id をメタデータ値または乱数で
--    上書きしていた (メタデータ経由の任意 alias 注入 + alias が勝手に変わるバグ)。
-- 3. signup メタデータの alias_id は自己申告値だが、形式・重複・予約語の検証なしに
--    そのまま採用されていた。
--
-- 一意インデックスは lower(alias_id) に張り、大文字小文字違いのなりすましも防ぐ。

-- ---------------------------------------------------------------------------
-- 1. generate_random_alias_id: 一意な alias を返すようリトライループ化
--    (旧実装は衝突チェックなし。また (random()*26)::int は四捨五入で 26 になり
--     'z' の次の文字 '{' が混入するバグがあったため floor() に修正)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_random_alias_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_alias TEXT;
  v_attempts INT := 0;
  v_len INT := 5;
BEGIN
  LOOP
    SELECT string_agg(chr(97 + floor(random() * 26)::int), '')
    INTO v_alias
    FROM generate_series(1, v_len);

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users u WHERE lower(u.alias_id) = lower(v_alias)
    );

    -- 衝突が続く場合は桁数を増やして空間を広げる (5→10文字)
    v_attempts := v_attempts + 1;
    IF v_attempts % 5 = 0 AND v_len < 10 THEN
      v_len := v_len + 1;
    END IF;
  END LOOP;

  RETURN v_alias;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. create_user_for_auth: メタデータ alias は検証をパスした場合のみ採用
--    (形式: 英字1〜10文字 / 予約語でない / 未使用。リストは src/lib の
--     RESERVED_ALIAS_IDS と同期すること)
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
    new.raw_user_meta_data->>'name'
  );

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. update_user_for_auth: alias_id を触らず name のみ同期する
--    (alias_id はアプリの updateUser で管理する。旧実装はログインの度に
--     alias_id を上書きし、OAuthユーザーはプロフィールURLが毎回変わっていた)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_for_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
    SET name = COALESCE(new.raw_user_meta_data->>'name', name)
    WHERE auth_id = new.id;

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. 既存の重複 alias_id を決定的にリネームしてから一意インデックスを作成
--    (既存 alias は英字のみのため、数字を含む 'dup{id}' は既存値と衝突しない。
--     id 最小の行が元の alias を保持する)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY lower(alias_id) ORDER BY id ASC) AS rn
  FROM public.users
)
UPDATE public.users u
SET alias_id = 'dup' || u.id::text
FROM ranked r
WHERE u.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS users_alias_id_lower_key
  ON public.users (lower(alias_id));

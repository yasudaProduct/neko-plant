# Security Advisor 警告レポート（2026-03-22）

## 概要

Supabase Security Advisor により、以下の7件の WARN レベル警告が検出されました。

| # | 警告名 | 対象 | レベル |
|---|--------|------|--------|
| 1 | Function Search Path Mutable | `generate_random_alias_id` | WARN |
| 2 | Function Search Path Mutable | `create_user_for_auth` | WARN |
| 3 | Function Search Path Mutable | `logging` | WARN |
| 4 | Function Search Path Mutable | `update_user_for_auth` | WARN |
| 5 | Auth OTP long expiry | Auth 設定 | WARN |
| 6 | Leaked Password Protection Disabled | Auth 設定 | WARN |
| 7 | Vulnerable Postgres version | supabase-postgres-15.8.1.044 | WARN |

---

## 1. Function Search Path Mutable（4件）

### 対象関数

| 関数名 | SECURITY DEFINER | 用途 |
|--------|-----------------|------|
| `create_user_for_auth` | **あり** | `auth.users` INSERT トリガー → `public.users` にユーザー作成 |
| `update_user_for_auth` | なし（初期定義時はあり） | `auth.users` UPDATE トリガー → `public.users` にユーザー更新 |
| `generate_random_alias_id` | なし | ランダムな alias_id（5文字）を生成 |
| `logging` | なし | デバッグ用ログ出力 |

### 原因

これらの関数で `search_path` パラメータが設定されていない。PostgreSQL は未修飾のオブジェクト名（テーブル名・関数名など）を `search_path` に従ってスキーマ解決するため、呼び出し側が `search_path` を変更すると、意図しないオブジェクトが参照される可能性がある（CVE-2018-1058）。

### 影響

- **`create_user_for_auth`（最も危険）**: `SECURITY DEFINER` で `postgres` ユーザー権限で実行される。攻撃者が `public` スキーマに同名のテーブルや関数を作成すると、`postgres` 権限でそれらが実行され、権限昇格につながる恐れがある。
- **`generate_random_alias_id`**: 他関数から `public.generate_random_alias_id()` として呼ばれているが、関数内部で `search_path` が固定されていないため、関数自体の内部処理が影響を受ける可能性がある。
- **`update_user_for_auth`**: トリガー関数として `auth.users` の UPDATE 時に自動実行されるため、攻撃面がある。
- **`logging`**: デバッグ用関数だが、`anon` / `authenticated` ロールに GRANT されているため、外部から呼び出し可能。

---

## 2. Auth OTP long expiry

### 原因

メール OTP の有効期限（`GOTRUE_MAILER_OTP_EXP`）が 1 時間（3600 秒）を超える値に設定されている。

### 影響

- OTP の有効期間が長いほど、第三者にメールリンクを奪われた場合に悪用されるリスクが高まる。
- メールクライアントのセキュリティスキャンやプレビュー機能がリンクを先に開き、OTP が消費されるリスクも増加する。

---

## 3. Leaked Password Protection Disabled

### 原因

HaveIBeenPwned.org による漏洩パスワードチェック機能が無効になっている。

### 影響

- 過去に漏洩したパスワードをそのまま登録・使用できてしまう。
- パスワード再利用攻撃（Credential Stuffing）に脆弱な状態。

> **注意**: この機能は Supabase Pro プラン以上で利用可能。

---

## 4. Vulnerable Postgres version

### 原因

現在のバージョン `supabase-postgres-15.8.1.044` に対して、より新しいセキュリティパッチが利用可能。

### 影響

- 既知の脆弱性（情報漏洩、権限昇格、サービス妨害など）が未修正のまま稼働している可能性がある。
- セキュリティコンプライアンス上の問題となる。

---

## 対応優先度

| # | 警告 | 優先度 | 理由 |
|---|------|--------|------|
| 1 | Function Search Path Mutable | **高** | `SECURITY DEFINER` 関数を含み、権限昇格のリスクがある |
| 2 | Vulnerable Postgres version | **高** | 既知の脆弱性が残る可能性 |
| 3 | Auth OTP long expiry | 中 | 認証フローの安全性に影響 |
| 4 | Leaked Password Protection | 中 | パスワード強度の問題（Pro プラン以上が必要） |

---

## 対応方針

### Function Search Path Mutable

#### 方針の選択肢

| 方針 | 内容 | メリット | デメリット |
|------|------|---------|-----------|
| **A. 全関数に `SET search_path = ''` を追加** | 関数定義に `SET search_path = ''` を明示し、関数内のオブジェクト参照をすべてスキーマ修飾する | 最もセキュア。search_path 攻撃を完全に防止 | 全関数の再定義が必要 |
| **B. `logging` 関数を削除し、残りに `SET search_path` を追加** | デバッグ用の `logging` 関数は不要なので削除。残りの関数に `SET search_path` を追加 | 不要な関数を整理しつつセキュリティ改善 | `logging` 関数を使っている箇所がないか確認が必要 |
| **C. 全関数に `SET search_path = 'public'` を追加** | search_path を `public` に固定 | 関数内で `public.` プレフィックスなしでもオブジェクトが解決される | `public` スキーマ内の攻撃には依然として脆弱（ただし RLS 有効化済みのため実質的なリスクは低い） |

#### 推奨: 方針 B

`logging` 関数はデバッグ用途であり、本番環境では不要。削除してアタックサーフェスを減らす。残りの3関数には `SET search_path = ''` を追加し、関数内のオブジェクト参照はすべて `public.` でスキーマ修飾する（現状でも `public.users` や `public.generate_random_alias_id()` のように修飾済み）。

#### 修正 SQL（マイグレーション）

```sql
-- logging 関数の削除
DROP FUNCTION IF EXISTS public.logging(text);

-- create_user_for_auth: search_path を固定
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

-- generate_random_alias_id: search_path を固定
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

-- update_user_for_auth: search_path を固定
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

-- logging 関数の GRANT を取り消し（関数削除で自動的に消えるが明示的に）
-- REVOKE ALL ON FUNCTION public.logging(text) FROM anon, authenticated, service_role;
```

#### 修正のポイント

1. **`SET search_path = ''`**: 空文字列を設定することで、すべてのオブジェクト参照にスキーマ修飾が必須になる。最もセキュアな設定。
2. **`raise log` の削除**: 本番環境では不要なデバッグログを除去。ログに `new.id` や `raw_user_meta_data` を出力するのはセキュリティ上も好ましくない。
3. **`logging` 関数の削除**: デバッグ専用関数であり、`anon` / `authenticated` に GRANT されているのは不要なアタックサーフェス。
4. **既存のスキーマ修飾はそのまま**: `public.users`, `public.generate_random_alias_id()` など、既にスキーマ修飾されている参照はそのまま維持。

#### 影響範囲

- トリガー経由で呼ばれる関数のため、`CREATE OR REPLACE` で再定義すればトリガーの再作成は不要。
- 関数のシグネチャ（引数・戻り値）は変更しないため、依存関係への影響なし。

---

### Vulnerable Postgres version

#### 方針の選択肢

| 方針 | 内容 | メリット | デメリット |
|------|------|---------|-----------|
| **A. Supabase Dashboard からアップグレード** | Dashboard > Settings > Infrastructure からアップグレードを実行 | 最新のセキュリティパッチが適用される | ダウンタイムが発生する（数分〜数十分） |
| **B. 次回メンテナンス時にアップグレード** | 計画的なメンテナンスウィンドウでアップグレード | ユーザー影響を最小化できる | パッチ適用までの間、脆弱性が残る |

#### 推奨: 方針 A

セキュリティパッチは早期に適用すべき。Supabase のアップグレードは通常数分で完了し、自動的にバックアップも取得される。

#### 手順

1. Supabase Dashboard にログイン
2. Settings > Infrastructure に移動
3. 利用可能なアップグレードを確認
4. アップグレードを実行（自動バックアップ付き）
5. アップグレード完了後、アプリケーションの動作確認

#### 注意事項

- アップグレード中は数分間のダウンタイムが発生する
- アップグレード前に手動バックアップを取得しておくことを推奨
- アップグレード後、Prisma クライアントの接続確認を行う
- PostgreSQL のメジャーバージョン変更ではなくパッチ適用のため、互換性の問題は発生しない見込み

---

### Auth OTP long expiry（参考）

Supabase Dashboard > Authentication > Email Templates > OTP Expiry を 3600 秒（1 時間）以下に変更する。

### Leaked Password Protection（参考）

Supabase Dashboard > Authentication > Security > Leaked Password Protection を有効にする（Pro プラン以上が必要）。

---

## 実装手順

1. **Function Search Path Mutable の修正マイグレーションを作成**
2. **ローカル環境でテスト**（`supabase db reset` でマイグレーション適用、関数の動作確認）
3. **本番環境へマイグレーション適用**（`supabase db push`）
4. **PostgreSQL のアップグレード**（Dashboard から実行）
5. **Auth 設定の変更**（Dashboard から OTP 有効期限・漏洩パスワード保護を設定）
6. **Security Advisor で全警告の解消を確認**

## 対応結果

### Function Search Path Mutable（2026-03-22）

#### 採用方針: B（`logging` 関数削除 + 残り3関数に `SET search_path = ''` 追加）

#### 作成したマイグレーションファイル

`supabase/migrations/20260322085405_fix_function_search_path.sql`

#### 変更内容

| 関数名 | 変更内容 |
|--------|---------|
| `logging` | **削除**（デバッグ専用・本番不要） |
| `create_user_for_auth` | `SET search_path = ''` 追加、`raise log` 除去 |
| `generate_random_alias_id` | `SET search_path = ''` 追加 |
| `update_user_for_auth` | `SET search_path = ''` 追加、`raise log` 除去 |

#### ローカル検証結果

##### マイグレーション適用

`supabase db reset` で全マイグレーションを適用。エラーなし。

##### search_path 設定の確認

```
       proname          | prosecdef |      proconfig
------------------------+-----------+---------------------
 create_user_for_auth   | true      | {search_path=""}
 update_user_for_auth   | false     | {search_path=""}
 generate_random_alias_id | false   | {search_path=""}
```

- 3関数すべてに `search_path=""` が設定済み
- `logging` 関数は結果に含まれない（削除済み）
- `create_user_for_auth` の `SECURITY DEFINER` は維持

##### トリガー紐付け確認

```
          tgname              |      proname          |      proconfig
-----------------------------+-----------------------+---------------------
 new_user_for_auth_trigger    | create_user_for_auth  | {search_path=""}
 update_user_for_auth_trigger | update_user_for_auth  | {search_path=""}
```

トリガーは修正後の関数を正しく参照。

##### 関数動作確認

- `generate_random_alias_id()`: ランダムな5文字の文字列を正常に生成
- `create_user_for_auth` トリガー: `auth.users` への INSERT で `public.users` にレコードが正常に作成。`alias_id` がランダム生成され、`name` も正しく設定

##### DB Lint

```
No schema errors found
```

#### 本番適用手順

```bash
# 差分確認（push 前）
npx supabase db push --dry-run

# 本番適用
npx supabase db push
```

適用後、Supabase Dashboard の Security Advisor で `function_search_path_mutable` が解消されていることを確認する。

---

## 参考リンク

- [CVE-2018-1058: Protect Your Search Path](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058%3A_Protect_Your_Search_Path)
- [Supabase Database Linter: function_search_path_mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Supabase Going into Production - Security](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Upgrading](https://supabase.com/docs/guides/platform/upgrading)

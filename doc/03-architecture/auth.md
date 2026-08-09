# 認証

Supabase Auth を使い、`auth.users` と `public.users` を **DB トリガーで自動同期**します。

> **このドキュメントは設計意図の説明です。SQL の正は `supabase/migrations/*.sql` にあります。**
> 関数定義を変更した場合はマイグレーションを追加し、本ドキュメントも更新してください。

## サインイン方法

| 方法 | 用途 |
| --- | --- |
| Google OAuth | 本番の主要導線 |
| メール・パスワード | E2Eテスト、開発用（`/signin/dev`） |

## クライアントの使い分け

| ファイル | 実行環境 | 用途 |
| --- | --- | --- |
| `src/lib/supabase/client.ts` | ブラウザ | Storage への直接アップロード、クライアント側の認証操作 |
| `src/lib/supabase/server.ts` | Server Component / Server Action | `auth.getUser()` によるログインユーザー取得 |
| `src/lib/supabase/middleware.ts` | Middleware | セッション cookie の更新、ルート保護、CSP付与 |

いずれも `NEXT_PUBLIC_SUPABASE_ANON_KEY` を使うため **RLS が適用されます**。
アプリのデータ読み書きは Prisma（RLS バイパス）で行う点に注意してください（[overview.md](./overview.md) 参照）。

### getSession() ではなく getUser() を使う

`getSession()` は **JWT の署名を検証しません**。cookie の値をそのまま信じるため、認可判定に使うと偽装可能です。
認可には必ず `getUser()`（Supabase のサーバーへ問い合わせて検証する）を使ってください。

## ユーザー同期トリガー

```
auth.users への INSERT ──▶ create_user_for_auth() ──▶ public.users に行を作成
auth.users への UPDATE ──▶ update_user_for_auth() ──▶ public.users の name を更新
```

| トリガー | タイミング | 関数 |
| --- | --- | --- |
| `new_user_for_auth_trigger` | `AFTER INSERT ON auth.users` | `public.create_user_for_auth()` |
| `update_user_for_auth_trigger` | `AFTER UPDATE ON auth.users` | `public.update_user_for_auth()` |

3つの関数（`create_user_for_auth` / `update_user_for_auth` / `generate_random_alias_id`）はすべて
`SET search_path = ''` を持ちます。これがないと検索パス経由の関数すり替えが成立しうるため、
Supabase Security Advisor の警告対象になります。また `anon` / `authenticated` からは
`EXECUTE` 権限を剥奪済みです（クライアントが直接呼ぶ必要はないため）。

## alias_id の設計

`alias_id` はプロフィールURL（`/{aliasId}`）に使う識別子です。**なりすまし対策が入っています。**

### 一意性

`lower(alias_id)` に一意インデックスを張っています。大文字小文字違いによるなりすましも防ぎます。

### サインアップ時の採用ルール

`raw_user_meta_data.alias_id` は**自己申告値**であり、`anon` key で誰でも `signUp` を呼べます。
そのため以下の3条件を**すべて**満たした場合のみ採用し、1つでも外れたらランダム生成に落とします。

1. 形式が `^[a-zA-Z]{1,10}$`（英字1〜10文字）
2. 予約語でない（`admin`, `api`, `auth`, `contact`, `news`, `plants`, `posts`, `privacy`, `settings`, `signin`, `signup`, `terms`, `zukan`）
3. 既存ユーザーと重複しない

> **予約語リストは `src/lib` の `RESERVED_ALIAS_IDS` と同期させてください。**
> DB 側とアプリ側の2箇所に存在します。

### ランダム生成

`generate_random_alias_id()` は英小文字5文字を生成し、**衝突したらリトライ**します。
5回衝突するごとに桁数を1増やし（最大10文字）、空間を広げます。

### name の長さ制限

UI は 20 文字制限ですが、`signUp` は anon key で直接呼べるため無検証の値が入り得ます。
トリガー側で `left(..., 50)` によるバックストップを設けています
（巨大な name でフィードや管理画面の表示を破壊されるのを防ぐため）。

### UPDATE トリガーが alias_id を触らない理由

`auth.users` の UPDATE はログイン時の `last_sign_in_at` 更新でも発火します。
かつては UPDATE トリガーが `alias_id` をメタデータ値または乱数で上書きしていたため、
**ログインするたびに alias_id が勝手に変わる**バグと、メタデータ経由の任意 alias 注入がありました。
現在の `update_user_for_auth()` は `name` のみを更新します。

## ルート保護

`src/lib/supabase/middleware.ts` で行います（詳細は [overview.md](./overview.md#ミドルウェア全リクエスト共通)）。

| 対象 | 条件 | 未満のとき |
| --- | --- | --- |
| `/private`, `/settings/{profile,account,cats}`, `/plants/new`, `/posts/new` | ログイン済み | `/signin` へリダイレクト |
| `/admin` 配下 | `users.role = 'admin'` | `/` へリダイレクト |

管理者判定の詳細は [../04-operations/admin.md](../04-operations/admin.md) を参照してください。

## 関連ドキュメント

- [security.md](./security.md) — RLS・ストレージポリシー
- [overview.md](./overview.md) — 認可がどこで行われるか
- [../99-archive/2026-03-22_security-advisor-warnings.md](../99-archive/2026-03-22_security-advisor-warnings.md) — `search_path` 対応の経緯（アーカイブ）

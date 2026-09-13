# セットアップ

ローカル開発環境を最初から構築する手順です。

## 前提

| 必要なもの | バージョン | 備考 |
| --- | --- | --- |
| Node.js | 22.14.0 | CI と揃えるのを推奨 |
| Docker | — | ローカル Supabase の起動に必要 |
| Supabase CLI | 2.109.1 | CI と同じバージョン |

```bash
# Supabase CLI（macOS / Homebrew）
brew install supabase/tap/supabase
```

## 手順

### 1. 依存をインストール

```bash
npm ci
```

`postinstall` で `prisma generate` が走ります。

### 2. Supabase をローカル起動

```bash
supabase start
```

初回は Docker イメージの取得に時間がかかります。起動後、接続情報が表示されます。

```bash
supabase status          # 接続情報を再表示
supabase status -o json  # スクリプトから読む場合
```

| サービス | URL |
| --- | --- |
| API | http://127.0.0.1:54321 |
| DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Inbucket（メール確認） | http://127.0.0.1:54324 |

### 3. `.env.local` を作成

```bash
cp .env.example .env.local
```

`supabase status` が表示した **anon key と service_role key** を `.env.local` に転記します。
必要な変数は下記「環境変数」を参照してください。

### 4. マイグレーションとシードを適用

```bash
supabase db reset
```

`supabase/migrations/*.sql` を全適用し、`supabase/seeds/*.sql`（植物マスタのサンプル）を投入します。
猫種マスタはマイグレーションに含まれるため、マイグレーション適用の時点で入ります。

### 5. 開発用データを投入

```bash
npm run seed:e2e
```

テストユーザー・猫・投稿を作成します。E2E テストの前提データでもあります。

### 6. 開発サーバーを起動

```bash
npm run dev     # http://localhost:3000
```

## 環境変数

`.env.local` に置きます。**`.env.local` はコミットしないでください。**

### 必須

| 変数 | 説明 |
| --- | --- |
| `NEXT_PUBLIC_APP_BASE_URL` | アプリのベースURL（ローカルは `http://localhost:3000`） |
| `DATABASE_URL` | Prisma の接続先（pgbouncer 経由） |
| `DIRECT_URL` | Prisma の直接接続先（マイグレーション・イントロスペクション用） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API のURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（**クライアントに露出する**） |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key（**サーバー専用。絶対に露出させない**） |

ローカルの既定値:

```bash
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # supabase status の ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=       # supabase status の SERVICE_ROLE_KEY
```

> **キーの形式に注意。** Supabase CLI のバージョンによって発行される鍵の形式が
> 従来の JWT 形式（`eyJ...`）と新形式（`sb_publishable_...` / `sb_secret_...`）で異なります。
> `supabase status` が出力した値をそのまま使ってください。形式が混在すると RLS エラーになります。

### 任意

| 変数 | 既定 | 用途 |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | `gemini` / `openai` / `mock` |
| `GEMINI_API_KEY` | — | `AI_PROVIDER=gemini` のとき必要 |
| `OPENAI_API_KEY` | — | `AI_PROVIDER=openai` のとき必要 |
| `AI_PLANT_ID_MODEL` | プロバイダー既定 | モデルの上書き |
| `AI_IDENTIFY_RATE_LIMIT_PER_MINUTE` | 10 | AI判定のレート制限（分） |
| `AI_IDENTIFY_RATE_LIMIT_PER_DAY` | 50 | AI判定のレート制限（日） |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | — | GA計測ID |
| `GOOGLE_SITE_VERIFICATION` | — | Search Console の所有権確認トークン（本番のみ） |
| `ERROR_WEBHOOK_URL` | — | サーバーエラーの通知先（Slack / Discord の Webhook） |
| `NOTION_API_KEY` | — | お知らせ機能（`/news`） |
| `NOTION_DATABASE_ID` | — | お知らせ機能（`/news`） |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | — | ローカルで Google OAuth を試す場合 |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | — | 同上 |

APIキーを設定しなければ AI 判定は無効化されるだけで、投稿フローは動きます
（[../03-architecture/ai-plant-identification.md](../03-architecture/ai-plant-identification.md) 参照）。

`GOOGLE_SITE_VERIFICATION` と `ERROR_WEBHOOK_URL` は本番でのみ設定します。
用途と設定手順は [../04-operations/monitoring.md](../04-operations/monitoring.md) にあります。

### E2Eテスト用

| 変数 | 例 |
| --- | --- |
| `E2E_TEST_USER_ADDRESS` | `e2e@example.com` |
| `E2E_TEST_USER_PASSWORD` | `password` |
| `E2E_TEST_ADMIN_ADDRESS` | `admin@example.com` |
| `E2E_TEST_ADMIN_PASSWORD` | `adminpass` |

管理者用の2つは未設定でも動きます（管理者テストがスキップされます）。

## 動作確認

```bash
npm test         # ユニットテスト
npm run test:db  # RLS・ストレージポリシー（要: supabase start）
npm run e2e      # E2E（要: seed:e2e 済み）
```

詳細は [testing.md](./testing.md) を参照してください。

## つまずきやすい点

| 症状 | 原因と対処 |
| --- | --- |
| RLS エラーが出る | anon key の形式が古い。`supabase status` の値に更新する |
| Prisma の型が合わない | `npm run db:pull` で `schema.prisma` を DB に追従させる |
| E2E がデータ不足で落ちる | `npm run seed:e2e` を実行する |
| `supabase db reset` が失敗する | Docker が起動しているか、`supabase start` が完了しているか確認 |

## 関連ドキュメント

- [commands.md](./commands.md) — コマンド早見表
- [testing.md](./testing.md) — テストの実行方法
- [../04-operations/database.md](../04-operations/database.md) — マイグレーションの運用ルール

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
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Google
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=

# Notion
NOTION_API_KEY=
NOTION_DATABASE_ID=

# AI（任意）
# 画像から植物名候補を推定する機能で使用します。
# AI_PROVIDER : "gemini"(デフォルト) | "openai"
AI_PROVIDER=gemini
GEMINI_API_KEY=
# OPENAI_API_KEY=           # AI_PROVIDER=openai の場合に使用
# AI_PLANT_ID_MODEL=        # 省略時はプロバイダーのデフォルトモデル

# E2E
E2E_TEST_USER_ADDRES="e2e@example.com"
E2E_TEST_USER_PASSWORD="password"
E2E_TEST_ADMIN_ADDRESS="admin@example.com"
E2E_TEST_ADMIN_PASSWORD="adminpass"

```

## dotenv

```bash
./node_modules/.bin/dotenv -e .env.local --
```

## prisma

```bash
npx prisma migrate dev
```

```bash
npx prisma migrate deploy
```

```bash
npx prisma db pull
```

```bash
npx prisma generate
```

## supabase

### supabase cli

```bash
# 差分確認やSQLの叩き台生成に使う（そのまま本番適用しない）
supabase db diff -f <fileName>

# storage, auth を含めて差分を出す
supabase db diff --schema storage,auth,public -f <fileName>

```

```bash

supabase db push -p [Database Password] --dry-run

supabase db push

```

```bash
# 指定したマイグレーションを適用させる
supabase migration repair --status applied [タイムスタンプ]

# 指定したマイグレーションを適用させる前の状態に戻す（＝無効化）させる。
supabase migration repair --status reverted [タイムスタンプ]
```

## マイグレーション方針

- `public` スキーマの業務テーブル・カラム・FK・index・enum は Prisma で管理します。
- `auth` / `storage` スキーマ、RLS、Policy、Trigger、Function、Grant は Supabase SQL migration で管理します。
- `auth.users` など Supabase 管理オブジェクトは Prisma の管理対象に含めません。
- `supabase db diff` は差分確認や SQL の叩き台生成用です。生成された SQL は必ずレビューしてください。

### ローカル開発

```bash
# public スキーマの変更
npx prisma migrate dev

# Supabase 固有機能の変更をローカルへ反映
supabase db reset
```

### 本番適用

```bash
# public スキーマの変更を適用
npx prisma migrate deploy

# auth / storage / RLS / trigger / function の変更を適用
supabase db push --dry-run
supabase db push
```

## テストについて

### ユニットテスト（Vitest）

```bash
npm run test
```

### E2Eテスト（Playwright）

```bash
npm run seed:e2e

npm run e2e

npm run e2e -- --project="no-auth"
```

- 初回のみ以下のコマンドでブラウザをインストールしてください。
```bash
npx playwright install
```

- レポート確認
  ```bash
  npx playwright show-report
  ```

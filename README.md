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
OPENAI_API_KEY=
OPENAI_PLANT_ID_MODEL=gpt-4o-mini

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
npx prisma db pull
```

```bash
npx prisma generate
```

## supabase

### supabase cli

```bash

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

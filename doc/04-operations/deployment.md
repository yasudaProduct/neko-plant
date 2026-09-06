# デプロイと CI/CD

## 構成

| 対象 | ホスティング | デプロイ契機 |
| --- | --- | --- |
| アプリ | Vercel | Vercel の Git 連携 |
| データベース | Supabase（本番プロジェクトのみ） | main へのマージで GitHub Actions が `supabase db push` |

アプリと DB の反映経路が**別々**である点に注意してください。
マイグレーションを伴う変更は、アプリのデプロイとDBの適用のどちらが先でも壊れないように設計する必要があります。

## ビルド

Vercel は `npm run vercel-build`（= `prisma generate && next build`）を使います。
`prisma generate` を挟むのは、Prisma Client がビルド時に必要なためです。

## GitHub Actions

### `pull_request.yml`（Check）

**トリガー**: develop への PR / 全ブランチへの push / 手動実行

| ジョブ | 内容 |
| --- | --- |
| `security` | `npm audit --omit=dev --audit-level=high` |
| `lint` | reviewdog + ESLint（PRにインラインコメント） |
| `unit-tests` | `npm run test:coverage` → Codecov アップロード + PRにカバレッジコメント |
| `build` | `npm run build`（`lint` と `unit-tests` の成功後） |

`--omit=dev` にしているのは、devDependencies が本番ビルド成果物に含まれないためです。
**本番に出荷される依存のみを high 以上でゲート**します。

### `playwright.yml`（Playwright Tests）

**トリガー**: main / master / develop への push・PR

1. Supabase CLI（2.109.1）をインストール
2. `supabase start`（studio, edge-runtime, imgproxy, mailpit を除外）
3. API のヘルスチェック待ち
4. **`supabase test db`（pgTAP）** ← ブラウザインストールより先に実行して早期失敗させる
5. `supabase status` から接続情報を取得し `.env.local` を生成（`AI_PROVIDER=mock`）
6. `prisma generate`
7. Playwright ブラウザをインストール
8. `npm run e2e`
9. レポートをアーティファクトとして保存（失敗時も）

スキーマと RLS/ストレージポリシーは `supabase start` 時に全マイグレーションが適用されるため、
**壊れたマイグレーションはここで検知**されます。実データのシードは Playwright の
`globalSetup`（`e2e/global-setup.ts` → `scripts/e2e-seed.ts`）が行います。

### `supabase-deploy.yml`（Deploy Supabase）

**トリガー**: main への push（`supabase/migrations/**` に変更がある場合のみ）／手動実行

```
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase migration list --linked   # 適用状況をログに残す
supabase db push --dry-run         # 当たるSQLをログに残す
supabase db push                   # 適用
```

- `concurrency: supabase-production`（`cancel-in-progress: false`）で同一DBへの同時実行を防止
- `environment: production` — GitHub の Environment に保護ルールを設定すれば**手動承認**を挟めます

必要なシークレット: `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROJECT_ID`

### `db-backup.yml`（Backup Database）

**トリガー**: 毎日 UTC 18:00（JST 03:00）／手動実行

本番DBの論理バックアップ（roles / schema / data）を取得し、
**GPG で暗号化してから**アーティファクトに14日保存します。

**このリポジトリは公開されており、公開リポジトリのアーティファクトは誰でも
ダウンロードできます。** ダンプには `auth.users`（全ユーザーのメールアドレス）が
含まれるため、暗号化は省略できません。シークレットが未設定のときジョブは失敗します
（バックアップが取れていないのに緑になるほうが危険なため）。

必要なシークレット: `supabase-deploy.yml` と同じ3つ + `BACKUP_GPG_PASSPHRASE`

復元手順と既知の制約（Storage は対象外、など）は
[monitoring.md](./monitoring.md#dbバックアップ) を参照してください。

## ブランチ運用

```
feature/xxx ──▶ develop ──▶ main
                  │           │
                  │           ├──▶ Vercel が本番デプロイ
                  │           └──▶ GitHub Actions が supabase db push
                  │
                  └──▶ Check + Playwright が走る
```

PR は `develop` 向けに作成します。`main` へのマージが本番反映のトリガーです。

## リリース前チェックリスト

1. `develop` で Check と Playwright が緑になっている
2. マイグレーションを含む場合、`supabase db push --dry-run` の内容を確認した
3. 破壊的なスキーマ変更の場合、アプリの新旧どちらのバージョンでも動くか検討した
4. 新規テーブルがある場合、RLS と `supabase/tests/01_rls_structure.sql` を更新した
5. 環境変数を追加した場合、**Vercel 側にも設定した**（`.env.example` だけでは本番に効きません）

## 本番の環境変数

Vercel のプロジェクト設定に持ちます。`.env.example` は雛形であって反映経路ではありません。

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_APP_BASE_URL` | canonical / OGP / sitemap の基準URL |
| `DATABASE_URL` / `DIRECT_URL` | Prisma の接続先 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー専用。退会時のストレージ削除等 |
| `AI_PROVIDER` / `GEMINI_API_KEY` | AI植物判定 |
| `NOTION_API_KEY` / `NOTION_DATABASE_ID` | お知らせ |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA4 |
| `GOOGLE_SITE_VERIFICATION` | Search Console の所有権確認 |
| `ERROR_WEBHOOK_URL` | サーバーエラーの通知先 |

## 関連ドキュメント

- [monitoring.md](./monitoring.md) — 死活監視・エラー通知・バックアップの運用
- [database.md](./database.md) — マイグレーションの運用ルール
- [../02-development/testing.md](../02-development/testing.md) — 各テストの詳細

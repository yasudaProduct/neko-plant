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

### Node.js のバージョン

| 環境 | 指定場所 | 現在 |
| --- | --- | --- |
| CI | `pull_request.yml` / `playwright.yml` の `node-version` | 22.23.4 |
| ローカル | [setup.md](../02-development/setup.md) の推奨値 | 22.23.4 |
| Docker | `dockerfile` の `FROM` | `node:22.23.4-alpine` |
| Vercel | プロジェクト設定の Node.js Version（`package.json` に `engines` はない） | メジャーのみ選べる。パッチは Vercel が自動で配布する |

Node.js のセキュリティリリースが出たら、上の3か所（CI・setup.md・dockerfile）をまとめて上げる。
Vercel はメジャーしか選べないので、デプロイのビルドログか `process.version` で実際のパッチ版を確認する。
22.23.4 未満は Brotli デコーダの脆弱性（CVE-2026-111497）の対象。

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

#### `security` ジョブが落ちたとき

1. `npm audit --omit=dev --audit-level=high` をローカルで再現し、依存経路（`npm ls <pkg> --omit=dev`）を確認する
2. パッチ版があれば更新する（`overrides` で押し込む場合は理由をコミットに書く）
3. パッチ版がなく、実行時に使われないビルド専用パッケージ経由なら、**`devDependencies` に置き直す**
   - Tailwind のプラグイン、ESLint/TypeScript 系などが該当する。`dependencies` に置くのは実行時に `import` / `require` されるものだけ
   - 経路の根元（`npm ls` で最上位に出るパッケージ）が `dependencies` に入っていないかを見る
   - 例: `tailwindcss-animate` は `tailwind.config.ts` から読み込むビルド時プラグインなのに `dependencies` にあったため、
     `braces`（GHSA-vfj7-8cjw-p6xm、`<=3.0.3` が対象で最新の 3.0.3 にも修正なし）が本番スコープに入って落ちた。`devDependencies` へ移して解消した
4. 実行時に使われるのにパッチ版がない場合は、ゲートを緩めずに代替パッケージへの置き換えを検討する

devDependencies 側の high 以上は CI のゲート対象外のため、`npm audit`（`--omit=dev` なし）で時々確認する。
2026-10 時点では、`--omit=dev` なしだと high 1 件・critical 2 件が残るが、いずれも本番スコープ外のビルド・開発ツール経由
（ESLint・Tailwind・Vitest など）。Vitest 経由の `tinypool`（critical）は vitest 5 へのメジャー更新でしか解消できない。

#### `security` ジョブでは検出できないもの

CVE が採番されていないアドバイザリは `npm audit` の参照データに載らないことがある。
例えば Next.js の Server Actions の DoS（GHSA-p3m5-59mp-jv5r、2026-10-14 公開、15.5.28 で修正）は、
このアプリが該当するにもかかわらず `npm audit` では検出されなかった。
そのため、Next.js については [Next.js Blog](https://nextjs.org/blog) のセキュリティリリースと
[vercel/next.js の Security Advisories](https://github.com/vercel/next.js/security/advisories) を直接確認し、
15.5 系のバックポート（npm の `backport` タグ）に追従する。

`package.json` の `overrides.sharp` は、Next.js 15.5 系が修正前の `sharp` も許容するため、
画像最適化で使う `sharp` を修正版以上に固定する目的で置いている
（`^0.35.5`: librsvg の脆弱性 CVE-2026-96889 / GHSA-wq5f-xc86-pv6w の修正版）。
Next.js を更新するときは `npm ls sharp` で解決結果も確認する。

### `playwright.yml`（Playwright Tests）

**トリガー**: main / master / develop への push・PR

**ランナー**: `ubuntu-24.04` に固定（`ubuntu-latest` は 2026-10〜11 に Ubuntu 26.04 へ段階移行しており、
移行先で Playwright 1.58 のブラウザインストールが失敗したため）。OS を上げるときは Playwright と
Supabase CLI がその OS に対応しているかを先に確認する。

1. Supabase CLI（2.109.1）をインストール
2. `supabase start`（studio, edge-runtime, imgproxy, mailpit を除外）
3. API のヘルスチェック待ち
4. **`supabase test db`（pgTAP）** ← ブラウザインストールより先に実行して早期失敗させる
5. `supabase status` から接続情報を取得し `.env.local` を生成（`AI_PROVIDER=mock`）
6. `prisma generate`
7. Playwright ブラウザをインストール（`playwright.config.ts` のプロジェクトは Desktop Chrome / Pixel 5 のみのため chromium だけ）
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

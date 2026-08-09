# テスト

3 種類のテストがあります。

| 種別 | ツール | 対象 | コマンド |
| --- | --- | --- | --- |
| ユニット | Vitest | Server Actions、ライブラリ関数 | `npm test` |
| E2E | Playwright | 主要なユーザーフロー | `npm run e2e` |
| DB | pgTAP | RLS・ストレージポリシー | `npm run test:db` |

## ユニットテスト（Vitest）

```bash
npm test              # watch
npm run test:coverage # カバレッジ付きで1回実行
npm run test:ui       # Vitest UI
```

- 対象: `src/__test__/**/*.{test,spec}.{ts,tsx}`
- 環境: `jsdom`、セットアップは `src/__test__/setup.ts`
- Prisma / Supabase は**モック**してロジックを検証します

現在のカバー範囲:

```
src/__test__/actions/  neko / plant / plant-identification / post / user の各 Server Action
src/__test__/lib/      client-image
```

`.env.local` がない CI でも動くよう、`vitest.config.ts` が必須キーにデフォルト値を補完します。

## E2Eテスト（Playwright）

```bash
npx playwright install    # 初回のみ
npm run seed:e2e          # テストデータ投入
npm run e2e
npm run e2e:ui            # UIモード
npx playwright show-report
```

`webServer` 設定により **:3001 で dev サーバーが自動起動**します
（`reuseExistingServer` は非CI時のみ有効）。

### グローバルセットアップ

`e2e/global-setup.ts` が実行前に:

1. `scripts/e2e-seed.ts` を実行してテストデータを投入
   （`NODE_ENV=production` なら例外を投げて中断）
2. `/`, `/signin`, `/signin/dev`, `/terms`, `/privacy` を fetch して dev サーバーをウォームアップ

`/news` は Notion API 依存のためウォームアップ対象外です。

### プロジェクトとタグ

テストは**タグ（`@public` / `@user` / `@admin` / `@mobile`）で振り分け**られます。

| プロジェクト | デバイス | 認証状態 | 対象タグ |
| --- | --- | --- | --- |
| `auth` | — | — | `auth.setup.ts`（セットアップ専用） |
| `desktop-public` | Desktop Chrome | 未認証 | `@public`（`@mobile` 除く） |
| `desktop-user` | Desktop Chrome | 一般ユーザー | `@user`（`@mobile` 除く） |
| `desktop-admin` | Desktop Chrome | 管理者 | `@admin`（`@mobile` 除く） |
| `mobile-public` | Pixel 5 | 未認証 | `@public` かつ `@mobile` |
| `mobile-user` | Pixel 5 | 一般ユーザー | `@user` かつ `@mobile` |

```bash
npm run e2e -- --project=desktop-public
```

`auth` プロジェクトが `playwright/.auth/{user,admin}.json` にセッションを保存し、
他プロジェクトが `storageState` として読み込みます。

> **新しいテストを書いたら必ずタグを付けてください。** タグがないとどのプロジェクトにも拾われず、
> 実行されないまま気づかれません。

### AI判定のモック

`webServer.env` で以下を強制します。

```
AI_PROVIDER=mock
AI_IDENTIFY_RATE_LIMIT_PER_MINUTE=1000
AI_IDENTIFY_RATE_LIMIT_PER_DAY=10000
```

外部APIを叩かず、テスト数やリトライがレート制限に掛からないようにするためです。

### テストデータ

`npm run seed:e2e`（`scripts/e2e-seed.ts`）が行うこと:

1. 既存テストデータのクリーンアップ（ユーザー以外）
2. Supabase Auth 経由でテストユーザー・管理者を作成/更新
3. 猫種・植物データと、猫・投稿のシード

必要な環境変数は `E2E_TEST_USER_ADDRESS` / `E2E_TEST_USER_PASSWORD` /
`E2E_TEST_ADMIN_ADDRESS` / `E2E_TEST_ADMIN_PASSWORD`（[setup.md](./setup.md#e2eテスト用) 参照）。
管理者用が未設定の場合は管理者テストがスキップされます。

## DBテスト（pgTAP）

```bash
supabase start     # 起動していなければ
npm run test:db    # = supabase test db
```

RLS とストレージポリシーを**カタログから検証**し、マイグレーションによる意図しない変更を検知します。

| ファイル | 内容 |
| --- | --- |
| `supabase/tests/01_rls_structure.sql` | テーブル一覧・RLS有効化・ポリシー完全一覧・対象ロール・権限 |
| `supabase/tests/02_rls_public_tables.sql` | public テーブルへの実アクセス挙動 |
| `supabase/tests/03_storage_posts_bucket.sql` | posts バケットの実アクセス挙動 |
| `supabase/tests/04_storage_profile_pet_buckets.sql` | profile / pet バケットの実アクセス挙動 |

> **テーブルやポリシーを変更したら `01_rls_structure.sql` の一覧と `plan()` の件数も更新してください。**
> このテストは「更新し忘れたら失敗する」ように作られています（詳細は
> [../03-architecture/security.md](../03-architecture/security.md#pgtap-による退行検知)）。

## CI

| ワークフロー | トリガー | 内容 |
| --- | --- | --- |
| `pull_request.yml`（Check） | develop への PR、全ブランチへの push | `npm audit` / ESLint（reviewdog） / Vitest + Codecov / ビルド |
| `playwright.yml` | main・master・develop への push / PR | Supabase 起動 → **pgTAP** → Prisma generate → E2E |

Playwright ジョブは **pgTAP をブラウザインストールより先に実行**して早期に失敗させます。
E2E レポートは失敗時もアーティファクトとして保存されます。

詳細は [../04-operations/deployment.md](../04-operations/deployment.md) を参照してください。

## 関連ドキュメント

- [setup.md](./setup.md) — 環境変数
- [../03-architecture/security.md](../03-architecture/security.md) — pgTAP が守っているもの
- [../99-archive/testing-improvement-plan.md](../99-archive/testing-improvement-plan.md) — 改善計画（アーカイブ）

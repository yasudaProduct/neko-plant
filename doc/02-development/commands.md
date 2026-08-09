# コマンド早見表

## 開発

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー（Turbopack、:3000） |
| `npm run debug` | Node inspector 付きで起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド済みアプリを起動 |
| `npm run vercel-build` | `prisma generate` + ビルド（Vercel が使う） |
| `npm run lint` | ESLint |

## テスト

| コマンド | 説明 |
| --- | --- |
| `npm test` | Vitest（watch モード） |
| `npm run test:coverage` | カバレッジ付きで1回実行 |
| `npm run test:ui` | Vitest UI |
| `npm run test:db` | pgTAP で RLS・ストレージポリシーを検証（要: `supabase start`） |
| `npm run e2e` | Playwright E2E（:3001 で dev サーバーを自動起動） |
| `npm run e2e:ui` | Playwright UI モード |
| `npm run seed:e2e` | E2E/開発用データを投入 |
| `npx playwright install` | ブラウザのインストール（初回のみ） |
| `npx playwright show-report` | 直近のE2Eレポートを表示 |

詳細は [testing.md](./testing.md)。

## データベース

| コマンド | 説明 |
| --- | --- |
| `supabase start` | ローカルスタックを起動 |
| `supabase stop` | 停止 |
| `supabase status` | 接続情報とキーを表示 |
| `supabase db reset` | 全マイグレーション適用 + `seeds/*.sql` 投入（DBを作り直す） |
| `supabase migration new <名前>` | 空のマイグレーションを作成 |
| `supabase db diff -f <名前>` | ローカルDBの変更から差分マイグレーションを生成 |
| `supabase db diff --schema storage,auth,public -f <名前>` | storage/auth を含めて差分を出す |
| `npm run db:pull` | DB → `schema.prisma` 同期 + Prisma Client 再生成 |

**`prisma db push` / `prisma migrate` は使いません。**
理由と手順は [../04-operations/database.md](../04-operations/database.md) を参照してください。

### 本番反映

```bash
supabase db push --dry-run   # 当たるSQLを確認
supabase db push             # 適用
```

通常は **main へのマージで GitHub Actions が自動実行**します。手動で流すのは例外時のみです。

### マイグレーション状態の修復

```bash
supabase migration list --linked                       # 適用状況を確認
supabase migration repair --status applied <タイムスタンプ>    # 適用済みとして記録
supabase migration repair --status reverted <タイムスタンプ>   # 未適用に戻す
```

## その他

```bash
# .env.local を読み込んで任意のコマンドを実行
./node_modules/.bin/dotenv -e .env.local -- <コマンド>
```

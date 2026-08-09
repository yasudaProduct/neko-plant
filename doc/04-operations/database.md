# データベース運用

## 大原則

**スキーマの正は `supabase/migrations/*.sql`（Supabaseマイグレーション）です。**

`prisma/schema.prisma` は `prisma db pull` で生成される **Prisma Client 用のイントロスペクション成果物**であり、
**手で編集しません**。RLS・ストレージポリシー・トリガー・関数もすべてマイグレーションSQLに含めます。

### 禁止事項

```bash
prisma db push      # ✗ 使わない
prisma migrate      # ✗ 使わない
```

マイグレーションを迂回してスキーマを変更すると、リポジトリと実DBがドリフトします。
本番へは `supabase db push` でしか反映されないため、`prisma db push` で入れた変更は**本番に届きません**。

## 変更手順

### 1. マイグレーションを作成する

**手書きの場合:**

```bash
supabase migration new <名前>
# 生成された supabase/migrations/<timestamp>_<名前>.sql に SQL を書く
```

**大きな変更の場合:** ローカルDBに変更を反映してから差分を生成します。

```bash
supabase db diff -f <名前>
```

> `--schema public` は `storage` / `auth` スキーマの差分を拾いません。
> ストレージポリシーなどは `--schema storage,auth,public` を指定するか、手動で追記してください。

### 2. ローカルで適用・確認

```bash
supabase db reset    # 全マイグレーション適用 + seeds/*.sql 投入
npm run test:db      # RLS・ポリシーの pgTAP テスト
```

### 3. Prisma を追従させる

```bash
npm run db:pull      # prisma db pull + prisma generate
```

### 4. コミット

マイグレーションSQL と `schema.prisma` を**セットでコミット**します。

## 新規テーブルを作るとき

1. 同じマイグレーション内で `ENABLE ROW LEVEL SECURITY` を設定する
   （意図的に無効のままにする場合は**理由をPRに明記**）
2. 必要な SELECT ポリシーのみ追加する（書き込みは Prisma 経由が原則）
3. `supabase/tests/01_rls_structure.sql` の**テーブル一覧・ポリシー断言・`plan()` 件数**を更新する
4. `npm run test:db` が通ることを確認する

詳細は [../03-architecture/security.md](../03-architecture/security.md) を参照してください。

## 本番反映

**リモートの Supabase プロジェクトは本番のみ**です。

### 自動（通常はこちら）

**main にマージされると GitHub Actions が `supabase db push` を自動実行します。**

- ワークフロー: `.github/workflows/supabase-deploy.yml`
- 条件: `supabase/migrations/**` に変更がある push のみ
- `supabase migration list --linked` で適用状況を、`--dry-run` で当たるSQLをログに残してから適用
- `concurrency: supabase-production` により同一DBへの同時実行を防止
- GitHub の `production` Environment に保護ルールを設定すれば**手動承認**を挟めます

### 手動（例外時）

```bash
supabase db push --dry-run   # 必ず先に確認
supabase db push
```

### 事前検知

CI の Playwright ジョブが `supabase start` で**まっさらなDBに全マイグレーションを適用**します。
壊れたマイグレーションは本番前にCIで落ちます。

## マイグレーション状態の修復

リポジトリとリモートの適用状況がずれた場合:

```bash
supabase migration list --linked                            # 現状を確認
supabase migration repair --status applied <タイムスタンプ>   # 適用済みとして記録
supabase migration repair --status reverted <タイムスタンプ>  # 未適用に戻す
```

## 落とし穴

| 事象 | 対処 |
| --- | --- |
| `config.toml` の `[storage.buckets.*]` がリモートに反映されない | **ローカルCLI専用の設定**。バケットの実体はマイグレーション内で `insert into storage.buckets ...` する（`20260711165057` の教訓） |
| `db diff` がストレージポリシーを拾わない | `--schema storage,auth,public` を指定するか手動追記 |
| 古いマイグレーションが今は存在しないテーブルを参照している | 正常。歴代の積み上げなので、**現在の状態は最新のマイグレーション群と pgTAP テストで確認**する |

## シードデータ

| ファイル | 内容 | 実行タイミング |
| --- | --- | --- |
| `supabase/seeds/neko.sql` | 猫種マスタ | `supabase db reset` で自動 |
| `supabase/seeds/plants.sql` | 植物マスタ | `supabase db reset` で自動 |
| `scripts/e2e-seed.ts` | ユーザー・猫・投稿 | `npm run seed:e2e` |

## 関連ドキュメント

- [../03-architecture/data-model.md](../03-architecture/data-model.md) — テーブル構成
- [../03-architecture/security.md](../03-architecture/security.md) — RLS・ポリシー
- [deployment.md](./deployment.md) — CI/CD 全体

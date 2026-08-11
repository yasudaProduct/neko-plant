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

さらに、**式インデックス（例: `plants_name_normalized_key`）は Prisma のスキーマに現れません**
（`prisma db pull` は doc コメントを付けるだけ）。この状態で `prisma migrate` / `prisma db push` を使うと、
Prisma は認識していないインデックスを**黙って DROP します**。

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

## 一意インデックスを追加するとき

1. **既存データの重複を先に解消する。** 参照されている行を消すと関連データを失うため、
   削除ではなく代表行への**マージ**（子テーブルの外部キーを付け替え）にする。
   何をマージしたかは `RAISE NOTICE` で本番の適用ログに残す
   （実例: `20260809152920_add_plants_name_normalized_unique_index.sql`）
2. `supabase/tests/01_rls_structure.sql` の第7節に `has_index` / `index_is_unique` を追加し、
   `plan()` 件数を更新する（式インデックスは `col_is_unique` では検証できない）
3. 正規化を伴う場合は、**アプリ側の実装と式を1:1で対応**させる
   （`src/lib/plant-name.ts` / `src/lib/plant-name-query.ts` が実例）。
   片方だけ変えると「アプリは重複と判定しないのに DB が一意違反を返す」状態になる
4. `npm run db:pull` しても**式インデックスは `schema.prisma` に現れない**（doc コメントのみ）。
   Prisma Client は制約を知らないので `upsert` / `connectOrCreate` は使えず、
   「事前チェック → `create` → P2002 を握って既存IDを返す」パターンが必要になる
5. **`supabase db reset` は空テーブルにインデックスを張るだけなのでマージ処理を通らない。**
   重複を仕込んでマイグレーションを単体実行し、関連データが保たれることを別途確認する

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
| マスタデータを `seeds/` に置いたのに本番に入っていない | `seeds/*.sql` は**ローカルの `db reset` 専用**でリモートに届かない（`supabase db push` はマイグレーションのみ）。参照整合が必要なマスタはマイグレーションへ移す |
| 式インデックスが `schema.prisma` に出てこない | 正常。Prisma は式インデックスを表現できず doc コメントだけが付く。`prisma migrate` を使うと消えるので使わない |

## マスタデータの置き場

**性質で置き場を分けます。** どちらも「マスタ」でも扱いは正反対です。

| | 運用マスタ（例: `neko`） | UGCマスタ（例: `plants`） |
| --- | --- | --- |
| 性質 | 閉じた一覧。書き込みAPIがなく、増えない | ユーザーが `addPlant` で増やす。増え続ける |
| 置き場 | **マイグレーション** | **`seeds/`（開発・E2E用サンプルのみ）** |
| 理由 | `pets.neko_id` が参照する。誤字が本番に出れば全ユーザーのプロフィールに出る。環境間で内容が一致すべき | 本番のID空間はユーザー起点。マイグレーションで固定行を入れると本番とdevでIDがずれ、本番にサンプルを押し込むことになる |
| 追加・修正 | 新しいマイグレーションで `INSERT ... ON CONFLICT DO NOTHING`（冪等に）。表記の修正は `UPDATE` を `INSERT` より**先**に置く（逆順だと新旧2件が並ぶ） | 管理画面 or Server Action（`plants` は `updatePlant` / `deletePlant` が管理者限定） |

## シードデータ

| ファイル | 内容 | 実行タイミング |
| --- | --- | --- |
| `supabase/seeds/plants.sql` | 植物マスタ（開発・E2E用サンプル。UGCマスタなのでマイグレーションに入れない） | `supabase db reset` で自動 |
| `scripts/e2e-seed.ts` | ユーザー・植物・猫・投稿 | `npm run seed:e2e` |

猫種マスタ（`neko`）は**マイグレーションで投入**されます（`20260809153832_neko_breeds_master_to_migration.sql`、49種）。
`scripts/e2e-seed.ts` は `neko` を削除しないので、シードを何度実行しても猫種のIDはずれません。

## 関連ドキュメント

- [../03-architecture/data-model.md](../03-architecture/data-model.md) — テーブル構成
- [../03-architecture/security.md](../03-architecture/security.md) — RLS・ポリシー
- [deployment.md](./deployment.md) — CI/CD 全体

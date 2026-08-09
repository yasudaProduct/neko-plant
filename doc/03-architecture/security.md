# セキュリティ（RLS・ストレージポリシー）

> **前提**: [overview.md](./overview.md#最重要-dbへの2つの経路) の「DBへの2つの経路」を先に読んでください。
> RLS が守っているのは **Prisma 経由のアプリ動線ではなく、anon key で直接叩かれる PostgREST / Storage API** です。

## 脅威モデル

`NEXT_PUBLIC_SUPABASE_ANON_KEY` はクライアントに露出しています。攻撃者は次のことができます。

- PostgREST API（`/rest/v1/...`）を直接叩いて任意のテーブルを読み書きしようとする
- Storage API（`/storage/v1/...`）を直接叩いてアップロード・一覧取得しようとする
- `signUp` を直接呼んで任意のメタデータを送り込む

**アプリのUIを経由するとは限りません。** したがって「アプリがその操作をしないから安全」は成り立ちません。

## 防御の三層

書き込みに対して 3 つの独立した壁があります。1 枚破られても即座に漏れない構成です。

| 層 | 内容 | 効果 |
| --- | --- | --- |
| 1. GRANT | `anon` / `authenticated` から `INSERT/UPDATE/DELETE/TRUNCATE` を剥奪 | テーブルレベルで書き込み不能 |
| 2. RLS | 全テーブルで有効化 | ポリシーがなければ全拒否 |
| 3. ポリシー | **SELECT のポリシーしか存在しない** | 書き込みポリシーがない = 書き込み拒否 |

GRANT レベルでも剥奪している理由は、**将来誰かが緩い書き込みポリシーを1本足しただけで
直接書き込みが開放される**のを防ぐためです（`20260712030221` の設計意図）。

## public スキーマのポリシー一覧

全 11 テーブルで RLS 有効。**存在するポリシーはすべて SELECT のみ**です。

| テーブル | ポリシー | 対象ロール | 条件 |
| --- | --- | --- | --- |
| `plants` | `plants_select_all` | anon, authenticated | 全件 |
| `neko` | `neko_select_all` | anon, authenticated | 全件 |
| `posts` | `Posts are viewable by everyone` | anon, authenticated | 全件 |
| `post_images` | `Post images are viewable by everyone` | anon, authenticated | 全件 |
| `post_likes` | `Post likes are viewable by everyone` | anon, authenticated | 全件 |
| `post_pets` | `Post pets are viewable by everyone` | anon, authenticated | 全件 |
| `post_plants` | `Post plants are viewable by everyone` | anon, authenticated | 全件 |
| `post_image_plants` | `Post image plants are viewable by everyone` | anon, authenticated | 全件 |
| `users` | `users_select_own` | authenticated | `auth_id = auth.uid()` |
| `pets` | `pets_select_own` | authenticated | 自分のユーザーIDのもの |
| `plant_identification_logs` | **なし** | — | 全拒否 |

テーブル権限は `SELECT` / `REFERENCES` / `TRIGGER` のみ残っているのが正
（`plant_identification_logs` は anon / authenticated ともに**権限ゼロ**）。

## ストレージポリシー

3 バケット（`posts` / `user_profiles` / `user_pets`）× 4 操作 = **12 本ちょうど**。

すべて **パスの1階層目が `auth.uid()` と一致すること**を条件にしています。

```sql
bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text
```

| 操作 | posts | user_profiles / user_pets |
| --- | --- | --- |
| INSERT（アップロード） | `TO authenticated` | TO 句なし（public ロール） |
| UPDATE | `TO authenticated` | TO 句なし |
| DELETE | `TO authenticated` | TO 句なし |
| SELECT（list） | `TO authenticated` + 自フォルダ限定 | `TO authenticated` + 自フォルダ限定 |

> `user_profiles` / `user_pets` の書き込み系に `TO` 句がないのは歴史的経緯です（`20250420061815` / `20250420062907`）。
> `auth.uid()` の条件があるため未認証では通りませんが、`posts` と書き方が揃っていません。

### SELECT を自フォルダ限定にしている理由

**パスの1階層目が `auth_id` そのもの**です。バケット全体の SELECT を許すと、
サインアップ1回で Storage list API から**全ユーザーの `auth_id` を機械的に収集**できてしまいます。

画像の表示には影響しません。公開バケットのオブジェクト配信（`/storage/v1/object/public/...`）は
**RLS を通らない**ためです。

### バケット設定

| バケット | 公開 | サイズ上限 | 許可MIME |
| --- | --- | --- | --- |
| `posts` | public | 10MB | `image/jpeg`, `image/png` |
| `user_profiles` | public | 10MB | `image/jpeg`, `image/png` |
| `user_pets` | public | 10MB | `image/jpeg`, `image/png` |

10MB はあくまで**バックストップ**です。実際のサイズ制御はクライアント側
（`src/lib/client-image.ts` の縮小・JPEG化）が担い、実質1〜2MBに収まります。

> `supabase/config.toml` の `[storage.buckets.*]` は **ローカルCLI専用**で、
> `supabase db push` ではリモートに反映されません。バケットの実体はマイグレーション内の
> `insert into storage.buckets ...` で作成する必要があります（`20260711165057` の教訓）。

## pgTAP による退行検知

上記の構成は `supabase/tests/*.sql` で**カタログから検証**されています。

```bash
npm run test:db      # = supabase test db（要: supabase start）
```

| ファイル | 検証内容 |
| --- | --- |
| `01_rls_structure.sql` | テーブル一覧・RLS有効化・ポリシー完全一覧・対象コマンド・対象ロール・テーブル権限 |
| `02_rls_public_tables.sql` | public テーブルへの実アクセス挙動 |
| `03_storage_posts_bucket.sql` | posts バケットの実アクセス挙動 |
| `04_storage_profile_pet_buckets.sql` | profile / pet バケットの実アクセス挙動 |

`01_rls_structure.sql` は **`tables_are` でテーブル一覧を固定**しているため、
新しいテーブルを作ると必ず失敗します。これは意図的な仕掛けで、
「テーブルを足したのにポリシーの断言を書き忘れる」事故を防ぎます。

> **テーブルを追加・削除・リネームしたら、またはポリシーを追加・変更したら、
> `01_rls_structure.sql` の一覧もセットで更新してください。** `plan(81)` の件数も合わせる必要があります。

CI では Playwright ジョブがブラウザインストールより先に `supabase test db` を実行し、早期に失敗させます。

## その他の防御

| 対象 | 内容 | 実装 |
| --- | --- | --- |
| CSP | 本番は nonce ベース。`object-src 'none'`, `base-uri 'self'`, `frame-ancestors` 制限 | `src/lib/supabase/middleware.ts` |
| パス偽装 | Server Action が受け取った画像パスを再検証（`{auth_id}/` 配下・`..` 禁止・文字種制限・255文字以内） | `src/lib/storage-path.ts` |
| 認証情報の漏洩 | Prisma の `omit` で `auth_users` のパスワードハッシュ・各種トークンを全クエリから既定除外 | `src/lib/prisma.ts` |
| 権限昇格 | `getUserData()`（`role` を返す）を `"use server"` にしない | `src/lib/user-data.ts` |
| 依存脆弱性 | `npm audit --omit=dev --audit-level=high` を CI でゲート | `.github/workflows/pull_request.yml` |

## 新しいテーブルを追加するときのチェックリスト

1. 同じマイグレーション内で `ENABLE ROW LEVEL SECURITY` を設定する
   （意図的に無効のままにする場合は理由をPRに明記）
2. 必要な SELECT ポリシーだけを追加する（書き込みは Prisma 経由が原則）
3. `supabase/tests/01_rls_structure.sql` のテーブル一覧・ポリシー断言・`plan()` 件数を更新する
4. `npm run test:db` が通ることを確認する

## 関連ドキュメント

- [overview.md](./overview.md) — DBへの2つの経路
- [storage.md](./storage.md) — アップロードフローの詳細
- [auth.md](./auth.md) — alias_id のなりすまし対策
- [../99-archive/](../99-archive/) — 過去の Security Advisor 監査レポート（対応済み）

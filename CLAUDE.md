# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

**詳細なドキュメントは `doc/` にあります。目次は [doc/README.md](./doc/README.md)。**
このファイルには要約と、必ず守るべきルールだけを置きます。

## プロジェクト概要

neko-plantは、「猫と植物の暮らし」を共有する日本のフォトSNSプラットフォームとして機能するNext.js 15フルスタックアプリケーションです。ユーザーは猫と植物が一緒に写った写真を投稿し(植物はAI判定または手動でタグ付け)、投稿の分布から植物ごとの「共存実績」(ユニーク猫数)が可視化されます。危険を断定せず、投稿がない植物は「情報がない」と表現するポジティブリスト方式を採用しています。

→ [doc/01-product/service-description.md](./doc/01-product/service-description.md)

## 最重要: DBへの2つの経路

| 経路 | RLS | 用途 |
| --- | --- | --- |
| **Prisma**（`DATABASE_URL`） | **バイパスする** | アプリのデータ読み書きのほぼ全て |
| **Supabase クライアント**（anon key） | **適用される** | 認証、Storageへの直接アップロード |

**Prisma は RLS をバイパスするため、認可判定は Server Action / RSC のコード側で明示的に行う必要があります。**
一方 anon key はクライアントに露出しており、攻撃者は PostgREST / Storage API を直接叩けます。
RLS とストレージポリシーは「アプリが使わないから緩くてよい」ものではありません。

→ [doc/03-architecture/overview.md](./doc/03-architecture/overview.md) / [doc/03-architecture/security.md](./doc/03-architecture/security.md)

## 開発コマンド

```bash
# 開発
npm run dev              # Turbopackによる開発サーバー
npm run build            # プロダクションビルド
npm run lint             # ESLint

# テスト
npm test                 # Vitestユニットテスト
npm run test:coverage    # カバレッジレポート
npm run e2e              # Playwright E2Eテスト
npm run test:db          # pgTAPによるRLS/ストレージポリシーのDBテスト（要: supabase start）
npm run seed:e2e         # 開発/E2E用データ（ユーザー・猫・投稿）を投入

# データベース
supabase db reset        # 全マイグレーション適用 + seeds/*.sql 投入（ローカルDBを作り直す）
npm run db:pull          # DB → schema.prisma を同期し Prisma Client を再生成
```

→ [doc/02-development/commands.md](./doc/02-development/commands.md)

## アーキテクチャ

### 技術スタック
- **フレームワーク**: Next.js 15 with App Router and Turbopack
- **データベース**: PostgreSQL with Prisma ORM
- **認証**: Supabase Auth with Google OAuth
- **UI**: Tailwind CSS + shadcn/ui components
- **テスト**: Vitest (unit) + Playwright (E2E) + pgTAP (RLS)

### 主要データベースモデル
- `plants` - 植物カタログ（分類学：科、属、種）
- `posts` - 猫と植物の写真投稿（コメント付き）
- `post_images` - 投稿写真（postsバケットに保存、パスは `{auth_id}/{post_id}/...`）
- `post_plants` / `post_pets` - 投稿への植物・猫のタグ付け（多対多）
- `post_image_plants` - 写真ごとの植物タグ付け
- `post_likes` - いいね（post_id × user_id 一意）
- `users` - トリガーによりSupabase authと同期されるユーザープロフィール（auth_idに一意制約）
- `pets` - ユーザーの飼い猫プロフィール、`neko` - 猫種マスタ
- `plant_identification_logs` - AI判定のレート制限用ログ

→ [doc/03-architecture/data-model.md](./doc/03-architecture/data-model.md)

### 共存実績の集計
植物ごとの「共存実績」は `post_plants` と `post_pets` を結合した **ユニークな pet_id の数** で算出する（同一ユーザーの重複投稿で水増しされない）。閾値は `src/lib/coexistence.ts` (50+/10+/1+/0 の4ランク)。

### ディレクトリ構造
- `app/` - Next.js App Routerページとレイアウト（ページ固有のコンポーネントもここ）
- `actions/` - データ変更のためのServer Actions
- `components/` - 再利用可能UIコンポーネント（shadcn/ui使用）
- `lib/supabase/` - Supabaseクライアント設定（client / server / middleware）
- `hooks/` - カスタムReactフック
- `contexts/` - React Contextプロバイダー

## 必ず守るルール

### データベース変更

**スキーマの正は `supabase/migrations/*.sql`。** `prisma/schema.prisma` は `prisma db pull` で生成する成果物であり、手で編集しない。RLS・ストレージポリシー・トリガー・関数もすべてマイグレーションSQLに含める。

```
1. supabase migration new <名前>  →  SQLを記述
2. supabase db reset             →  適用・確認
3. npm run db:pull               →  schema.prisma を追従
4. マイグレーションSQL と schema.prisma をセットでコミット
```

**禁止: `prisma db push` / `prisma migrate`**（マイグレーションを迂回してドリフトの原因になる）

新規テーブルには同じマイグレーション内で原則 `ENABLE ROW LEVEL SECURITY` を設定する（意図的に無効のままにする場合は理由をPRに明記）。

→ [doc/04-operations/database.md](./doc/04-operations/database.md)

### pgTAPテストの同期

テーブルを追加・削除・リネームする、またはポリシーを追加・変更するマイグレーションを書いたら、**`supabase/tests/01_rls_structure.sql` のテーブル一覧・ポリシー一覧・`plan()` の件数もセットで更新する**。このテストは更新し忘れたら失敗するように作られている。

### Server Actions の認可

- `getSession()` は JWT 署名を検証しないため認可に使わない。**必ず `getUser()`**
- `role` など権限に関わる情報を返す関数を `"use server"` に置かない（クライアントから直接呼べる無認証エンドポイントになる）
- クライアント由来の画像パスは `isValidOwnedImagePath()` で再検証する

→ [doc/02-development/coding-guidelines.md](./doc/02-development/coding-guidelines.md)

### 本番環境

**本番 Supabase への変更操作は事前確認なしに行わない。** main へのマージで GitHub Actions が `supabase db push` を自動実行する。

→ [doc/04-operations/deployment.md](./doc/04-operations/deployment.md)

## 開発ノート

### 認証フロー
`auth.users` と `public.users` をDBトリガーで自動同期。Google OAuth 設定済み。`alias_id` にはなりすまし対策（一意制約・形式検証・予約語チェック）が入っている。
→ [doc/03-architecture/auth.md](./doc/03-architecture/auth.md)

### 画像アップロード
Vercelのボディ上限を避けるため、**ブラウザから Supabase Storage へ直接アップロード**し、Server Action にはパス文字列だけを渡す。パスは `{auth_id}/...` で、ストレージポリシーとアプリ側の両方で検証する。
→ [doc/03-architecture/storage.md](./doc/03-architecture/storage.md)

### AI植物判定
`AI_PROVIDER` で gemini / openai / mock を切り替え。APIキー未設定時は機能が無効化されるだけで投稿フローは動く。E2Eは mock を使う。
→ [doc/03-architecture/ai-plant-identification.md](./doc/03-architecture/ai-plant-identification.md)

### テスト戦略
- Server Actions は Vitest でユニットテスト（Prisma/Supabase はモック）
- 重要なユーザーフローは Playwright E2E。**タグ（`@public` / `@user` / `@admin` / `@mobile`）で振り分ける**ため、新規テストには必ずタグを付ける
- RLS・ストレージポリシーは pgTAP で退行を検知
→ [doc/02-development/testing.md](./doc/02-development/testing.md)

### ローカライゼーション
アプリケーションは主に日本語で、日本語フォント（M_PLUS_Rounded_1c）を使用。ユーザー向けのエラーメッセージも日本語。

### ドキュメントの更新
コードを変更したら対応するドキュメントも更新する。どのドキュメントを更新すべきかは [doc/README.md](./doc/README.md#更新が必要になるタイミング) の対応表を参照。

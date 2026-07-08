# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

neko-plantは、「猫と植物の暮らし」を共有する日本のフォトSNSプラットフォームとして機能するNext.js 15フルスタックアプリケーションです。ユーザーは猫と植物が一緒に写った写真を投稿し(植物はAI判定または手動でタグ付け)、投稿の分布から植物ごとの「共存実績」(ユニーク猫数)が可視化されます。危険を断定せず、投稿がない植物は「情報がない」と表現するポジティブリスト方式を採用しています(詳細は `doc/service-description-photo-sns.md`)。

## 開発コマンド

```bash
# 開発
npm run dev               # TurbopackによるNext.js開発サーバー
npm run build            # プロダクションビルド
npm run vercel-build     # Prisma generate付きプロダクションビルド

# テスト
npm test                 # Vitestユニットテスト
npm run test:coverage    # テストカバレッジレポート
npm run e2e              # Playwright E2Eテスト
npm run seed:e2e         # E2Eテストデータのシード

# データベース
npx prisma generate      # Prismaクライアント生成
npm run db:push          # schema.prismaをローカルDBに適用 (prisma db push)
npm run db:policies      # RLS/ストレージポリシー適用 (prisma/policies.sql)
npm run db:setup         # push + policies + seed をまとめて実行
# ローカルSupabaseを `supabase db reset` した後は必ず `npm run db:setup` を実行すること

# リント
npm run lint             # ESLint
```

## アーキテクチャ

### 技術スタック
- **フレームワーク**: Next.js 15 with App Router and Turbopack
- **データベース**: PostgreSQL with Prisma ORM
- **認証**: Supabase Auth with Google OAuth
- **UI**: Tailwind CSS + shadcn/ui components
- **テスト**: Vitest (unit) + Playwright (E2E)

### 主要データベースモデル
- `plants` - 植物カタログ（分類学：科、属、種）
- `posts` - 猫と植物の写真投稿（コメント付き）
- `post_images` - 投稿写真（postsバケットに保存、パスは `{auth_id}/{post_id}/...`）
- `post_plants` / `post_pets` - 投稿への植物・猫のタグ付け（多対多）
- `post_likes` - いいね（post_id × user_id 一意）
- `users` - トリガーによりSupabase authと同期されるユーザープロフィール（auth_idに一意制約）
- `pets` - ユーザーの飼い猫プロフィール、`neko` - 猫種マスタ

### 共存実績の集計
植物ごとの「共存実績」は `post_plants` と `post_pets` を結合した **ユニークな pet_id の数** で算出する（同一ユーザーの重複投稿で水増しされない）。閾値は `src/lib/coexistence.ts` (50+/10+/1+/0 の4ランク)。

### ディレクトリ構造
- `app/` - Next.js App Routerページとレイアウト
- `actions/` - データ変更のためのServer Actions
- `components/` - 再利用可能UIコンポーネント（shadcn/ui使用）
- `lib/supabase/` - Supabaseクライアント設定
- `hooks/` - カスタムReactフック
- `contexts/` - React Contextプロバイダー

## 開発ノート

### 認証フロー
`auth.users`と`public.users`テーブル間でユーザーデータを自動同期するカスタムデータベーストリガーを持つSupabase Authを使用。Googleオ OAuth設定済み。

### 画像アップロード
植物とユーザープロフィール画像は特定のバケットパスでSupabase Storageに保存。植物画像は公開前にモデレーションが必要。

### テスト戦略
- Server ActionsはVitestを使用したユニットテスト
- 重要なユーザーフローはPlaywright E2Eテストでカバー
- E2Eテストには認証フローが含まれ、シードされたテストデータが必要

### ローカライゼーション
アプリケーションは主に日本語で、日本語フォント（M_PLUS_Rounded_1c）を使用。コンテンツとメタデータは日本語中心。

### データベーストリガー
データベースは自動ユーザープロフィール作成とデータ整合性のためのトリガーを使用。トリガーのドキュメントは`/doc/supabase.md`を参照。

### データベース変更のルール
データベースに変更を加える際は、以下のルールに従ってください：
- Prismaスキーマファイル（`prisma/schema.prisma`）を変更し、Prismaの機能を使用してマイグレーションを行う
- Supabaseのマイグレーション機能は使用しない
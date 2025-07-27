# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

neko-plantは、日本の猫に安全な植物データベースプラットフォームとして機能するNext.js 15フルスタックアプリケーションです。ユーザーは植物を検索し、コミュニティからの安全性評価を読み、植物の画像をアップロードし、猫のプロフィールを管理できます。

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
npx prisma db pull       # スキーマ変更の取得
supabase db push         # リモート(本番)Supabaseへのマイグレーション適用

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
- `evaluations` - ユーザーの安全性レビュー（良い/悪い評価）
- `plant_images` - モデレーション状態付きユーザーアップロード写真
- `users` - トリガーによりSupabase authと同期されるユーザープロフィール
- `neko` - ユーザーの猫プロフィール

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
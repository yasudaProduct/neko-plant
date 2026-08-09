# neko-plant

「猫と植物の暮らし」を共有するフォトSNS。

猫と植物が一緒に写った写真を投稿し、植物は AI 判定または手動でタグ付けします。
投稿の分布から、植物ごとの**共存実績**（何匹の猫と暮らしているか）が可視化されます。

危険を断定せず、投稿がない植物は「情報がない」と表現する**ポジティブリスト方式**を採用しています。

## 技術スタック

Next.js 15 (App Router) / TypeScript / PostgreSQL + Prisma / Supabase (Auth・Storage) /
Tailwind CSS + shadcn/ui / Vitest・Playwright・pgTAP / Vercel

## クイックスタート

前提: Node.js 22.14.0 / Docker / Supabase CLI 2.109.1

```bash
npm ci
supabase start                 # ローカルSupabaseを起動
cp .env.example .env.local     # supabase status のキーを転記する
supabase db reset              # マイグレーション + マスタデータ
npm run seed:e2e               # 開発用データ（ユーザー・猫・投稿）
npm run dev                    # http://localhost:3000
```

詳しい手順と環境変数は **[doc/02-development/setup.md](./doc/02-development/setup.md)** を参照してください。

## 主なコマンド

```bash
npm run dev          # 開発サーバー
npm run build        # ビルド
npm run lint         # ESLint

npm test             # ユニットテスト (Vitest)
npm run e2e          # E2Eテスト (Playwright)
npm run test:db      # RLS・ストレージポリシー (pgTAP)

supabase db reset    # DBを作り直す
npm run db:pull      # schema.prisma をDBに追従させる
```

全コマンドは [doc/02-development/commands.md](./doc/02-development/commands.md) にあります。

## ドキュメント

**[doc/README.md](./doc/README.md) が全ドキュメントの目次です。**

| | |
| --- | --- |
| [サービス仕様](./doc/01-product/service-description.md) | コンセプト、ユーザー動線、安全性表現の方針 |
| [アーキテクチャ概要](./doc/03-architecture/overview.md) | 全体構成とデータの流れ |
| [セットアップ](./doc/02-development/setup.md) | 環境構築と環境変数 |
| [DB運用ルール](./doc/04-operations/database.md) | マイグレーションの手順（**Prisma Migrate は使いません**） |
| [セキュリティ](./doc/03-architecture/security.md) | RLS・ストレージポリシー |

> **最初に読むべき箇所**: [アーキテクチャ概要](./doc/03-architecture/overview.md) の「DBへの2つの経路」。
> Prisma は RLS をバイパスし、Supabase クライアントは RLS が適用されます。
> この非対称性が設計全体に効いています。

## 開発の流れ

PR は `develop` 向けに作成します。`main` へのマージで Vercel が本番デプロイし、
GitHub Actions が `supabase db push` で DB マイグレーションを適用します。

詳細は [doc/04-operations/deployment.md](./doc/04-operations/deployment.md) を参照してください。

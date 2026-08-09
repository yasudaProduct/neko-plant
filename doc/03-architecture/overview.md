# アーキテクチャ概要

neko-plant は Next.js 15（App Router）と Supabase で構成されたフルスタックアプリケーションです。
本ドキュメントは全体像とデータの流れを扱います。個別の詳細は各ドキュメントを参照してください。

## 技術スタック

| レイヤ | 採用技術 |
| --- | --- |
| フレームワーク | Next.js 15（App Router / Turbopack） |
| 言語 | TypeScript |
| DB | PostgreSQL（Supabase ホスティング） |
| ORM | Prisma（読み書き）※スキーマの正はマイグレーションSQL |
| 認証 | Supabase Auth（Google OAuth / メール・パスワード） |
| ストレージ | Supabase Storage |
| UI | Tailwind CSS + shadcn/ui |
| AI | Gemini / OpenAI（OpenAI互換 Chat Completions API） |
| テスト | Vitest（ユニット） / Playwright（E2E） / pgTAP（RLS・ポリシー） |
| ホスティング | Vercel |

## 最重要: DBへの2つの経路

**このプロジェクトを理解する上で最も重要な点は、データベースに 2 つの独立した経路があり、
RLS（行レベルセキュリティ）が効くかどうかが経路によって異なることです。**

```
                    ┌─────────────────────────────┐
   ブラウザ ───────▶│  Next.js (Vercel)           │
                    │                             │
                    │  Server Actions / RSC       │
                    │       │                     │
                    │       │ Prisma              │
                    └───────┼─────────────────────┘
                            │  DATABASE_URL（postgres ロール）
                            ▼
                    ┌─────────────────────────────┐
                    │  PostgreSQL                 │  ◀── RLS を「バイパス」する
                    └─────────────────────────────┘
                            ▲
                            │  anon key（anon / authenticated ロール）
   ブラウザ ────────────────┘
   （PostgREST / Storage API を直接叩ける）      ◀── RLS が「適用」される
```

| 経路 | 接続 | RLS | 用途 |
| --- | --- | --- | --- |
| **Prisma**（サーバーサイド） | `DATABASE_URL` の特権接続 | **バイパスする** | アプリのデータ読み書きのほぼ全て |
| **Supabase クライアント** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **適用される** | 認証（セッション管理）、Storage への画像アップロード |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` はクライアントに露出しているため、
**攻撃者は PostgREST / Storage API を直接叩けます**。アプリのUIを経由するとは限りません。
したがって RLS とストレージポリシーは「アプリが使わないから緩くてよい」ものではなく、
**独立した防壁として設計する必要があります**。詳細は [security.md](./security.md) を参照してください。

### 認可はどこで行われるか

Prisma は RLS をバイパスするため、**認可判定は Server Action / RSC のコード側で明示的に行う必要があります**。
典型的なパターン:

1. `createClient()`（`src/lib/supabase/server.ts`）で Supabase クライアントを取得
2. `supabase.auth.getUser()` でログインユーザーを取得（`getSession()` は JWT 署名を検証しないため使わない）
3. 取得した `auth_id` を使って Prisma でデータを読み書きし、所有者チェックを行う

`src/lib/user-data.ts` の `getUserData()` は `role` を含むため、**あえて `"use server"` を付けていません**。
`"use server"` ファイルに置くと、クライアントから任意の `authId` で呼び出せる無認証エンドポイントになるためです。

## リクエストの流れ

### ミドルウェア（全リクエスト共通）

`src/middleware.ts` → `src/lib/supabase/middleware.ts` の `updateSession()` が、静的ファイルを除く全リクエストで動作します。

1. **CSP ヘッダーの付与** — 本番のみ nonce を生成。nonce はレスポンスだけでなく**リクエストヘッダーにも載せる**（Next.js のインラインスクリプトへの nonce 自動付与がリクエストヘッダーを参照するため）
2. **セッションの更新** — Supabase の cookie をリフレッシュ
3. **保護ルートのリダイレクト** — 未ログインなら `/signin` へ

   保護対象: `/private`, `/settings/profile`, `/settings/account`, `/settings/cats`, `/plants/new`, `/posts/new`
4. **管理者ルートの保護** — `/admin` 配下は `users.role = 'admin'` でなければ `/` へリダイレクト

### 画像アップロード

画像は **Server Action を経由せず、ブラウザから Supabase Storage へ直接アップロード**します。

1. クライアント側で縮小・JPEG化（`src/lib/client-image.ts`、長辺 2048px / 品質 0.85）
2. ブラウザから Storage へ直接 PUT（RLS ポリシーが `{auth_id}/...` のパスを強制）
3. Server Action にはアップロード済みの**パス文字列だけ**を渡す
4. Server Action 側で `isValidOwnedImagePath()`（`src/lib/storage-path.ts`）により、
   そのパスが本当に自分のフォルダ配下かを再検証する

Vercel のリクエストボディ上限（4.5MB）を回避しつつ、パス偽装も防ぐ設計です。
詳細は [storage.md](./storage.md) を参照してください。

## ディレクトリ構造

```
src/
├── app/          Next.js App Router（ページ・レイアウト）
│   ├── (auth-pages)/  サインイン系（ルートグループ）
│   ├── [aliasId]/     ユーザープロフィール
│   ├── admin/         管理者画面
│   ├── plants/        植物カタログ・詳細・登録
│   ├── posts/         投稿詳細・投稿フロー
│   ├── zukan/         図鑑（検索・一覧）
│   └── settings/      アカウント・プロフィール・猫の設定
├── actions/      Server Actions（データ変更・取得）
├── components/   共通UIコンポーネント（shadcn/ui ベース）
├── contexts/     React Context（AuthDialogContext など）
├── hooks/        カスタムフック
├── lib/          ユーティリティ・外部サービス連携
│   └── supabase/ Supabase クライアント（client / server / middleware）
├── types/        型定義
└── __test__/     Vitest ユニットテスト
```

ページ固有のコンポーネントはそのページのディレクトリに置き、共通化されたものだけ `components/` に上げます
（[../02-development/coding-guidelines.md](../02-development/coding-guidelines.md) を参照）。

## 関連ドキュメント

- [data-model.md](./data-model.md) — テーブル構成と共存実績の集計
- [auth.md](./auth.md) — 認証フローと DB トリガー
- [storage.md](./storage.md) — バケット構成とアップロード
- [security.md](./security.md) — RLS・ストレージポリシー
- [ai-plant-identification.md](./ai-plant-identification.md) — AI植物判定

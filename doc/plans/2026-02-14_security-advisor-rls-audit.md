# Security Advisor 監査レポート（2026-02-14）

## 概要

Supabase Security Advisor により、`public` スキーマの全9テーブルで **Row Level Security（RLS）が無効** であることが検出されました。すべてERRORレベル・SECURITYカテゴリの指摘です。

## RLS とは


## なぜ問題なのか

本プロジェクトのデータアクセスは主に2つの経路があります。

| 経路 | RLS の影響 | 使用状況 |
|------|-----------|---------|
| **Prisma（サーバーサイド）** | `DATABASE_URL` で直接接続するため RLS をバイパス | 全テーブルで使用 |
| **Supabase クライアント（PostgREST）** | `anon key` で接続するため **RLS の対象** | `users` テーブルのみ使用 |

現在、アプリケーションのほとんどのデータ操作は Prisma 経由（Server Actions）で行われていますが、**RLS が無効な状態では Supabase の PostgREST API エンドポイントが無防備に公開** されています。`anon key` は `NEXT_PUBLIC_` プレフィックス付きでクライアントに露出しているため、悪意あるユーザーが直接 API を叩くことで全データにアクセス可能です。

## 検出された問題一覧

| # | テーブル | レベル | データ内容 | リスク |
|---|---------|--------|-----------|--------|
| 1 | `public.plant_images` | ERROR | 植物画像情報（URL、承認状態） | 未承認画像URLの漏洩、任意データ挿入 |
| 2 | `public.plants` | ERROR | 植物カタログ（名前、学名、分類） | データ改ざん、削除 |
| 3 | `public.neko` | ERROR | 猫種マスタ（名前、画像） | マスタデータ改ざん |
| 4 | `public.users` | ERROR | ユーザープロフィール（auth_id、名前、画像、ロール） | **個人情報漏洩、ロール昇格による管理者なりすまし** |
| 5 | `public.evaluations` | ERROR | ユーザー安全性評価（コメント） | 評価の改ざん、なりすまし投稿 |
| 6 | `public.pets` | ERROR | ユーザーのペット情報（名前、年齢、誕生日） | **個人情報漏洩** |
| 7 | `public.plant_favorites` | ERROR | お気に入り植物 | ユーザー行動履歴の漏洩 |
| 8 | `public.plant_have` | ERROR | 所持植物 | ユーザー行動履歴の漏洩 |
| 9 | `public.evaluation_reactions` | ERROR | 評価へのリアクション | リアクション偽装 |

### 特に危険度が高いテーブル

- **`users`**: `auth_id`（認証ID）や `role` カラムが露出。PostgREST 経由で `role` を `admin` に UPDATE される可能性がある
- **`pets`**: ペットの名前・誕生日など個人に紐づく情報が含まれる
- **`plant_images`**: `is_approved` フラグを直接変更されるとモデレーション機能が無効化される

## 対応方針

### 方針の選択肢

| 方針 | メリット | デメリット |
|------|---------|-----------|
| **A. 全テーブルに適切な RLS ポリシーを設定** | 最もセキュアな対応 | ポリシー設計・テストの工数が必要 |
| **B. 全テーブルで RLS を有効化し、全操作を拒否** | 最速で対応可能。Prisma 経由のアクセスには影響なし | Supabase クライアント経由のアクセスが全て失敗する |
| **C. 段階的対応（B → A）** | 即座にリスクを低減しつつ、段階的に適切なポリシーを追加 | 一時的に Supabase クライアント機能が制限される |

### 推奨: 方針 C（段階的対応）

#### ステップ1: 即時対応 — 全テーブルで RLS を有効化

まず全テーブルで RLS を有効化します。ポリシーを追加しない状態では、PostgREST（anon/authenticated ロール）経由の全操作がデフォルトで **拒否** されます。Prisma は `DATABASE_URL`（直接接続）を使用するため影響を受けません。

```sql
-- ステップ1: 全テーブルで RLS を有効化（ポリシーなし = 全拒否）
ALTER TABLE public.plant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_have ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reactions ENABLE ROW LEVEL SECURITY;
```

**影響範囲の確認:**

RLS を有効化すると、Supabase クライアント（PostgREST）経由のアクセスに影響があります。現在の影響は以下の2箇所です。

| 箇所 | ファイル | 操作 | 影響 |
|------|---------|------|------|
| middleware の管理者チェック | `src/lib/supabase/middleware.ts` | `users` テーブルの `role` を SELECT | **アクセス不可になる** |
| useUser フック | `src/hooks/useUser.ts` | `users` テーブルの `alias_id`, `name`, `image` を SELECT | **アクセス不可になる** |

#### ステップ2: `users` テーブルに必要な RLS ポリシーを追加

`users` テーブルは Supabase クライアントから参照されるため、RLS ポリシーが必要です。

```sql
-- 認証済みユーザーが自分のプロフィールを読み取れるようにする
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());
```

このポリシーにより:
- middleware での管理者チェック（`role` の取得）が動作する
- `useUser` フックでのプロフィール取得が動作する
- 他ユーザーのデータは取得できない（セキュア）

> **注意:** `role` カラムの UPDATE は Prisma（サーバーサイド）経由でのみ行うべきです。PostgREST 経由の UPDATE ポリシーは追加しません。

#### ステップ3（将来的）: 他テーブルへのポリシー追加

現在は他テーブルへの Supabase クライアントアクセスはありませんが、将来的にリアルタイム機能やクライアント直接アクセスを追加する場合は、以下のポリシー設計を参考にしてください。

```sql
-- plants: 全ユーザーが読み取り可能（公開データ）
CREATE POLICY "plants_select_all"
  ON public.plants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- neko: 全ユーザーが読み取り可能（マスタデータ）
CREATE POLICY "neko_select_all"
  ON public.neko
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- evaluations: 全ユーザーが読み取り可能、作成は認証済みユーザーのみ
CREATE POLICY "evaluations_select_all"
  ON public.evaluations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "evaluations_insert_own"
  ON public.evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- plant_images: 承認済み画像は全ユーザーが読み取り可能
CREATE POLICY "plant_images_select_approved"
  ON public.plant_images
  FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- plant_images: 自分がアップロードした画像は読み取り可能
CREATE POLICY "plant_images_select_own"
  ON public.plant_images
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- pets: 自分のペットのみ読み書き可能
CREATE POLICY "pets_select_own"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- plant_favorites / plant_have: 自分のデータのみ読み書き可能
CREATE POLICY "plant_favorites_select_own"
  ON public.plant_favorites
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "plant_have_select_own"
  ON public.plant_have
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- evaluation_reactions: 全ユーザーが読み取り可能
CREATE POLICY "evaluation_reactions_select_all"
  ON public.evaluation_reactions
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

## 実装手順

1. **Prisma マイグレーションファイルを作成** して RLS を有効化する
2. **`users` テーブルの SELECT ポリシー** を追加する
3. **ローカル環境でテスト** して既存機能が正常に動作することを確認する
4. **本番環境へデプロイ** する

---

## 対応結果（2026-03-21）

### 採用方針: A（全テーブルに適切な RLS ポリシーを設定）

### 作成したマイグレーションファイル

`supabase/migrations/20260321112724_enable_rls_and_add_policies.sql`

全9テーブルで RLS を有効化し、テーブルの性質に応じた SELECT ポリシーを設定した。書き込みポリシーは追加せず、PostgREST 経由の INSERT/UPDATE/DELETE はデフォルト拒否とした（全書き込みは Prisma 経由で行うため影響なし）。

### 設定したポリシー一覧

#### カテゴリ1: 公開データ（anon + authenticated が SELECT 可）

| テーブル | ポリシー名 | 条件 |
|---------|-----------|------|
| `plants` | `plants_select_all` | `true`（全行） |
| `neko` | `neko_select_all` | `true`（全行） |
| `evaluations` | `evaluations_select_all` | `true`（全行） |
| `evaluation_reactions` | `evaluation_reactions_select_all` | `true`（全行） |

#### カテゴリ2: 条件付き公開データ

| テーブル | ポリシー名 | 対象ロール | 条件 |
|---------|-----------|-----------|------|
| `plant_images` | `plant_images_select_approved` | anon, authenticated | `is_approved = true` |
| `plant_images` | `plant_images_select_own` | authenticated | 自分がアップロードした画像 |

#### カテゴリ3: ユーザー固有データ（authenticated が自分のデータのみ SELECT 可）

| テーブル | ポリシー名 | 条件 |
|---------|-----------|------|
| `users` | `users_select_own` | `auth_id = auth.uid()` |
| `pets` | `pets_select_own` | `user_id` が自分の `users.id` と一致 |
| `plant_favorites` | `plant_favorites_select_own` | `user_id` が自分の `users.id` と一致 |
| `plant_have` | `plant_have_select_own` | `user_id` が自分の `users.id` と一致 |

### ローカル検証結果

`supabase db reset` でマイグレーションを適用し、以下を確認した。

#### RLS 有効化の確認

```
      tablename       | rowsecurity
----------------------+-------------
 evaluation_reactions | t
 evaluations          | t
 neko                 | t
 pets                 | t
 plant_favorites      | t
 plant_have           | t
 plant_images         | t
 plants               | t
 users                | t
```

#### PostgREST API テスト結果

| テスト | 期待結果 | 結果 |
|--------|---------|------|
| `plants` anon SELECT | データ返却 | 3件取得 |
| `users` anon SELECT | 空配列（拒否） | `[]` |
| `pets` anon SELECT | 空配列（拒否） | `[]` |
| `plant_favorites` anon SELECT | 空配列（拒否） | `[]` |
| `plant_have` anon SELECT | 空配列（拒否） | `[]` |
| `plants` INSERT | エラー（拒否） | `"new row violates row-level security policy"` |
| `users` UPDATE role | 変更なし（拒否） | 空レスポンス |

#### DB Lint

```
No schema errors found
```

`rls_disabled_in_public` のエラーは全て解消された。

### 本番適用手順

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

適用後、Supabase Dashboard の Security Advisor で `rls_disabled_in_public` が解消されていることを確認する。

## 参考リンク

- [Supabase RLS ドキュメント](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter: rls_disabled_in_public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Prisma と RLS の併用](https://pris.ly/d/row-level-security)

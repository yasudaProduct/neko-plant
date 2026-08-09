# 管理者機能

## ロール

`users.role` で管理します。既定値は `'user'`。

| ロール | 説明 |
| --- | --- |
| `user` | 一般ユーザー（既定） |
| `admin` | 管理者。`/admin` 配下にアクセスできる |
| `moderator` | ロール値としては受け付けるが、**現在アクセス制御上の特別扱いはない** |

`moderator` は `updateUserRole` の許可リスト（`VALID_ROLES`）に含まれますが、
`/admin` の判定は `role === 'admin'` のみを見ます。実質的に `user` と同じ権限です。

## アクセス制御

**二重にチェックしています。**

| 層 | 場所 | 内容 |
| --- | --- | --- |
| 1. ミドルウェア | `src/lib/supabase/middleware.ts` | `/admin` 配下で `users.role !== 'admin'` なら `/` へリダイレクト |
| 2. Server Action | `src/app/admin/actions.ts` | `getUserData()` で再度 `role` を確認し、違えば例外 |

ミドルウェアだけでは Server Action の直接呼び出しを防げないため、
**Action 側でも必ず権限を確認**してください。

## 画面

| パス | 内容 |
| --- | --- |
| `/admin` | ダッシュボード（最近の投稿など） |
| `/admin/users` | ユーザー一覧・ロール変更（`UserManagement.tsx`） |

## ロールの変更

### 画面から

`/admin/users` で管理者が変更します。`updateUserRole()` が
認証 → 管理者判定 → ロール値のバリデーション → 更新 → `revalidatePath("/admin/users")` を行います。

### 最初の管理者を作る

管理者がいない状態では画面から昇格できません。DB を直接更新します。

```sql
-- ローカル: supabase studio (http://127.0.0.1:54323) の SQL Editor でも可
UPDATE public.users SET role = 'admin' WHERE alias_id = '<対象のalias_id>';
```

本番で行う場合は Supabase ダッシュボードの SQL Editor から実行してください。

> E2E テストの管理者ユーザーは `scripts/e2e-seed.ts` が作成します
> （`E2E_TEST_ADMIN_ADDRESS` / `E2E_TEST_ADMIN_PASSWORD`）。

## モデレーション

**現在、投稿に対する承認フローや通報機能はありません。** 投稿は作成と同時に公開されます。

管理者は `/admin` から投稿を確認できます。不適切な投稿への対応は、
現状 DB / Supabase ダッシュボードからの手動削除になります。

> 旧仕様では `plant_images` に `is_approved` による承認フローがありましたが、
> フォトSNS化改修でテーブルごと廃止されました。

## E2E テスト

`admin-protection.test.ts` が `/admin` へのアクセス制御を検証します
（`desktop-admin` プロジェクト、`@admin` タグ）。

## 関連ドキュメント

- [../03-architecture/auth.md](../03-architecture/auth.md) — ルート保護
- [../03-architecture/security.md](../03-architecture/security.md) — `getUserData()` を Server Action にしない理由

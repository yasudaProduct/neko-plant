---
name: db-migration
description: neko-plantプロジェクトでデータベースのマイグレーションを行う際の手順とルールを提供する。テーブル定義の変更、カラム追加・削除、FK・インデックス・Enumの変更、RLS・Policy・Trigger・Functionの追加・変更時に使用する。Prisma MigrateとSupabase Migrationの使い分けを含む。
---

# DB マイグレーション手順（neko-plant）

## 変更対象による使い分け

| 変更対象 | 管理ツール | ファイル場所 |
|---|---|---|
| テーブル・カラム・FK・インデックス・Enum（`public`スキーマ） | Prisma Migrate | `prisma/migrations/` |
| RLS・Policy・Trigger・Function・Grant・`auth`/`storage`スキーマ | Supabase Migration | `supabase/migrations/` |

**`auth.users` など Supabase 管理オブジェクトは Prisma の管理対象に含めない。**

---

## パターンA：テーブル構造の変更（Prisma Migrate）

テーブル・カラム・FK・インデックス・Enumを変更する場合。

### 手順

1. `prisma/schema.prisma` を編集する
2. マイグレーションを生成・適用する

```bash
npx prisma migrate dev --name <変更内容を表す名前>
```

3. Prisma クライアントが自動再生成されることを確認する

### 注意事項

- 対象は `public` スキーマのみ（`schemas = ["public"]` で設定済み）
- RLS・Policy は Prisma で書かない → パターンBで対応
- `auth.users` など Supabase 管理テーブルを `schema.prisma` に追加しない

---

## パターンB：Supabase 固有機能の変更

RLS・Policy・Trigger・Function・Grant・Storage バケット設定を変更する場合。

### 手順

1. 差分を確認する（叩き台生成のみ、そのまま適用しない）

```bash
supabase db diff
```

2. 内容をレビューし、必要な部分だけ `supabase/migrations/YYYYMMDDHHMMSS_説明.sql` として保存する

3. ファイル名の命名規則：

```
YYYYMMDDHHMMSS_<変更内容>.sql
例: 20260401120000_add_posts_rls_policy.sql
```

4. 本番環境への適用前に必ず内容をレビューする

### 注意事項

- `supabase db diff` の出力をそのままコピーして適用しない（必ずレビュー）
- 本番環境への変更操作前は承認を得る

---

## パターンC：テーブル構造 ＋ RLS の両方を変更する場合

1. まず `prisma/schema.prisma` を編集し `npx prisma migrate dev` を実行する
2. 次に対応する RLS・Policy を `supabase/migrations/` に追加する

**順序を守ること**（テーブルが存在しない状態で Policy を作成するとエラーになる）。

---

## 実行前チェックリスト

- [ ] 変更対象は Prisma か Supabase Migration か判断した
- [ ] `auth.users` など Supabase 管理オブジェクトを Prisma に含めていない
- [ ] `supabase db diff` の結果をレビューした（パターンBの場合）
- [ ] 本番環境への変更操作前に承認を得た
- [ ] マイグレーションファイルのタイムスタンプが正しい形式（`YYYYMMDDHHMMSS`）になっている

---

## 参考ドキュメント

- トリガー・Function の詳細: `doc/supabase.md`
- Prisma スキーマ: `prisma/schema.prisma`
- 既存マイグレーション例: `supabase/migrations/`

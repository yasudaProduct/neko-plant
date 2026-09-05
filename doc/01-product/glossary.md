# 用語集

このプロジェクト固有の用語をまとめます。

## プロダクト

### 共存実績（Coexistence）

ある植物が**何匹の猫と一緒に暮らしているか**を表す、サービスの中核指標。

`post_plants` と `post_pets` を `post_id` で結合した**ユニークな `pet_id` の数**で算出します。
投稿数ではなくユニーク猫数を使うのは、同一ユーザーの重複投稿で水増しされないようにするためです。

→ [../03-architecture/data-model.md](../03-architecture/data-model.md#共存実績coexistenceの集計)

### ポジティブリスト方式

**「危険」と断定せず、共存実績の多さで安全性を示す**表現方針。

投稿が少ない・ない植物は「危険」ではなく「**コミュニティからの情報が少ない／ない**」と表現します。
法的リスクへの配慮と、データがないことを断定材料にしないという設計思想に基づきます。

→ [service-description.md](./service-description.md) §5

### 表示ランク

共存実績の猫数に応じた4段階の表現（`many` / `some` / `few` / `none`）。
閾値とメッセージは `src/lib/coexistence.ts` に集約されています。

| ランク | 猫数 | 表示 |
| --- | --- | --- |
| `many` | 50以上 | 多くの猫と暮らしています |
| `some` | 10〜49 | N匹の猫と暮らしています |
| `few` | 1〜9 | 少数の暮らしが報告されています |
| `none` | 0 | 猫との共存情報がありません |

### 図鑑（zukan）

植物を検索・一覧する画面（`/zukan`）。共存実績での絞り込み・並び替えができます。
**既定では共存実績のある植物だけ**を表示し、投稿がまだない植物は「全て」に切り替えると見られます
（ポジティブリスト方式の趣旨に沿った既定値）。

### AI植物判定

投稿時に写真から植物名の**候補**を推定する機能。**確定はユーザーが行います**。

→ [../03-architecture/ai-plant-identification.md](../03-architecture/ai-plant-identification.md)

## データモデル

### alias_id

プロフィールURL（`/{aliasId}`）に使う短い識別子。英字1〜10文字。
`lower(alias_id)` に一意制約があり、大文字小文字違いのなりすましも防ぎます。

サインアップ時の自己申告値は、形式・予約語・重複の検証をパスした場合のみ採用され、
外れた場合はランダム生成されます。

→ [../03-architecture/auth.md](../03-architecture/auth.md#alias_id-の設計)

### auth_id

`auth.users.id`（UUID）。`public.users.auth_id` に一意制約付きで保持され、両テーブルを結びます。
**Storage のパス1階層目にも使われる**ため、外部に列挙されないよう保護されています。

### neko と pets

- **`neko`** — 猫種のマスタデータ（アメリカンショートヘアなど）
- **`pets`** — ユーザーが登録した**実際の飼い猫**のプロフィール

共存実績で数えるのは `pets`（実際の猫）です。

### post_plants と post_image_plants

- **`post_plants`** — 投稿単位の植物タグ。**共存実績の集計に使う**
- **`post_image_plants`** — 写真単位の植物タグ。1投稿に複数写真がある場合の詳細

## 技術

### RLS（Row Level Security）

PostgreSQL の行レベルセキュリティ。**Prisma 経由（`DATABASE_URL`）ではバイパスされ、
Supabase クライアント経由（anon key）では適用されます。**

このプロジェクトで RLS が守っているのは、anon key で直接叩かれる PostgREST / Storage API です。

→ [../03-architecture/security.md](../03-architecture/security.md)

### pgTAP

PostgreSQL 用のテストフレームワーク。`supabase/tests/*.sql` で RLS とストレージポリシーの
退行を検知します（`npm run test:db`）。

### anon key / service role key

| キー | 露出 | RLS |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **クライアントに露出する** | 適用される |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー専用 | バイパスする |

anon key はブラウザから読めるため、攻撃者も同じ権限で API を叩けます。

### モック（mock）プロバイダー

`AI_PROVIDER=mock` にすると AI API を呼ばず固定の候補を返します。CI の E2E で使います。

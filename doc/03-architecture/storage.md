# ストレージと画像アップロード

画像は Supabase Storage に保存し、**ブラウザから直接アップロード**します。

## バケット構成

| バケット | 用途 | パス規約 |
| --- | --- | --- |
| `posts` | 投稿写真 | `{auth_id}/{post_id}/...` |
| `user_profiles` | ユーザーのプロフィール画像 | `{auth_id}/...` |
| `user_pets` | 猫のプロフィール画像 | `{auth_id}/...` |

**パスの1階層目が必ず `auth_id`** です。これがストレージポリシーの判定条件になっています
（[security.md](./security.md#ストレージポリシー) 参照）。

3 バケットとも public、サイズ上限 10MB、許可MIMEは `image/jpeg` / `image/png`。
公開URLの組み立ては `src/lib/const.ts` の `STORAGE_PATH` が担います。

> `plants` バケットの定数（`STORAGE_PATH.PLANT`）は残っていますが、
> **アップロード経路とストレージポリシーは削除済み**です（`20260712030221`）。
> 任意の認証ユーザーが公開ホスティングとして悪用できる状態だったためです。

## アップロードフロー

```
[ブラウザ]                          [Supabase Storage]        [Server Action]
    │
    │ 1. 画像を選択
    │
    │ 2. processImageForUpload()
    │    長辺2048px に縮小 + JPEG化(品質0.85)
    │
    │ 3. uploadImagesToBucket() ──────▶ PUT {auth_id}/...
    │                                   （RLSポリシーがパスを強制）
    │
    │ 4. パス文字列だけを渡す ───────────────────────────────▶ createPost()
    │                                                          │
    │                                        5. isValidOwnedImagePath() で再検証
    │                                        6. Prisma で post_images に記録
```

### なぜ Server Action を経由しないのか

Vercel のリクエストボディ上限は **4.5MB** です。画像を Server Action に渡す方式だと、
複数枚投稿ですぐに上限へ当たります。

そのため実体はブラウザから直接 Storage へ送り、Server Action には**パス文字列だけ**を渡します。

### パス偽装への対策

Server Action が受け取るパスはクライアント由来なので信用できません。
`src/lib/storage-path.ts` の `isValidOwnedImagePath()` が次を検証します。

- `{auth_id}/` で始まる（他人のフォルダを指せない）
- `..` を含まない（ディレクトリトラバーサル）
- `^[0-9a-zA-Z/_.-]+$` の文字種のみ
- 255文字以内

ストレージポリシーと**同じルールをアプリ側でも再現**する多層防御です。

## クライアント側の画像処理

`src/lib/client-image.ts` の `processImageForUpload()` が canvas で再エンコードします。

| 定数 | 値 | 意味 |
| --- | --- | --- |
| `IMAGE_MAX_EDGE` | 2048 | 長辺の上限（px） |
| `IMAGE_JPEG_QUALITY` | 0.85 | JPEG品質 |
| `MAX_UPLOAD_SOURCE_IMAGE_SIZE` | 20MB | **処理前**の入力上限（canvasデコードのメモリ保護） |
| `MAX_PROCESSED_IMAGE_SIZE` | 4MB | **処理後**の上限 |
| `MAX_POST_IMAGES` | 3 | 1投稿あたりの枚数上限 |

`MAX_PROCESSED_IMAGE_SIZE` が 4MB なのは、**処理済み画像が AI 判定で Server Action にも渡る**ためです。
Vercel の 4.5MB 上限を下回る必要があります。

## 削除

投稿削除時は `supabaseAdmin`（service role key）で Storage のオブジェクトを削除します。
アップロード途中の失敗については `removeUploadedImagesBestEffort()` がベストエフォートで後始末します。

## 関連ドキュメント

- [security.md](./security.md) — ストレージポリシーの詳細と設計理由
- [ai-plant-identification.md](./ai-plant-identification.md) — 処理済み画像のAI判定への受け渡し

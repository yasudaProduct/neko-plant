# AI植物判定

投稿フローで、写真から植物名の候補を推定してユーザーに提示する機能です。

**AI は候補を出すだけで、確定はしません。** ユーザーが候補から選ぶか、検索・手入力で決めます。

## プロバイダー抽象化

`src/lib/ai-provider.ts` が **OpenAI 互換の Chat Completions API** を前提に差異を吸収します。
Gemini も OpenAI 互換エンドポイントを提供しているため、メッセージ形式は共通です。

| `AI_PROVIDER` | 既定モデル | APIキー環境変数 |
| --- | --- | --- |
| `gemini`（既定） | `gemini-2.5-flash-lite` | `GEMINI_API_KEY` |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `mock` | — | 不要 |

`AI_PLANT_ID_MODEL` を設定すると既定モデルを上書きできます。

### mock プロバイダー

`AI_PROVIDER=mock` にすると API を呼ばず固定の候補（パキラ / モンステラ / テスト新規植物）を返します。
**CI の E2E テストはこれを使います**（`.github/workflows/playwright.yml` が `.env.local` に書き込む）。

### 未設定時の挙動

APIキーが未設定なら `getAiProviderConfig()` が `null` を返し、機能は**無効化**されます。
このとき Server Action はエラーではなく**空の候補配列と案内メッセージを返して成功扱い**にします。
AI が使えなくても投稿フロー自体は止まりません。

## 処理の流れ

```
1. 認証チェック（getUser → users.id を引く）
2. レート制限チェック（plant_identification_logs を数える）
3. 画像バリデーション（JPEG/PNG、5MB以下）
4. プロバイダー設定を取得（未設定なら空候補で返す）
5. ★ 実行ログを1件記録する（API呼び出しの「直前」）
6. 画像を base64 data URL 化して Chat Completions へ
7. レスポンスJSONをパースして候補を正規化
8. 既存 plants テーブルと名寄せして matchedPlant を付ける
```

**ログの記録が API 呼び出しの直前**なのは意図的です。API が失敗した場合も1回として数えることで、
エラー時の連打によるコスト濫用を防ぎます。

## レート制限

ユーザー単位で `plant_identification_logs` の件数を数えて判定します（`src/lib/const.ts`）。

| 制限 | 既定値 | 目的 |
| --- | --- | --- |
| `AI_IDENTIFY_RATE_LIMIT_PER_MINUTE` | 10回/分 | バースト抑止 |
| `AI_IDENTIFY_RATE_LIMIT_PER_DAY` | 50回/日 | コスト濫用抑止 |

写真ごとに判定するため、**1投稿で最大 `MAX_POST_IMAGES`（3回）消費**します。

同名の環境変数で上書きできます（正の整数のみ有効。E2E で緩めるための仕組み）。

## 画像の制約

| 制約 | 値 |
| --- | --- |
| 形式 | `image/jpeg`, `image/png` |
| サイズ | 5MB以下（`MAX_IMAGE_BYTES`） |

この画像は Server Action に渡るため、クライアント側で `MAX_PROCESSED_IMAGE_SIZE`（4MB）まで
縮小済みのものが来ます（[storage.md](./storage.md#クライアント側の画像処理) 参照）。

## レスポンスのパース

モデルの出力は不安定なため、多段のフォールバックを持ちます。

**形式の揺れ**（`tryParseJson`）:
1. そのまま `JSON.parse`
2. 最初の `{` 〜 最後の `}` を切り出して再試行
3. 最初の `[` 〜 最後の `]` を切り出して再試行

**キー名の揺れ**: 現行形式は `{"plants":[...]}`。旧形式 `{"candidates":[...]}` と裸の配列も受け付けます。

## プロンプト

システムプロンプトの要点（実際の文言は `src/actions/plant-identification-action.ts`）:

- 出力は JSON のみ（説明文なし）
- 形式は `{"plants":[{"name":"植物名","confidence":0.0}]}`
- 写真に写っている植物を種類ごとに1件ずつ、最大5件
- 名前は日本語の一般的な呼称を優先
- `confidence` は 0〜1 の小数
- 植物が写っていなければ空配列

## データ

`plant_identification_logs` は `user_id` と `created_at` だけを持ちます。
**画像も判定結果も保存しません**（レート制限のためだけのテーブル）。

RLS ポリシーは1本もなく、`anon` / `authenticated` の権限もゼロです。Prisma 経由でのみアクセスします。

## 関連ドキュメント

- [storage.md](./storage.md) — 画像処理とサイズ上限
- [data-model.md](./data-model.md) — `plant_identification_logs`
- [../99-archive/photo-first-post-with-ai-identification.md](../99-archive/photo-first-post-with-ai-identification.md) — 導入時の改修計画（アーカイブ）

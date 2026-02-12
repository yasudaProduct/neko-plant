## 写真起点の投稿フロー + AI植物判定 改修計画（neko-plant）

### 背景（現状）
- 現行は **植物詳細ページ起点**で「評価（good/bad）＋コメント＋写真（任意）」を投稿する。
- 「写真をアップロード（plant_images）」も植物詳細ページ起点。
- ユーザーが “植物名が分からない/探すのが面倒” なケースで投稿導線が弱い。

### 目的（やりたいこと）
1. ユーザーは **写真を最初に選択/投稿**できる
2. 併せて **猫に対する安全性（good/bad）** を入力できる
3. 画像から **AIで植物名候補を推定**し、候補をUIに提示する
4. ユーザーは候補から植物を選択できる（候補外は手動検索/新規登録）
5. 既に登録済みの植物は **既存plantsへ紐付け**る

### 非目的（今回やらない）
- AI判定の完全自動化（ユーザー確認なしで確定しない）
- 判定結果の学習/継続改善のための大規模ログ基盤
- 「写真だけ先に保存して後から植物選択を再開」する下書き機能（Phase 2で検討）

---

## 仕様（提案）

### 新規UI（投稿ページ）
- 追加ルート: `GET /posts/new`
- 画面構成（1画面ウィザード）
  1) 写真（1〜3枚、AI判定は先頭1枚を使用）
  2) 安全性（good=安全 / bad=危険）
  3) コメント（現行仕様に合わせて必須のまま）
  4) 「AIで植物名候補を表示」ボタン
  5) 候補リスト（登録済みなら「登録済み」表示、ラジオ選択）
  6) 候補にない場合:
     - DB内検索（既存plantsから選択）
     - 新規登録（入力した植物名でplants作成 → 紐付け）
  7) 「投稿」ボタン（植物が確定している時のみ活性）

### 投稿の保存先（Phase 1）
- 評価投稿は既存の `evaluations` + Supabase Storage `evaluations` を利用
  - `addEvaluation(plantId, comment, type, images)` を再利用
- 画像の「植物ギャラリー（plant_images）」への追加は今回スコープ外（必要なら別途追加）

---

## AI判定（Phase 1）

### インターフェース
- Server Action: `identifyPlantFromImage(image: File)`
  - 入力: 画像（File）
  - 出力: `candidates: { name: string; confidence?: number; matchedPlant?: { id: number; name: string } }[]`

### 実装方針
- 外部AIは **環境変数がある時のみ有効化**し、未設定時は候補0件でフォールバック。
- 画像は `data:image/...;base64,` に変換して送信（ブラウザ→Server Action→AI）。
- レスポンスはJSONで受け取り、植物名候補（最大5件程度）を抽出。
- DB照合: 候補の `name` で `plants` を照合し、存在すれば `matchedPlant` を付与。

### 環境変数
- `AI_PROVIDER`（任意。`"gemini"`（デフォルト）または `"openai"`）
- `GEMINI_API_KEY`（サーバーのみ。Gemini 使用時に必要）
- `OPENAI_API_KEY`（サーバーのみ。OpenAI 使用時に必要）
- `AI_PLANT_ID_MODEL`（任意。未設定時はプロバイダーのデフォルトモデル）

---

## エッジケース/UX
- AIが候補を返さない/失敗: 「候補が見つかりませんでした。検索または手入力してください」を表示。
- 候補の重複: 重複はUI表示前に除外。
- 新規登録時の重複: 既存の `addPlant` の重複チェック結果をUIへ返し、既存植物へ誘導。
- 画像サイズ/形式: 既存バリデーション（JPEG/PNG、<=5MB/枚、最大3枚）に準拠。

---

## 実装タスク（Phase 1）

### 1. Server Action 追加
- `src/actions/plant-identification-action.ts` を追加
  - `identifyPlantFromImage`（AI呼び出し + 既存plants照合）

### 2. 投稿ページ追加
- `src/app/posts/new/page.tsx`（ログイン必須/未ログインは `/signin` へ）
- `src/app/posts/new/NewPostWithAiForm.tsx`（client）
  - 写真/安全性/コメント入力
  - AI候補表示と植物確定
  - `addEvaluation` を呼んで投稿完了（成功時は植物詳細 or 投稿一覧へ遷移）

### 3. ナビゲーション導線
- `src/components/Header.tsx` に「投稿」ボタンを追加（ログイン時のみ）

### 4. テスト
- Unit（Vitest）
  - `identifyPlantFromImage` のフォールバック（APIキー無しで候補0件）
  - AIレスポンスのパース/DB照合の基本パターン（fetchとprismaをモック）
- E2E（任意）
  - `/posts/new` に到達→画像選択→手動で植物選択→投稿（AI無しでも通るスモーク）

---

## Phase 2（必要になったら）
- 「写真だけ先に保存」できる下書き（例: `post_drafts` テーブル + Storage `drafts`）
- AI判定ログ（モデル/プロンプト/候補/選択結果）を保存して改善に活用
- `plant_images` への自動追加（評価画像からのギャラリー反映）


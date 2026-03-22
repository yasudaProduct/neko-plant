# AI機能の導入設計書

## 概要

neko-plantアプリケーションへのAI機能導入に関する設計書です。猫に安全な植物データベースプラットフォームとして、AI技術を活用してユーザー体験の向上、コンテンツの質の向上、およびモデレーション業務の効率化を図ります。

## 背景

### 現状の課題

1. **植物登録の重複問題**
   - 現在、植物名の完全一致で重複チェックを実施（`addPlant`関数）
   - 一般ユーザーによる植物登録を促進したいが、重複が発生しやすい
   - 同じ植物でも異なる名称（通称名、学名、別名）で登録される可能性

2. **画像モデレーションの負荷**
   - 植物画像は手動承認が必要（`is_approved`フィールド）
   - 管理者による目視確認が必須で、スケーラビリティに課題
   - 不適切な画像（植物以外、猫が含まれないなど）の判定に時間がかかる

3. **ユーザー体験の向上余地**
   - 植物名の手入力が必要で、専門知識のないユーザーには難しい
   - 写真から自動的に植物を識別できれば、より多くのユーザーが参加可能

## AI機能の提案

### 1. AI植物識別機能

#### 1-1. 概要
画像から植物を自動識別し、データベース内の既存植物とのマッチングおよび新規植物の提案を行う機能。

#### 1-2. 実装アプローチ

**A案：植物登録時の組み込み（推奨）**

植物登録モーダル内に統合し、シームレスな体験を提供。

**フロー：**
1. ユーザーが植物画像をアップロード
2. AI APIで画像解析を実行
   - 植物種の識別（複数候補を返す）
   - 信頼度スコアを付与
3. データベース内の既存植物と照合
   - 識別された植物名でファジーマッチング
   - 学名があれば学名でも照合
4. 結果に応じた処理：
   - **既存植物が見つかった場合**：「この植物は既に登録されています」と表示し、該当植物ページへのリンクを提供
   - **類似植物が見つかった場合**：「もしかして：[植物名]」形式で候補を提示
   - **新規植物の場合**：AI識別結果を植物名として自動入力（ユーザーが編集可能）

**B案：独立した「AI診断機能」として実装**

植物登録とは別の独立した機能として提供。

**メリット：**
- 既存の植物登録フローに影響を与えない
- 診断専用のUIを提供できる（より詳細な情報表示）
- 植物を登録せずに診断だけしたいユーザーのニーズに対応

**デメリット：**
- 機能が分散し、ユーザーが混乱する可能性
- 診断後に登録する場合、二度手間になる

**推奨：A案（植物登録時の組み込み）**
ユーザー体験の一貫性と効率性の観点から、A案を推奨します。ただし、将来的にB案の「診断のみ」機能を追加することも検討に値します。

#### 1-3. 重複検知戦略

現在の完全一致による重複チェックを拡張し、AI識別結果を活用した柔軟な重複検知を実装。

**実装方針：**

1. **AI識別による事前チェック**
   ```typescript
   // 擬似コード
   async function identifyPlantFromImage(image: File) {
     const aiResult = await callAIAPI(image);
     // aiResult = {
     //   candidates: [
     //     { name: "ポトス", scientificName: "Epipremnum aureum", confidence: 0.95 },
     //     { name: "フィロデンドロン", scientificName: "Philodendron", confidence: 0.75 }
     //   ]
     // }
     
     // 既存植物との照合
     const existingPlants = await findSimilarPlants(aiResult.candidates);
     return { aiResult, existingPlants };
   }
   ```

2. **ファジーマッチングによる類似検索**
   - PostgreSQLの`pg_trgm`拡張機能を使用した類似度検索
   - 学名による照合を優先（学名は一意性が高い）
   - 通称名の揺らぎに対応（例：「ポトス」「オウゴンカズラ」）

3. **ユーザーへの確認フロー**
   - 重複の可能性がある場合は、必ずユーザーに確認
   - 「これらの植物と同じですか？」と候補を提示
   - ユーザーが「同じ」を選択した場合は既存植物への誘導
   - 「異なる」を選択した場合は新規登録を許可

4. **データベース設計の考慮事項**

   **オプション1：重複を許容しない（現状維持・推奨）**
   - 現在のスキーマを維持
   - AI + ファジーマッチングで重複を最小化
   - より精度の高い重複検知で対応
   
   **オプション2：重複を許容する**
   - 別名テーブル（`plant_aliases`）を追加
   - 同一植物の異なる名称を管理
   - 検索時に別名も考慮
   
   ```sql
   CREATE TABLE plant_aliases (
     id SERIAL PRIMARY KEY,
     plant_id INT REFERENCES plants(id) ON DELETE CASCADE,
     alias_name VARCHAR(255) NOT NULL,
     alias_type VARCHAR(50), -- 'common', 'scientific', 'local'
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **推奨：オプション1（重複を許容しない）**
   データの整合性とメンテナンス性の観点から、重複を許容しない方針を維持することを推奨します。

#### 1-4. 技術選択肢

**AI APIの候補：**

1. **Google Cloud Vision API - Plant Detection**
   - 植物識別に特化したモデル
   - 高精度、豊富な植物データベース
   - 価格：1000リクエスト/$1.50

2. **Plant.id API**
   - 植物識別専用サービス
   - 詳細な植物情報を提供
   - 価格：プランによる（要確認）

3. **OpenAI Vision API（GPT-4V）**
   - 汎用的な画像認識
   - 植物識別もサポート
   - 詳細な説明文を生成可能
   - 価格：画像あたりの従量課金

4. **Custom Model（TensorFlow/PyTorch）**
   - 自社でモデルを構築
   - データセットの準備とトレーニングが必要
   - 長期的にはコスト削減の可能性

**推奨：段階的アプローチ**
- **フェーズ1**：Google Cloud Vision API または Plant.id API（既存サービスで迅速に検証）
- **フェーズ2**：ユーザーフィードバックを基に精度向上、必要に応じてカスタムモデルを検討

#### 1-5. 実装計画

**データベース変更：**

```sql
-- AI識別結果を保存するテーブル（オプション、分析用）
CREATE TABLE plant_ai_identifications (
  id SERIAL PRIMARY KEY,
  plant_id INT REFERENCES plants(id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  ai_service VARCHAR(50) NOT NULL, -- 'google', 'plant_id', etc.
  identified_name VARCHAR(255),
  scientific_name VARCHAR(255),
  confidence DECIMAL(3, 2), -- 0.00 - 1.00
  raw_response JSONB, -- AI APIの生レスポンスを保存
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_plant_ai_identifications_plant_id ON plant_ai_identifications(plant_id);
CREATE INDEX idx_plant_ai_identifications_confidence ON plant_ai_identifications(confidence DESC);
```

**Prismaスキーマ更新：**

```prisma
model plant_ai_identifications {
  id               Int       @id @default(autoincrement())
  plant_id         Int
  image_url        String    @db.VarChar(255)
  ai_service       String    @db.VarChar(50)
  identified_name  String?   @db.VarChar(255)
  scientific_name  String?   @db.VarChar(255)
  confidence       Decimal   @db.Decimal(3, 2)
  raw_response     Json      @db.JsonB
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  
  plants           plants    @relation(fields: [plant_id], references: [id], onDelete: Cascade)
  
  @@index([plant_id])
  @@index([confidence(sort: Desc)])
  @@schema("public")
}
```

**Server Action実装：**

```typescript
// src/actions/ai-action.ts

export async function identifyPlantFromImage(image: File): Promise<{
  success: boolean;
  candidates: Array<{
    name: string;
    scientificName?: string;
    confidence: number;
  }>;
  existingPlants: Array<{
    id: number;
    name: string;
    matchScore: number;
  }>;
}> {
  // 実装
}
```

**UIコンポーネント：**

```typescript
// src/components/PlantIdentificationUpload.tsx
// 画像アップロード + AI識別 + 重複チェック
```

### 2. AI画像分類・モデレーション機能

#### 2-1. 概要
植物画像アップロード時に、画像内容を自動分類し、承認プロセスを効率化する機能。

#### 2-2. 分類カテゴリー

画像を以下のカテゴリーに分類：

1. **対象植物が含まれる（植物のみ）**
   - 自動承認候補
   - 高い表示優先度
   
2. **猫が含まれる（猫のみ）**
   - 手動レビュー推奨
   - 中程度の表示優先度
   
3. **対象植物と猫の両方が含まれる**
   - 自動承認 + 高優先度表示
   - アプリのテーマに最も適したコンテンツ
   
4. **対象植物も猫も含まれない**
   - 自動で管理者レビュー対象にマーク
   - 低い表示優先度 or 非表示

#### 2-3. データベース設計

```sql
-- plant_imagesテーブルに列を追加
ALTER TABLE plant_images
ADD COLUMN ai_classification VARCHAR(50), -- 'plant_only', 'cat_only', 'plant_and_cat', 'neither'
ADD COLUMN contains_plant BOOLEAN DEFAULT NULL,
ADD COLUMN contains_cat BOOLEAN DEFAULT NULL,
ADD COLUMN ai_confidence DECIMAL(3, 2) DEFAULT NULL,
ADD COLUMN ai_analyzed_at TIMESTAMP DEFAULT NULL,
ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN display_priority INT DEFAULT 0; -- 表示順序制御用

-- インデックス
CREATE INDEX idx_plant_images_classification ON plant_images(ai_classification);
CREATE INDEX idx_plant_images_display_priority ON plant_images(display_priority DESC);
CREATE INDEX idx_plant_images_auto_approved ON plant_images(auto_approved);
```

**Prismaスキーマ更新：**

```prisma
model plant_images {
  id                Int       @id(map: "plants_images_pkey") @default(autoincrement())
  plant_id          Int
  user_id           Int
  image_url         String    @db.VarChar
  caption           String?   @db.VarChar
  alt_text          String?   @db.VarChar
  created_at        DateTime  @default(now()) @db.Timestamptz(6)
  updated_at        DateTime  @default(now()) @updatedAt @db.Timestamptz(6)
  is_approved       Boolean   @default(false)
  order             Int       @default(0)
  
  // AI分類関連の新規フィールド
  ai_classification String?   @db.VarChar(50)
  contains_plant    Boolean?
  contains_cat      Boolean?
  ai_confidence     Decimal?  @db.Decimal(3, 2)
  ai_analyzed_at    DateTime? @db.Timestamptz(6)
  auto_approved     Boolean   @default(false)
  display_priority  Int       @default(0)
  
  plants            plants    @relation(fields: [plant_id], references: [id], onDelete: Cascade)
  users             public_users @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([plant_id], map: "idx_plant_images_plant_id")
  @@index([user_id], map: "idx_plant_images_user_id")
  @@index([ai_classification])
  @@index([display_priority(sort: Desc)])
  @@index([auto_approved])
  @@schema("public")
}
```

#### 2-4. 表示優先度ルール

```typescript
// 表示優先度の計算ロジック
function calculateDisplayPriority(
  classification: string,
  confidence: number,
  isApproved: boolean
): number {
  let priority = 0;
  
  if (!isApproved) return -1; // 未承認画像は表示しない
  
  switch (classification) {
    case 'plant_and_cat':
      priority = 100 + Math.floor(confidence * 100);
      break;
    case 'plant_only':
      priority = 50 + Math.floor(confidence * 100);
      break;
    case 'cat_only':
      priority = 25 + Math.floor(confidence * 100);
      break;
    case 'neither':
    default:
      priority = 0;
  }
  
  return priority;
}
```

#### 2-5. 自動承認ポリシー

**自動承認の条件：**
- `classification = 'plant_and_cat'` かつ `confidence >= 0.9`
- `classification = 'plant_only'` かつ `confidence >= 0.95`

**手動レビュー必須：**
- `classification = 'cat_only'`
- `classification = 'neither'`
- `confidence < 0.9`

**実装例：**

```typescript
async function analyzeAndApproveImage(imageId: number, imageFile: File) {
  // AI分析
  const analysis = await analyzeImageWithAI(imageFile);
  
  // 自動承認判定
  const shouldAutoApprove = 
    (analysis.classification === 'plant_and_cat' && analysis.confidence >= 0.9) ||
    (analysis.classification === 'plant_only' && analysis.confidence >= 0.95);
  
  // 優先度計算
  const priority = calculateDisplayPriority(
    analysis.classification,
    analysis.confidence,
    shouldAutoApprove
  );
  
  // データベース更新
  await prisma.plant_images.update({
    where: { id: imageId },
    data: {
      ai_classification: analysis.classification,
      contains_plant: analysis.containsPlant,
      contains_cat: analysis.containsCat,
      ai_confidence: analysis.confidence,
      ai_analyzed_at: new Date(),
      auto_approved: shouldAutoApprove,
      is_approved: shouldAutoApprove,
      display_priority: priority,
    },
  });
}
```

#### 2-6. 技術選択肢

**画像分類のためのAI API：**

1. **Google Cloud Vision API**
   - ラベル検出、オブジェクト検出機能
   - 「植物」「猫」などのラベルを検出可能
   - 信頼度スコアを提供

2. **Azure Computer Vision**
   - オブジェクト検出、タグ付け機能
   - カスタムモデルの構築も可能

3. **AWS Rekognition**
   - オブジェクトおよびシーン検出
   - カスタムラベル機能

4. **OpenAI Vision API（GPT-4V）**
   - 自然言語での詳細な説明
   - カスタムプロンプトで柔軟な分類が可能

**推奨：Google Cloud Vision API**
- 使いやすさとコストのバランスが良い
- 植物識別機能と同じプラットフォームで統一可能
- ラベル検出機能が充実

#### 2-7. 実装計画

**Server Action：**

```typescript
// src/actions/image-moderation-action.ts

export async function analyzeImage(imageFile: File): Promise<{
  success: boolean;
  classification: 'plant_and_cat' | 'plant_only' | 'cat_only' | 'neither';
  containsPlant: boolean;
  containsCat: boolean;
  confidence: number;
  labels: Array<{ name: string; confidence: number }>;
}> {
  // Google Cloud Vision APIを呼び出し
  // ラベル検出結果を解析
  // 分類結果を返す
}
```

**画像アップロード処理の更新：**

```typescript
// src/actions/plant-action.ts の addPlantImage を更新

export async function addPlantImage(id: number, image: File): Promise<ActionResult> {
  // 既存のアップロード処理
  
  // AI分析を追加
  const analysis = await analyzeImage(image);
  
  // 自動承認判定
  const shouldAutoApprove = determineAutoApproval(analysis);
  
  // データベースに保存（AI分析結果を含む）
}
```

### 3. その他のAI機能提案

#### 3-1. 評価コメントの自動分類・感情分析

**目的：**
- ユーザーの評価コメントを分析し、有用性を判定
- ネガティブ/ポジティブな感情を検出
- スパムや不適切なコメントを自動検出

**実装概要：**
```sql
ALTER TABLE evaluations
ADD COLUMN ai_sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
ADD COLUMN ai_toxicity_score DECIMAL(3, 2),
ADD COLUMN ai_usefulness_score DECIMAL(3, 2);
```

#### 3-2. 植物の安全性スコアリング

**目的：**
- 評価データを機械学習で分析
- 植物の猫への安全性を数値化
- 新しい評価が追加されるたびに再計算

**実装概要：**
```sql
ALTER TABLE plants
ADD COLUMN ai_safety_score DECIMAL(3, 2), -- 0.00 (危険) - 1.00 (安全)
ADD COLUMN ai_safety_confidence DECIMAL(3, 2),
ADD COLUMN ai_safety_updated_at TIMESTAMP;
```

#### 3-3. 類似植物のレコメンデーション

**目的：**
- ユーザーが閲覧・お気に入りした植物に基づいて、類似植物を提案
- 画像の視覚的類似性と特性の類似性を組み合わせ

**実装概要：**
- 植物画像の特徴ベクトルを抽出（Embedding）
- ベクトル類似度検索（PostgreSQLのpgvector拡張機能を使用）

#### 3-4. 自動タグ付け機能

**目的：**
- 植物画像から自動的にタグを生成（「観葉植物」「多肉植物」「花」など）
- 検索性の向上

**実装概要：**
```sql
CREATE TABLE plant_tags (
  id SERIAL PRIMARY KEY,
  plant_id INT REFERENCES plants(id) ON DELETE CASCADE,
  tag_name VARCHAR(50) NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3-5. チャットボット（植物Q&A）

**目的：**
- ユーザーからの植物に関する質問に自動回答
- 「この植物は猫に安全ですか？」などの質問に対応

**実装概要：**
- RAG（Retrieval-Augmented Generation）アーキテクチャ
- データベース内の評価データを活用
- OpenAI GPT-4 または Claude を使用

## 実装ロードマップ

### フェーズ1：基盤構築（1-2ヶ月）

- [ ] AI APIの選定と契約（Google Cloud Vision API推奨）
- [ ] データベーススキーマの拡張
  - `plant_ai_identifications` テーブル追加
  - `plant_images` に AI分類フィールド追加
- [ ] Prismaスキーマ更新とマイグレーション
- [ ] AI APIクライアントライブラリの実装

### フェーズ2：AI植物識別機能（2-3ヶ月）

- [ ] 画像解析Server Action実装
- [ ] ファジーマッチング機能実装（PostgreSQL pg_trgm）
- [ ] 植物登録UIの拡張
  - 画像アップロード時の自動識別
  - 重複チェック結果の表示
  - ユーザー確認フロー
- [ ] 単体テスト・E2Eテストの実装
- [ ] パフォーマンステスト

### フェーズ3：AI画像分類・モデレーション（1-2ヶ月）

- [ ] 画像分類Server Action実装
- [ ] 自動承認ロジック実装
- [ ] 表示優先度アルゴリズム実装
- [ ] 管理画面の改善（AI分析結果の表示）
- [ ] 画像表示順序の最適化
- [ ] テストとモニタリング

### フェーズ4：追加AI機能（柔軟に対応）

- [ ] 評価コメントの感情分析
- [ ] 植物安全性スコアリング
- [ ] 類似植物レコメンデーション
- [ ] 自動タグ付け
- [ ] チャットボット（長期的な目標）

## コスト見積もり

### Google Cloud Vision API（推奨）

**植物識別（Image Labeling + Web Detection）：**
- 月間1,000回：$3
- 月間10,000回：$30
- 月間100,000回：$300

**画像分類（Object Localization + Label Detection）：**
- 月間1,000回：$2
- 月間10,000回：$20
- 月間100,000回：$200

**初期段階の想定コスト（月間）：**
- 植物識別：1,000回 = $3
- 画像分類：2,000回 = $4
- 合計：約$7/月

**スケール時の想定コスト（月間）：**
- 植物識別：10,000回 = $30
- 画像分類：20,000回 = $40
- 合計：約$70/月

### インフラコスト

- データベースストレージ増加：軽微（数GB程度）
- 計算リソース：既存インフラで対応可能
- キャッシュ実装で API呼び出しを削減可能

## リスクと緩和策

### リスク1：AI識別精度の問題

**リスク内容：**
- AI が植物を誤識別
- ユーザーの信頼を失う

**緩和策：**
- 常にユーザーが最終確認
- 信頼度スコアを表示
- フィードバック機能を実装し、継続的に改善

### リスク2：コストの増大

**リスク内容：**
- ユーザー増加に伴うAPI呼び出しコストの増大

**緩和策：**
- 結果のキャッシュ実装
- 段階的な自動承認でAPI呼び出しを削減
- 一定期間後にカスタムモデルへの移行を検討

### リスク3：プライバシーとセキュリティ

**リスク内容：**
- 画像がサードパーティのAI APIに送信される
- 個人情報の漏洩リスク

**緩和策：**
- プライバシーポリシーの更新
- ユーザーへの明示的な同意取得
- 画像の前処理で個人情報を削除
- セキュアな通信（HTTPS）の使用

### リスク4：依存性の増加

**リスク内容：**
- 外部AI APIへの依存
- APIの価格変更やサービス終了

**緩和策：**
- 複数のAI APIをサポートできる設計
- フォールバック機能の実装
- 長期的にはカスタムモデルへの移行パスを確保

## 成功指標（KPI）

### 植物識別機能

- 識別精度：90%以上
- ユーザー満足度：4.0/5.0以上
- 植物登録の重複率：10%未満に削減
- 新規植物登録数：20%増加

### 画像分類・モデレーション

- 自動承認率：70%以上
- 管理者のレビュー時間：50%削減
- 不適切画像の検出率：95%以上
- 誤検出率（False Positive）：5%未満

### 全体的な指標

- ユーザーエンゲージメント：20%向上
- 月間アクティブユーザー数：30%増加
- 画像アップロード数：50%増加
- コンテンツの質（高品質画像の割合）：30%向上

## 結論

AI機能の導入により、neko-plantプラットフォームのユーザー体験、コンテンツの質、運営効率が大幅に向上することが期待されます。

**推奨実装順序：**

1. **最優先：AI画像分類・モデレーション機能（フェーズ3）**
   - 即座に管理者の負担を軽減
   - 比較的シンプルな実装
   - 明確なROI

2. **次点：AI植物識別機能（フェーズ2）**
   - ユーザー体験の大幅な向上
   - 重複問題の解決
   - 実装の複雑さが高い

3. **長期的：追加AI機能（フェーズ4）**
   - 段階的に実装
   - ユーザーフィードバックを反映

**現在の機能フローからの変更について：**

植物登録時にAI識別を組み込むことを推奨しますが、これは既存フローの「拡張」であり、「大きな変更」ではありません。以下の方針で段階的に導入できます：

1. まず、AI識別機能をオプションとして追加（既存の手動入力も継続）
2. ユーザーフィードバックを収集し、精度を向上
3. 十分な精度が確認できた段階で、AI識別をデフォルトに変更

この段階的アプローチにより、リスクを最小限に抑えつつ、AI機能の恩恵を受けることができます。

## 次のステップ

1. ステークホルダーとの議論（この設計書をベースに）
2. AI API の選定と契約
3. プロトタイプの開発（小規模な実装で検証）
4. ユーザーテストの実施
5. 本格実装へ移行

---

**作成日：** 2026-02-03  
**バージョン：** 1.0  
**ステータス：** レビュー待ち

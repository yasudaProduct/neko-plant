# AI機能実装ガイド

## 概要

このドキュメントは、`ai-features-design.md`で提案されたAI機能の具体的な実装方法を示します。開発者向けの技術的な詳細、コード例、ベストプラクティスを含みます。

## 環境セットアップ

### 1. Google Cloud Vision APIのセットアップ

#### 1-1. Google Cloud Projectの作成

```bash
# gcloudコマンドラインツールをインストール
# https://cloud.google.com/sdk/docs/install

# プロジェクトの作成
gcloud projects create neko-plant-ai --name="Neko Plant AI"

# プロジェクトの設定
gcloud config set project neko-plant-ai

# Vision APIの有効化
gcloud services enable vision.googleapis.com
```

#### 1-2. サービスアカウントの作成

```bash
# サービスアカウントの作成
gcloud iam service-accounts create neko-plant-vision \
    --display-name="Neko Plant Vision API"

# サービスアカウントにロールを付与
gcloud projects add-iam-policy-binding neko-plant-ai \
    --member="serviceAccount:neko-plant-vision@neko-plant-ai.iam.gserviceaccount.com" \
    --role="roles/cloudvision.user"

# 認証キーの生成
gcloud iam service-accounts keys create ./google-vision-key.json \
    --iam-account=neko-plant-vision@neko-plant-ai.iam.gserviceaccount.com
```

#### 1-3. 環境変数の設定

```bash
# .env.local に追加
GOOGLE_CLOUD_VISION_API_KEY=path/to/google-vision-key.json
GOOGLE_CLOUD_PROJECT_ID=neko-plant-ai
```

### 2. 必要なパッケージのインストール

```bash
npm install @google-cloud/vision
npm install --save-dev @types/node
```

## データベースマイグレーション

### 1. AI識別結果テーブルの作成

```bash
# マイグレーションファイルを作成
npx prisma migrate dev --name add_ai_identification_table
```

**Prismaスキーマに追加：**

```prisma
// prisma/schema.prisma

model plant_ai_identifications {
  id               Int       @id @default(autoincrement())
  plant_id         Int?
  image_url        String    @db.VarChar(255)
  ai_service       String    @db.VarChar(50)
  identified_name  String?   @db.VarChar(255)
  scientific_name  String?   @db.VarChar(255)
  confidence       Decimal   @db.Decimal(3, 2)
  raw_response     Json      @db.JsonB
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  
  plants           plants?   @relation(fields: [plant_id], references: [id], onDelete: Cascade)
  
  @@index([plant_id])
  @@index([confidence(sort: Desc)])
  @@schema("public")
}

// plantsモデルにリレーションを追加
model plants {
  // 既存のフィールド...
  
  plant_ai_identifications plant_ai_identifications[]
}
```

### 2. 画像分類フィールドの追加

```bash
npx prisma migrate dev --name add_ai_classification_to_plant_images
```

**Prismaスキーマを更新：**

```prisma
model plant_images {
  // 既存のフィールド...
  
  // AI分類関連の新規フィールド
  ai_classification String?   @db.VarChar(50)
  contains_plant    Boolean?
  contains_cat      Boolean?
  ai_confidence     Decimal?  @db.Decimal(3, 2)
  ai_analyzed_at    DateTime? @db.Timestamptz(6)
  auto_approved     Boolean   @default(false)
  display_priority  Int       @default(0)
  
  @@index([ai_classification])
  @@index([display_priority(sort: Desc)])
  @@index([auto_approved])
}
```

### 3. ファジーマッチング用のPostgreSQL拡張機能

```sql
-- Supabaseダッシュボードまたはマイグレーションで実行
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 植物名の類似度検索用インデックス
CREATE INDEX idx_plants_name_trgm ON plants USING gin (name gin_trgm_ops);
CREATE INDEX idx_plants_scientific_name_trgm ON plants USING gin (scientific_name gin_trgm_ops);
```

## AI機能の実装

### 1. Google Cloud Vision API クライアント

```typescript
// src/lib/ai/vision-client.ts

import vision from '@google-cloud/vision';
import { env } from 'process';

let visionClient: vision.ImageAnnotatorClient | null = null;

export function getVisionClient(): vision.ImageAnnotatorClient {
  if (!visionClient) {
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: env.GOOGLE_CLOUD_VISION_API_KEY,
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
  return visionClient;
}

export interface VisionLabel {
  description: string;
  score: number;
}

export interface VisionAnalysisResult {
  labels: VisionLabel[];
  webEntities?: Array<{
    entityId?: string;
    score?: number;
    description?: string;
  }>;
}

/**
 * 画像をGoogle Cloud Vision APIで分析
 */
export async function analyzeImageWithVision(
  imageBuffer: Buffer
): Promise<VisionAnalysisResult> {
  const client = getVisionClient();
  
  try {
    const [labelResult] = await client.labelDetection({
      image: { content: imageBuffer.toString('base64') },
    });
    
    const [webResult] = await client.webDetection({
      image: { content: imageBuffer.toString('base64') },
    });
    
    return {
      labels: labelResult.labelAnnotations?.map(label => ({
        description: label.description || '',
        score: label.score || 0,
      })) || [],
      webEntities: webResult.webDetection?.webEntities || [],
    };
  } catch (error) {
    console.error('Vision API error:', error);
    throw new Error('画像の分析に失敗しました');
  }
}
```

### 2. 植物識別機能の実装

```typescript
// src/lib/ai/plant-identification.ts

import { analyzeImageWithVision, VisionAnalysisResult } from './vision-client';
import prisma from '@/lib/prisma';

export interface PlantIdentificationCandidate {
  name: string;
  scientificName?: string;
  confidence: number;
}

export interface PlantIdentificationResult {
  candidates: PlantIdentificationCandidate[];
  existingPlants: Array<{
    id: number;
    name: string;
    scientificName?: string;
    matchScore: number;
  }>;
  rawAnalysis: VisionAnalysisResult;
}

/**
 * 画像から植物を識別
 */
export async function identifyPlant(
  imageBuffer: Buffer
): Promise<PlantIdentificationResult> {
  // Vision APIで画像を分析
  const analysis = await analyzeImageWithVision(imageBuffer);
  
  // 植物関連のラベルを抽出
  const plantLabels = extractPlantLabels(analysis);
  
  // 候補を生成
  const candidates = plantLabels.map(label => ({
    name: label.description,
    confidence: label.score,
  }));
  
  // Web entitiesから学名を推測
  const scientificNames = extractScientificNames(analysis);
  
  // 既存植物との照合
  const existingPlants = await findSimilarPlants(candidates, scientificNames);
  
  return {
    candidates,
    existingPlants,
    rawAnalysis: analysis,
  };
}

/**
 * 植物関連のラベルを抽出
 */
function extractPlantLabels(analysis: VisionAnalysisResult) {
  const plantKeywords = [
    'plant', 'flower', 'tree', 'herb', 'shrub', 'succulent',
    'vegetation', 'botanical', 'houseplant', 'foliage',
    '植物', '花', '木', 'ハーブ', '多肉植物', '観葉植物'
  ];
  
  return analysis.labels.filter(label => {
    const desc = label.description.toLowerCase();
    return plantKeywords.some(keyword => desc.includes(keyword)) ||
           label.score > 0.7; // 高信頼度のラベルは全て含める
  });
}

/**
 * Web entitiesから学名を抽出
 */
function extractScientificNames(analysis: VisionAnalysisResult) {
  if (!analysis.webEntities) return [];
  
  return analysis.webEntities
    .filter(entity => {
      const desc = entity.description || '';
      // 学名の特徴：2単語、最初が大文字、2番目が小文字
      return /^[A-Z][a-z]+ [a-z]+/.test(desc);
    })
    .map(entity => entity.description!);
}

/**
 * 既存植物との類似検索
 */
async function findSimilarPlants(
  candidates: PlantIdentificationCandidate[],
  scientificNames: string[]
) {
  const results = [];
  
  // 学名での完全一致検索（最優先）
  if (scientificNames.length > 0) {
    const exactMatches = await prisma.plants.findMany({
      where: {
        scientific_name: {
          in: scientificNames,
        },
      },
      select: {
        id: true,
        name: true,
        scientific_name: true,
      },
    });
    
    results.push(...exactMatches.map(plant => ({
      ...plant,
      scientificName: plant.scientific_name || undefined,
      matchScore: 1.0, // 完全一致
    })));
  }
  
  // 名前でのファジーマッチング
  for (const candidate of candidates) {
    const similarPlants = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      scientific_name: string | null;
      similarity: number;
    }>>`
      SELECT 
        id,
        name,
        scientific_name,
        similarity(name, ${candidate.name}) as similarity
      FROM plants
      WHERE similarity(name, ${candidate.name}) > 0.3
      ORDER BY similarity DESC
      LIMIT 5
    `;
    
    results.push(...similarPlants.map(plant => ({
      id: plant.id,
      name: plant.name,
      scientificName: plant.scientific_name || undefined,
      matchScore: plant.similarity * candidate.confidence,
    })));
  }
  
  // 重複を削除し、スコアでソート
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.id, item])).values()
  ).sort((a, b) => b.matchScore - a.matchScore);
  
  return uniqueResults.slice(0, 5); // 上位5件
}

/**
 * 識別結果をデータベースに保存
 */
export async function saveIdentificationResult(
  plantId: number | null,
  imageUrl: string,
  result: PlantIdentificationResult
) {
  const topCandidate = result.candidates[0];
  
  await prisma.plant_ai_identifications.create({
    data: {
      plant_id: plantId,
      image_url: imageUrl,
      ai_service: 'google_vision',
      identified_name: topCandidate?.name,
      scientific_name: result.rawAnalysis.webEntities?.[0]?.description,
      confidence: topCandidate?.confidence || 0,
      raw_response: result.rawAnalysis as any,
    },
  });
}
```

### 3. 画像分類機能の実装

```typescript
// src/lib/ai/image-classification.ts

import { analyzeImageWithVision } from './vision-client';

export type ImageClassification = 
  | 'plant_and_cat' 
  | 'plant_only' 
  | 'cat_only' 
  | 'neither';

export interface ImageClassificationResult {
  classification: ImageClassification;
  containsPlant: boolean;
  containsCat: boolean;
  confidence: number;
  labels: Array<{
    name: string;
    confidence: number;
  }>;
}

/**
 * 画像を分類（植物、猫、両方、どちらでもない）
 */
export async function classifyImage(
  imageBuffer: Buffer
): Promise<ImageClassificationResult> {
  const analysis = await analyzeImageWithVision(imageBuffer);
  
  // 植物と猫の検出
  const plantLabels = ['plant', 'flower', 'houseplant', 'botanical', 'vegetation', '植物', '花'];
  const catLabels = ['cat', 'kitten', 'feline', 'pet', '猫', 'ネコ'];
  
  let containsPlant = false;
  let containsCat = false;
  let plantConfidence = 0;
  let catConfidence = 0;
  
  for (const label of analysis.labels) {
    const desc = label.description.toLowerCase();
    
    if (plantLabels.some(keyword => desc.includes(keyword))) {
      containsPlant = true;
      plantConfidence = Math.max(plantConfidence, label.score);
    }
    
    if (catLabels.some(keyword => desc.includes(keyword))) {
      containsCat = true;
      catConfidence = Math.max(catConfidence, label.score);
    }
  }
  
  // 分類を決定
  let classification: ImageClassification;
  let confidence: number;
  
  if (containsPlant && containsCat) {
    classification = 'plant_and_cat';
    confidence = Math.min(plantConfidence, catConfidence);
  } else if (containsPlant) {
    classification = 'plant_only';
    confidence = plantConfidence;
  } else if (containsCat) {
    classification = 'cat_only';
    confidence = catConfidence;
  } else {
    classification = 'neither';
    confidence = 0;
  }
  
  return {
    classification,
    containsPlant,
    containsCat,
    confidence,
    labels: analysis.labels.map(label => ({
      name: label.description,
      confidence: label.score,
    })),
  };
}

/**
 * 自動承認を判定
 */
export function shouldAutoApprove(result: ImageClassificationResult): boolean {
  if (result.classification === 'plant_and_cat' && result.confidence >= 0.9) {
    return true;
  }
  
  if (result.classification === 'plant_only' && result.confidence >= 0.95) {
    return true;
  }
  
  return false;
}

/**
 * 表示優先度を計算
 */
export function calculateDisplayPriority(
  classification: ImageClassification,
  confidence: number,
  isApproved: boolean
): number {
  if (!isApproved) return -1;
  
  let basePriority = 0;
  
  switch (classification) {
    case 'plant_and_cat':
      basePriority = 100;
      break;
    case 'plant_only':
      basePriority = 50;
      break;
    case 'cat_only':
      basePriority = 25;
      break;
    case 'neither':
    default:
      basePriority = 0;
  }
  
  return basePriority + Math.floor(confidence * 100);
}
```

### 4. Server Actions

```typescript
// src/actions/ai-action.ts

"use server";

import { identifyPlant, saveIdentificationResult } from '@/lib/ai/plant-identification';
import { classifyImage, shouldAutoApprove, calculateDisplayPriority } from '@/lib/ai/image-classification';
import { ActionResult } from '@/types/common';
import { createClient } from '@/lib/supabase/server';

/**
 * 植物画像を識別
 */
export async function identifyPlantFromImage(
  image: File
): Promise<ActionResult<{
  candidates: Array<{
    name: string;
    scientificName?: string;
    confidence: number;
  }>;
  existingPlants: Array<{
    id: number;
    name: string;
    scientificName?: string;
    matchScore: number;
  }>;
}>> {
  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const result = await identifyPlant(buffer);
    
    return {
      success: true,
      data: {
        candidates: result.candidates,
        existingPlants: result.existingPlants,
      },
    };
  } catch (error) {
    console.error('Plant identification error:', error);
    return {
      success: false,
      message: '植物の識別に失敗しました。',
    };
  }
}

/**
 * 画像を分類して分析結果を返す
 */
export async function analyzeAndClassifyImage(
  imageId: number,
  image: File
): Promise<ActionResult<{
  classification: string;
  autoApproved: boolean;
  confidence: number;
}>> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: '認証が必要です。' };
  }
  
  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const result = await classifyImage(buffer);
    
    const autoApproved = shouldAutoApprove(result);
    const priority = calculateDisplayPriority(
      result.classification,
      result.confidence,
      autoApproved
    );
    
    // データベースを更新
    await prisma.plant_images.update({
      where: { id: imageId },
      data: {
        ai_classification: result.classification,
        contains_plant: result.containsPlant,
        contains_cat: result.containsCat,
        ai_confidence: result.confidence,
        ai_analyzed_at: new Date(),
        auto_approved: autoApproved,
        is_approved: autoApproved,
        display_priority: priority,
      },
    });
    
    return {
      success: true,
      data: {
        classification: result.classification,
        autoApproved,
        confidence: result.confidence,
      },
    };
  } catch (error) {
    console.error('Image classification error:', error);
    return {
      success: false,
      message: '画像の分類に失敗しました。',
    };
  }
}
```

### 5. UIコンポーネント

```typescript
// src/components/PlantIdentificationUpload.tsx

"use client";

import { useState } from 'react';
import { identifyPlantFromImage } from '@/actions/ai-action';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ImageUpload from './ImageUpload';
import Link from 'next/link';

export default function PlantIdentificationUpload() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  const handleImageChange = (files: File[]) => {
    setSelectedImage(files[0]);
    setResult(null);
  };
  
  const handleAnalyze = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    try {
      const result = await identifyPlantFromImage(selectedImage);
      if (result.success) {
        setResult(result.data);
      } else {
        alert(result.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">植物を識別</h2>
      
      <ImageUpload onImageChange={handleImageChange} />
      
      <Button
        onClick={handleAnalyze}
        disabled={!selectedImage || isAnalyzing}
        className="mt-4 w-full"
      >
        {isAnalyzing ? '分析中...' : '植物を識別'}
      </Button>
      
      {result && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">識別結果：</h3>
          
          {result.candidates.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">候補：</p>
              {result.candidates.map((candidate: any, index: number) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">
                    {Math.round(candidate.confidence * 100)}%
                  </Badge>
                  <span>{candidate.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {result.existingPlants.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                既に登録されている可能性のある植物：
              </p>
              {result.existingPlants.map((plant: any) => (
                <Link
                  key={plant.id}
                  href={`/plants/${plant.id}`}
                  className="block p-2 bg-yellow-50 rounded mb-2 hover:bg-yellow-100"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {Math.round(plant.matchScore * 100)}% 一致
                    </Badge>
                    <span className="font-semibold">{plant.name}</span>
                  </div>
                  {plant.scientificName && (
                    <p className="text-xs text-gray-500 ml-2">
                      {plant.scientificName}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

## テスト

### 1. ユニットテスト

```typescript
// src/__test__/lib/ai/plant-identification.test.ts

import { describe, it, expect, vi } from 'vitest';
import { identifyPlant } from '@/lib/ai/plant-identification';
import * as visionClient from '@/lib/ai/vision-client';

vi.mock('@/lib/ai/vision-client');

describe('identifyPlant', () => {
  it('should identify plant from image', async () => {
    const mockAnalysis = {
      labels: [
        { description: 'Plant', score: 0.95 },
        { description: 'Houseplant', score: 0.90 },
        { description: 'Pothos', score: 0.85 },
      ],
      webEntities: [
        { description: 'Epipremnum aureum', score: 0.9 },
      ],
    };
    
    vi.spyOn(visionClient, 'analyzeImageWithVision')
      .mockResolvedValue(mockAnalysis);
    
    const buffer = Buffer.from('fake-image-data');
    const result = await identifyPlant(buffer);
    
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].name).toBe('Plant');
    expect(result.candidates[0].confidence).toBe(0.95);
  });
});
```

### 2. E2Eテスト

```typescript
// e2e/ai-plant-identification.test.ts

import { test, expect } from '@playwright/test';

test.describe('AI Plant Identification', () => {
  test('should identify plant from uploaded image', async ({ page }) => {
    await page.goto('/plants/new');
    
    // 画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./e2e/fixtures/pothos.jpg');
    
    // 識別ボタンをクリック
    await page.click('button:has-text("植物を識別")');
    
    // 結果を待つ
    await expect(page.locator('text=識別結果')).toBeVisible();
    await expect(page.locator('text=候補')).toBeVisible();
    
    // 候補が表示されることを確認
    const candidates = page.locator('[data-testid="identification-candidate"]');
    await expect(candidates).toHaveCount.greaterThan(0);
  });
});
```

## モニタリングとロギング

### 1. AI API使用量のトラッキング

```typescript
// src/lib/ai/metrics.ts

import prisma from '@/lib/prisma';

export async function logAIAPICall(
  service: string,
  operation: string,
  success: boolean,
  responseTime: number,
  error?: string
) {
  // メトリクステーブルに記録（別途テーブル作成が必要）
  await prisma.ai_api_logs.create({
    data: {
      service,
      operation,
      success,
      response_time_ms: responseTime,
      error_message: error,
      created_at: new Date(),
    },
  });
}
```

### 2. エラーハンドリング

```typescript
// src/lib/ai/error-handler.ts

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export async function withAIErrorHandling<T>(
  operation: () => Promise<T>,
  service: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`AI Service Error [${service}]:`, error);
    
    if (error instanceof Error) {
      throw new AIServiceError(
        error.message,
        service,
        (error as any).code
      );
    }
    
    throw new AIServiceError(
      '不明なエラーが発生しました',
      service
    );
  }
}
```

## パフォーマンス最適化

### 1. 結果のキャッシュ

```typescript
// src/lib/ai/cache.ts

import { createClient } from '@supabase/supabase-js';

// Supabaseのキャッシュ機能を使用
// または Redis を使用

export async function getCachedIdentification(imageHash: string) {
  // 画像ハッシュで過去の識別結果を検索
  const cached = await prisma.plant_ai_identifications.findFirst({
    where: {
      // image_hashフィールドを追加して検索
    },
    orderBy: {
      created_at: 'desc',
    },
  });
  
  // 1週間以内の結果のみ使用
  if (cached && Date.now() - cached.created_at.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return cached;
  }
  
  return null;
}
```

### 2. 画像の最適化

```typescript
// src/lib/ai/image-processor.ts

import sharp from 'sharp';

/**
 * AI分析用に画像を最適化
 */
export async function optimizeImageForAI(
  imageBuffer: Buffer
): Promise<Buffer> {
  // 画像をリサイズ（APIコスト削減）
  return await sharp(imageBuffer)
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}
```

## デプロイメント

### 1. 環境変数の設定

```bash
# Vercel/本番環境での設定
GOOGLE_CLOUD_VISION_API_KEY=/path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=neko-plant-ai
AI_FEATURES_ENABLED=true
AI_AUTO_APPROVAL_ENABLED=true
```

### 2. 段階的なロールアウト

```typescript
// src/lib/feature-flags.ts

export function isAIFeatureEnabled(userId?: number): boolean {
  // 環境変数でグローバル制御
  if (process.env.AI_FEATURES_ENABLED !== 'true') {
    return false;
  }
  
  // ユーザーIDでの段階的ロールアウト（オプション）
  if (userId && process.env.AI_ROLLOUT_PERCENTAGE) {
    const percentage = parseInt(process.env.AI_ROLLOUT_PERCENTAGE);
    return (userId % 100) < percentage;
  }
  
  return true;
}
```

## トラブルシューティング

### よくある問題と解決策

1. **Vision API認証エラー**
   - サービスアカウントキーのパスを確認
   - IAMロールが正しく設定されているか確認

2. **APIレート制限**
   - キャッシュを実装
   - リクエストのスロットリングを追加

3. **精度の問題**
   - より多くのラベルを考慮
   - 信頼度の閾値を調整
   - ユーザーフィードバックを収集して改善

4. **コストの増加**
   - キャッシュを活用
   - 画像を最適化してAPIコストを削減
   - 不要なAPI呼び出しを削減

## 次のステップ

1. プロトタイプの実装
2. 小規模なユーザーグループでのテスト
3. フィードバックの収集と改善
4. 本番環境へのデプロイ
5. モニタリングと継続的な改善

---

このガイドを参考に、AI機能を段階的に実装してください。質問や問題が発生した場合は、開発チームにお問い合わせください。

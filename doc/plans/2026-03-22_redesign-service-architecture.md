# サービスアーキテクチャ再設計 詳細設計書

作成日: 2026-03-22

---

## 1. 現状の課題

### 1.1 Server Actions の肥大化

現在のアーキテクチャでは Server Actions（`src/actions/`）が以下の全責務を担っている:

- 認証・認可チェック
- バリデーション
- ビジネスロジック
- Prisma によるデータアクセス
- Supabase Storage 操作
- レスポンス整形

ファイルごとの規模:

| ファイル | 行数(概算) | 責務 |
|---------|-----------|------|
| `plant-action.ts` | ~500行 | 植物CRUD, 検索, お気に入り, 所持 |
| `evaluation-action.ts` | ~300行 | 評価CRUD, リアクション |
| `user-action.ts` | ~450行 | ユーザープロフィール, ペット管理, コレクション |
| `plant-identification-action.ts` | ~210行 | AI植物判定 |
| `news-action.ts` | ~70行 | Notion連携 |
| `neko-action.ts` | ~20行 | 猫種マスタ取得 |

**問題点:**
- 1つの関数内にバリデーション→認証→DB操作→ストレージ操作→整形が混在
- テスタビリティが低い（Server Action全体をモックしないとテストできない）
- 同じパターンの認証チェック・エラーハンドリングが各関数で重複
- ビジネスロジックの再利用が困難

### 1.2 データモデルの課題

| テーブル | 課題 |
|---------|------|
| `evaluations` | 「評価」と「投稿」の概念が混在。写真起点投稿の導入で「投稿 = 評価」の前提が崩れつつある |
| `plant_images` | evaluationsの画像とは別管理。同一植物の画像が2系統に分散 |
| `plant_have` | PKの命名にスペース混入（`plant_ have_pkey`）。設計上の負債 |
| `plant_favorites` | 機能的に問題なし。そのまま利用可 |
| `neko` / `pets` | 猫種マスタとペット管理。現行で問題なし |

### 1.3 型定義の分散

`src/types/` に型定義があるが、Prismaの生成型との二重管理が発生している箇所がある。

---

## 2. 再設計の方針

### 2.1 基本原則

1. **Server Actions は薄いコントローラーにする** — バリデーションと認証のみを担当し、ビジネスロジックはServiceレイヤーに委譲
2. **Service レイヤーの導入** — ビジネスロジックを独立した関数群として切り出し、テスタビリティと再利用性を向上
3. **Repository パターンは導入しない** — Prisma自体がリポジトリ的役割を果たすため、薄いラッパーは不要
4. **データモデルは負債を解消** — `plant_have` の命名問題の修正、投稿モデルの再設計
5. **段階的導入はしない** — このブランチで完成させる

### 2.2 ディレクトリ構成（変更後）

```
src/
├── actions/                    # Server Actions (薄いコントローラー)
│   ├── plant-action.ts         # 植物関連エントリポイント
│   ├── post-action.ts          # 投稿関連エントリポイント（evaluation-action.tsから改名）
│   ├── user-action.ts          # ユーザー関連エントリポイント
│   ├── plant-identification-action.ts  # AI判定（そのまま）
│   ├── news-action.ts          # ニュース（そのまま）
│   └── neko-action.ts          # 猫種マスタ（そのまま）
├── services/                   # ビジネスロジック（新規）
│   ├── plant-service.ts        # 植物ドメインロジック
│   ├── post-service.ts         # 投稿ドメインロジック
│   ├── user-service.ts         # ユーザードメインロジック
│   ├── pet-service.ts          # ペット管理ロジック
│   ├── storage-service.ts      # Supabase Storage操作の共通化
│   └── auth-service.ts         # 認証・認可ヘルパー
├── app/                        # ページ（変更なし）
├── components/                 # UIコンポーネント（変更なし）
├── hooks/                      # クライアントフック（変更なし）
├── contexts/                   # コンテキスト（変更なし）
├── lib/                        # ライブラリ設定（変更なし）
└── types/                      # 型定義（整理）
```

---

## 3. Service レイヤー詳細設計

### 3.1 設計パターン

各サービスは **純粋な関数群のモジュール** として実装する（クラスは使わない）。

```typescript
// services/plant-service.ts のイメージ
import { prisma } from "@/lib/prisma";

export async function findPlants(params: FindPlantsParams): Promise<PlantWithCounts[]> {
  // ビジネスロジック + Prismaクエリ
}

export async function findPlantById(id: number, userId?: number): Promise<PlantDetail | null> {
  // ...
}
```

Server Action側は薄くなる:

```typescript
// actions/plant-action.ts のイメージ
"use server";

import { getCurrentUser } from "@/services/auth-service";
import { findPlants } from "@/services/plant-service";

export async function getPlants(page: number, filter: string) {
  const user = await getCurrentUser(); // 任意認証（未ログインも許可）
  return findPlants({ page, filter, userId: user?.id });
}
```

### 3.2 各サービスの責務

#### `auth-service.ts` — 認証・認可

```typescript
// 現在のセッションからユーザーを取得（未ログインならnull）
export async function getCurrentUser(): Promise<AuthenticatedUser | null>

// 現在のセッションからユーザーを取得（未ログインならエラー）
export async function requireCurrentUser(): Promise<AuthenticatedUser>

// 管理者権限チェック（権限なしならエラー）
export async function requireAdmin(): Promise<AuthenticatedUser>
```

**目的:** 各Server Actionで重複している認証チェックパターンを1箇所に集約。

#### `plant-service.ts` — 植物ドメイン

```typescript
// 植物一覧（ページネーション + フィルタ + 評価集計）
export async function findPlants(params: {
  page: number;
  perPage?: number;
  filter?: "safe" | "danger" | "all";
  sort?: "name" | "rating" | "newest";
  userId?: number;  // お気に入り・所持判定用
}): Promise<{ plants: PlantWithCounts[]; totalCount: number }>

// 植物名検索（オートコンプリート）
export async function searchPlantsByName(query: string): Promise<PlantSummary[]>

// 植物詳細
export async function findPlantById(id: number, userId?: number): Promise<PlantDetail | null>

// 植物作成
export async function createPlant(data: CreatePlantInput): Promise<Plant>

// 植物更新
export async function updatePlant(id: number, data: UpdatePlantInput): Promise<Plant>

// お気に入り追加/削除
export async function toggleFavorite(userId: number, plantId: number): Promise<boolean>

// 所持追加/削除
export async function toggleOwnership(userId: number, plantId: number): Promise<boolean>
```

#### `post-service.ts` — 投稿ドメイン（旧evaluation）

「投稿」は、ユーザーが植物に対して行う安全性評価投稿を指す。
現行の `evaluations` テーブルを引き続き使用するが、概念的には「投稿（post）」として扱う。

```typescript
// 植物に紐づく投稿一覧
export async function findPostsByPlantId(plantId: number, params: {
  page?: number;
  perPage?: number;
}): Promise<{ posts: PostWithDetails[]; totalCount: number }>

// ユーザーの投稿一覧
export async function findPostsByUserId(userId: number): Promise<PostWithDetails[]>

// 投稿作成（画像アップロード含む）
export async function createPost(data: {
  userId: number;
  plantId: number;
  type: "good" | "bad";
  comment: string;
  images?: File[];
}): Promise<PostWithDetails>

// 投稿削除（画像のStorage削除含む）
export async function deletePost(postId: number, userId: number): Promise<void>

// リアクション追加/削除
export async function toggleReaction(params: {
  evaluationId: number;
  userId: number;
  type: "good" | "bad";
}): Promise<{ added: boolean }>
```

#### `user-service.ts` — ユーザードメイン

```typescript
// ユーザープロフィール取得（alias_id指定）
export async function findUserByAliasId(aliasId: string): Promise<UserProfile | null>

// ユーザープロフィール取得（auth_id指定）
export async function findUserByAuthId(authId: string): Promise<UserProfile | null>

// ユーザーデータ取得（ロール含む）
export async function getUserWithRole(authId: string): Promise<UserWithRole | null>

// プロフィール更新
export async function updateProfile(userId: number, data: UpdateProfileInput): Promise<UserProfile>

// ユーザーの植物コレクション
export async function getUserPlants(userId: number): Promise<PlantSummary[]>

// ユーザーのお気に入り植物
export async function getUserFavorites(userId: number): Promise<PlantSummary[]>
```

#### `pet-service.ts` — ペット管理

```typescript
// ユーザーのペット一覧
export async function findPetsByUserId(userId: number): Promise<Pet[]>

// ペット作成
export async function createPet(userId: number, data: CreatePetInput): Promise<Pet>

// ペット更新
export async function updatePet(petId: number, userId: number, data: UpdatePetInput): Promise<Pet>

// ペット削除
export async function deletePet(petId: number, userId: number): Promise<void>

// 猫種一覧（マスタ）
export async function getAllNekoSpecies(): Promise<NekoSpecies[]>
```

#### `storage-service.ts` — ストレージ操作共通化

```typescript
// 画像アップロード（汎用）
export async function uploadImage(params: {
  bucket: string;
  path: string;
  file: File;
}): Promise<string>  // 公開URL

// 画像削除
export async function deleteImage(params: {
  bucket: string;
  path: string;
}): Promise<void>

// 評価投稿の画像アップロード（パス生成含む）
export async function uploadEvaluationImages(
  evaluationId: number,
  files: File[]
): Promise<string[]>

// プロフィール画像アップロード
export async function uploadProfileImage(
  userId: number,
  file: File
): Promise<string>

// ペット画像アップロード
export async function uploadPetImage(
  petId: number,
  file: File
): Promise<string>
```

---

## 4. データモデル変更

### 4.1 変更が必要なテーブル

#### `plant_have` → `plant_owns`（再作成）

**理由:** PK名・FK名にスペースが混入しており、負債になっている。テーブル名も意味が不明瞭。

```prisma
// 変更前
model plant_have {
  id         Int          @id(map: "plant_ have_pkey") @default(autoincrement())
  plant_id   Int
  user_id    Int
  created_at DateTime     @default(now()) @db.Timestamptz(6)
  plants     plants       @relation(fields: [plant_id], references: [id], onDelete: Cascade, map: "plant_ have_plant_id_fkey")
  users      public_users @relation(fields: [user_id], references: [id], onDelete: Cascade, map: "plant_ have_user_id_fkey")
  @@schema("public")
}

// 変更後
model plant_owns {
  id         Int          @id @default(autoincrement())
  plant_id   Int
  user_id    Int
  created_at DateTime     @default(now()) @db.Timestamptz(6)
  plants     plants       @relation(fields: [plant_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users      public_users @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([user_id, plant_id])  // 同一ユーザーの重複所持を防止
  @@schema("public")
}
```

**マイグレーション手順:**
1. `plant_owns` テーブルを新規作成
2. `plant_have` のデータを `plant_owns` へ移行
3. `plant_have` テーブルを削除
4. RLSポリシーを `plant_owns` に再設定

#### `plant_favorites` — ユニーク制約追加

```prisma
// 変更後（ユニーク制約追加のみ）
model plant_favorites {
  id         Int          @id @default(autoincrement())
  user_id    Int
  plant_id   Int
  created_at DateTime     @default(now()) @db.Timestamptz(6)
  plants     plants       @relation(fields: [plant_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users      public_users @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([user_id, plant_id])  // 追加: 重複お気に入り防止
  @@schema("public")
}
```

#### `evaluation_reactions` — ユニーク制約追加

```prisma
// 変更後（ユニーク制約追加のみ）
model evaluation_reactions {
  id            Int           @id @default(autoincrement())
  evaluation_id Int
  user_id       Int
  created_at    DateTime      @default(now()) @db.Timestamptz(6)
  type          reaction_type
  evaluations   evaluations   @relation(fields: [evaluation_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users         public_users  @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([evaluation_id, user_id])  // 追加: 同一ユーザーの重複リアクション防止
  @@schema("public")
}
```

### 4.2 変更不要なテーブル（そのまま利用）

| テーブル | 理由 |
|---------|------|
| `plants` | 問題なし。分類学フィールドも適切 |
| `evaluations` | 投稿の実体テーブルとして引き続き利用。テーブル名は変更しない（アプリ層で「post」として扱う） |
| `plant_images` | 植物ギャラリー用として維持。評価画像とは用途が異なる |
| `public_users` | 問題なし |
| `neko` | 猫種マスタ。問題なし |
| `pets` | 問題なし |

### 4.3 RLSポリシーの更新

`plant_owns`（新テーブル）に対して、既存の `plant_have` と同等のRLSポリシーを設定:

```sql
-- plant_owns: 自分のデータのみ閲覧可
CREATE POLICY "Users can view own plant_owns"
  ON public.plant_owns FOR SELECT
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
```

---

## 5. Server Actions リファクタリング詳細

### 5.1 変更前後の比較

#### 例: `getPlants`（植物一覧取得）

**変更前（plant-action.ts）:**
```typescript
export async function getPlants(page: number, filter: string, sort: string) {
  // 1. Supabaseセッション取得
  // 2. ユーザーID取得（任意）
  // 3. Prismaクエリ構築（where, orderBy, include, skip, take）
  // 4. お気に入り・所持判定
  // 5. 評価集計
  // 6. レスポンス整形
  // → 全部が1つの関数に詰め込まれている
}
```

**変更後:**
```typescript
// actions/plant-action.ts — 薄いコントローラー
export async function getPlants(page: number, filter: string, sort: string) {
  const user = await getCurrentUser();
  return findPlants({ page, filter, sort, userId: user?.id });
}

// services/plant-service.ts — ビジネスロジック
export async function findPlants(params: FindPlantsParams) {
  const where = buildPlantFilter(params.filter);
  const orderBy = buildPlantSort(params.sort);
  const [plants, totalCount] = await Promise.all([
    prisma.plants.findMany({ where, orderBy, skip, take, include: { ... } }),
    prisma.plants.count({ where }),
  ]);
  return { plants: plants.map(p => toPlantWithCounts(p, params.userId)), totalCount };
}
```

### 5.2 ファイル名の変更

| 変更前 | 変更後 | 理由 |
|--------|--------|------|
| `evaluation-action.ts` | `post-action.ts` | ユーザー向け概念として「投稿」に統一 |
| その他 | 変更なし | — |

---

## 6. エラーハンドリング統一

### 6.1 現状

各Server Actionでtry-catchと`ActionResult`型を独自に構築している。

### 6.2 改善

サービスレイヤーでは**例外をスロー**し、Server Actionレイヤーで**キャッチして`ActionResult`に変換**する。

```typescript
// services/ ではビジネスエラーを例外としてスロー
export class AppError extends Error {
  constructor(
    public code: ActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "リソースが見つかりません") {
    super("NOT_FOUND", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "認証が必要です") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "権限がありません") {
    super("FORBIDDEN", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}
```

```typescript
// actions/ ではキャッチして統一的にActionResultへ変換
import { AppError } from "@/services/errors";

async function handleAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (e) {
    if (e instanceof AppError) {
      return { success: false, code: e.code, message: e.message };
    }
    console.error("Unexpected error:", e);
    return { success: false, code: "INTERNAL_ERROR", message: "予期しないエラーが発生しました" };
  }
}

// 使用例
export async function getPlant(id: number) {
  return handleAction(async () => {
    const user = await getCurrentUser();
    return findPlantById(id, user?.id);
  });
}
```

---

## 7. 実装タスク一覧

### Phase A: 基盤構築

| # | タスク | 詳細 |
|---|--------|------|
| A-1 | `services/errors.ts` 作成 | AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError |
| A-2 | `services/auth-service.ts` 作成 | getCurrentUser, requireCurrentUser, requireAdmin |
| A-3 | `services/storage-service.ts` 作成 | uploadImage, deleteImage, 各種画像アップロード関数 |
| A-4 | `handleAction` ヘルパー作成 | actions内の共通エラーハンドリング |

### Phase B: データモデル変更

| # | タスク | 詳細 |
|---|--------|------|
| B-1 | `plant_owns` テーブル作成 | Prismaスキーマ変更 + マイグレーション |
| B-2 | `plant_have` → `plant_owns` データ移行 | マイグレーションSQLでデータコピー |
| B-3 | `plant_have` テーブル削除 | Prismaスキーマから削除 |
| B-4 | `plant_favorites` ユニーク制約追加 | `@@unique([user_id, plant_id])` |
| B-5 | `evaluation_reactions` ユニーク制約追加 | `@@unique([evaluation_id, user_id])` |
| B-6 | RLSポリシー更新 | `plant_owns` にRLS設定 |

### Phase C: サービスレイヤー実装

| # | タスク | 詳細 |
|---|--------|------|
| C-1 | `services/plant-service.ts` 実装 | plant-action.tsからロジック移行 |
| C-2 | `services/post-service.ts` 実装 | evaluation-action.tsからロジック移行 |
| C-3 | `services/user-service.ts` 実装 | user-action.tsからロジック移行 |
| C-4 | `services/pet-service.ts` 実装 | user-action.tsのペット関連を分離 |

### Phase D: Server Actions リファクタリング

| # | タスク | 詳細 |
|---|--------|------|
| D-1 | `plant-action.ts` リファクタリング | plant-serviceへ委譲、plant_have→plant_owns対応 |
| D-2 | `evaluation-action.ts` → `post-action.ts` | post-serviceへ委譲、ファイル名変更 |
| D-3 | `user-action.ts` リファクタリング | user-service, pet-serviceへ委譲 |
| D-4 | 呼び出し元の更新 | import パスの変更（evaluation-action → post-action） |

### Phase E: テスト

| # | タスク | 詳細 |
|---|--------|------|
| E-1 | サービスレイヤーのユニットテスト | Prismaモック使用。各サービスの主要関数をテスト |
| E-2 | 既存テストの更新 | import変更への追従、新しいテーブル名への対応 |
| E-3 | E2Eテストの動作確認 | 既存フローが壊れていないことを確認 |

### Phase F: クリーンアップ

| # | タスク | 詳細 |
|---|--------|------|
| F-1 | 旧コードの削除 | evaluation-action.ts（post-action.tsに移行済み） |
| F-2 | 型定義の整理 | types/ の重複排除、Prisma生成型の活用 |
| F-3 | ビルド確認 | `npm run build` の成功を確認 |

---

## 8. 影響範囲

### 8.1 変更が必要なファイル

| カテゴリ | ファイル | 変更内容 |
|---------|---------|---------|
| スキーマ | `prisma/schema.prisma` | plant_owns追加、plant_have削除、ユニーク制約追加 |
| サービス(新規) | `src/services/*.ts` | 6ファイル新規作成 |
| アクション | `src/actions/plant-action.ts` | サービスへの委譲 |
| アクション | `src/actions/evaluation-action.ts` → `post-action.ts` | 改名＋サービスへの委譲 |
| アクション | `src/actions/user-action.ts` | サービスへの委譲 |
| ページ | `evaluation-action` をimportしている全ページ | import先を `post-action` に変更 |
| テスト | 既存テストファイル | import変更追従 |

### 8.2 変更不要なファイル

- `src/app/` のページ構成（ルーティング変更なし）
- `src/components/` のUIコンポーネント（データの受け渡し方は同じ）
- `src/hooks/useUser.ts`（Supabase Auth依存のため変更なし）
- `src/lib/`（Prisma, Supabase設定はそのまま）
- `src/actions/plant-identification-action.ts`（独立性が高いためそのまま）
- `src/actions/news-action.ts`（Notion連携で独立性が高い）
- `src/actions/neko-action.ts`（1関数のみで分離不要）

---

## 9. テスト戦略

### 9.1 サービスレイヤーのテスト

サービス関数は Prisma をモックすることで独立してテスト可能になる。

```typescript
// __tests__/services/plant-service.test.ts
import { vi } from "vitest";
import { findPlants, createPlant } from "@/services/plant-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plants: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("findPlants", () => {
  it("フィルタなしで全植物を返す", async () => { ... });
  it("safeフィルタで安全な植物のみ返す", async () => { ... });
  it("ページネーションが正しく動作する", async () => { ... });
});
```

### 9.2 Server Actions のテスト

Server Actions は薄いため、統合テスト的に確認:

```typescript
// __tests__/actions/plant-action.test.ts
describe("getPlants", () => {
  it("未ログインでも植物一覧を取得できる", async () => { ... });
  it("ログイン時はお気に入り情報が含まれる", async () => { ... });
});
```

---

## 10. リスク・注意事項

| リスク | 対策 |
|--------|------|
| `plant_have` → `plant_owns` のデータ移行漏れ | マイグレーションSQL内でINSERT...SELECTを使い、件数を検証 |
| import先変更の漏れ | `npm run build` で型エラーとして検出。grepで全箇所確認 |
| evaluation-action → post-action の改名による影響 | 全ファイルのimportを一括置換後にビルド確認 |
| RLSポリシーの設定漏れ | plant_ownsに対して既存plant_haveと同等のポリシーを適用 |
| Server Actionsの"use server"ディレクティブ消失 | リファクタリング時に各ファイル先頭の"use server"を維持 |

# サービス再設計 詳細設計書

作成日: 2026-03-22
更新日: 2026-03-23

---

## 1. 再設計の方針

### 1.1 基本原則

1. **アーキテクチャは変更しない** — 現行の Server Actions → Prisma 直接パターンを維持
2. **サービスレイヤーは導入しない** — 必要に迫られない限り現行構造を踏襲
3. **既存データモデルは使えるものを利用** — ただし負債は徹底的に解消し再作成
4. **段階的導入はしない** — このブランチで完成させてリリース
5. **フォトSNSコンセプト（concept-photo-sns-v2.md）に完全準拠**

### 1.2 コンセプト変更の要約

| 項目 | v1（現行） | v2（フォトSNS） |
|------|-----------|-----------------|
| 主な行動 | 植物を検索 → 評価を読む | フィードを眺める → 投稿する |
| 安全性の表現 | good/bad の明示的評価 | 共存実績の多さ（ポジティブリスト） |
| コンテンツの主役 | 植物データ | 猫と植物の写真 |
| ユーザー体験 | データベース検索ツール | SNSフィード |

---

## 2. データモデル変更

### 2.1 テーブル判断一覧

| テーブル | 判断 | 理由 |
|---------|------|------|
| `plants` | **維持** | 植物マスタとして引き続き利用 |
| `public_users` | **維持** | ユーザー管理の基盤 |
| `neko` | **維持** | 猫種マスタ |
| `pets` | **維持** | 猫プロフィール。投稿との紐付けに活用 |
| `posts` | **新規作成** | フォトSNSのコアテーブル（evaluationsを置き換え） |
| `post_images` | **新規作成** | 投稿画像（plant_imagesを置き換え） |
| `post_likes` | **新規作成** | いいね（evaluation_reactions, plant_favoritesを置き換え） |
| `evaluations` | **削除** | postsで置き換え |
| `evaluation_reactions` | **削除** | post_likesで置き換え |
| `plant_images` | **削除** | post_imagesに統合 |
| `plant_favorites` | **削除** | post_likesに統合 |
| `plant_have` | **削除** | 投稿から自動推定（PK名スペース混入の負債も解消） |
| `evaluation_type` enum | **削除** | good/bad評価は廃止 |
| `reaction_type` enum | **削除** | いいねは単一種類のみ |
| `mood` enum | **削除** | 未使用 |

### 2.2 新規テーブル定義

#### `posts` — 投稿（コアテーブル）

```prisma
model posts {
  id          Int          @id @default(autoincrement())
  user_id     Int
  plant_id    Int
  pet_id      Int?
  comment     String?      @db.VarChar
  created_at  DateTime     @default(now()) @db.Timestamptz(6)
  users       public_users @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  plants      plants       @relation(fields: [plant_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  pets        pets?        @relation(fields: [pet_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
  post_images post_images[]
  post_likes  post_likes[]

  @@index([plant_id])
  @@index([user_id])
  @@index([created_at(sort: Desc)])
  @@schema("public")
}
```

#### `post_images` — 投稿画像

```prisma
model post_images {
  id         Int      @id @default(autoincrement())
  post_id    Int
  image_url  String   @db.VarChar
  order      Int      @default(0)
  created_at DateTime @default(now()) @db.Timestamptz(6)
  posts      posts    @relation(fields: [post_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([post_id])
  @@schema("public")
}
```

#### `post_likes` — いいね

```prisma
model post_likes {
  id         Int          @id @default(autoincrement())
  post_id    Int
  user_id    Int
  created_at DateTime     @default(now()) @db.Timestamptz(6)
  posts      posts        @relation(fields: [post_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users      public_users @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([post_id, user_id])
  @@schema("public")
}
```

### 2.3 既存テーブルの変更

#### `plants` — リレーション更新

```prisma
model plants {
  // 既存フィールドは変更なし
  // リレーション変更:
  // - evaluations     → 削除
  // - plant_favorites → 削除
  // - plant_have      → 削除
  // - plant_images    → 削除
  // + posts           posts[]  ← 追加
}
```

#### `pets` — リレーション追加

```prisma
model pets {
  // 既存フィールドは変更なし
  // + posts posts[]  ← 追加（投稿との紐付け）
}
```

#### `public_users` — リレーション更新

```prisma
model public_users {
  // 既存フィールドは変更なし
  // リレーション変更:
  // - evaluation_reactions → 削除
  // - evaluations          → 削除
  // - plant_favorites      → 削除
  // - plant_have           → 削除
  // - plant_images         → 削除
  // + posts                posts[]       ← 追加
  // + post_likes           post_likes[]  ← 追加
}
```

### 2.4 データ移行

| 移行元 | 移行先 | 方針 |
|--------|--------|------|
| `evaluations` | `posts` | comment を移行。type(good/bad) は移行しない |
| evaluations の Storage 画像 | `post_images` | 評価に紐づく画像を投稿画像として移行 |
| `plant_images`（is_approved=true） | `post_images` | 承認済み画像を投稿として移行 |
| `evaluation_reactions`（type=good） | `post_likes` | good リアクションのみ like として移行 |
| `plant_favorites` | — | 移行しない（post_likesとは概念が異なる） |
| `plant_have` | — | 移行不要（投稿から自動推定） |

移行はPrismaマイグレーションSQL内で `INSERT ... SELECT` を使って実行する。

---

## 3. 安全性指標の算出ロジック

### 共存実績スコア

```sql
-- 共存猫数（ユニーク猫数）
SELECT COUNT(DISTINCT pet_id) FROM posts WHERE plant_id = ? AND pet_id IS NOT NULL

-- 共存投稿数
SELECT COUNT(*) FROM posts WHERE plant_id = ?
```

### 表示ランク

| 共存猫数 | 表示 |
|---------|------|
| 50以上 | 「多くの猫と暮らしています」（高い共存実績） |
| 10〜49 | 「XX匹の猫と暮らしています」（共存実績あり） |
| 1〜9 | 「XX匹の猫との暮らしが報告されています」（少数の実績） |
| 0 | 「猫との共存情報がありません ⚠️ 注意してください」 |

---

## 4. Server Actions 変更

### 4.1 ファイル変更一覧

| 変更前 | 変更後 | 内容 |
|--------|--------|------|
| `evaluation-action.ts` | `post-action.ts` | 完全書き換え。posts/post_images/post_likes を操作 |
| `plant-action.ts` | `plant-action.ts` | 大幅修正。favorite/have/評価集計を削除、共存実績集計を追加 |
| `user-action.ts` | `user-action.ts` | 大幅修正。evaluation/favorite/have関連を削除、post関連を追加 |
| `plant-identification-action.ts` | `plant-identification-action.ts` | 変更なし |
| `news-action.ts` | `news-action.ts` | 変更なし |
| `neko-action.ts` | `neko-action.ts` | 変更なし |

### 4.2 `post-action.ts`（新規 — evaluation-action.ts を置き換え）

```typescript
// 投稿一覧（フィード）
export async function getFeedPosts(page?: number, pageSize?: number):
  Promise<{ posts: Post[]; totalCount: number }>

// 植物別投稿一覧
export async function getPostsByPlantId(plantId: number, page?: number, pageSize?: number):
  Promise<{ posts: Post[]; totalCount: number }>

// 投稿作成
export async function createPost(
  plantId: number, petId: number | null, comment: string | null, images: File[]
): Promise<ActionResult<{ postId: number }>>

// 投稿削除
export async function deletePost(postId: number): Promise<ActionResult>

// いいね追加
export async function addLike(postId: number): Promise<ActionResult>

// いいね削除
export async function deleteLike(postId: number): Promise<ActionResult>
```

### 4.3 `plant-action.ts`（修正）

```typescript
// 維持（修正あり）
export async function getPlants(sortBy?, page?, pageSize?):
  Promise<{ plants: Plant[]; totalCount: number }>
  // → goodCount/badCount を coexistenceCatCount/coexistencePostCount に変更
  // → filter の "safe"/"danger" を廃止
  // → "coexistence" ソート（共存実績順）を追加

export async function searchPlants(query, sortBy?, page?, pageSize?):
  Promise<{ plants: Plant[]; totalCount: number }>
  // → 同上

export async function searchPlantName(name):
  Promise<{ id: number; name: string }[]>
  // → 変更なし

export async function getPlant(id):
  Promise<Plant | undefined>
  // → isFavorite/isHave/goodCount/badCount を削除
  // → coexistenceCatCount/coexistencePostCount を追加
  // → 関連投稿一覧を追加

export async function addPlant(name, image?): Promise<ActionResult<{ plantId: number }>>
  // → 変更なし

export async function updatePlant(id, plant): Promise<ActionResult<{ plantId: number }>>
  // → 変更なし

export async function deletePlant(id): Promise<ActionResult>
  // → 変更なし

// 削除する関数
// - getPlantImages → 投稿画像に統合
// - addPlantImage → 投稿フローに統合
// - addFavorite / deleteFavorite → post_likes に置き換え
// - addHave / deleteHave → 投稿から自動推定
```

### 4.4 `user-action.ts`（修正）

```typescript
// 維持（変更なし）
export async function getUserProfile(aliasId): Promise<UserProfile | undefined>
export async function getUserProfileByAuthId(): Promise<UserProfile | undefined>
export async function getUserData(authId): Promise<UserData | null>
export async function getUserPets(userId): Promise<Pet[] | undefined>
export async function updateUser(name, aliasId): void
export async function updateUserImage(image): void
export async function addPet(name, speciesId, image?, sex?, birthday?, age?): void
export async function updatePet(petId, name, speciesId, image?, sex?, birthday?, age?): Promise<ActionResult>
export async function deletePet(petId): void

// 修正
export async function getUserPosts(userId):
  Promise<(Post & { plant: Plant })[] | undefined>
  // → getUserEvaluations を置き換え。posts テーブルから取得

export async function getUserPostImages(userId):
  Promise<{ id: number; postId: number; plantName: string; imageUrl: string; createdAt: Date }[] | undefined>
  // → post_images テーブルから取得に変更

// 削除する関数
// - getUserPlants → 投稿から自動集計に変更（getUserPosts で代替）
// - deleteHavePlant → plant_have 廃止
// - getUserEvaluations → getUserPosts に置き換え
// - getUserFavoritePlants → plant_favorites 廃止
// - deleteFavoritePlant → plant_favorites 廃止
// - deletePostImage → post-action.ts に移動
```

---

## 5. 型定義の変更

### 5.1 `types/post.ts`（新規 — evaluation.ts を置き換え）

```typescript
export type Post = {
  id: number;
  comment: string | null;
  createdAt: Date;
  pet?: Pet;
  imageUrls: string[];
  likeCount: number;
  isLiked: boolean;
  user: { aliasId: string; name: string; imageSrc?: string };
  plant?: { id: number; name: string };
};
```

### 5.2 `types/plant.ts`（修正）

```typescript
export type Plant = {
  id: number;
  name: string;
  mainImageUrl?: string;
  scientific_name?: string;
  family?: string;
  genus?: string;
  species?: string;
  coexistenceCatCount: number;   // 共存猫数（旧 goodCount を置き換え）
  coexistencePostCount: number;  // 共存投稿数（旧 badCount を置き換え）
  // 削除: isFavorite, isHave, goodCount, badCount
};
```

### 5.3 削除するファイル

| ファイル | 理由 |
|---------|------|
| `types/evaluation.ts` | `types/post.ts` に置き換え |

### 5.4 変更なしのファイル

| ファイル | 理由 |
|---------|------|
| `types/common.ts` | ActionResult, ActionErrorCode はそのまま利用 |
| `types/user.ts` | UserProfile, UserData はそのまま利用 |
| `types/neko.ts` | Pet, NekoSpecies はそのまま利用 |

---

## 6. ページ・ルーティング変更

### 6.1 ルート変更一覧

| ルート | 変更 | 内容 |
|--------|------|------|
| `/` (ホーム) | **大幅修正** | 植物一覧 → フィード（新着投稿タイムライン）に変更 |
| `/plants` | **修正** | 共存実績ベースのソート・表示に変更。safe/dangerフィルタ廃止 |
| `/plants/[id]` | **修正** | 評価一覧 → 関連投稿一覧、共存実績表示に変更 |
| `/plants/[id]/edit` | 変更なし | — |
| `/plants/new` | 変更なし | — |
| `/posts/new` | **修正** | good/bad選択を廃止。猫選択を追加。フォトSNS投稿フローに |
| `/[aliasId]` | **修正** | ユーザーの投稿ギャラリーに変更 |
| `/[aliasId]/posts` | **修正** | 投稿一覧をpost対応に変更 |
| `/admin/evaluations` | **修正** | `/admin/posts` に変更。投稿モデレーション |
| `/admin/plant-images` | **削除** | post_imagesに統合（admin/postsで管理） |
| `/settings/*` | 変更なし | — |
| `/news/*` | 変更なし | — |
| `/(auth-pages)/*` | 変更なし | — |
| `/contact` | 変更なし | — |
| `/privacy`, `/terms` | 変更なし | — |

### 6.2 ホームページ（フィード）の設計

- **レイアウト:** カード型の縦スクロールフィード
- **各投稿カード:**
  - 投稿者情報（アイコン、名前）
  - 写真（メイン）
  - 植物名タグ（タップで植物ページへ）
  - 猫の名前・種類
  - いいねボタン + 数
  - コメント（あれば）
  - 投稿日時
- **ページネーション:** 無限スクロール or ページネーション

### 6.3 植物詳細ページの変更

| 要素 | v1 | v2 |
|------|----|----|
| 安全性表示 | good/bad カウント | 共存実績サマリー |
| メインコンテンツ | 評価一覧 | 関連投稿ギャラリー |
| お気に入りボタン | あり | 廃止 |
| 所持ボタン | あり | 廃止（投稿から自動推定） |
| 植物情報 | 学名・科・属・種 | 維持 |

---

## 7. Storage バケット変更

### 7.1 変更方針

| バケット | 変更 | 内容 |
|---------|------|------|
| `plants` | **廃止** | plant_images 用。post_images に統合 |
| `evaluations` | **リネーム or 廃止** | `posts` バケットに移行 |
| `posts` | **新規作成** | 投稿画像用の統一バケット |
| `user_profiles` | 変更なし | — |
| `user_pets` | 変更なし | — |

### 7.2 Storage パス設計

```
posts/{post_id}/{image_name}     ← 投稿画像
user_profiles/{user_id}/{name}   ← ユーザープロフィール画像（既存）
user_pets/{pet_id}/{name}        ← ペット画像（既存）
```

---

## 8. 実装タスク一覧

このブランチで一括実装する。推奨順序:

| # | タスク | 詳細 |
|---|--------|------|
| 1 | Prismaスキーマ変更 | posts, post_images, post_likes 追加。旧テーブル削除。enum削除 |
| 2 | マイグレーション実行 | データ移行SQL含む。`npx prisma migrate dev` |
| 3 | 型定義の更新 | `types/post.ts` 新規作成、`types/plant.ts` 修正、`types/evaluation.ts` 削除 |
| 4 | `post-action.ts` 作成 | `evaluation-action.ts` を置き換え。CRUD + いいね |
| 5 | `plant-action.ts` 修正 | favorite/have/評価集計を削除、共存実績集計を追加 |
| 6 | `user-action.ts` 修正 | evaluation/favorite/have 関連を削除、post 関連を追加 |
| 7 | ホームページ変更 | フィード型UIに変更 |
| 8 | 投稿フロー変更 | `/posts/new` をフォトSNS投稿フローに修正 |
| 9 | 植物詳細ページ変更 | 共存実績表示 + 関連投稿ギャラリー |
| 10 | 植物一覧ページ変更 | 共存実績ベースの表示・ソート |
| 11 | ユーザープロフィール変更 | 投稿ギャラリー化 |
| 12 | 管理者ページ変更 | evaluations → posts 対応 |
| 13 | コンポーネント更新 | 評価関連コンポーネントを投稿対応に書き換え |
| 14 | Storage バケット対応 | posts バケット作成、パス変更 |
| 15 | 旧ファイル削除 | `evaluation-action.ts`, `types/evaluation.ts`, 旧コンポーネント |
| 16 | テスト更新 | ユニットテスト + E2Eテストの修正 |
| 17 | ビルド確認 | `npm run build` の成功を確認 |

---

## 9. 影響範囲

### 9.1 変更が必要なファイル

| カテゴリ | ファイル | 変更内容 |
|---------|---------|---------|
| スキーマ | `prisma/schema.prisma` | posts系追加、旧テーブル・enum削除 |
| アクション | `src/actions/post-action.ts` | 新規作成（evaluation-action.ts の置き換え） |
| アクション | `src/actions/plant-action.ts` | 共存実績対応、favorite/have削除 |
| アクション | `src/actions/user-action.ts` | post対応、evaluation/favorite/have削除 |
| 型定義 | `src/types/post.ts` | 新規作成 |
| 型定義 | `src/types/plant.ts` | 共存実績フィールドに変更 |
| 型定義 | `src/types/evaluation.ts` | 削除 |
| ページ | `src/app/page.tsx` | フィード化 |
| ページ | `src/app/plants/[id]/page.tsx` | 共存実績 + 投稿ギャラリー |
| ページ | `src/app/plants/page.tsx` | 共存実績ベース表示 |
| ページ | `src/app/posts/new/page.tsx` | フォトSNS投稿フロー |
| ページ | `src/app/[aliasId]/page.tsx` | 投稿ギャラリー |
| ページ | `src/app/[aliasId]/posts/page.tsx` | post対応 |
| ページ | `src/app/admin/evaluations/page.tsx` | posts対応に変更 |
| コンポーネント | evaluation関連コンポーネント | post対応に書き換え |

### 9.2 変更不要なファイル

| ファイル | 理由 |
|---------|------|
| `src/actions/plant-identification-action.ts` | 独立性が高い。投稿フローから呼ぶだけ |
| `src/actions/news-action.ts` | Notion連携で独立 |
| `src/actions/neko-action.ts` | 猫種マスタ取得のみ |
| `src/app/settings/*` | プロフィール・アカウント設定は変更なし |
| `src/app/news/*` | ニュースは独立 |
| `src/app/(auth-pages)/*` | 認証フローは変更なし |
| `src/hooks/useUser.ts` | Supabase Auth依存で変更なし |
| `src/lib/*` | Prisma, Supabase設定は変更なし |
| `src/types/common.ts` | ActionResult等はそのまま利用 |
| `src/types/user.ts` | ユーザー型は変更なし |
| `src/types/neko.ts` | ペット型は変更なし |

---

## 10. リスク・注意事項

| リスク | 対策 |
|--------|------|
| データ移行漏れ（evaluations → posts） | マイグレーションSQL内で INSERT...SELECT + 件数検証 |
| Storage画像の移行 | 既存バケットの画像パスを維持するか、新バケットへコピーするか要判断 |
| import先変更の漏れ | `npm run build` で型エラーとして検出。grepで全箇所確認 |
| evaluation-action を参照するコンポーネントの修正漏れ | ビルドエラーで検出 |
| RLSポリシーの設定 | 新テーブル（posts, post_images, post_likes）にRLS設定が必要 |
| 既存ユーザーのお気に入りデータ消失 | plant_favorites は移行しない方針。事前告知が望ましい |
| "use server" ディレクティブ | post-action.ts 作成時に先頭に記載を忘れない |

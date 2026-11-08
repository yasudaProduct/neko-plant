# コーディング規約

`.cursor/rules/neko-plant.mdc` はこのドキュメントを参照します。**規約の正はこのファイルです。**

## ディレクトリの使い分け

| 置き場所 | 何を置くか |
| --- | --- |
| `src/app/<route>/` | そのページでしか使わないコンポーネント |
| `src/components/` | 複数ページで使う共通コンポーネント（shadcn/ui ベース） |
| `src/actions/` | Server Actions（データ取得・変更） |
| `src/lib/` | ユーティリティ、外部サービス連携、定数 |
| `src/hooks/` | カスタムフック |
| `src/contexts/` | React Context |
| `src/types/` | 型定義 |

**最初はページ配下に置き、2箇所目で使うときに `components/` へ上げる**方針です。

## 命名

| 対象 | 規則 | 例 |
| --- | --- | --- |
| コンポーネントファイル | PascalCase | `UserManagement.tsx` |
| ライブラリ・アクション | kebab-case | `plant-identification-action.ts` |
| 動的ルート | ブラケット | `[aliasId]`, `[id]` |
| ルートグループ | 丸括弧 | `(auth-pages)` |

## Server Actions

### 認可は自分で書く

**Prisma は RLS をバイパスします。** DB が守ってくれないので、Server Action 内で明示的に検証してください。

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();  // getSession() は使わない
if (!user) return { success: false, code: ActionErrorCode.AUTH_REQUIRED, ... };
// user.id（auth_id）を使って所有者チェックを行う
```

- `getSession()` は **JWT 署名を検証しない**ため認可に使わない
- 他人のリソースを触れないことを、必ず `where` 句か明示的な比較で担保する

### `"use server"` に置いてよいものの判断

`"use server"` の関数は**クライアントから任意の引数で直接呼べるエンドポイント**になります。

`role` など権限に関わる情報を返す関数は `"use server"` に置かないでください
（例: `src/lib/user-data.ts` の `getUserData()` はあえて Server Action にしていません）。

### クライアント由来の値は再検証する

特に画像パス。`isValidOwnedImagePath()`（`src/lib/storage-path.ts`）を通してください
（[../03-architecture/storage.md](../03-architecture/storage.md#パス偽装への対策) 参照）。

### 戻り値の型

`ActionResult` / `ActionErrorCode`（`src/types/common.ts`）を使い、
成功・失敗とエラーコードを構造化して返します。

## 定数

マジックナンバーは `src/lib/const.ts` に定義します（枚数上限、文字数上限、画像サイズ、レート制限など）。
複数箇所で同じ値を使う場合は必ず定数化してください。

## スタイリング

- CSS は **Tailwind CSS** で記述する
- 色は `tailwind.config.ts` の**セマンティックトークン**（`primary` / `secondary` / `muted` /
  `destructive` / `accent` など、CSS変数ベース）を使う。個別の色指定（`text-green-600` など）は
  トークンで表現できない場合に限る
- 配色は「窓辺の鉢植え」: 紙のような暖かい白の地に、ブランドの深緑（`#2d5a27`）を1色だけ置く。値は `src/app/globals.css` の `:root`

  | トークン | 用途 |
  | --- | --- |
  | `bg-background` / `bg-card` | ページの地 / カード |
  | `bg-secondary` | 一段上げた面（選択中のナビ、チップ、ホバー） |
  | `text-ink` / `text-ink-secondary` / `text-ink-muted` | 文字の3役（本文 / 補足 / メタ情報）。`gray-*` は使わない |
  | `primary` | 主ボタン・選択中・リンク・グラフで強調する1本だけ。面の色には使わない |
  | `noinfo` | 共存実績「情報なし」の意味色。危険の断定には使わない |
  | `border-border` | 髪の毛線の境界線 |

- **植物名は園芸ラベル型（`.np-label`、左端がとがった札）で示す**。このサービスの目印なので植物名以外には使わない（猫は丸いチップ）。札の色は `[--np-label-bg:...]` で変える
- 文字のウェイトは 400 / 500 を使う（見出しも 500）。700 は既存ページの強調用に残しているだけ
- アイコンは lucide を `strokeWidth={1.5}`、文中・ボタンは 16px（`size-4`）、いいね・下部タブなど指で押すものは 20px（`size-5`）
- 動きは `transition-colors` などの名前付きプロパティだけにし、イージングは `cubic-bezier(0.22, 1, 0.36, 1)`（Tailwind の既定値に設定済み）
- **レスポンシブ対応は必須**。モバイルは単一カラム、デスクトップは適宜マルチカラム
- shadcn/ui のコンポーネントがある場合はそれを使う（`components.json` で管理）

## エラー表示

ユーザー向けのエラーメッセージは**日本語**で、何をすればよいか分かる文言にします。

```
✗ "Failed to upload image"
✓ "画像のアップロードに失敗しました。時間をおいて再度お試しください。"
```

## 表現のルール（プロダクト固有）

**植物の安全性について「危険」と断定しません。** 投稿がない植物は「情報がない」と表現します。

文言の生成は `src/lib/coexistence.ts` に集約されています。
背景は [../01-product/service-description.md](../01-product/service-description.md) §5 を参照してください。

## データベース

**スキーマの正は `supabase/migrations/*.sql`** です。

- `prisma/schema.prisma` は `prisma db pull` で生成される成果物。**手で編集しない**
- `prisma db push` / `prisma migrate` は**使わない**
- 新規テーブルには原則 RLS を設定し、`supabase/tests/01_rls_structure.sql` も更新する

手順は [../04-operations/database.md](../04-operations/database.md) を参照してください。

## 本番環境の操作

**本番 Supabase への変更操作は事前確認なしに行わないでください。**
MCP 接続で本番プロジェクト（`neko-plant`）を操作できてしまうため、特に注意が必要です。

## GitHub

- リポジトリ: `yasudaProduct/neko-plant`
- プロジェクト管理は GitHub Issues
- PR は `develop` 向け。`main` へのマージで本番デプロイと DB マイグレーションが走ります

# UIレビュー 🟡操作性(#9〜16)の改善プラン

## Context

UIレビュー(本セッション、実機スクリーンショット48枚+全画面コードレビュー)の優先度高🔴8件は実装済み(PR #108、コミット `9ba9ef7`〜`3303392`)。本プランはその続き=優先度提案「次のスプリント(操作性)」**#9〜16**を対応する。モバイル操作性が中心で、フォトSNSとして最も使われるスマホでの日常操作(回遊・投稿・いいね)の使い勝手を引き上げる。

前提: 検証環境は構築済み(ローカルSupabase+dev server+Playwright撮影スクリプト)。ブランチは `claude/ui-improvement-review-110nnk`(push すると PR #108 が自動更新される)。

## 変更内容

### 1. #9+#10: モバイルを下部固定タブバーに再編 — コミット1

**新規 `src/components/BottomNav.tsx`**(client component):
- 5項目: フィード(`/`)・図鑑(`/zukan`)・**投稿(`/posts/new`、中央の強調ボタン)**・さがす(`/plants`)・マイページ(ログイン時 `/{aliasId}`、未ログイン時 `/signin`)
- `fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white border-t border-border`、セーフエリア対応 `pb-[env(safe-area-inset-bottom)]`
- アイコン+テキストラベル(text-[10px])の縦積み。`usePathname()`でアクティブ状態(HeaderNavの`isActive`ロジックを踏襲)。各リンク高さ≥44px(`py-2`+アイコン20px+ラベル)
- 中央の投稿ボタンは円形グリーン(`bg-green-600 text-white rounded-full w-12 h-12 -mt-4 shadow`)。未ログインタップ時は既存middleware(`src/middleware.ts` の `/posts/new` 保護)が `/signin` へ誘導するのでクライアント側の分岐は不要
- `data-testid="bottom-nav"` と各項目にtestidを付与(E2E用)

**組み込み**(`src/components/Header.tsx`):
- Header(server component、既に `getUserProfileByAuthId()` 取得済み)がフラグメントで `<BottomNav aliasId={...} isLoggedIn={...} />` を併せて返す(fixed配置なのでDOM上はheader内でも問題ない。プロフィール取得の重複クエリを増やさない)
- ヘッダー側のモバイル表示を整理: `HeaderNav` に `max-sm:hidden`(アイコンのみで意味不明だった3リンクはタブバーに移管)、モバイル用カメラボタン(`Header.tsx:46-50`)を削除(中央の投稿タブに移管)。**デスクトップは無変更**

**下部バーとの重なり回避**(`src/app/layout.tsx`): `<main>` に `max-sm:pb-20` を追加(フッター最下部がタブバーに隠れないように)

### 2. #11+#12+#16: フィードカードの操作性 — コミット2

- **#11 いいねのタップ領域**(`src/components/np/LikeButton.tsx`): buttonに `p-2 -m-2`(見た目不変で実効44px確保)。投稿詳細(size="lg")も同様
- **#12 モバイルで猫チップ表示**(`src/components/np/PostCard.tsx:52-61`): ヘッダー右の猫チップ(`max-sm:hidden`)はデスクトップ用に維持し、本文セクション(植物タグの行の上)に `sm:hidden` の猫チップ行を追加(モバイルでも「猫×植物」の中核情報が見えるように)。3匹以上の「+N」表記は既存ロジックを共通化して流用
- **#16 共存バッジをタップ可能に**(`PostCard.tsx:95-103`): PlantTag横の `CoexistBadge` を `<Link href={/plants/${plant.id}} className="pointer-events-auto">` でラップ(現状はタップすると意図せず投稿詳細に飛ぶ。バッジ=実績表示なので植物ページへ)。CoexistBadge自体は無変更

### 3. #13+#15: 行き止まりの解消 — コミット3

- **#13 検索0件時の導線**(`src/components/np/EmptyState.tsx` + `src/app/plants/page.tsx`):
  - EmptyStateに任意の `action?: React.ReactNode` propを追加(テキスト下に描画するだけの小変更)
  - /plants の植物タブ0件時: 「共存図鑑で全植物を見る」ボタン(→`/zukan`)+「投稿時には新しい植物名を登録できます」の補足文を action で渡す。投稿タブ0件時: 「絞り込みを解除する」リンク(→`/plants?tab=posts`)
- **#15 投稿ボタンの無効理由**(`src/app/posts/new/PostFlow.tsx:582-601` フッターナビ):
  - `!canSubmit && !isSubmitting` のとき、ボタンの上に不足項目を1行表示: 「あと 写真の選択 / 植物の選択 / 猫の選択 が必要です」(photoDone/plantDone/petDone から未完了のものだけを列挙、`text-xs text-gray-500`)。全て揃えば消える

### 4. #14 ページネーション(もっと見る/無限スクロール)は**今回見送り**

フィードのデータ取得をクライアント追記型に作り替える必要があり(サーバーコンポーネント→client feed への再設計)、このトランシェの他7件と粒度が違うため。レビュー報告どおり中期課題として別PRを推奨。

## E2Eへの影響(実装時に必ず確認)

- `@mobile` タグのE2E(`playwright.config.ts:59-65`、Pixel 5)がヘッダーナビ/カメラボタンをタップしている場合、下部タブバーのtestidに差し替える(`e2e/navigation.test.ts`・`e2e/feed.test.ts`・`e2e/post-flow.test.ts` を実装前にgrepし、`max-sm:hidden` 化した要素への依存を洗い出す)
- PostCardの構造変更(#12/#16)は `post-card-link` オーバーレイのクリック領域に影響しないこと(`pointer-events-auto` の付け忘れに注意)

## 検証

1. `npm run lint` / `npm test` / `npm run build`
2. Playwright再撮影(390x844 + 1440x900):
   - モバイル: 全主要ページで下部タブバー表示・アクティブ状態・フッターが隠れない・ヘッダーがロゴ+ログイン/アバターだけになる
   - デスクトップ: ヘッダー/フィードが**修正前と同一**(回帰なし)
   - フィード: モバイルで猫チップが本文に表示、いいねタップ領域、バッジタップで植物ページへ遷移
   - /plants?q=存在しない名前: 0件導線(図鑑ボタン)表示
   - /posts/new: 写真だけ選んだ状態で「あと 植物の選択 / 猫の選択 が必要です」表示→全選択で消えて投稿可能
3. E2E: `npm run e2e -- --grep @mobile` と `--grep @public` をローカル実行し、必要なら selector を更新
4. push(PR #108 が自動更新される)

## コミット構成

1. `feat(nav): モバイルに下部タブバーを追加しヘッダーを整理`(BottomNav新規、Header/HeaderNav/layout調整、E2E selector追随)
2. `fix(feed): カードの操作性改善`(いいねタップ領域、モバイル猫チップ、共存バッジのリンク化)
3. `fix(ux): 検索0件と投稿フォームの行き止まりを解消`(EmptyState action、投稿ボタンの不足項目ヒント)

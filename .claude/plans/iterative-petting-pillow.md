# UIレビュー優先度高(🔴 #1〜8)の修正プラン

## Context

UIレビュー(本セッション前半、実機スクリーンショット48枚+コードレビュー)で洗い出した改善点のうち、ユーザー指示「優先度高いもの」= 🔴 8件を修正する。

- **#1〜5**: スマホ(390px)で実際に崩れている表示バグ
- **#6〜8**: 機能として壊れているUI

#6はユーザー確認済み: **usersテーブルにbioカラムを追加し、保存+公開プロフィール表示まで実装**。

検証環境は構築済み: ローカルSupabase(54321/54322)+dev server(localhost:3000)起動中、シード済み、Playwright撮影スクリプトあり(`scratchpad/shoot.js`)。ブランチ `claude/ui-improvement-review-110nnk` チェックアウト済み。

## Phase 1: モバイル表示崩れのCSS修正(#1〜5) — コミット1

1. **図鑑行の「N匹」見切れ** `src/app/zukan/page.tsx:88-104` — モバイルは2行に折る(sm以上は現状と完全同一):
   - 行Link: `flex items-center gap-4 px-5 py-3.5` → `flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-3.5`
   - 名前span: `w-36 shrink-0 ...` → `flex-1 min-w-0 ... sm:flex-none sm:w-36`(`min-w-0`を落とさない=truncate維持)
   - バーspan: `flex-1 min-w-[60px]` → `order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-[60px]`
   - No・匹数・バッジ等は無変更。`data-testid="zukan-row"`とテキスト維持(e2e/search-zukan.test.ts:74-88はレイアウト非依存で影響なし)
2. **カタログ表ラベル縦割れ** `src/app/plants/[id]/page.tsx:206-224` — 6つの`dt`に`whitespace-nowrap`追加
3. **設定タブ折り返し** `src/app/settings/layout.tsx:21-55` — タブ行に`overflow-x-auto`、各タブ`shrink-0 whitespace-nowrap text-sm`。あわせて不正な`<Link><button>`入れ子を`<Link className=...>`直スタイルへ(見た目同一。text-smはPCでも16→14pxになるが許容)
4. **フッター折り返し** `src/components/Footer.tsx:7-11` — `flex flex-wrap justify-center gap-x-4 gap-y-2`+各リンク`whitespace-nowrap`
5. **iOS入力ズーム** `src/components/ui/input.tsx:13` — `text-sm`→`text-base md:text-sm`(textarea.tsx:12と同一パターン。使用箇所でのサイズ上書きなしを確認済み)

## Phase 2: bio保存対応(#6) — コミット2(DB) + コミット3(アプリ)

**DB(CLAUDE.md手順厳守。`prisma db push`/`prisma migrate`禁止)**:
```
npx supabase migration new add_users_bio   # SQL: alter table public.users add column bio varchar;
npx supabase db reset
npm run db:pull      # schema.prisma差分が public_users.bio 1行のみなこと確認(他が出たら停止して報告)
npm run seed:e2e     # resetで消えるため再投入
# dev server再起動(Prisma Client再生成の反映)
```
- RLS/ポリシー/一意Index変更なし → pgTAP更新不要(構造テストは列を検査しないことを確認済み)
- コミット2 = migration SQL + schema.prisma のセット

**アプリ側(コミット3)**:
- `src/lib/const.ts`: `MAX_USER_BIO_LENGTH = 300` 追加
- `src/actions/user-action.ts`:
  - `getUserProfile`(:21): selectに`bio: true`、返却に`bio: userData.bio ?? undefined`
  - `getUserProfileByAuthId`(:52): 返却に`bio`追加(select無しのため返却のみ)
  - `updateUser(name, aliasId, bio?: string)`(:150): 既存throwスタイルで検証を追加し、**bio未指定時に既存値を消さない**条件スプレッドで更新:
    `data: { name, alias_id: aliasId, ...(bio !== undefined ? { bio: bio.trim() || null } : {}) }`(空文字はnull化)。
    `revalidatePath("/settings/profile")`に加え`revalidatePath(\`/${aliasId}\`)`も実行(公開プロフィールの古いbio/名前対策)
- `src/app/settings/profile/AccountPageContent.tsx`:
  - zod: `bio: z.string().max(MAX_USER_BIO_LENGTH, ...).optional()`追加、nameのmaxメッセージ「7文字以内」→「20文字以内」に修正
  - **aliasIdのclient/server検証不一致も同時修正**(client `/^[a-zA-Z0-9]+$/`・server `/^[a-zA-Z]+$/`(:180)。数字入りが汎用エラートーストになる罠。zodをサーバに合わせ`/^[a-zA-Z]+$/`+メッセージ「ユーザーIDは半角英字で…」にし、「表示名」表記も「ユーザーID」へ)
  - `defaultValues`に`bio: userProfile.bio ?? ""`追加、3フィールドとも`defaultValue`/`value`/`onChange`を削除し`{...field}`化(controlled/uncontrolled警告の根治)、Textareaに`maxLength`
  - submit: `updateUser(formData.name, formData.aliasId, formData.bio)`
- `src/app/[aliasId]/page.tsx`(:112直後): `{userProfile.bio && <p className="pt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">…</p>}`
- テスト `src/__test__/actions/user-action.test.ts`(:164-): bio 301字で`rejects`+update未呼び出し、bio付き正常系(`'こんにちは'`→そのまま/空白のみ→`null`)を追加。既存正常系は条件スプレッド採用により無変更でpass
- doc: `doc/03-architecture/data-model.md`のusers行にbioを追記(doc/README対応表に従う。security.mdはカラム列挙なしのため対象外)

## Phase 3: /newsクラッシュ対策(#7) — コミット4

- `src/actions/news-action.ts:40-47`: `getNews()`のcatchで`throw`→`return []`(console.error維持)。目的は/newsページの白画面解消(news/page.tsxは空配列で「お知らせはありません」表示済み。sitemap.tsは既にtry/catch済みで影響なし)。`getNewsById`はthrow維持
- `src/app/error.tsx` **新規作成**: `"use client"`、`{ error, reset }`を受ける標準エラーバウンダリ。not-found.tsxと同じトーン(PawPrint+「一時的な問題が発生しました」+`reset()`再試行ボタン+ホームへ戻る)。エラー内容は画面に出さずconsoleのみ。root layout自体のエラーは対象外(layoutはデータ取得をしないため許容)

## Phase 4: /contactフォールバック(#8) — コミット5

`src/app/contact/page.tsx`: iframeに`title="お問い合わせフォーム"`、下に「フォームが表示されない場合は こちら」リンク(`/ebd/`を除いた通常URL `https://confirmed-giant-27d.notion.site/1c69f17f06688007995fc3497043f841` を`target="_blank" rel="noopener noreferrer"`で)

## 検証

1. `npm run lint` / `npm test` / `npm run build` すべてpass
2. Playwright再撮影(390x844 + 1440x900):
   - /zukan: 全行で「N匹」が見切れない(モバイル2行化)。**PCは修正前と同一**
   - /plants/[id]: カタログ表のラベルが横書き1行
   - /settings/*: タブが語中で折れない
   - フッター: 項目単位で折り返し
   - /contact: フォールバックリンク表示
3. bio実機フロー(/signin/dev → e2e@example.com/password): 設定で自己紹介入力→保存→リロードで残存→公開プロフィール`/testuser`に表示。空で保存→表示が消える(null)。/settings/profileでコンソール警告が出ない
4. /news: ローカル(Notion未設定)で白画面にならず「お知らせはありません」
5. e2e必要時: `npm run e2e -- --grep @public`(search-zukan含む)

## コミット/プッシュ

- 5コミット構成(上記Phase単位)、ブランチ `claude/ui-improvement-review-110nnk` へ `git push -u origin`
- `.env.local`(gitignore済み)と`supabase/storage/`空ディレクトリ(git管理外)は含めない。PRは指示があるまで作らない

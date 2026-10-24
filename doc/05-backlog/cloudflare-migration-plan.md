# Vercel → Cloudflare Workers 移行計画

> **ステータス: 計画（未着手）**。現行のデプロイ構成は [../04-operations/deployment.md](../04-operations/deployment.md) です。
> 移行が完了したら、本書の「後片付け」に挙げたドキュメントを更新し、本書は `99-archive/` へ移します。

## 1. 方針

| 項目 | 方針 |
| --- | --- |
| 移すもの | **Next.js アプリのホスティングだけ**（Vercel → Cloudflare Workers） |
| 移さないもの | Supabase（DB / Auth / Storage）。**データ移行は発生しない** |
| 実行方式 | [OpenNext の Cloudflare アダプタ](https://opennext.js.org/cloudflare)（`@opennextjs/cloudflare`）で Workers 上の Node.js 互換ランタイムに載せる。Edge ランタイム前提の旧 `next-on-pages`（Pages）は使わない |
| 進め方 | **両方で動く変更を先に Vercel で本番に出し、最後に基盤だけを切り替える**。切替の PR を小さくし、問題が出たときに原因を基盤に絞り込めるようにする |
| ロールバック | DB が共通なので、**DNS を Vercel に戻すだけ**で戻せる。安定するまで Vercel プロジェクトは消さない |

### 今回やらないこと

- Next.js 16 への更新（OpenNext は 15.5 系と 16.4.1 以上の両方をサポートしているので、移行後に別で行う）
- 投稿画像の R2 への移行、DB の D1 化
- middleware を Node.js ランタイム（`runtime: "nodejs"`）に変えること。OpenNext ではこれが実験扱いのため、今の Edge middleware のまま移す

### 調査時点の前提（2026-10-24）

| 項目 | 値 | 確認方法 |
| --- | --- | --- |
| `@opennextjs/cloudflare` | 1.20.13。peer は `next >=15.5.28 <16 \|\| >=16.4.1`、`wrangler ^4.148.0` | npm |
| 本リポジトリの Next.js | 15.5.28 → **そのままアダプタの対象範囲内** | `package-lock.json` |
| Prisma | 現在 6.4.1。安定版は **7.10.1**（`@prisma/client` / `@prisma/adapter-pg` とも） | npm |
| `prisma` CLI の `latest` タグ | **8.0.0-rc.27 を指している**（RC）。`npm i prisma@latest` は使わず、`7.10.1` を明示する | npm dist-tags |
| Prisma 7 の Node 要件 | `^20.19 \|\| ^22.12 \|\| >=24`。CI の 22.14.0 は条件を満たす | npm engines |

Cloudflare の制限値や料金は、この調査環境から公式ドキュメントに接続できなかったため、**Phase 0 で公式の値を確かめてから確定**します。
本書に書いた数値は、確認が取れるまでは目安として扱ってください。

## 2. Vercel 依存の棚卸し

コードと設定を洗い出した結果です。「対応」の列は、後述のどのフェーズで扱うかを示します。

| # | 箇所 | 現状 | Cloudflare での問題 / 扱い | 対応 |
| --- | --- | --- | --- | --- |
| D1 | `src/lib/prisma.ts` | モジュールスコープの `PrismaClient` シングルトン（Rust エンジン） | **Workers ではリクエストをまたいでソケットを使い回せない**。リクエストごとにクライアントを作り、driver adapter（`pg`）経由で Hyperdrive に繋ぐ必要がある | Phase 1・2 |
| D2 | `prisma/schema.prisma` の generator | `prisma-client-js`、`binaryTargets`、`previewFeatures = ["multiSchema"]` | Prisma 7 の Rust を使わないクライアントへ移る。`binaryTargets` は不要になる | Phase 1 |
| D3 | `next/image`（15ファイル） | Vercel の画像最適化。`formats: avif/webp`、Supabase Storage を `remotePatterns` で許可 | Cloudflare Images の `IMAGES` バインディングに置き換える（コード変更なし、設定のみ） | Phase 2 |
| D4 | キャッシュ | `unstable_cache`（Notion のお知らせ、1時間）、`sitemap.ts` の `revalidate = 3600`、`revalidatePath` 14箇所 | OpenNext のキャッシュ（R2 / D1 / キュー）を設定しないと、再検証が効かないか古いまま残る | Phase 2 |
| D5 | `src/lib/report-error.ts` | `void notify()`。レスポンスを返した後に Webhook を送る | **Workers はレスポンス後に `waitUntil` へ渡していない処理を打ち切ることがある**。Next.js の `after()` に載せ替える | Phase 1 |
| D6 | `src/lib/notion.ts` | `@notionhq/client` 2.3.0（既定で `node-fetch` を使う） | `nodejs_compat` 下でも `node-fetch` が動くかは不確実。`fetch: globalThis.fetch` を渡して標準の fetch を使う | Phase 1 |
| D7 | `src/lib/supabase/middleware.ts` | `Buffer` と `crypto.randomUUID()` で CSP nonce を生成 | `nodejs_compat` で動く想定。Phase 3 で nonce 付き CSP の動作を確認する | Phase 3 |
| D8 | `next.config.ts` の `headers()` | HSTS などのセキュリティヘッダを全パスに付与 | **Workers の静的アセット（`/_next/static/*` や `public/`）は Worker を通らずに配信される**ため `headers()` が効かない。`public/_headers` で同じヘッダを付ける | Phase 2 |
| D9 | ビルド | `npm run vercel-build`（`prisma generate && next build`） | `opennextjs-cloudflare build`。`postinstall` の `prisma generate` はそのまま使える | Phase 2 |
| D10 | デプロイ | Vercel の Git 連携（main → 本番、その他 → プレビュー） | Workers Builds（Cloudflare の Git 連携）か GitHub Actions に置き換える | Phase 2 |
| D11 | 環境変数 | Vercel のプロジェクト設定 | ビルド時の変数と実行時のシークレットに分けて登録する（[§5](#5-環境変数の置き場)） | Phase 2 |
| D12 | ログ | Vercel のログ（`reportError` の構造化 JSON） | Workers Logs（`observability.enabled`）と `wrangler tail` | Phase 2 |
| D13 | ドメイン | `neko-and-plant.com` が Vercel を指している | Cloudflare のゾーンに移し、Workers のカスタムドメインに付け替える | Phase 2・4 |
| D14 | 4.5MB 上限を前提にしたコメント・ドキュメント | `src/lib/const.ts`、`src/app/posts/new/PostFlow.tsx`、`storage.md`、`overview.md`、`CLAUDE.md` | Workers のリクエストボディ上限は Vercel より大きい。ただし直接アップロードの設計は残す（理由を「ボディ上限」から「Worker のメモリと処理時間」に書き換える） | Phase 5 |

**影響しないもの**: Supabase Auth / Storage へのブラウザからの直接アクセス、Google OAuth の設定（コールバックは Supabase 側の URL のため）、
GA4、`supabase-deploy.yml`（DB の反映経路）、pgTAP。Vercel Analytics や Speed Insights は使っていないので、置き換えるものはありません。

## 3. 移行後の構成

```
                         Cloudflare（neko-and-plant.com）
                        ┌──────────────────────────────────────────────┐
  ブラウザ ───────────▶ │ Static Assets（/_next/static, public/）       │
                        │        │ 該当なし                             │
                        │        ▼                                     │
                        │ Worker（OpenNext: middleware + Next.js）      │
                        │   ├─ IMAGES           next/image の最適化     │
                        │   ├─ R2               ISR / データキャッシュ   │
                        │   ├─ D1               タグキャッシュ(revalidatePath)
                        │   ├─ WORKER_SELF_REFERENCE  ISR の再検証キュー │
                        │   └─ HYPERDRIVE ──────┐                       │
                        └───────────────────────┼──────────────────────┘
                                                ▼ 接続プール
                                     Supabase PostgreSQL（Prisma の経路。RLS バイパスは今と同じ）

  ブラウザ ──────────▶ Supabase Auth / Storage（anon key。変更なし）
```

### バインディング

| バインディング | 種類 | 用途 |
| --- | --- | --- |
| `ASSETS` | Static Assets | ビルド成果物の静的ファイル |
| `HYPERDRIVE` | Hyperdrive | Prisma（`pg`）から Supabase への接続プール |
| `NEXT_INC_CACHE_R2_BUCKET` | R2 | `unstable_cache` と ISR（sitemap）の保存先 |
| `NEXT_TAG_CACHE_D1` | D1 | `revalidatePath` の無効化を記録するタグキャッシュ |
| `WORKER_SELF_REFERENCE` | Service（自分自身） | ISR の再検証リクエスト（メモリキュー）の送り先 |
| `IMAGES` | Cloudflare Images | `next/image` の変換 |

キャッシュの構成は、OpenNext が用意しているもののうち一番単純な「R2 + D1 タグキャッシュ + メモリキュー」にします。
このサイトは layout で `headers()` を呼んでいるのでほぼ全ページが動的レンダリングになり、キャッシュの対象は
**Notion のお知らせと sitemap に限られます**。Durable Objects を使うキューや、シャーディングしたタグキャッシュは、
アクセスが増えてから検討すれば十分です。

## 4. フェーズ別の作業

### Phase 0: 事前確認と PoC（0.5〜1日）

本番には何も変更を加えません。結果次第で、移行するかどうかをここで判断します。

**確認すること**

| # | 項目 | なぜ見るか |
| --- | --- | --- |
| P1 | Cloudflare の Workers の制限値（スクリプトサイズ、CPU時間、メモリ、リクエストボディ）を公式ドキュメントで確認する | 無料プランは CPU 時間とスクリプトサイズが小さく、Next.js の SSR は収まらない見込み。**Workers Paid が前提**になるかを確定する |
| P2 | Cloudflare Images の料金と無料枠 | `next/image` の変換数に応じて課金される |
| P3 | Vercel の現在のプラン、月額、Function のリージョン設定 | `vercel.json` が無いため、リージョンはプロジェクト設定で決まっている。既定の `iad1`（米国東部）のままなら、移行で日本からの応答が大きく速くなる可能性がある |
| P4 | `neko-and-plant.com` の DNS をどこで管理しているか、レコードの一覧（`www`、MX、TXT の有無） | DNS 移管の手順と、移すべきレコードが決まる |
| P5 | Supabase のリージョン、接続方式（直接接続が IPv6 のみか、IPv4 アドオンの有無）、Network Restrictions の設定 | Hyperdrive からどの接続文字列で繋ぐかが決まる。Network Restrictions が有効だと Hyperdrive から繋がらない |
| P6 | 主要ページの現在の TTFB（`/`、`/plants`、`/plants/[id]`、`/posts/[id]`） | 移行後と比べる基準値 |

**PoC（使い捨てのブランチで行う）**

1. `npx opennextjs-cloudflare migrate` で雛形を作る。`wrangler.jsonc`、`open-next.config.ts`、`.dev.vars`、`public/_headers`、
   `package.json` のスクリプト（`preview` / `deploy` / `upload` / `cf-typegen`）、`.gitignore`、`next.config.ts` への追記が生成される
2. Phase 1 の Prisma 変更を仮で入れ、`opennextjs-cloudflare build` を通す
3. **Worker のサイズ（圧縮後）を測り、P1 の上限に収まるか確認する**。収まらなければ、何が大きいかを調べるところから始める
4. Hyperdrive をローカルの Supabase（`localConnectionString`）に向けて `opennextjs-cloudflare preview` を起動し、トップ・植物詳細・投稿詳細が表示されるか見る

**判断基準（Go / No-Go）**

- Worker のサイズが Workers Paid の上限に収まる
- `preview` で主要ページが表示できる
- 月額費用（Workers Paid + Images の見込み）が許容範囲にある

### Phase 1: Vercel のまま入れる「両対応」の変更（1〜2日、PR を分ける）

すべて **Vercel 上でも動く変更**です。1つずつ本番に出して、問題がないことを確認してから次へ進みます。

#### 1-1. Prisma 7 + driver adapter へ更新（D2）

- `prisma@7.10.1` / `@prisma/client@7.10.1` / `@prisma/adapter-pg@7.10.1` / `pg` を導入する（**バージョンは明示する**。`latest` は RC を指している）
- `schema.prisma` の generator を Prisma 7 の推奨構成にする。`binaryTargets` は削除し、`multiSchema` は正式機能になったので `previewFeatures` から外す
- 接続文字列は `prisma.config.ts` に移す（Prisma 7 は CLI が `.env` を自動で読み込まない。`db:pull` は `dotenv -e .env.local --` を挟んでいるのでそのまま使える）
- 新しい generator は出力先の指定が必須になり、`import { Prisma } from "@prisma/client"`（6箇所）の import 先が変わる。生成物は `.gitignore` に入れる
- `DATABASE_URL` の `?pgbouncer=true` は Prisma の Rust エンジン向けのパラメータで、`pg` では意味を持たない。Supavisor のトランザクションモード（6543）に `pg` で繋いで、`$transaction`（`post-action.ts`）と `$queryRaw` が動くかを確認する

> **`schema.prisma` の手編集について**: CLAUDE.md の「`schema.prisma` は手で編集しない」はモデル定義の話です。
> `generator` / `datasource` ブロックは `prisma db pull` で上書きされないため、手で管理するしかありません。
> この例外は [database.md](../04-operations/database.md) に書き足します。

**確認**: `npm test`、`npm run e2e`、`npm run db:pull` で差分が出ないこと、Vercel のプレビューで投稿・いいね・削除が通ること。

#### 1-2. Prisma クライアントをリクエスト単位にできる形にする（D1）

`src/lib/prisma.ts` の default export（シングルトン）を `getPrisma()` に変えます。この段階では Node.js 用の経路だけを実装し、
Workers 用の経路は Phase 2 で足します。

```ts
// src/lib/prisma.ts（Phase 2 完了時点の案）
const omit = { auth_users: { encrypted_password: true, /* ...今と同じ... */ } } as const;

let nodeClient: PrismaClient | undefined;
const requestClients = new WeakMap<object, PrismaClient>();

export function getPrisma(): PrismaClient {
    const cf = getCloudflareContextOrNull(); // Phase 2 で追加
    if (!cf) {
        // next dev / Vitest / E2E / ビルド時の sitemap 事前生成 / 移行期間中の Vercel
        return (nodeClient ??= new PrismaClient({
            adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
            omit,
        }));
    }
    // Workers ではソケットをリクエスト間で共有できないため、リクエスト(ctx)ごとに作る
    let client = requestClients.get(cf.ctx);
    if (!client) {
        client = new PrismaClient({
            adapter: new PrismaPg({ connectionString: cf.env.HYPERDRIVE.connectionString }),
            omit,
        });
        requestClients.set(cf.ctx, client);
    }
    return client;
}
```

- 呼び出し箇所は `@/lib/prisma` を import する 18 ファイル（うちテスト 5 ファイル）と `scripts/e2e-seed.ts`。`prisma` を `getPrisma()` に機械的に置き換える。テストのモックは `vi.mock("@/lib/prisma", () => ({ getPrisma: () => mockPrisma }))` の形にする
- `getCloudflareContextOrNull()` は **Workers 上で context が取れないときはエラーにする**（フォールバックで Node 用のシングルトンを作ると、本番でリクエスト間の共有が起きて壊れるため）
- `ctx` が1リクエストの中で同じオブジェクトであること（middleware・RSC・Server Action をまたいで）は PoC で確認する
- `omit` の多層防御（`auth.users` の秘匿列）は両方の経路で同じ設定を使う

#### 1-3. `reportError` の通知を `after()` に載せる（D5）

`void notify(...)` を Next.js の `after(() => notify(...))` に置き換えます。`after()` はリクエストの外（ビルド時の sitemap 生成など）では
例外を投げるので、`try/catch` で囲んで、失敗したら今と同じ `void notify()` にします。
「例外を投げない」「`await` させない」という今の設計上の制約はそのまま守れます。

Vercel でも、レスポンスを返した後の処理は保証されていないので、これは今ある潜在的な不具合の修正でもあります。

#### 1-4. Notion クライアントに標準の fetch を渡す（D6）

`new Client({ auth, fetch: globalThis.fetch })` にします（2.3.0 は `fetch` オプションに対応済み）。
`node-fetch` は import 時に読み込まれますが、通信には使われなくなります。

### Phase 2: Cloudflare 側の環境構築（1日）

#### 2-1. アカウントと DNS

1. Cloudflare アカウントを作り、Workers Paid を契約する（Phase 0 の P1 の結果による）
2. **DNS を先に Cloudflare に移す（向き先は Vercel のまま）**
   - ゾーン `neko-and-plant.com` を追加し、既存のレコードをすべて取り込む（P4 で確認した MX / TXT を漏らさない）
   - Vercel を向いているレコードは **DNS only（グレーの雲）** にする。Cloudflare のプロキシを通すと、Vercel の証明書の発行と更新を妨げる
   - レジストラでネームサーバーを Cloudflare に変える。反映に時間がかかるので、本番の切替の**1週間前**までに済ませる
3. 検証用のサブドメイン（例: `cf.neko-and-plant.com`）を用意し、**Cloudflare Access で自分だけが入れるようにする**。
   検索エンジンへの露出と、本番 DB を使う環境を第三者に触られることを防ぐ

#### 2-2. リソースの作成

```bash
wrangler r2 bucket create neko-plant-opennext-cache
wrangler d1 create neko-plant-tag-cache
wrangler hyperdrive create neko-plant-db --connection-string="<P5 で決めた接続文字列>" --caching-disabled
```

**Hyperdrive のクエリキャッシュは無効にします。** 有効にすると、Hyperdrive が SELECT の結果を数十秒キャッシュするため、
- いいね・投稿の直後に読み直すと古い値が返る
- `/api/health` の `SELECT 1` がキャッシュから返り、DB が落ちていても 200 になる

という不具合が出ます。速度が足りないと分かってから、対象を絞って検討します。

**接続先**: 今の `DATABASE_URL`（Supavisor のトランザクションモード、6543）に Hyperdrive を重ねると、プールが二重になります。
Supabase の**直接接続**か、Supavisor の**セッションモード（5432）**に向けるのが候補です。どちらにするかは P5 の結果（IPv6 / IPv4）と PoC で決めます。

#### 2-3. リポジトリへの追加

- `devDependencies` に `@opennextjs/cloudflare` と `wrangler` を追加する
- `wrangler.jsonc`

  ```jsonc
  {
    "name": "neko-plant",
    "main": ".open-next/worker.js",
    "compatibility_date": "<作業日>",
    "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
    "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
    "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "neko-plant" }],
    "r2_buckets": [{ "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "neko-plant-opennext-cache" }],
    "d1_databases": [{ "binding": "NEXT_TAG_CACHE_D1", "database_name": "neko-plant-tag-cache", "database_id": "<id>" }],
    "hyperdrive": [{
      "binding": "HYPERDRIVE",
      "id": "<id>",
      // wrangler dev / opennextjs-cloudflare preview ではローカルの Supabase に繋ぐ
      "localConnectionString": "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    }],
    "images": { "binding": "IMAGES" },
    "observability": { "enabled": true }
  }
  ```

- `open-next.config.ts`

  ```ts
  import { defineCloudflareConfig } from "@opennextjs/cloudflare";
  import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
  import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
  import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

  export default defineCloudflareConfig({
      incrementalCache: r2IncrementalCache,
      tagCache: d1NextTagCache,
      queue: memoryQueue,
  });
  ```

  D1 のテーブルは `opennextjs-cloudflare deploy` が作成するので、手で作る必要はありません

- `public/_headers`: `/_next/static/*` の `Cache-Control: public,max-age=31536000,immutable` に加えて、
  `next.config.ts` の `headers()` と同じセキュリティヘッダ（HSTS、`X-Content-Type-Options` など）を `/*` に付ける（D8）
- `src/lib/prisma.ts` に Workers 用の経路を足す（Phase 1-2 の案）
- `.gitignore` に `.open-next`、`.wrangler`、`.dev.vars*` を追加する
- `.node-version`（22）を置き、Cloudflare のビルド環境の Node.js を CI と揃える
- `npm run cf-typegen` で `cloudflare-env.d.ts`（バインディングの型）を生成する

#### 2-4. デプロイ経路

**推奨: Workers Builds（Cloudflare の Git 連携）**。Vercel と同じく「main を本番、それ以外のブランチをプレビュー URL」にでき、
GitHub に Cloudflare の API トークンを置かずに済みます。

| 設定 | 値 |
| --- | --- |
| 本番ブランチ | `main` |
| ビルドコマンド | `npx opennextjs-cloudflare build` |
| デプロイコマンド | `npx opennextjs-cloudflare deploy` |
| 本番以外のブランチ | `npx opennextjs-cloudflare upload`（プレビュー URL を発行する） |

アプリのデプロイと DB の反映（`supabase-deploy.yml`）の順序を制御したくなったら、GitHub Actions で
`supabase db push` → `opennextjs-cloudflare deploy` を `needs:` で繋ぐ方式に移します。今の「どちらが先でも壊れないように作る」
という方針のままなら、Workers Builds で十分です。

**プレビューの注意**: プレビュー URL のバージョンは本番と**同じバインディング**（R2・D1・Hyperdrive の先の本番 DB）を使います。

### Phase 3: 検証（1〜2日）

`cf.neko-and-plant.com`（Cloudflare Access の内側）に、`NEXT_PUBLIC_APP_BASE_URL=https://cf.neko-and-plant.com` でビルドしたものを出して確認します。

> **本番の Supabase への変更**: Google ログインを検証するには、Supabase Auth の Redirect URLs に
> `https://cf.neko-and-plant.com/auth/callback` を追加する必要があります。**本番の Supabase の設定変更なので、実施前に確認を取ります**。
> 検証が終わったら削除します。

検証環境は**本番の DB に繋がる**ため、操作は検証用のアカウントだけで行い、作った投稿は最後に削除します。

#### 機能の確認

| # | 確認 | 主に見るもの |
| --- | --- | --- |
| V1 | Google ログイン / メール・パスワードログイン / ログアウト | Supabase のクッキーが middleware で更新されるか |
| V2 | 未ログインで `/posts/new` などを開くと `/signin` へ、一般ユーザーで `/admin` を開くと `/` へ | middleware のリダイレクト |
| V3 | 画像3枚の投稿（直接アップロード → AI 判定 → 植物タグ → 投稿） | `Buffer` / base64、Server Action、Gemini への fetch |
| V4 | 投稿の直後にトップ・植物詳細・プロフィールへ反映される | `revalidatePath` とタグキャッシュ |
| V5 | いいね、投稿削除（service role での Storage 削除）、プロフィール画像の変更、猫の登録 | `$transaction`、service role |
| V6 | `/news` と `/news/[id]` が表示され、1時間後に更新が反映される | `unstable_cache` と R2 |
| V7 | `/sitemap.xml` に植物・投稿・プロフィール・お知らせが入り、1時間後に再生成される | ISR とメモリキュー |
| V8 | `next/image` が AVIF / WebP で返る（レスポンスの `Content-Type`） | `IMAGES` バインディング |
| V9 | ブラウザのコンソールに CSP 違反が出ず、GA4 が計測される | nonce の受け渡し（D7） |
| V10 | HTML と `/_next/static/*` の両方にセキュリティヘッダが付いている | `public/_headers`（D8） |
| V11 | `/api/health` が 200。Hyperdrive の接続先を誤らせると 503 になる | ヘルスチェックが本当に DB を見ているか |
| V12 | わざとエラーを起こして `ERROR_WEBHOOK_URL` に届く | `after()`（D5） |
| V13 | 404 / エラーページ、`/robots.txt`、`/manifest.webmanifest` | |

#### 速度と制限の確認

- P6 と同じページの TTFB を Vercel と比べる。目安は **Vercel より遅くならないこと**
- Workers のメトリクスで、リクエストあたりの CPU 時間が上限に対して十分に小さいか
- Supabase 側の接続数（Hyperdrive のプールの上限が、Supabase のプランの最大接続数に収まっているか）

#### CI への追加

`pull_request.yml` に `opennextjs-cloudflare build` のジョブを足し、Worker のバンドルが作れなくなる変更を PR の段階で止めます。
`opennextjs-cloudflare preview` に対して Playwright の `@public` タグを流すジョブは、実行時間を見てから追加するかを決めます
（今の E2E は `next dev` に対して流しているので、Workers のランタイム固有の問題は拾えません）。

### Phase 4: 本番の切替（0.5日 + 監視）

**事前**

- Phase 2-1 の DNS 移管が終わっていて、レコードの TTL を短くしてある
- Cloudflare のゾーン設定
  - SSL/TLS を **Full (strict)** にする
  - **Rocket Loader と Email Address Obfuscation を無効にする**。どちらも HTML にスクリプトを差し込み、nonce を使った CSP に違反する
  - Cloudflare Web Analytics の自動挿入を使わない（同じく CSP に違反する）
  - Bot Fight Mode が外形監視（UptimeRobot）を弾かないか確認する
- 本番用のビルド変数（`NEXT_PUBLIC_APP_BASE_URL=https://neko-and-plant.com`）とシークレットが入っている
- **作業中は main へマージしない**（Vercel と Cloudflare の両方にデプロイが走るため）

**手順**

1. 本番の Worker をデプロイし、カスタムドメインを付ける前に `workers.dev` の URL で表示を確認する
2. Workers のカスタムドメインに `neko-and-plant.com`（`www` があればそれも）を追加する。Vercel を向いている既存のレコードと衝突するので、
   置き換える（削除が必要な場合は、削除から追加までを続けて行い、名前解決できない時間を短くする）
3. V1〜V13 のうち、本番で安全にできるもの（ログイン、閲覧、自分のテスト投稿の作成と削除、ヘッダ、ヘルスチェック）を確認する
4. 1〜2時間、Workers Logs と Webhook の通知、UptimeRobot を見る
5. Search Console でクロールエラーが増えていないか、翌日以降に確認する

**ロールバック**

Workers のカスタムドメインを外し、Vercel 向けのレコードを DNS only で戻します。
DB は共通なので、切替後に作られた投稿もそのまま残ります。

移行期間中は main へのマージで **Vercel にもデプロイされ続ける状態を保ち**、ロールバック先が常に最新のコードになるようにします
（そのため、Vercel 側の環境変数も更新し続けます）。

### Phase 5: 後片付け（0.5日。切替の2〜4週間後）

- `workers_dev` と、不要ならプレビュー URL を無効にする（canonical は本番 URL を指しているが、`*.workers.dev` で本番と同じ内容が見える状態は残さない）
- `package.json` の `vercel-build` を削除する。`.gitignore` の `.vercel` も削除する
- 4.5MB 上限を前提にしたコメントを直す（D14）。`MAX_PROCESSED_IMAGE_SIZE`（4MB）の値は変えず、理由を書き換える
- `overrides.sharp` は Workers では使われないが、`npm audit` の対象には残るので、外すかどうかを判断する
- 検証用サブドメイン、Cloudflare Access のアプリ、Supabase Auth の検証用 Redirect URL を削除する
- Vercel のプロジェクトを削除し、プランを解約する
- 下記のドキュメントを更新し、本書を `99-archive/` へ移す

| ドキュメント | 更新内容 |
| --- | --- |
| [deployment.md](../04-operations/deployment.md) | 構成表、ビルド、ブランチ運用の図、リリース前チェックリスト（「Vercel 側にも設定した」）、本番の環境変数の置き場 |
| [monitoring.md](../04-operations/monitoring.md) | ログの確認先、Search Console の手順の「Vercel の環境変数」 |
| [overview.md](../03-architecture/overview.md) | 技術スタック、構成図、4.5MB の記述 |
| [storage.md](../03-architecture/storage.md) | 直接アップロードの理由 |
| [database.md](../04-operations/database.md) | Prisma 7、`prisma.config.ts`、generator ブロックの手編集の例外 |
| [setup.md](../02-development/setup.md) / `.env.example` | `.dev.vars`、Hyperdrive の `localConnectionString` |
| [commands.md](../02-development/commands.md) | `preview` / `deploy` / `upload` / `cf-typegen`、`vercel-build` の削除 |
| `README.md` / `CLAUDE.md` | 技術スタック、「Vercelのボディ上限」の記述 |

## 5. 環境変数の置き場

`NEXT_PUBLIC_*` は**ビルド時に値が埋め込まれる**ため、実行時のシークレットに入れても効きません。

| 変数 | ビルド時 | 実行時 | 備考 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_BASE_URL` | ✓ | | 検証環境と本番で値が違う |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | | |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | ✓ | | |
| `DATABASE_URL` | ✓ | | ビルド時の sitemap の事前生成だけで使う。実行時は Hyperdrive |
| `NOTION_API_KEY` / `NOTION_DATABASE_ID` | ✓ | ✓（シークレット） | ビルド時の sitemap と、実行時の `/news` |
| `SUPABASE_SERVICE_ROLE_KEY` | | ✓（シークレット） | |
| `GEMINI_API_KEY`（`OPENAI_API_KEY`） | | ✓（シークレット） | |
| `ERROR_WEBHOOK_URL` | | ✓（シークレット） | |
| `AI_PROVIDER` / `AI_PLANT_ID_MODEL` / `AI_IDENTIFY_RATE_LIMIT_*` | | ✓（変数） | |
| `GOOGLE_SITE_VERIFICATION` | | ✓（変数） | 消すと Search Console の所有権確認が外れる |
| `DIRECT_URL` | | | 不要（`prisma.config.ts` で CLI だけが使う） |

実行時の値は `wrangler secret put <名前>` か、ダッシュボードの Worker の設定から登録します。
`nodejs_compat` と新しい `compatibility_date` の組み合わせで、これらは `process.env` から読めます（コードの変更は不要）。

## 6. リスクと対策

| リスク | 影響 | 対策 |
| --- | --- | --- |
| Worker のサイズが上限を超える | デプロイできない | Phase 0 で最初に測る。Prisma 7 は Rust エンジンが無くなる分だけ小さくなる |
| Prisma のクライアントをリクエスト間で共有してしまう | 本番で断続的にクエリが失敗する | `getPrisma()` に一本化し、Workers で context が取れないときはエラーにする（Phase 1-2） |
| Hyperdrive のクエリキャッシュで古い値が返る | いいね数などが更新されない、ヘルスチェックが嘘をつく | キャッシュを無効にして作成する（Phase 2-2） |
| レスポンス後の処理が打ち切られる | エラー通知が届かない | `after()` に載せる（Phase 1-3）。V12 で確認する |
| キャッシュの設定漏れ | お知らせや sitemap が更新されない、投稿が一覧に出ない | V4・V6・V7 で確認する |
| Cloudflare の機能が HTML を書き換える | CSP 違反で GA などが止まる | Rocket Loader などを無効にする（Phase 4）。V9 で確認する |
| 静的アセットにセキュリティヘッダが付かない | `nosniff` などが抜ける | `public/_headers`（Phase 2-3）。V10 で確認する |
| 検証環境が本番 DB を使う | テストデータが本番に残る | Cloudflare Access で閉じ、検証用アカウントだけで操作して後で消す |
| デプロイ直後に古いタブの Server Action が失敗する | 投稿などが1回失敗する | Vercel でも Skew Protection を使っていなければ今と同じ。OpenNext の `skewProtection` は実験扱いなので、今回は入れない |
| OpenNext が将来 Next.js 15.5 系のサポートを外す | Next.js の更新が先に必要になる | 移行後に Next.js 16（OpenNext の対象は 16.4.1 以上）への更新を別で計画する |
| ログの保持期間が Vercel と違う | 障害の調査期間が変わる | Phase 0 で Workers Logs の保持期間を確認し、[monitoring.md](../04-operations/monitoring.md) に書く |

## 7. 工数の目安

| フェーズ | 工数 | 本番への影響 |
| --- | --- | --- |
| Phase 0 事前確認と PoC | 0.5〜1日 | なし |
| Phase 1 両対応の変更 | 1〜2日 | Vercel のまま通常のリリース |
| Phase 2 Cloudflare 側の構築 | 1日 | DNS 移管（向き先は Vercel のまま） |
| Phase 3 検証 | 1〜2日 | 本番 Supabase の Redirect URL に一時的に追加 |
| Phase 4 本番の切替 | 0.5日 + 監視 | **切替**。DNS の付け替えだけで戻せる |
| Phase 5 後片付け | 0.5日 | 切替の2〜4週間後 |

合計で作業 **4.5〜7日**、Vercel の削除までの期間を含めると **約1か月**です。

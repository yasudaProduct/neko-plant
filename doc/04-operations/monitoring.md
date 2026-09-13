# 監視・バックアップ・障害通知

本番が「落ちていないか」「壊れていないか」を見るための仕組みです。
「伸びているか」を見る指標は [analytics.md](./analytics.md) にあります。

## 全体像

| 対象 | 仕組み | 設定が必要なもの |
| --- | --- | --- |
| 死活監視 | `/api/health` を外形監視サービスから叩く | 監視サービス側の登録 |
| サーバーエラー通知 | `reportError()` → Webhook | `ERROR_WEBHOOK_URL` |
| DBバックアップ | Supabase の自動バックアップ（有料プラン） | Supabase 側のプラン契約 |
| 検索流入 | Google Search Console | `GOOGLE_SITE_VERIFICATION` |

## 死活監視

### `/api/health`

| 項目 | 内容 |
| --- | --- |
| パス | `GET /api/health` |
| 正常 | `200` `{"status":"ok","database":"ok"}` |
| 異常 | `503` `{"status":"error","database":"error"}` |
| 検査内容 | Prisma 経由で `SELECT 1`（アプリが起動し、DBに到達できるか） |

**このエンドポイントが検査しないもの**: Supabase Auth、Storage、AI プロバイダー、Notion。
外部サービスをここで叩くと、相手側の一時的な不調で本体が正常なのにアラートが鳴ります。
Supabase API を到達不可にしても 200 を返すことを確認済みです。

リクエストは middleware を通ります。認証クッキーを送らない監視リクエストでは
Supabase Auth への問い合わせは起きませんが、**middleware 自体が壊れていれば 500 になります**。
これは検知できたほうがよい挙動なので、あえて middleware から除外していません。

エラーの詳細は返しません。障害の内容は攻撃者への情報になるため、
原因は Vercel のログか Webhook 通知で確認します。

キャッシュされると監視の意味がなくなるため `no-store` を返し、`force-dynamic` で毎回実行します。
`robots.ts` で `/api/` をクロール対象から除外しています。

### 外形監視サービスの設定

UptimeRobot などの無料枠で十分です。

| 設定 | 値 |
| --- | --- |
| URL | `https://neko-and-plant.com/api/health` |
| 間隔 | 5分 |
| 判定 | HTTP 200 以外、またはレスポンスに `"status":"ok"` を含まない |
| 通知先 | メール、または障害通知と同じ Webhook |

トップページ（`/`）も別枠で登録しておくと、`/api/health` は通るのに
画面が壊れているケースに気づけます。

## サーバーエラーの通知

### 使い方

`src/lib/report-error.ts` の `reportError()` を、握りつぶす catch に足します。

```ts
import { reportError } from "@/lib/report-error";

try {
  // ...
} catch (error) {
  reportError(error, { scope: "createPost", userId: userData.id });
  return { success: false, code: ActionErrorCode.UNKNOWN_ERROR, message: "..." };
}
```

- **`await` しません。** 通知の失敗や遅延がユーザーのリクエストに影響しないようにします。
- **例外を投げません。** 通知経路の障害でアプリが落ちるのは本末転倒です。
- 常に構造化 JSON で `console.error` します（Vercel のログに残る）。
  `ERROR_WEBHOOK_URL` があれば、加えて Webhook に投げます。

### context に入れてよいもの

| 入れる | 入れない |
| --- | --- |
| 処理名（`scope`）、内部ID、件数、エラーコード | メールアドレス、コメント本文、検索語、画像パス、トークン |

**通知先は多くの場合チャットです。** 個人情報を送ると保存先が増え、
プライバシーポリシーの想定を超えます。内部IDだけ送り、詳細はDBで引いてください。

### 通知の間引き

同じ内容のエラーが連続しても、**同一シグネチャにつき10分に1回**しか通知しません。
障害時にチャットが埋まって他の通知が見えなくなるのを防ぐためです。

間引きはプロセス内のメモリで行うため、サーバーレスのインスタンスが複数あれば
その数だけ通知が出ます。完全な抑制ではなく、暴走の上限を作るための仕組みです。

### `ERROR_WEBHOOK_URL`

Slack と Discord の Incoming Webhook に対応します。URL のホスト名で送信形式を判定します。

| ホスト | 形式 |
| --- | --- |
| `discord.com` / `discordapp.com` | `{ "content": "..." }` |
| その他（Slack 互換） | `{ "text": "..." }` |

未設定なら Webhook 送信自体を行いません（`console.error` は常に出ます）。

## DBバックアップ

**方針: Supabase の有料プランに課金し、プラットフォーム側の自動バックアップに任せます。**

自前でダンプを取る仕組み（GitHub Actions の定期実行など）は持ちません。
公開リポジトリに個人情報を含むダンプを置く運用は、暗号化しても鍵の管理という
新しい事故要因を増やすためです。運用の手数も、1人運用では割に合いません。

### 設定時に確認すること

Supabase ダッシュボードの Database → Backups で、次の4点を確認してください。
プランの内容は変わるため、ドキュメントの記憶ではなく**画面の表示で確認**します。

| 確認項目 | なぜ見るか |
| --- | --- |
| バックアップの取得間隔 | 「日次」なら、最悪24時間分の投稿を失いうる |
| 保持期間 | 壊れたことに何日後まで気づけば間に合うか |
| Point-in-Time Recovery の有無 | 誤った DELETE や壊れたマイグレーションからの復旧に効く。Pro でも別料金の場合がある |
| **Storage（投稿画像）が含まれるか** | DBのバックアップとStorageは別扱いのことがある。含まれないなら画像の消失には別の備えが要る |

Storage が対象外だった場合、画像はユーザーの投稿そのものなので、
失うとDBのレコードだけ残って中身が見えない状態になります。
対策が必要かどうかはユーザー数と投稿数を見て判断してください。

### 復元を一度試す

**試していないバックアップは、あるかどうか分かりません。** 課金したら、
実際に復元できるところまで一度通してください。確認するのは次の2点です。

1. ダッシュボードから復元操作が実行できるか（どの画面の、どのボタンか）
2. 復元にかかる時間（障害時に「あと何分で戻るか」を言えるか）

### 危険な変更の前に手元でダンプを取る

自動化はしませんが、**破壊的なマイグレーションを本番へ流す前**には
手元で1回ダンプを取っておくと安全です。

```bash
supabase link --project-ref <project-ref>
supabase db dump --linked -f roles.sql --role-only
supabase db dump --linked -f schema.sql
supabase db dump --linked -f data.sql --data-only --use-copy
```

**出力したファイルはリポジトリに入れないでください。** `--data-only` のダンプには
`auth.users`（全ユーザーのメールアドレス）が含まれます。
使い終わったら消すか、ローカルの暗号化された場所に置いてください。

## Google Search Console

`GOOGLE_SITE_VERIFICATION` に確認用トークンを設定すると、
`<meta name="google-site-verification">` がすべてのページに出ます。

1. Search Console でプロパティ `https://neko-and-plant.com` を追加
2. 「HTMLタグ」の確認方法を選び、`content` の値をコピー
3. Vercel の環境変数に `GOOGLE_SITE_VERIFICATION` として設定し、再デプロイ
4. Search Console で「確認」を押す
5. サイトマップに `sitemap.xml` を送信

確認が完了したあとも環境変数は残してください。消すと所有権の確認が外れます。

## 関連ドキュメント

- [analytics.md](./analytics.md) — 指標と改善ループ
- [deployment.md](./deployment.md) — GitHub Actions の全体像
- [../02-development/setup.md](../02-development/setup.md) — 環境変数一覧
- [../03-architecture/security.md](../03-architecture/security.md) — CSP とキーの扱い

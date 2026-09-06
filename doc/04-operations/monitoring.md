# 監視・バックアップ・障害通知

本番が「落ちていないか」「壊れていないか」を見るための仕組みです。
「伸びているか」を見る指標は [analytics.md](./analytics.md) にあります。

## 全体像

| 対象 | 仕組み | 設定が必要なもの |
| --- | --- | --- |
| 死活監視 | `/api/health` を外形監視サービスから叩く | 監視サービス側の登録 |
| サーバーエラー通知 | `reportError()` → Webhook | `ERROR_WEBHOOK_URL` |
| DBバックアップ | GitHub Actions の日次ダンプ（暗号化） | `BACKUP_GPG_PASSPHRASE` |
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

### 前提の確認

**まず Supabase のプランを確認してください。** Free プランには自動バックアップがありません。
Pro 以上なら日次バックアップと Point-in-Time Recovery が使えるため、そちらが第一の防衛線です。

このリポジトリの `.github/workflows/db-backup.yml` は、**プランに関わらず持っておく二次的な
論理バックアップ**です。Supabase 側の障害やプロジェクト削除のような、
プラットフォームごと失うケースに備えます。

### 仕組み

毎日 UTC 18:00（JST 03:00）と手動実行で走ります。

```
supabase db dump --linked -f roles.sql --role-only
supabase db dump --linked -f schema.sql
supabase db dump --linked -f data.sql --data-only --use-copy
→ tar でまとめる
→ gpg --symmetric --cipher-algo AES256 で暗号化
→ GitHub Actions のアーティファクトとして14日保持
```

ダンプが空のときはジョブを失敗させます。0バイトのファイルを
「成功したバックアップ」として保存するのが一番危ないためです。

再利用するシークレットは `supabase-deploy.yml` と同じ
（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROJECT_ID`）。
加えて `BACKUP_GPG_PASSPHRASE` が必要です。

### 暗号化が必須である理由

**このリポジトリは公開されています。** 公開リポジトリの Actions アーティファクトは、
リンクを知っていれば誰でもダウンロードできます。

そして `--data-only` のダンプには **`auth.users` が実際に含まれます**（ローカルDBで確認済み。
`public` / `auth` / `storage` / `supabase_functions` の4スキーマが出力されます）。
つまりダンプは全ユーザーのメールアドレスを含む個人情報の塊です。
**平文で置くことは事故と同じ**です。

`BACKUP_GPG_PASSPHRASE` は十分に長いランダム文字列にし、GitHub Secrets 以外の場所
（コミット、Issue、チャット）に置かないでください。**この鍵を失うと復号できません。**
パスワードマネージャに控えを取ってください。

シークレットが未設定のとき、ジョブは**成功せず失敗します**。
バックアップが取れていないのに緑になるほうが危険だからです。

### 復元

アーティファクトを展開すると `neko-plant-db-<日時>.tar.gz.gpg` が入っています。

```bash
export BACKUP_GPG_PASSPHRASE='...'   # GitHub Secrets と同じ値

# 復号して展開（--pinentry-mode loopback が無いと GnuPG 2.1+ は失敗する）
gpg --decrypt --batch --yes --pinentry-mode loopback \
    --passphrase "$BACKUP_GPG_PASSPHRASE" \
    neko-plant-db-20260906T180000Z.tar.gz.gpg > backup.tar.gz
mkdir -p restored && tar xzf backup.tar.gz -C restored

# 復元先（ローカル or 新規プロジェクト）に流す。順序を入れ替えないこと
psql "$TARGET_DB_URL" -f restored/roles.sql
psql "$TARGET_DB_URL" -f restored/schema.sql
psql "$TARGET_DB_URL" -f restored/data.sql
```

**復元は一度実際に試してください。** 試していないバックアップは、あるかどうか分かりません。
ローカルの `supabase start` した空DBに流すのが安全な練習相手です。

### 既知の制約

| 制約 | 内容 |
| --- | --- |
| 画像ファイルは対象外 | `storage.objects` の**行**は入りますが、画像の実体は入りません。画像の消失には別の対策が要ります |
| `auth` の復元は非自明 | 行としては戻せますが、新規プロジェクトへ流すと既存の認証設定と衝突しえます。復元先を空のプロジェクトにしてください |
| アーティファクトは14日で消える | 長期保管には R2 / S3 などへの転送に切り替えてください |
| スケジュールは60日で止まる | GitHub は活動のないリポジトリの定期実行を停止します |
| 整合性は保証されない | 稼働中DBの論理ダンプです。厳密な時点復旧が要るなら Supabase の PITR を使ってください |

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

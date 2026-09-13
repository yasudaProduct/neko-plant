/**
 * サーバー側エラーの記録と通知。
 *
 * 握りつぶす catch に足して、本番で何が起きているかを見えるようにする。
 * 運用手順は doc/04-operations/monitoring.md を参照。
 *
 * 設計上の制約が3つある。
 * 1. 例外を投げない  — 通知経路の障害でアプリを落とさない
 * 2. await させない  — 通知の遅延をユーザーのリクエストに波及させない
 * 3. 個人情報を送らない — 通知先はチャットであり、保存先を増やさない
 */

/** 通知に載せてよい補助情報。個人を特定できる値は入れないこと。 */
export type ErrorContext = {
    /** 処理名。通知の見出しと間引きのキーに使う (例: "createPost") */
    scope: string;
} & Record<string, string | number | boolean | null | undefined>;

/** 同一シグネチャの通知間隔。障害時にチャットが埋まるのを防ぐ */
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;

/** 間引き用マップの上限。増え続けてメモリを食うのを防ぐ */
const MAX_TRACKED_SIGNATURES = 500;

/** Webhook 送信のタイムアウト。相手が無応答でも関数呼び出しを溜めない */
const WEBHOOK_TIMEOUT_MS = 3000;

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 1200;

/**
 * 直近に通知したシグネチャと時刻。
 * プロセス内のメモリなので、サーバーレスのインスタンス数だけ通知が出る。
 * 完全な抑制ではなく、暴走の上限を作るための仕組み。
 */
const lastNotifiedAt = new Map<string, number>();

type ErrorDetail = {
    name: string;
    message: string;
    stack?: string;
};

function truncate(value: string, max: number): string {
    return value.length > max ? `${value.slice(0, max)}…` : value;
}

function toDetail(error: unknown): ErrorDetail {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: truncate(error.message, MAX_MESSAGE_LENGTH),
            stack: error.stack ? truncate(error.stack, MAX_STACK_LENGTH) : undefined,
        };
    }
    if (typeof error === "string") {
        return { name: "Error", message: truncate(error, MAX_MESSAGE_LENGTH) };
    }
    // Error でも文字列でもない throw。JSON 化できない値もありうる
    let serialized: string;
    try {
        serialized = JSON.stringify(error) ?? String(error);
    } catch {
        serialized = String(error);
    }
    return { name: "UnknownError", message: truncate(serialized, MAX_MESSAGE_LENGTH) };
}

/**
 * 間引きの判定。通知してよいなら true。
 * メッセージにIDなどの可変値が混ざると別シグネチャになるが、
 * 上限件数で刈り取るので無制限には増えない。
 */
function shouldNotify(signature: string, now: number): boolean {
    const previous = lastNotifiedAt.get(signature);
    if (previous !== undefined && now - previous < THROTTLE_WINDOW_MS) {
        return false;
    }

    if (lastNotifiedAt.size >= MAX_TRACKED_SIGNATURES) {
        for (const [key, at] of lastNotifiedAt) {
            if (now - at >= THROTTLE_WINDOW_MS) {
                lastNotifiedAt.delete(key);
            }
        }
        // 全件が期間内でも溢れさせない (Map は挿入順なので最古から捨てる)
        while (lastNotifiedAt.size >= MAX_TRACKED_SIGNATURES) {
            const oldest = lastNotifiedAt.keys().next();
            if (oldest.done) break;
            lastNotifiedAt.delete(oldest.value);
        }
    }

    lastNotifiedAt.set(signature, now);
    return true;
}

/** Discord と Slack で受け付けるキーが違うため、URLのホストで振り分ける */
function buildWebhookPayload(url: string, text: string): Record<string, string> {
    let host = "";
    try {
        host = new URL(url).hostname;
    } catch {
        // 不正なURLは fetch 側で失敗させる
    }
    const isDiscord = host === "discord.com" || host.endsWith(".discord.com")
        || host === "discordapp.com" || host.endsWith(".discordapp.com");
    return isDiscord ? { content: text } : { text };
}

function formatText(detail: ErrorDetail, context: ErrorContext): string {
    const extras = Object.entries(context)
        .filter(([key, value]) => key !== "scope" && value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(" ");

    return [
        `🚨 [猫と植物] ${context.scope}`,
        `${detail.name}: ${detail.message}`,
        extras ? `context: ${extras}` : undefined,
        detail.stack ? "```\n" + detail.stack + "\n```" : undefined,
    ]
        .filter(Boolean)
        .join("\n");
}

async function notify(detail: ErrorDetail, context: ErrorContext): Promise<void> {
    const url = process.env.ERROR_WEBHOOK_URL;
    if (!url) return;

    if (!shouldNotify(`${context.scope}:${detail.name}:${detail.message}`, Date.now())) {
        return;
    }

    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildWebhookPayload(url, formatText(detail, context))),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
    } catch {
        // 通知の失敗は本処理に影響させない。構造化ログ側には残っている
    }
}

/**
 * エラーを構造化ログに残し、ERROR_WEBHOOK_URL があれば通知する。
 *
 * 呼び出し側は await しないこと。戻り値は void。
 */
export function reportError(error: unknown, context: ErrorContext): void {
    const detail = toDetail(error);

    try {
        console.error(
            JSON.stringify({
                level: "error",
                at: new Date().toISOString(),
                ...context,
                error: detail,
            })
        );
    } catch {
        // JSON 化できない context でもログは残す
        console.error(`[${context.scope}] ${detail.name}: ${detail.message}`);
    }

    void notify(detail, context);
}

/** テスト用。間引き状態を初期化する */
export function __resetErrorReportThrottle(): void {
    lastNotifiedAt.clear();
}

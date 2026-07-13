import { Client } from "@notionhq/client";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing ${name} environment variable`);
    }
    return value;
}

let client: Client | undefined;

/**
 * Notionクライアントを取得する。
 * 環境変数の検証をモジュール読み込み時ではなく初回呼び出し時に行う。
 * (トップレベルでの throw は import した時点で発火し、呼び出し側の
 * try-catch では捕捉できない。sitemap.ts 等の「取得失敗時は握りつぶす」
 * 設計を壊し、Notion機能を使わないビルドまで巻き込んで失敗させていた)
 */
export function getNotionClient(): Client {
    if (!client) {
        client = new Client({ auth: requireEnv("NOTION_API_KEY") });
    }
    return client;
}

/** お知らせDBのID (未設定なら呼び出し時にエラー) */
export function getNewsDatabaseId(): string {
    return requireEnv("NOTION_DATABASE_ID");
}

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    tag: string;
    create_date: string;
}
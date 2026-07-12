/**
 * サイトURL・サイト名の一元管理。
 * canonical / OGP / JSON-LD / sitemap / robots はすべてここを参照する。
 * (プレビュー環境では NEXT_PUBLIC_APP_BASE_URL の上書きで全所が一括で切り替わる)
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://neko-and-plant.com"
).replace(/\/+$/, "");

export const SITE_NAME = "猫と植物";

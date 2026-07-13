const DEFAULT_SITE_URL = "https://neko-and-plant.com";

/**
 * NEXT_PUBLIC_APP_BASE_URL を検証して返す。
 * `??` によるフォールバックは null/undefined にしか効かず、空文字列や
 * "example.com" のようなプロトコル欠落値では効かない。これらは
 * `new URL()` に渡すと即例外になり、metadataBase 経由で
 * 全ページ共通の layout 設定読み込み自体を失敗させ、ビルド全体を落とす。
 * そのため、ここで一箇所だけ厳格に検証してから返す。
 */
function resolveSiteUrl(): string {
    const raw = process.env.NEXT_PUBLIC_APP_BASE_URL;
    if (!raw) {
        return DEFAULT_SITE_URL;
    }
    try {
        return new URL(raw).origin;
    } catch {
        console.warn(
            `NEXT_PUBLIC_APP_BASE_URL is not a valid URL: "${raw}". Falling back to ${DEFAULT_SITE_URL}.`
        );
        return DEFAULT_SITE_URL;
    }
}

/**
 * サイトURL・サイト名の一元管理。
 * canonical / OGP / JSON-LD / sitemap / robots はすべてここを参照する。
 * (プレビュー環境では NEXT_PUBLIC_APP_BASE_URL の上書きで全所が一括で切り替わる)
 */
export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "猫と植物";

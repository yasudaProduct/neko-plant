/**
 * 公開Server Actionのページング・検索入力の正規化。
 * これらのアクションはページ側の定数と無関係にHTTPで直接呼べるため、
 * クライアントから渡る page / pageSize / query を必ずここで丸めて
 * 巨大クエリによる資源枯渇 (DoS) や負数によるDB例外を防ぐ。
 */

/** 1ページあたりの取得件数の既定上限 (投稿一覧など重いクエリ向け) */
export const MAX_PAGE_SIZE = 50;

/** 植物一覧の上限 (図鑑ページが1画面で最大200件を表示するため広めに取る) */
export const MAX_PLANT_PAGE_SIZE = 200;

/** 検索クエリの最大文字数 */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/** page を 1 以上の整数に丸める (不正値は 1) */
export function clampPage(page: number): number {
    if (!Number.isFinite(page)) {
        return 1;
    }
    return Math.max(1, Math.floor(page));
}

/** pageSize を 1〜max の整数に丸める (不正値は 12) */
export function clampPageSize(pageSize: number, max: number = MAX_PAGE_SIZE): number {
    if (!Number.isFinite(pageSize)) {
        return Math.min(12, max);
    }
    return Math.min(max, Math.max(1, Math.floor(pageSize)));
}

/** 検索クエリを trim して MAX_SEARCH_QUERY_LENGTH までに切り詰める */
export function clampSearchQuery(query: string | undefined | null): string {
    return (query ?? "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

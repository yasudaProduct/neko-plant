"use server";

import { unstable_cache } from "next/cache";
import { getNotionClient, getNewsDatabaseId, NewsItem } from "@/lib/notion";
import { BlockObjectResponse, GetPageResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notFound } from "next/navigation";

// Notion API は毎リクエスト叩くには遅い外部依存のため、
// 取得結果を1時間キャッシュする (一覧・詳細・sitemap が共有)
const NEWS_CACHE_REVALIDATE_SECONDS = 3600;

const fetchNewsList = unstable_cache(
    async (): Promise<NewsItem[]> => {
        const response = await getNotionClient().databases.query({
            database_id: getNewsDatabaseId(),
            sorts: [
                {
                    property: "create_date",
                    direction: "descending",
                },
            ],
        });

        return response.results
            .filter((page): page is PageObjectResponse => 'properties' in page && 'parent' in page)
            .map((page) => {
                return {
                    id: page.id,
                    title: page.properties.title.type === 'title' ? page.properties.title.title[0]?.plain_text || "" : "",
                    content: "",
                    tag: page.properties.tag.type === 'select' ? page.properties.tag.select?.name || "" : "",
                    create_date: page.properties.create_date.type === 'date' ? page.properties.create_date.date?.start || "" : "",
                }
            });
    },
    ["news-list"],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS },
);

export async function getNews(): Promise<NewsItem[]> {
    try {
        return await fetchNewsList();
    } catch (error) {
        console.error("Failed to fetch news:", error);
        throw new Error("Failed to fetch news");
    }
}

/** NotionのID表記ゆれ (ハイフン有無・大文字小文字) を吸収して比較する */
function normalizeNotionId(id: string): string {
    return id.replace(/-/g, "").toLowerCase();
}

// notFound() はキャッシュ関数の外で呼ぶ必要があるため、
// お知らせDB配下のページでない場合は null を返す
const fetchNewsItem = unstable_cache(
    async (id: string): Promise<NewsItem | null> => {
        const notion = getNotionClient();

        const response: GetPageResponse = await notion.pages.retrieve({
            page_id: id,
        });

        if (!("properties" in response)) {
            return null;
        }

        // お知らせDB配下のページ以外は返さない (連携が共有する他ページの読み出し防止)
        if (
            response.parent.type !== "database_id" ||
            normalizeNotionId(response.parent.database_id) !== normalizeNotionId(getNewsDatabaseId())
        ) {
            return null;
        }

        const blocks = await notion.blocks.children.list({ block_id: id });

        return {
            id: response.id,
            title: response.properties.title.type === 'title' ? response.properties.title.title[0]?.plain_text || "" : "",
            content: blocks.results
                .filter((block): block is BlockObjectResponse => "type" in block)
                .map((block) => block.type === "paragraph" ? block.paragraph?.rich_text.map((text) => text.plain_text).join("") : "").join("\n"),
            tag: response.properties.tag.type === 'select' ? response.properties.tag.select?.name || "" : "",
            create_date: response.properties.create_date.type === 'date' ? response.properties.create_date.date?.start || "" : "",
        }
    },
    ["news-item"],
    { revalidate: NEWS_CACHE_REVALIDATE_SECONDS },
);

export async function getNewsById(id: string): Promise<NewsItem> {
    // Notion のページIDは32桁hex (ハイフン任意)。それ以外は問い合わせずに404
    if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) {
        return notFound();
    }

    let news: NewsItem | null;
    try {
        news = await fetchNewsItem(id);
    } catch (error) {
        console.error("Failed to fetch news:", error);
        throw new Error("Failed to fetch news");
    }

    if (!news) {
        return notFound();
    }

    return news;
}

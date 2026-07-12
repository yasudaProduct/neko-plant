"use server";

import { notion, databaseId, NewsItem } from "@/lib/notion";
import { BlockObjectResponse, GetPageResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notFound, unstable_rethrow } from "next/navigation";

export async function getNews(): Promise<NewsItem[]> {
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
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
    } catch (error) {
        console.error("Failed to fetch news:", error);
        throw new Error("Failed to fetch news");
    }
}

/** NotionのID表記ゆれ (ハイフン有無・大文字小文字) を吸収して比較する */
function normalizeNotionId(id: string): string {
    return id.replace(/-/g, "").toLowerCase();
}

export async function getNewsById(id: string): Promise<NewsItem> {
    // Notion のページIDは32桁hex (ハイフン任意)。それ以外は問い合わせずに404
    if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) {
        return notFound();
    }

    try {
        const response: GetPageResponse = await notion.pages.retrieve({
            page_id: id,
        });

        if (!("properties" in response)) {
            return notFound();
        }

        // お知らせDB配下のページ以外は返さない (連携が共有する他ページの読み出し防止)
        if (
            response.parent.type !== "database_id" ||
            normalizeNotionId(response.parent.database_id) !== normalizeNotionId(databaseId)
        ) {
            return notFound();
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
    } catch (error) {
        // notFound() が投げる制御用エラーはそのまま伝播させる
        unstable_rethrow(error);
        console.error("Failed to fetch news:", error);
        throw new Error("Failed to fetch news");
    }
}

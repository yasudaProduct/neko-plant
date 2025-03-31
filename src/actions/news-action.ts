"use server";

import { notion, databaseId, NewsItem } from "@/lib/notion";
import { BlockObjectResponse, GetPageResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notFound } from "next/navigation";

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

export async function getNewsById(id: string): Promise<NewsItem> {
    try {
        const response: GetPageResponse = await notion.pages.retrieve({
            page_id: id,
        });
        const blocks = await notion.blocks.children.list({ block_id: id });

        if (!("properties" in response)) {
            return notFound();
        }

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
        console.error("Failed to fetch news:", error);
        throw new Error("Failed to fetch news");
    }
}

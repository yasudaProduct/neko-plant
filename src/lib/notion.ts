import { Client } from "@notionhq/client";

if (!process.env.NOTION_API_KEY) {
    throw new Error("Missing NOTION_API_KEY environment variable");
}

if (!process.env.NOTION_DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID environment variable");
}

export const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

export const databaseId = process.env.NOTION_DATABASE_ID;

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    tag: string;
    create_date: string;
}
import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'
import { getNews } from '@/actions/news-action'

const BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL
if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_APP_BASE_URL is not set')
}

// 1時間ごとに再生成（ISR）
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 静的ページ
    const now = new Date()
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL!,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/plants`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/news`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/terms`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/privacy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ]

    // 植物詳細ページ（DBから取得）
    let plantPages: MetadataRoute.Sitemap = []
    try {
        const plants = await prisma.plants.findMany({
            select: { id: true, updated_at: true },
            orderBy: { updated_at: 'desc' },
        })

        plantPages = plants.map((plant) => ({
            url: `${BASE_URL}/plants/${plant.id}`,
            lastModified: plant.updated_at ?? now,
            changeFrequency: 'weekly',
            priority: 0.9,
        }))
    } catch (error) {
        console.error('sitemap: failed to fetch plants', error)
    }

    // ニュース詳細ページ（Notionから取得）
    let newsPages: MetadataRoute.Sitemap = []
    try {
        const news = await getNews()
        newsPages = news.map((item) => ({
            url: `${BASE_URL}/news/${item.id}`,
            lastModified: item.create_date ? new Date(item.create_date) : now,
            changeFrequency: 'monthly',
            priority: 0.7,
        }))
    } catch (error) {
        console.error('sitemap: failed to fetch news', error)
    }

    return [...staticPages, ...plantPages, ...newsPages]
}



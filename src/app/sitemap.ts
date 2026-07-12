import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'
import { getNews } from '@/actions/news-action'
import { SITE_URL } from '@/lib/site'

const BASE_URL = SITE_URL

// 1時間ごとに再生成（ISR）
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 静的ページ
    const now = new Date()
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
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
            url: `${BASE_URL}/zukan`,
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

    // 投稿詳細ページ（中核UGC。updated_at 列が無いため lastModified は created_at）
    let postPages: MetadataRoute.Sitemap = []
    try {
        const posts = await prisma.posts.findMany({
            select: { id: true, created_at: true },
            orderBy: { created_at: 'desc' },
        })

        postPages = posts.map((post) => ({
            url: `${BASE_URL}/posts/${post.id}`,
            lastModified: post.created_at,
            changeFrequency: 'weekly',
            priority: 0.8,
        }))
    } catch (error) {
        console.error('sitemap: failed to fetch posts', error)
    }

    // プロフィールページ（投稿が1件以上あるユーザーのみ。0件は noindex 扱い）
    let profilePages: MetadataRoute.Sitemap = []
    try {
        const users = await prisma.public_users.findMany({
            where: { posts: { some: {} } },
            select: {
                alias_id: true,
                posts: {
                    select: { created_at: true },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        })

        profilePages = users.map((user) => ({
            url: `${BASE_URL}/${user.alias_id}`,
            lastModified: user.posts[0]?.created_at ?? now,
            changeFrequency: 'weekly',
            priority: 0.6,
        }))
    } catch (error) {
        console.error('sitemap: failed to fetch users', error)
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

    return [...staticPages, ...plantPages, ...postPages, ...profilePages, ...newsPages]
}



import { writeFileSync } from 'fs';
import { globby } from 'globby';
import { resolve } from 'path';
import prisma from '../src/lib/prisma';
import { getNews } from '../src/actions/news-action';

const BASE_URL = 'https://neko-and-plant.com';

// 静的ページの除外パターン
const EXCLUDED_PATTERNS = [
    '**/_*.tsx',
    '**/layout.tsx',
    '**/loading.tsx',
    '**/error.tsx',
    '**/not-found.tsx',
    '**/settings/**', // 認証が必要なページ
    '**/(auth-pages)/**', // 認証ページ
    '**/plants/new', // 新規作成ページ（認証必要）
    '**/plants/[id]/edit', // 編集ページ（認証必要）
];

interface SitemapUrl {
    loc: string;
    lastmod: string;
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
}

async function generateSitemap() {
    const urls: SitemapUrl[] = [];

    // 1. 静的ページを取得
    const staticPages: string[] = await globby([
        'src/app/**/page.tsx',
        ...EXCLUDED_PATTERNS.map(pattern => `!${pattern}`),
    ]);

    // 静的ページをサイトマップに追加
    staticPages.forEach((page: string) => {
        const path = page
            .replace('src/app', '')
            .replace('/page.tsx', '')
            .replace('/index.tsx', '');

        if (!path) {
            // トップページ
            urls.push({
                loc: BASE_URL + '/',
                lastmod: new Date().toISOString(),
                changefreq: 'daily',
                priority: 1.0,
            });
        } else {
            // その他の静的ページ
            urls.push({
                loc: BASE_URL + path,
                lastmod: new Date().toISOString(),
                changefreq: 'weekly',
                priority: 0.8,
            });
        }
    });

    // 2. 植物詳細ページをデータベースから取得
    try {
        const plants = await prisma.plants.findMany({
            select: {
                id: true,
                updated_at: true,
            },
            orderBy: {
                updated_at: 'desc',
            },
        });

        plants.forEach((plant) => {
            urls.push({
                loc: `${BASE_URL}/plants/${plant.id}`,
                lastmod: plant.updated_at?.toISOString() || new Date().toISOString(),
                changefreq: 'weekly',
                priority: 0.9, // 植物詳細ページは高優先度
            });
        });

        console.log(`✓ Added ${plants.length} plant pages to sitemap`);
    } catch (error) {
        console.error('Failed to fetch plants:', error);
    }

    // 3. ニュース詳細ページをNotionから取得
    try {
        const news = await getNews();
        news.forEach((item) => {
            urls.push({
                loc: `${BASE_URL}/news/${item.id}`,
                lastmod: item.create_date ? new Date(item.create_date).toISOString() : new Date().toISOString(),
                changefreq: 'monthly',
                priority: 0.7,
            });
        });

        console.log(`✓ Added ${news.length} news pages to sitemap`);
    } catch (error) {
        console.error('Failed to fetch news:', error);
    }

    // 4. サイトマップXMLを生成
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
            .map(
                (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
            )
            .join('\n')}
</urlset>`;

    // 5. ファイルに書き込み
    const outputPath = resolve(process.cwd(), 'public/sitemap.xml');
    writeFileSync(outputPath, sitemap, 'utf-8');

    console.log(`✓ Sitemap generated successfully: ${urls.length} URLs`);
    console.log(`  - Static pages: ${staticPages.length}`);
    console.log(`  - Plant pages: ${urls.filter(u => u.loc.includes('/plants/')).length}`);
    console.log(`  - News pages: ${urls.filter(u => u.loc.includes('/news/')).length}`);
}

generateSitemap()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error generating sitemap:', error);
        process.exit(1);
    }); 
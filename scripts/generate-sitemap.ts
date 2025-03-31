import { writeFileSync } from 'fs';
import { globby } from 'globby';
import { resolve } from 'path';

const BASE_URL = 'https://neko-and-plant.com';

async function generateSitemap() {
    const pages: string[] = await globby([
        'src/app/**/page.tsx',
        '!src/app/**/_*.tsx',
        '!src/app/**/layout.tsx',
        '!src/app/**/loading.tsx',
        '!src/app/**/error.tsx',
        '!src/app/**/not-found.tsx',
    ]);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
            .map((page: string) => {
                const path = page
                    .replace('src/app', '')
                    .replace('/page.tsx', '')
                    .replace('/index.tsx', '')
                    .replace(/\[.*?\]/g, '');

                if (!path) return '';

                return `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
            })
            .filter(Boolean)
            .join('')}
</urlset>`;

    writeFileSync(resolve(process.cwd(), 'public/sitemap.xml'), sitemap);
}

generateSitemap(); 
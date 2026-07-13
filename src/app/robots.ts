import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin',
                '/settings',
                '/auth/',
                '/signin',
                '/signup',
                '/posts/new',
                '/plants/new',
                '/plants/*/edit',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}

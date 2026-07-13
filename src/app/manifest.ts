import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: SITE_NAME,
        description: '猫にとって安全な植物を探すためのサイトです。',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2d5a27',
        icons: [
            {
                src: '/images/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/images/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '猫と植物',
        short_name: '猫と植物',
        description: '猫にとって安全な植物を探すためのサイトです。',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/images/logo.png',
                sizes: '192x192',
                type: 'image/jpg',
            },
            {
                src: '/images/logo.png',
                sizes: '512x512',
                type: 'image/jpg',
            },
        ],
    }
}
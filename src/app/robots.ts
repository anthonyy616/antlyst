import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://antlyst.xyz'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/_next/', '/admin/', '/private/', '/.env', '/config/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}

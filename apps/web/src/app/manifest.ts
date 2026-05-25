import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Concert Crawl',
    short_name: 'Concert Crawl',
    description:
      'Denver concert calendar — find shows at your favorite venues.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070A1A',
    theme_color: '#070A1A',
    icons: [
      {
        src: '/api/pwa/icon-192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

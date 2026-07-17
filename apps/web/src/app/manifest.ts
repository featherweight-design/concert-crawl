import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Concert Crawl',
    short_name: 'Concert Crawl',
    description:
      'Denver concert calendar — find shows at your favorite venues.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#070A1A',
    theme_color: '#070A1A',
    categories: ['music', 'entertainment', 'events'],
    icons: [
      {
        src: '/api/pwa/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa/icon-maskable-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/api/pwa/icon-maskable-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Browse events', short_name: 'Events', url: '/' },
      { name: 'Search', short_name: 'Search', url: '/search' },
    ],
    screenshots: [
      {
        src: '/api/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Concert Crawl',
      },
    ],
  }
}

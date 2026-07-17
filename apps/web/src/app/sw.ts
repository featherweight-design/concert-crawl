/// <reference lib="webworker" />
// The reference directive above scopes the WebWorker lib to THIS file only, so the
// app-wide tsconfig keeps its DOM lib and we avoid conflicting global type
// declarations (self, addEventListener, etc.) between DOM and WebWorker.
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from 'serwist'
import { isPublicCacheableApi } from '@/lib/pwa/route-cache'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Serwist replaces the single literal `self.__SW_MANIFEST` reference with the
// build-time precache list; it must appear exactly once in this source, so read
// it into a local before use.
const precacheEntries = self.__SW_MANIFEST

// Only same-origin-as-the-API requests are eligible. Guard the origin explicitly
// so an unrelated cross-origin URL that happens to share a `/v1/events` path
// prefix can never enter the public cache.
const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? self.location.origin,
).origin

const publicApiCache = {
  matcher: ({ request, url }: { request: Request; url: URL }) =>
    request.method === 'GET' &&
    url.origin === apiOrigin &&
    isPublicCacheableApi(url),
  handler: new StaleWhileRevalidate({
    cacheName: 'public-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
}

const serwist = new Serwist({
  // Conditional spread rather than passing the value directly: under
  // exactOptionalPropertyTypes the option must be an array or absent, never
  // explicitly `undefined`.
  ...(precacheEntries ? { precacheEntries } : {}),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [publicApiCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()

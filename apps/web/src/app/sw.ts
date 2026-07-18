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
// prefix can never enter the public cache. Parse defensively: an empty or
// malformed NEXT_PUBLIC_API_URL would throw here during SW evaluation, aborting
// install/activation and breaking offline caching entirely — so fall back to the
// worker's own origin on any invalid value.
function resolveApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch (err) {
      console.error(
        'Invalid NEXT_PUBLIC_API_URL; falling back to self.location.origin',
        err,
      )
    }
  }
  return self.location.origin
}

const apiOrigin = resolveApiOrigin()

const publicApiCache = {
  // Refuse to cache any credentialed request: otherwise-public endpoints like
  // GET /v1/events/:id return auth-dependent fields (e.g. `isWatching`) when an
  // Authorization header is present, which would leak user state into the shared
  // public cache. Keeping the invariant "only anonymous responses are cached."
  matcher: ({ request, url }: { request: Request; url: URL }) =>
    request.method === 'GET' &&
    url.origin === apiOrigin &&
    !request.headers.has('Authorization') &&
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

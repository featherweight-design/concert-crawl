/// <reference lib="webworker" />
// The reference directive above scopes the WebWorker lib to THIS file only, so the
// app-wide tsconfig keeps its DOM lib and we avoid conflicting global type
// declarations (self, addEventListener, etc.) between DOM and WebWorker.
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'
import {
  isApiOrigin,
  isPublicCacheableApi,
  isPublicCacheableDocument,
} from '@/lib/pwa/route-cache'
import {
  buildNotificationOptions,
  isValidPushPayload,
  safeSameOriginPath,
  type PushPayload,
} from '@/lib/pwa/push-notification'

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
// prefix can never enter the public cache. The production API's old and new
// origins are accepted as well (`isApiOrigin`), for the Render-to-Vercel move.
// Parse defensively: an empty or malformed NEXT_PUBLIC_API_URL would throw here
// during SW evaluation, aborting install/activation and breaking offline
// caching entirely — so fall back to the worker's own origin on any invalid
// value.
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

// Read in this file rather than through `isPublicBrowseEnabled()`. Next's
// DefinePlugin only inlines `process.env.NEXT_PUBLIC_*` reads written in the
// worker entry itself; the same read inside an imported module compiles to a
// webpack `process` shim whose `env` is empty at worker runtime, so the flag
// would read `false` forever and never flip at launch.
const launched = process.env.NEXT_PUBLIC_PUBLIC_BROWSE === 'true'

const publicApiCache = {
  // Refuse to cache any credentialed request: otherwise-public endpoints like
  // GET /v1/events/:id return auth-dependent fields (e.g. `isWatching`) when an
  // Authorization header is present, which would leak user state into the shared
  // public cache. Keeping the invariant "only anonymous responses are cached."
  matcher: ({ request, url }: { request: Request; url: URL }) =>
    request.method === 'GET' &&
    isApiOrigin(url.origin, apiOrigin) &&
    !request.headers.has('Authorization') &&
    isPublicCacheableApi(url),
  handler: new StaleWhileRevalidate({
    cacheName: 'public-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
}

// `defaultCache` NetworkFirsts every same-origin page into `pages`,
// `pages-rsc` and `pages-rsc-prefetch`. A cached page is replayed without the
// middleware ever running, so a gated route cached during one session becomes
// readable by a signed-out visitor in the next — the beta gate silently
// bypassed. Registered BEFORE defaultCache so it wins the route match; Serwist
// still attaches the `/~offline` fallback to this handler, so an offline
// navigation to an uncacheable route lands there instead of failing.
const gatedPagesNetworkOnly = {
  matcher: ({ request, url }: { request: Request; url: URL }) => {
    if (url.origin !== self.location.origin) return false
    if (url.pathname.startsWith('/api/')) return false
    if (url.pathname.startsWith('/_next/')) return false
    // Scoped to page requests only: matching more broadly would swallow the
    // static assets that `defaultCache` needs to cache for offline to work.
    const isPage =
      request.mode === 'navigate' || request.headers.get('RSC') === '1'
    if (!isPage) return false
    return !isPublicCacheableDocument(url, launched)
  },
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  // Conditional spread rather than passing the value directly: under
  // exactOptionalPropertyTypes the option must be an array or absent, never
  // explicitly `undefined`.
  ...(precacheEntries ? { precacheEntries } : {}),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [publicApiCache, gatedPagesNetworkOnly, ...defaultCache],
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

// Every install that predates `gatedPagesNetworkOnly` has gated pages sitting in
// these caches already, and a new worker does not clear them. Dropping them on
// activation remediates the bypass on update rather than only for fresh
// installs. This runs on every activation, not just the first, which is
// deliberate: a version-flag guard would be more state to get wrong than the
// cost it saves, and these caches repopulate from the network on demand.
const PAGE_CACHES = ['pages', 'pages-rsc', 'pages-rsc-prefetch']

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(PAGE_CACHES.map((name) => caches.delete(name))).catch((err) => {
      console.warn('sw: failed to clear stale page caches', err)
    }),
  )
})

// #971 Web push handlers. The payload contract, the same-origin guard and
// the showNotification mapping live in `@/lib/pwa/push-notification` so they
// can be unit-tested; a service worker's listeners cannot be imported.

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: PushPayload
  try {
    const raw = event.data.json()
    if (!isValidPushPayload(raw)) {
      console.warn('sw: dropping push with invalid payload shape')
      return
    }
    payload = raw
  } catch (parseErr) {
    console.warn('sw: dropping push with unparseable body', parseErr)
    return
  }
  const options = buildNotificationOptions(payload, self.location.origin)
  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = safeSameOriginPath(
    typeof event.notification.data === 'object' &&
      event.notification.data !== null &&
      'actionUrl' in event.notification.data
      ? event.notification.data.actionUrl
      : undefined,
    self.location.origin,
  )
  event.waitUntil(
    // includeUncontrolled: true — after a fresh SW install/update, existing
    // tabs aren't controlled yet, so the default matchAll returns [] and we'd
    // wastefully openWindow a duplicate tab.
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then(() => client.navigate(target))
          }
        }
        return self.clients.openWindow(target)
      }),
  )
})

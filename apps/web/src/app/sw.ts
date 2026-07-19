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

// #971 Web push handlers.
// Payload shape sent by packages/push/src/send-push.ts.
interface PushPayload {
  title: string
  body: string
  actionUrl?: string
  tag?: string
}

const isValidPayload = (value: unknown): value is PushPayload => {
  if (typeof value !== 'object' || value === null) return false
  if (!('title' in value) || typeof value.title !== 'string') return false
  if (value.title.length === 0 || value.title.length > 200) return false
  if (!('body' in value) || typeof value.body !== 'string') return false
  if (value.body.length === 0 || value.body.length > 500) return false
  if (
    'actionUrl' in value &&
    typeof value.actionUrl !== 'string' &&
    value.actionUrl !== undefined
  ) {
    return false
  }
  if (
    'tag' in value &&
    typeof value.tag !== 'string' &&
    value.tag !== undefined
  ) {
    return false
  }
  return true
}

// Constrain actionUrl to a same-origin path — push payloads are untrusted
// input, and `notification.data` persists across events, so a malicious value
// must never reach `client.navigate` / `openWindow` as a full URL.
const safeSameOriginPath = (raw: unknown): string => {
  if (typeof raw !== 'string' || raw.length === 0) return '/'
  try {
    const parsed = new URL(raw, self.location.origin)
    if (parsed.origin !== self.location.origin) {
      // Log the drop so a compromised push endpoint injecting external URLs is
      // visible in operator logs — a malformed payload that lands here is
      // useful to diagnose.
      console.warn('sw: dropped cross-origin actionUrl', { raw })
      return '/'
    }
    return parsed.pathname + parsed.search
  } catch (parseErr) {
    console.warn('sw: dropped unparseable actionUrl', { raw, err: parseErr })
    return '/'
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: PushPayload
  try {
    const raw = event.data.json()
    if (!isValidPayload(raw)) {
      console.warn('sw: dropping push with invalid payload shape')
      return
    }
    payload = raw
  } catch (parseErr) {
    console.warn('sw: dropping push with unparseable body', parseErr)
    return
  }
  const options: NotificationOptions = {
    body: payload.body,
    icon: '/api/pwa/icon-192',
    badge: '/api/pwa/icon-maskable-192',
    data: { actionUrl: safeSameOriginPath(payload.actionUrl) },
    ...(payload.tag ? { tag: payload.tag } : {}),
  }
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

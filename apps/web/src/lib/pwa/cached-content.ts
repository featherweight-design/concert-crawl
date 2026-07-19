// Matches the display-relevant subset of EventWithVenue returned by
// `/v1/events` (see apps/api/src/routes/events.ts). Only fields the offline
// shortcuts render — keeping this narrow avoids over-coupling to the full
// EventWithVenue shape.
interface CachedEvent {
  id: string
  title: string
  date: string
  venue: { name: string; slug: string }
}

// Matches the display-relevant subset of the venue rows returned by
// `/v1/venues` (see apps/api/src/routes/venues-public.ts).
interface CachedVenue {
  id: string
  name: string
  slug: string
}

export type { CachedEvent, CachedVenue }

const CACHE_NAME = 'public-api'

// Type guard for the event summary shape. Uses `in` narrowing (no cast) and
// walks into the nested `venue` object because the API returns
// `EventWithVenue` where the venue name lives under `event.venue.name`.
const isCachedEvent = (value: unknown): value is CachedEvent => {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string') return false
  if (!('title' in value) || typeof value.title !== 'string') return false
  if (!('date' in value) || typeof value.date !== 'string') return false
  if (!('venue' in value)) return false
  const { venue } = value
  if (typeof venue !== 'object' || venue === null) return false
  if (!('name' in venue) || typeof venue.name !== 'string') return false
  if (!('slug' in venue) || typeof venue.slug !== 'string') return false
  return true
}

const isCachedVenue = (value: unknown): value is CachedVenue => {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string') return false
  if (!('name' in value) || typeof value.name !== 'string') return false
  if (!('slug' in value) || typeof value.slug !== 'string') return false
  return true
}

// Peel the Hono `{ success: true, data: ... }` envelope, and — for the events
// list — the nested `{ data: { data: [...] } }` shape (see events.ts's
// return ctx.json({ success: true, data: { data: rows } })). Returns the first
// array found, walking at most two `data` hops. Handles legacy plain arrays
// and `{ items: [...] }` too so a stale cached response from an earlier API
// version doesn't blank the fallback.
const unwrapArray = (raw: unknown): unknown[] | null => {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'object' || raw === null) return null
  if ('items' in raw && Array.isArray(raw.items)) return raw.items
  if ('data' in raw) {
    const first = raw.data
    if (Array.isArray(first)) return first
    if (typeof first === 'object' && first !== null && 'data' in first) {
      const second = first.data
      if (Array.isArray(second)) return second
    }
  }
  return null
}

const readCollection = async <T>(
  pathname: string,
  isValid: (value: unknown) => value is T,
): Promise<T[]> => {
  try {
    if (typeof caches === 'undefined') return []
    // Guard existence BEFORE opening — caches.open(name) creates the cache
    // when absent, which would make "empty" indistinguishable from
    // "never populated" and blank out the empty state.
    const cacheNames = await caches.keys()
    if (!cacheNames.includes(CACHE_NAME)) return []
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    for (const request of keys) {
      const requestUrl = new URL(request.url)
      // Exact-match the collection URL. The SW allowlist also caches detail
      // routes (/v1/events/:uuid) but those have different shapes; scoping
      // the shortcuts to the collection keeps parsing predictable and reuses
      // the summary shape the list already renders.
      if (requestUrl.pathname !== pathname) continue
      const response = await cache.match(request)
      if (!response) continue
      try {
        const rawResponse: unknown = await response.clone().json()
        const rows = unwrapArray(rawResponse)
        if (!rows) continue
        const validated: T[] = []
        for (const row of rows) {
          if (isValid(row)) validated.push(row)
        }
        // Only return once we've found a cache entry that actually produces
        // usable shortcuts. Multiple entries can share a pathname (query
        // strings survive as full Request objects in the cache but URL.pathname
        // strips them), so a stale-shape entry from `/v1/events?filter=x`
        // shouldn't blank an intact response from `/v1/events?filter=y`.
        if (validated.length > 0) return validated
      } catch (parseErr) {
        // Log + skip so one bad cached entry can't blank the shortcuts list.
        console.warn('cached-content: skipping malformed entry', {
          url: request.url,
          err: parseErr,
        })
      }
    }
    return []
  } catch (readErr) {
    console.warn('cached-content: cache read failed', readErr)
    return []
  }
}

export const getCachedEvents = (): Promise<CachedEvent[]> =>
  readCollection('/v1/events', isCachedEvent)

export const getCachedVenues = (): Promise<CachedVenue[]> =>
  readCollection('/v1/venues', isCachedVenue)

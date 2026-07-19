// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCachedEvents, getCachedVenues } from '../cached-content'

// Fake CacheStorage that seeds named caches with fixed responses. We implement
// the full Cache interface (stubbing the methods we don't exercise) so no
// `as unknown as Cache` cast is needed at the mock boundary.
type CacheEntry = { url: string; body: unknown }

const makeCache = (entries: CacheEntry[]): Cache => ({
  keys: async () => entries.map((entry) => new Request(entry.url)),
  match: async (request: RequestInfo | URL) => {
    const url =
      typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.href
          : request.url
    const entry = entries.find((row) => row.url === url)
    if (!entry) return undefined
    return new Response(JSON.stringify(entry.body), {
      headers: { 'content-type': 'application/json' },
    })
  },
  // Stubs for the methods we don't test — return the correct types so the
  // structural check passes without any `as` cast at the caller.
  add: async () => undefined,
  addAll: async () => undefined,
  delete: async () => false,
  matchAll: async () => [],
  put: async () => undefined,
})

const makeCacheStorage = (
  caches: Record<string, CacheEntry[]>,
): CacheStorage => ({
  keys: async () => Object.keys(caches),
  has: async (name: string) => name in caches,
  open: async (name: string) => {
    caches[name] ||= []
    return makeCache(caches[name])
  },
  delete: async () => true,
  match: async () => undefined,
})

// Real API envelope shapes copied verbatim from apps/api/src/routes/events.ts
// and venues-public.ts. Keep in sync with those routes.
const eventsResponse = (rows: unknown[]) => ({
  success: true,
  data: { data: rows },
})
const venuesResponse = (rows: unknown[]) => ({ success: true, data: rows })

const sampleEvent = {
  id: 'evt-1',
  title: 'Amyl at the Roxy',
  date: '2026-08-14',
  venue: { name: 'The Roxy', slug: 'the-roxy' },
}

const sampleVenue = {
  id: 'ven-1',
  name: 'The Roxy',
  slug: 'the-roxy',
}

beforeEach(() => {
  vi.stubGlobal('caches', undefined)
})

describe('cached-content', () => {
  it('returns [] when Cache Storage is unavailable', async () => {
    expect(await getCachedEvents()).toEqual([])
    expect(await getCachedVenues()).toEqual([])
  })

  it('returns [] when the named cache does not exist', async () => {
    vi.stubGlobal('caches', makeCacheStorage({ 'other-cache': [] }))
    expect(await getCachedEvents()).toEqual([])
  })

  it('returns [] when the cache exists but has no matching URL', async () => {
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/venues',
            body: venuesResponse([]),
          },
        ],
      }),
    )
    expect(await getCachedEvents()).toEqual([])
  })

  it('reads the real Hono events envelope { success, data: { data: [...] } }', async () => {
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/events',
            body: eventsResponse([sampleEvent, { id: 'not-an-event' }]),
          },
        ],
      }),
    )
    const events = await getCachedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Amyl at the Roxy')
    expect(events[0]?.venue.name).toBe('The Roxy')
  })

  it('reads the real Hono venues envelope { success, data: [...] }', async () => {
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/venues',
            body: venuesResponse([sampleVenue]),
          },
        ],
      }),
    )
    const venues = await getCachedVenues()
    expect(venues).toHaveLength(1)
    expect(venues[0]?.name).toBe('The Roxy')
  })

  it('falls back to legacy plain-array envelopes', async () => {
    // Stale cached response from an earlier API version.
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/events',
            body: [sampleEvent],
          },
        ],
      }),
    )
    expect(await getCachedEvents()).toHaveLength(1)
  })

  it('keeps scanning when the first matching cache entry has zero validated rows', async () => {
    // Query-string variants of the same pathname produce multiple cache
    // entries. If the first one is empty/stale and the second is intact,
    // the reader should return the intact rows — not the empty first hit.
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/events?filter=broken',
            body: eventsResponse([{ id: 'not-an-event' }]),
          },
          {
            url: 'https://api.example.com/v1/events?filter=intact',
            body: eventsResponse([sampleEvent]),
          },
        ],
      }),
    )
    const events = await getCachedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Amyl at the Roxy')
  })

  it('skips detail-route cache entries', async () => {
    vi.stubGlobal(
      'caches',
      makeCacheStorage({
        'public-api': [
          {
            url: 'https://api.example.com/v1/events/8c6b7e00-0000-0000-0000-000000000000',
            body: eventsResponse([sampleEvent]),
          },
        ],
      }),
    )
    expect(await getCachedEvents()).toEqual([])
  })
})

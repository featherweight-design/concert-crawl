import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ApiModule from '@/lib/api'

const getMock = vi.fn()
// The real `ApiError` comes through: the route's 404-vs-502 split turns on
// `instanceof`, so a stand-in class would make that branch untestable.
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  publicApiClient: { get: getMock },
}))

const { ApiError } = await import('@/lib/api')

const { GET } = await import('@/app/share/[eventId]/[ratio]/route')

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../../public')
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const EVENT_ID = '11111111-2222-4333-8444-555555555555'

// The route fetches its fonts from its own origin. In a node test there is no
// origin, so `fetch` is redirected at the bundled files — the same bytes the
// edge would have served.
const originalFetch = globalThis.fetch
const serveFontsFromDisk = (): void => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const buffer = await readFile(path.join(PUBLIC_DIR, url.pathname))
    return new Response(buffer, { status: 200 })
  })
}

// Deliberately not annotated as `EventDetailResponse`: the route only reads the
// handful of fields `toPosterEvent` maps, and annotating would force either a
// cast or forty irrelevant nulls. If the mapper starts reading a new field, the
// render assertions below fail — which is the signal we actually want.
const event = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  date: '2026-03-14',
  showTime: '20:00',
  venue: {
    id: 'venue-1',
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    city: 'Denver',
    websiteUrl: null,
    timezone: 'America/Denver',
  },
  ticketPriceMin: '28.00',
  ticketPriceOpenedAt: 40,
  priceStatus: 'live',
}

const call = (
  url: string,
  params: { eventId: string; ratio: string },
  init: RequestInit = {},
) => GET(new Request(url, init), { params: Promise.resolve(params) })

const digest = async (response: Response): Promise<string> =>
  createHash('sha256')
    .update(Buffer.from(await response.arrayBuffer()))
    .digest('hex')

describe('GET /share/[eventId]/[ratio]', () => {
  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  beforeEach(() => {
    vi.clearAllMocks()
    serveFontsFromDisk()
    getMock.mockResolvedValue(event)
  })

  it('renders a PNG with the locked cache headers', async () => {
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    )
    expect(response.headers.get('ETag')).toMatch(/^"share:/)
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.subarray(0, 4)).toEqual(PNG_MAGIC)
  }, 30_000)

  it('is byte-identical for identical requests', async () => {
    const url = `http://localhost/share/${EVENT_ID}/square`
    const params = { eventId: EVENT_ID, ratio: 'square' }
    const first = await digest(await call(url, params))
    const second = await digest(await call(url, params))
    expect(first).toBe(second)
  }, 30_000)

  it('400s an unknown ratio without calling the API', async () => {
    const response = await call(`http://localhost/share/${EVENT_ID}/banner`, {
      eventId: EVENT_ID,
      ratio: 'banner',
    })
    expect(response.status).toBe(400)
    expect(getMock).not.toHaveBeenCalled()
  })

  it('400s a malformed event id without calling the API', async () => {
    const response = await call('http://localhost/share/nope/story', {
      eventId: 'nope',
      ratio: 'story',
    })
    expect(response.status).toBe(400)
    expect(getMock).not.toHaveBeenCalled()
  })

  it('404s when the event does not exist', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'not found'))
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    })
    expect(response.status).toBe(404)
  })

  // A 404 here is cached for a day by `s-maxage`, so answering an outage with
  // one outlives the outage that caused it.
  it('502s rather than caching an outage as a missing event', async () => {
    for (const failure of [
      new ApiError(503, 'upstream down'),
      new Error('ECONNRESET'),
    ]) {
      getMock.mockRejectedValue(failure)
      const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
        eventId: EVENT_ID,
        ratio: 'story',
      })
      expect(response.status).toBe(502)
    }
  })

  it('502s rather than rendering in a substitute font', async () => {
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 404 }))
    const response = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    })
    expect(response.status).toBe(502)
  })

  it('304s a matching If-None-Match', async () => {
    const url = `http://localhost/share/${EVENT_ID}/link`
    const params = { eventId: EVENT_ID, ratio: 'link' }
    const first = await call(url, params)
    const etag = first.headers.get('ETag') ?? ''
    const second = await call(url, params, {
      headers: { 'if-none-match': etag },
    })
    expect(second.status).toBe(304)
  }, 30_000)

  it('varies the ETag by ratio and theme', async () => {
    const story = await call(`http://localhost/share/${EVENT_ID}/story`, {
      eventId: EVENT_ID,
      ratio: 'story',
    })
    const square = await call(`http://localhost/share/${EVENT_ID}/square`, {
      eventId: EVENT_ID,
      ratio: 'square',
    })
    const jade = await call(
      `http://localhost/share/${EVENT_ID}/story?theme=jade`,
      { eventId: EVENT_ID, ratio: 'story' },
    )
    const tags = [story, square, jade].map((res) => res.headers.get('ETag'))
    expect(new Set(tags).size).toBe(3)
  }, 30_000)

  // The mint's contentHash only moves with `state`, so a corrected artist or a
  // changed drop amount would otherwise keep serving yesterday's PNG for the
  // full s-maxage day.
  it('varies the ETag with every field drawn on the card', async () => {
    const tagFor = async (overrides: Record<string, unknown>) => {
      getMock.mockResolvedValue({ ...event, ...overrides })
      const response = await call(`http://localhost/share/${EVENT_ID}/link`, {
        eventId: EVENT_ID,
        ratio: 'link',
      })
      return response.headers.get('ETag')
    }
    const tags = [
      await tagFor({}),
      await tagFor({ artist: 'Snakebite Reviva' }),
      await tagFor({ showTime: '21:00' }),
      await tagFor({ date: '2026-03-15' }),
      await tagFor({ ticketPriceMin: '16.00' }),
    ]
    expect(new Set(tags).size).toBe(tags.length)
  }, 30_000)

  it('renders a different card for a signed share than an anonymous one', async () => {
    const anon = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    )
    const signed = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square?by=hugh`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    )
    expect(anon).not.toBe(signed)
  }, 30_000)

  it('ignores an implausible handle instead of drawing it', async () => {
    const anon = await digest(
      await call(`http://localhost/share/${EVENT_ID}/square`, {
        eventId: EVENT_ID,
        ratio: 'square',
      }),
    )
    const junk = await digest(
      await call(
        `http://localhost/share/${EVENT_ID}/square?by=${encodeURIComponent('<script>')}`,
        { eventId: EVENT_ID, ratio: 'square' },
      ),
    )
    expect(junk).toBe(anon)
  }, 30_000)
})

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@concert-crawl/crawler-core/robots', async (importOriginal) => ({
  // resolveCrawlDelayMs is pure arithmetic, so keep the real one.
  ...(await importOriginal<
    typeof import('@concert-crawl/crawler-core/robots')
  >()),
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
}))
// No real 3-second waits in unit tests.
vi.mock('@concert-crawl/crawler-core/jitter', () => ({
  jitter: vi.fn().mockReturnValue(0),
}))

import {
  checkRobots,
  getCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots'
import { jitter } from '@concert-crawl/crawler-core/jitter'
import { tier1StructuredData } from '../tier1-structured-data.js'
import { PriceFetchDeferredError } from '../types.js'
import type { PipelineContext } from '../types.js'

const baseCtx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
  priceUrl: 'https://venue.example.com/events/test',
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('tier1StructuredData', () => {
  it('returns null when priceUrl is absent', async () => {
    const result = await tier1StructuredData({ ...baseCtx, priceUrl: null })
    expect(result).toBeNull()
  })

  it('identifies with the honest user agent on the domain we own', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)

    await tier1StructuredData(baseCtx)

    const init: unknown = fetchMock.mock.calls[0]?.[1]
    expect(init).toMatchObject({
      headers: {
        'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
      },
    })
  })

  it('does not fetch a price URL that robots.txt disallows', async () => {
    vi.mocked(checkRobots).mockResolvedValueOnce({ status: 'disallowed' })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await tier1StructuredData(baseCtx)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('defers rather than fetching when robots.txt is unreachable', async () => {
    vi.mocked(checkRobots).mockResolvedValueOnce({
      status: 'unreachable',
      reason: 'HTTP 503',
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(tier1StructuredData(baseCtx)).rejects.toBeInstanceOf(
      PriceFetchDeferredError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('paces each request by at least our 3-second floor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await tier1StructuredData(baseCtx)
    expect(jitter).toHaveBeenCalledWith(3000)
  })

  it("slows to the site's Crawl-delay", async () => {
    vi.mocked(getCrawlDelayMs).mockResolvedValueOnce(10_000)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await tier1StructuredData(baseCtx)
    expect(jitter).toHaveBeenCalledWith(10_000)
  })

  it('skips a site whose Crawl-delay is longer than one run can keep', async () => {
    vi.mocked(getCrawlDelayMs).mockResolvedValueOnce(300_000)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await tier1StructuredData(baseCtx)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null on non-200 fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await tier1StructuredData(baseCtx)
    expect(result).toBeNull()
  })

  it('extracts price from JSON-LD Offer with lowPrice + highPrice', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "MusicEvent",
        "offers": { "@type": "Offer", "lowPrice": 35, "highPrice": 75 }
      }
      </script>
      </head></html>
    `
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => html }),
    )
    const result = await tier1StructuredData(baseCtx)
    expect(result).toEqual({
      priceMin: 35,
      priceMax: 75,
      source: 'structured_data',
    })
  })

  it('extracts price from JSON-LD Offer with single price', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {"@type": "Event", "offers": {"@type": "Offer", "price": 20}}
      </script>
      </head></html>
    `
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => html }),
    )
    const result = await tier1StructuredData(baseCtx)
    expect(result).toEqual({
      priceMin: 20,
      priceMax: null,
      source: 'structured_data',
    })
  })

  it('returns null when JSON-LD has no Offer price', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {"@type": "Event", "name": "A Show"}
      </script>
      </head></html>
    `
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => html }),
    )
    const result = await tier1StructuredData(baseCtx)
    expect(result).toBeNull()
  })
})

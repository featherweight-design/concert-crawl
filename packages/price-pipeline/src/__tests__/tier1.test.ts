import { describe, it, expect, vi, afterEach } from 'vitest'
import { tier1StructuredData } from '../tier1-structured-data.js'
import type { PipelineContext } from '../types.js'

const baseCtx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
  priceUrl: 'https://venue.example.com/events/test',
}

afterEach(() => {
  vi.restoreAllMocks()
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

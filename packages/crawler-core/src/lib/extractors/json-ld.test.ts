import { describe, it, expect } from 'vitest'
import { extractJsonLd } from './json-ld.js'

const SOURCE_URL = 'https://example.com/events'

function makeHtml(jsonLd: object | object[]): string {
  return `<html><head>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head><body></body></html>`
}

describe('extractJsonLd', () => {
  it('extracts a single Event object', () => {
    const html = makeHtml({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Metallica Live',
      startDate: '2026-08-15',
      performer: { name: 'Metallica' },
      url: 'https://example.com/tickets/metallica',
    })
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Metallica Live')
    expect(events[0]?.artist).toBe('Metallica')
    expect(events[0]?.date).toBe('2026-08-15')
    expect(events[0]?.confidence).toBe(1.0)
    expect(events[0]?.sourceUrl).toBe(SOURCE_URL)
  })

  it('extracts MusicEvent objects', () => {
    const html = makeHtml({
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: 'Taylor Swift Night',
      startDate: '2026-09-01T19:30:00',
      performer: { name: 'Taylor Swift' },
    })
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Taylor Swift Night')
  })

  it('extracts multiple events from an array', () => {
    const html = makeHtml([
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Show A',
        startDate: '2026-08-01',
        performer: { name: 'Band A' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Show B',
        startDate: '2026-08-02',
        performer: { name: 'Band B' },
      },
    ])
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(2)
    expect(events[0]?.title).toBe('Show A')
    expect(events[1]?.title).toBe('Show B')
  })

  it('extracts events from @graph', () => {
    const html = makeHtml({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Event',
          name: 'Graph Event',
          startDate: '2026-10-01',
          performer: { name: 'Artist X' },
        },
      ],
    })
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Graph Event')
  })

  it('returns empty array when no JSON-LD found', () => {
    const html = '<html><body><p>No structured data here</p></body></html>'
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(0)
  })

  it('returns empty array when JSON-LD has no events', () => {
    const html = makeHtml({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Red Rocks',
    })
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(0)
  })

  it('extracts optional fields when present', () => {
    const html = makeHtml({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Full Event',
      startDate: '2026-08-20T20:00:00',
      doorTime: '2026-08-20T19:00:00',
      performer: { name: 'Full Band' },
      url: 'https://example.com/tickets/full',
      description: 'A full event description',
      image: 'https://example.com/image.jpg',
    })
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(1)
    const event = events[0]!
    expect(event.ticketUrl).toBe('https://example.com/tickets/full')
    expect(event.description).toBe('A full event description')
    expect(event.imageUrl).toBeUndefined()
  })

  it('handles malformed JSON-LD gracefully', () => {
    const html = `<html><head>
      <script type="application/ld+json">{ invalid json }</script>
    </head></html>`
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(0)
  })

  it('handles multiple script tags and picks events from each', () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify({ '@type': 'Event', name: 'Event One', startDate: '2026-08-01', performer: { name: 'Artist One' } })}</script>
      <script type="application/ld+json">${JSON.stringify({ '@type': 'Event', name: 'Event Two', startDate: '2026-08-02', performer: { name: 'Artist Two' } })}</script>
    </head></html>`
    const events = extractJsonLd(html, SOURCE_URL)
    expect(events).toHaveLength(2)
  })

  describe('venue-timezone-aware date extraction', () => {
    it('shifts UTC-suffixed late-night startDate back to venue-local previous day', () => {
      // Mon June 15 22:00 MDT (UTC-6) = Tue June 16 04:00 UTC.
      // Without timezone conversion the show appears on Tuesday — the original Bug #596 symptom.
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Swing Nights',
        startDate: '2026-06-16T04:00:00Z',
        performer: { name: 'Swing Nights Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events).toHaveLength(1)
      expect(events[0]?.date).toBe('2026-06-15')
      expect(events[0]?.showTime).toBe('22:00:00')
    })

    it('preserves an explicit local-offset startDate as-is', () => {
      // Same instant, expressed with venue-local offset — no shift needed.
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Local Offset Show',
        startDate: '2026-06-15T22:00:00-06:00',
        performer: { name: 'Local Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events).toHaveLength(1)
      expect(events[0]?.date).toBe('2026-06-15')
      expect(events[0]?.showTime).toBe('22:00:00')
    })

    it('handles standard-time DST boundary (MST = UTC-7)', () => {
      // Sat Jan 10 22:00 MST (UTC-7) = Sun Jan 11 05:00 UTC.
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'January Show',
        startDate: '2026-01-11T05:00:00Z',
        performer: { name: 'Winter Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events).toHaveLength(1)
      expect(events[0]?.date).toBe('2026-01-10')
      expect(events[0]?.showTime).toBe('22:00:00')
    })

    it('leaves naive (no-timezone) datetimes interpreted in venue zone', () => {
      // No Z, no offset — treat as already venue-local (existing behavior).
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Naive Show',
        startDate: '2026-06-15T22:00:00',
        performer: { name: 'Naive Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events).toHaveLength(1)
      expect(events[0]?.date).toBe('2026-06-15')
      expect(events[0]?.showTime).toBe('22:00:00')
    })

    it('leaves date-only startDate untouched regardless of timezone', () => {
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Date Only',
        startDate: '2026-08-15',
        performer: { name: 'Date Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events).toHaveLength(1)
      expect(events[0]?.date).toBe('2026-08-15')
      expect(events[0]?.showTime).toBeUndefined()
    })

    it('also converts doorTime to venue-local time', () => {
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Doors Show',
        startDate: '2026-06-16T04:00:00Z',
        doorTime: '2026-06-16T03:00:00Z',
        performer: { name: 'Doors Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denver')
      expect(events[0]?.doorsTime).toBe('21:00:00')
    })

    it('falls back to UTC and keeps extracting when venue timezone is invalid', () => {
      // venues.timezone is plain text — a typo would otherwise crash via RangeError.
      const html = makeHtml({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Bad TZ Show',
        startDate: '2026-06-16T04:00:00Z',
        performer: { name: 'Bad TZ Band' },
      })
      const events = extractJsonLd(html, SOURCE_URL, 'America/Denvr')
      expect(events).toHaveLength(1)
      // Falls back to UTC, so the UTC startDate is preserved as-is.
      expect(events[0]?.date).toBe('2026-06-16')
      expect(events[0]?.showTime).toBe('04:00:00')
    })
  })
})

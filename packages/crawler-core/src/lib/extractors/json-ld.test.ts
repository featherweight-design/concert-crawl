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
    expect(event.imageUrl).toBe('https://example.com/image.jpg')
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
})

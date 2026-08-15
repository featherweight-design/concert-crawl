import { describe, expect, it } from 'vitest'
import { extractJsonLd } from './json-ld.js'

const page = (event: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@type': 'Event',
    startDate: '2026-09-12T20:00:00-06:00',
    ...event,
  })}</script>`

describe('json-ld observedPerformers', () => {
  it('splits a flat performer list into a headliner and its openers', () => {
    // schema.org carries no billing emphasis, so everything past the first
    // entry is an opener. Reporting the flat list instead would let the
    // derivation ladder read LA LOM as a co-headliner (#1203).
    const events = extractJsonLd(
      page({
        name: 'Thee Sacred Souls at the Ogden',
        performer: [{ name: 'Thee Sacred Souls' }, { name: 'LA LOM' }],
      }),
      'https://example.com/events',
      'America/Denver',
    )

    expect(events[0]?.observedPerformers).toEqual(['Thee Sacred Souls'])
    expect(events[0]?.observedSupportingArtists).toEqual(['LA LOM'])
  })

  it('reports an EMPTY list when the listing names no performer, and never copies the title', () => {
    const events = extractJsonLd(
      page({ name: 'HUMP! Film Festival' }),
      'https://example.com/events',
      'America/Denver',
    )

    expect(events[0]?.observedPerformers).toEqual([])
    expect(events[0]?.artist).toBe('HUMP! Film Festival')
  })
})

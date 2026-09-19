import { describe, it, expect } from 'vitest'
import type { HistoryShow } from '@concert-crawl/types'
import { buildHistoryIcs, escapeIcsText, foldIcsLine } from './ics.js'

const show = (overrides: Partial<HistoryShow> = {}): HistoryShow => ({
  eventId: 'evt-1',
  artist: 'Khruangbin',
  artistPhotoUrl: null,
  venueName: 'Ogden Theatre',
  venueSlug: 'ogden-theatre',
  neighborhood: 'Capitol Hill',
  date: '2026-06-01',
  dateLabel: 'Mon, Jun 1',
  showTime: '8:00 PM',
  priceFinal: 45,
  genre: 'psych',
  attendingAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

const byteLength = (value: string): number =>
  new TextEncoder().encode(value).length

describe('escapeIcsText', () => {
  it('escapes commas, semicolons, and backslashes', () => {
    expect(escapeIcsText('Larimer Lounge, Denver')).toBe(
      'Larimer Lounge\\, Denver',
    )
    expect(escapeIcsText('a;b')).toBe('a\\;b')
    expect(escapeIcsText('a\\b')).toBe('a\\\\b')
  })

  it('escapes the backslash before the other characters, not after', () => {
    // A naive order turns "\," into "\\\\," — the backslash gets doubled twice.
    expect(escapeIcsText('\\,')).toBe('\\\\\\,')
  })

  it('collapses newlines into the literal \\n sequence', () => {
    expect(escapeIcsText('line one\nline two')).toBe('line one\\nline two')
    expect(escapeIcsText('crlf\r\nhere')).toBe('crlf\\nhere')
  })
})

describe('foldIcsLine', () => {
  it('leaves a short line untouched', () => {
    expect(foldIcsLine('SUMMARY:Idles')).toBe('SUMMARY:Idles')
  })

  it('folds a long line so no segment exceeds 75 octets', () => {
    const folded = foldIcsLine(`SUMMARY:${'a'.repeat(200)}`)
    expect(folded).toContain('\r\n ')
    for (const segment of folded.split('\r\n')) {
      expect(byteLength(segment)).toBeLessThanOrEqual(75)
    }
  })

  it('never splits a multi-byte character across a fold', () => {
    const folded = foldIcsLine(`SUMMARY:${'é'.repeat(120)}`)
    // A split surrogate/continuation byte would survive the round trip as U+FFFD.
    expect(folded).not.toContain('�')
    for (const segment of folded.split('\r\n')) {
      expect(byteLength(segment)).toBeLessThanOrEqual(75)
    }
  })
})

describe('buildHistoryIcs', () => {
  it('produces a valid empty VCALENDAR for no shows', () => {
    const ics = buildHistoryIcs([])
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toContain('BEGIN:VEVENT')
    expect(ics).toContain('VERSION:2.0')
  })

  it('emits a timed DTSTART with the Mountain TZID', () => {
    const ics = buildHistoryIcs([show({ showTime: '8:00 PM' })])
    expect(ics).toContain('DTSTART;TZID=America/Denver:20260601T200000')
    expect(ics).toContain('UID:evt-1@concertcrawl.app')
    expect(ics).toContain('SUMMARY:Khruangbin')
  })

  it('converts 12-hour edge times correctly', () => {
    expect(buildHistoryIcs([show({ showTime: '12:00 AM' })])).toContain(
      'DTSTART;TZID=America/Denver:20260601T000000',
    )
    expect(buildHistoryIcs([show({ showTime: '12:30 PM' })])).toContain(
      'DTSTART;TZID=America/Denver:20260601T123000',
    )
  })

  it('emits an all-day DTSTART when the show time is unknown', () => {
    const ics = buildHistoryIcs([show({ showTime: null })])
    expect(ics).toContain('DTSTART;VALUE=DATE:20260601')
    expect(ics).not.toContain('TZID')
  })

  it('escapes a venue name containing a comma', () => {
    const ics = buildHistoryIcs([show({ venueName: 'Larimer Lounge, Denver' })])
    expect(ics).toContain('LOCATION:Larimer Lounge\\, Denver')
  })

  it('folds a 200-character artist name', () => {
    const ics = buildHistoryIcs([show({ artist: 'A'.repeat(200) })])
    for (const segment of ics.trimEnd().split('\r\n')) {
      expect(byteLength(segment)).toBeLessThanOrEqual(75)
    }
  })

  it('stamps DTSTAMP with generation time, not the show date', () => {
    const ics = buildHistoryIcs([show()], new Date('2026-07-30T04:05:06.789Z'))
    expect(ics).toContain('DTSTAMP:20260730T040506Z')
  })

  it('includes neighborhood and price in the description', () => {
    const ics = buildHistoryIcs([show()])
    expect(ics).toContain('DESCRIPTION:Capitol Hill · $45')
  })

  it('omits the description line when there is nothing to say', () => {
    const ics = buildHistoryIcs([
      show({ neighborhood: null, priceFinal: null }),
    ])
    expect(ics).not.toContain('DESCRIPTION:')
  })

  it('emits one VEVENT per show', () => {
    const ics = buildHistoryIcs([
      show({ eventId: 'a' }),
      show({ eventId: 'b' }),
      show({ eventId: 'c' }),
    ])
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3)
    expect(ics.match(/END:VEVENT/g)).toHaveLength(3)
  })
})

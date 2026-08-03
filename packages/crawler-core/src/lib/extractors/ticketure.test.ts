import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractTicketure } from './ticketure.js'

const SOURCE_URL = 'https://tickets.meowwolf.com/events/denver/'
const DENVER = 'America/Denver'

interface RawEventOverrides {
  title?: unknown
  startDateTime?: unknown
  category?: unknown
  url?: unknown
  image?: unknown
  text?: unknown
}

function pageWith(events: RawEventOverrides[]): string {
  const payload = JSON.stringify({
    props: { pageProps: { events: { events } } },
  })
  return `<html><body></body><script id="__NEXT_DATA__" type="application/json">${payload}</script></html>`
}

// Mirrors a real listing: an Aug 8th 7pm Denver show published as an Aug 9th
// UTC instant.
const DUTCH_MELROSE: RawEventOverrides = {
  title: 'Dutch Melrose',
  startDateTime: '2026-08-09T01:00:00Z',
  category: 'Music',
  url: 'dutch-melrose',
  image: 'https://api.ticketure.com/v1/assets/meowwolf/abc',
  text: { supportingActs: 'Benny Mayne', banner: null },
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('extractTicketure', () => {
  it('returns an empty list when the page has no __NEXT_DATA__ script', () => {
    expect(
      extractTicketure('<html><body>hi</body></html>', SOURCE_URL),
    ).toEqual([])
  })

  it('returns an empty list when __NEXT_DATA__ is not the Ticketure shape', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
      { props: { pageProps: { somethingElse: true } } },
    )}</script>`
    expect(extractTicketure(html, SOURCE_URL)).toEqual([])
  })

  it('matches the script tag regardless of attribute order or an injected nonce', () => {
    const payload = JSON.stringify({
      props: { pageProps: { events: { events: [DUTCH_MELROSE] } } },
    })
    const html = `<script type="application/json" nonce="abc123" id="__NEXT_DATA__">${payload}</script>`
    expect(extractTicketure(html, SOURCE_URL, DENVER)).toHaveLength(1)
  })

  it('returns an empty list when the payload is malformed JSON', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{not json</script>`
    expect(extractTicketure(html, SOURCE_URL)).toEqual([])
  })

  it('converts a UTC instant to the venue-local date rather than splitting on T', () => {
    const [event] = extractTicketure(
      pageWith([DUTCH_MELROSE]),
      SOURCE_URL,
      DENVER,
    )
    // Naive `split('T')` would yield 2026-08-09 — a day late.
    expect(event?.date).toBe('2026-08-08')
    expect(event?.doorsTime).toBe('19:00:00')
  })

  it('mirrors title into rawTitle and artist', () => {
    const [event] = extractTicketure(
      pageWith([DUTCH_MELROSE]),
      SOURCE_URL,
      DENVER,
    )
    expect(event?.title).toBe('Dutch Melrose')
    expect(event?.rawTitle).toBe('Dutch Melrose')
    expect(event?.artist).toBe('Dutch Melrose')
  })

  it('resolves the bare slug against the listing URL for ticket and event links', () => {
    const [event] = extractTicketure(
      pageWith([DUTCH_MELROSE]),
      SOURCE_URL,
      DENVER,
    )
    expect(event?.ticketUrl).toBe(
      'https://tickets.meowwolf.com/events/denver/dutch-melrose/',
    )
    expect(event?.eventUrl).toBe(event?.ticketUrl)
  })

  it('keeps the event but drops the link when the slug carries a non-web scheme', () => {
    const html = pageWith([
      { ...DUTCH_MELROSE, url: 'javascript:alert(1)' },
      { ...DUTCH_MELROSE, title: 'Mailto Show', url: 'mailto:box@office.com' },
    ])
    const events = extractTicketure(html, SOURCE_URL, DENVER)
    expect(events).toHaveLength(2)
    expect(events[0]?.ticketUrl).toBeUndefined()
    expect(events[0]?.eventUrl).toBeUndefined()
    expect(events[1]?.ticketUrl).toBeUndefined()
  })

  it('splits pipe-delimited supporting acts', () => {
    const html = pageWith([
      {
        ...DUTCH_MELROSE,
        text: { supportingActs: 'hellocentral | Jaguar Stevens' },
      },
    ])
    const [event] = extractTicketure(html, SOURCE_URL, DENVER)
    expect(event?.supportingArtists).toEqual(['hellocentral', 'Jaguar Stevens'])
  })

  it('omits supportingArtists when the field is null', () => {
    const html = pageWith([
      { ...DUTCH_MELROSE, text: { supportingActs: null } },
    ])
    const [event] = extractTicketure(html, SOURCE_URL, DENVER)
    expect(event?.supportingArtists).toBeUndefined()
  })

  it('drops a supporting act that merely repeats the headliner', () => {
    const html = pageWith([
      {
        ...DUTCH_MELROSE,
        text: { supportingActs: 'Dutch Melrose | Benny Mayne' },
      },
    ])
    const [event] = extractTicketure(html, SOURCE_URL, DENVER)
    expect(event?.supportingArtists).toEqual(['Benny Mayne'])
  })

  it('marks Music rows as concerts and non-Music rows as not', () => {
    const html = pageWith([
      DUTCH_MELROSE,
      { ...DUTCH_MELROSE, title: 'Burlesque Roulette', category: 'Community' },
    ])
    const events = extractTicketure(html, SOURCE_URL, DENVER)
    expect(events).toHaveLength(2)
    expect(events[0]?.isConcert).toBe(true)
    expect(events[1]?.isConcert).toBe(false)
  })

  it('skips a row whose startDateTime carries no timezone rather than guessing', () => {
    const html = pageWith([
      { ...DUTCH_MELROSE, startDateTime: '2026-08-09 01:00:00' },
    ])
    expect(extractTicketure(html, SOURCE_URL, DENVER)).toEqual([])
  })

  it('skips a row whose start time carries a timezone but is not a real instant', () => {
    // Matches HAS_EXPLICIT_TZ yet yields an Invalid Date — formatToParts would
    // throw and abort every remaining row for the venue.
    const html = pageWith([
      { ...DUTCH_MELROSE, startDateTime: '2026-13-45T99:00:00Z' },
      { ...DUTCH_MELROSE, title: 'Survivor' },
    ])
    const events = extractTicketure(html, SOURCE_URL, DENVER)
    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Survivor')
  })

  it('skips rows missing a title or a start time', () => {
    const html = pageWith([
      { ...DUTCH_MELROSE, title: undefined },
      { ...DUTCH_MELROSE, startDateTime: undefined },
      { ...DUTCH_MELROSE, title: '   ' },
    ])
    expect(extractTicketure(html, SOURCE_URL, DENVER)).toEqual([])
  })

  it('ignores non-object entries in the events array', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: { events: { events: [null, 'nope', DUTCH_MELROSE] } },
      },
    })
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`
    expect(extractTicketure(html, SOURCE_URL, DENVER)).toHaveLength(1)
  })

  it('falls back to UTC when the venue timezone is not a valid IANA zone', () => {
    const [event] = extractTicketure(
      pageWith([DUTCH_MELROSE]),
      SOURCE_URL,
      'Not/AZone',
    )
    expect(event?.date).toBe('2026-08-09')
    expect(event?.doorsTime).toBe('01:00:00')
  })

  it('carries the image through as imageUrl', () => {
    const [event] = extractTicketure(
      pageWith([DUTCH_MELROSE]),
      SOURCE_URL,
      DENVER,
    )
    expect(event?.imageUrl).toBe(
      'https://api.ticketure.com/v1/assets/meowwolf/abc',
    )
  })
})

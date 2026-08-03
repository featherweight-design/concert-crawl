import { describe, it, expect } from 'vitest'
import { diffVenues, parseOnly } from './sync-venues-helpers.js'

const venue = (slug: string, overrides = {}) => ({
  slug,
  name: `Venue ${slug}`,
  websiteUrl: `https://${slug}.example.com/`,
  capacity: 500,
  venueType: 'Club',
  neighborhood: 'RiNo',
  about: 'A room.',
  lat: 39.7,
  lng: -105,
  ticketVendor: 'unknown',
  crawlMode: 'http',
  crawlWaitUntil: 'domcontentloaded',
  crawlWaitForSelector: null,
  crawlDelayMs: 3000,
  featured: false,
  active: true,
  verified: true,
  ...overrides,
})

// The absence of --only is what selects the create-only path, so
// distinguishing "flag missing" from "flag empty" is load-bearing: an empty
// scope must fail loudly rather than silently widen to every venue.
describe('parseOnly', () => {
  it('returns undefined when the flag is absent', () => {
    expect(parseOnly(['node', 'sync-venues.ts', '--commit'])).toBeUndefined()
  })

  it('reads a space-separated value', () => {
    expect(parseOnly(['--only', 'globe-hall,hi-dive'])).toEqual([
      'globe-hall',
      'hi-dive',
    ])
  })

  it('reads an equals-separated value', () => {
    expect(parseOnly(['--only=globe-hall'])).toEqual(['globe-hall'])
  })

  it('trims whitespace and drops empty entries', () => {
    expect(parseOnly(['--only', ' globe-hall , , hi-dive '])).toEqual([
      'globe-hall',
      'hi-dive',
    ])
  })

  it('returns an empty list when the flag is given no value', () => {
    expect(parseOnly(['--only'])).toEqual([])
  })

  it('does not swallow a following flag as the value', () => {
    expect(parseOnly(['--only', '--commit'])).toEqual([])
  })
})

describe('diffVenues', () => {
  it('reports a venue missing from the DB as a create', () => {
    const result = diffVenues([venue('meow-wolf-denver')], [])

    expect(result).toEqual({
      toCreate: ['meow-wolf-denver'],
      toUpdate: [],
      unchanged: [],
    })
  })

  it('reports an identical venue as unchanged', () => {
    const result = diffVenues([venue('globe-hall')], [venue('globe-hall')])

    expect(result.unchanged).toEqual(['globe-hall'])
    expect(result.toCreate).toEqual([])
    expect(result.toUpdate).toEqual([])
  })

  it('reports a venue whose compared field drifted as an update', () => {
    const result = diffVenues(
      [venue('lost-lake', { capacity: 250 })],
      [venue('lost-lake', { capacity: 500 })],
    )

    expect(result.toUpdate).toEqual(['lost-lake'])
  })

  // The upsert COALESCEs address, so an existing non-null value always wins.
  // Surfacing it as pending would report a change the commit never makes.
  it('ignores address drift when the current address is already set', () => {
    const result = diffVenues(
      [venue('oriental', { address: '4335 W 44th Ave' })],
      [venue('oriental', { address: 'Manually corrected address' })],
    )

    expect(result.unchanged).toEqual(['oriental'])
  })

  // The other side of the COALESCE: a null current address IS filled in by
  // the seed, so hiding it would under-report what --commit writes.
  it('reports an update when a null address would be filled from the seed', () => {
    const result = diffVenues(
      [venue('globe-hall', { address: '4483 Logan St' })],
      [venue('globe-hall', { address: null })],
    )

    expect(result.toUpdate).toEqual(['globe-hall'])
  })

  it('ignores a null address the seed also leaves unset', () => {
    const result = diffVenues(
      [venue('hi-dive', { address: null })],
      [venue('hi-dive', { address: null })],
    )

    expect(result.unchanged).toEqual(['hi-dive'])
  })

  // Numeric columns come back from postgres as strings; treating that as
  // drift would mark every venue dirty on every run.
  it('treats a numeric seed value and its string DB form as equal', () => {
    const result = diffVenues(
      [venue('bluebird', { capacity: 550, lat: 39.7405 })],
      [venue('bluebird', { capacity: '550', lat: '39.7405' })],
    )

    expect(result.unchanged).toEqual(['bluebird'])
  })

  it('treats an absent key and an explicit null as equal', () => {
    const { crawlWaitForSelector: _omitted, ...seedVenue } = venue('summit')

    const result = diffVenues(
      [seedVenue],
      [venue('summit', { crawlWaitForSelector: null })],
    )

    expect(result.unchanged).toEqual(['summit'])
  })

  // A seed that omits a field still writes the column default on insert,
  // and carries it through `excluded.<col>` on update. Comparing the
  // omission against the default is what keeps every such venue from
  // reading as permanently dirty.
  it('resolves an omitted seed field against the schema default', () => {
    const { crawlDelayMs: _omitted, ...seedVenue } = venue('hi-dive')

    const result = diffVenues(
      [seedVenue],
      [venue('hi-dive', { crawlDelayMs: 3000 })],
      { crawlDelayMs: 3000 },
    )

    expect(result.unchanged).toEqual(['hi-dive'])
  })

  it('reports drift when an omitted field would reset a non-default value', () => {
    const { crawlDelayMs: _omitted, ...seedVenue } = venue('marquis')

    const result = diffVenues(
      [seedVenue],
      [venue('marquis', { crawlDelayMs: 9000 })],
      { crawlDelayMs: 3000 },
    )

    expect(result.toUpdate).toEqual(['marquis'])
  })

  // These three are create-only in the upsert: the crawler auto-pauses a
  // venue via `active`, and admins curate `featured` / `verified` in prod.
  // The seed never overwrites them, so it must never report them either.
  it.each(['active', 'featured', 'verified'])(
    'ignores drift in the create-only flag %s',
    (flag) => {
      const result = diffVenues(
        [venue('summit', { [flag]: true })],
        [venue('summit', { [flag]: false })],
      )

      expect(result.unchanged).toEqual(['summit'])
    },
  )

  // SQL NULL and '' are different values: `excluded.<col>` writing NULL over
  // a stored empty string is a real change the diff must not swallow.
  it('distinguishes an empty string from null', () => {
    const result = diffVenues(
      [venue('gothic', { about: null })],
      [venue('gothic', { about: '' })],
    )

    expect(result.toUpdate).toEqual(['gothic'])
  })

  // COALESCE treats only NULL as absent, so a stored empty-string address
  // still wins over the seed value — it is not a gap to fill.
  it('does not treat an empty-string address as a gap to fill', () => {
    const result = diffVenues(
      [venue('ogden', { address: '935 E Colfax Ave' })],
      [venue('ogden', { address: '' })],
    )

    expect(result.unchanged).toEqual(['ogden'])
  })

  it('ignores DB venues that are not in SEED_VENUES', () => {
    const result = diffVenues(
      [venue('globe-hall')],
      [venue('globe-hall'), venue('some-retired-venue')],
    )

    expect(result).toEqual({
      toCreate: [],
      toUpdate: [],
      unchanged: ['globe-hall'],
    })
  })
})

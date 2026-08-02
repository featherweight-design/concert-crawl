import { describe, it, expect } from 'vitest'
import { diffVenues } from './sync-venues-helpers.js'

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

  // A seed that omits `featured` still writes the column default on insert,
  // and carries it through `excluded.featured` on update. Comparing the
  // omission against the default is what keeps every such venue from
  // reading as permanently dirty.
  it('resolves an omitted seed field against the schema default', () => {
    const { featured: _omitted, ...seedVenue } = venue('hi-dive')

    const result = diffVenues(
      [seedVenue],
      [venue('hi-dive', { featured: false })],
      { featured: false },
    )

    expect(result.unchanged).toEqual(['hi-dive'])
  })

  it('reports drift when an omitted field would reset a non-default value', () => {
    const { featured: _omitted, ...seedVenue } = venue('marquis')

    const result = diffVenues(
      [seedVenue],
      [venue('marquis', { featured: true })],
      { featured: false },
    )

    expect(result.toUpdate).toEqual(['marquis'])
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

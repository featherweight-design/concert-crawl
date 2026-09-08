import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { events } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import { clearTables, seedEvent, seedVenue } from '../test/helpers/seed.js'
import {
  billedCanonicalNames,
  billsAnyCanonicalName,
  billsCanonicalName,
  displayHeadliner,
  portraitCanonicalName,
} from './event-billing.js'

const titlesBilling = async (canonicalName: string): Promise<string[]> => {
  const rows = await testDb
    .select({ title: events.title })
    .from(events)
    .where(billsCanonicalName(canonicalName))
  return rows.map((row) => row.title).sort()
}

const titlesBillingAny = async (
  canonicalNames: string[],
): Promise<string[]> => {
  const rows = await testDb
    .select({ title: events.title })
    .from(events)
    .where(billsAnyCanonicalName(canonicalNames))
  return rows.map((row) => row.title).sort()
}

describe('event billing predicates', () => {
  let venueId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue({ name: 'Ogden Theatre', slug: 'ogden' })
    venueId = venue.id
  })

  it('binds an act the derivation ladder named as headliner', async () => {
    await seedEvent(venueId, {
      title: 'Son Little: CityFolk Tour 2026',
      artist: 'Son Little',
      canonicalArtist: 'son little: cityfolk tour 2026',
      canonicalHeadliners: ['son little'],
      canonicalSupporting: ['tonina'],
    })

    expect(await titlesBilling('son little')).toEqual([
      'Son Little: CityFolk Tour 2026',
    ])
  })

  // The defect this module exists to close: the raw title string is not an act,
  // and matching it manufactured a second, tour-shaped artist beside the real one.
  it('does not bind the raw title string once the ladder has run', async () => {
    await seedEvent(venueId, {
      title: 'Son Little: CityFolk Tour 2026',
      artist: 'Son Little',
      canonicalArtist: 'son little: cityfolk tour 2026',
      canonicalHeadliners: ['son little'],
      canonicalSupporting: ['tonina'],
    })

    expect(await titlesBilling('son little: cityfolk tour 2026')).toEqual([])
  })

  it('binds a supporting act', async () => {
    await seedEvent(venueId, {
      title: 'Son Little: CityFolk Tour 2026',
      artist: 'Son Little',
      canonicalArtist: 'son little: cityfolk tour 2026',
      canonicalHeadliners: ['son little'],
      canonicalSupporting: ['tonina'],
    })

    expect(await titlesBilling('tonina')).toEqual([
      'Son Little: CityFolk Tour 2026',
    ])
  })

  it('falls back to the raw column on a row the ladder never saw', async () => {
    await seedEvent(venueId, {
      title: 'Wax Harbour',
      artist: 'Wax Harbour',
      canonicalArtist: 'wax harbour',
      canonicalHeadliners: null,
      canonicalSupporting: null,
    })

    expect(await titlesBilling('wax harbour')).toEqual(['Wax Harbour'])
  })

  // Empty is the ladder reporting no act at all — bar bingo, karaoke, club
  // nights. Falling back there is what made "bass bingo" a followable artist.
  it('does not fall back when the ladder ran and found no act', async () => {
    await seedEvent(venueId, {
      title: 'Bass Bingo',
      artist: 'Bass Bingo',
      canonicalArtist: 'bass bingo',
      canonicalHeadliners: [],
      canonicalSupporting: [],
    })

    expect(await titlesBilling('bass bingo')).toEqual([])
  })

  it('applies the same three arms to a batch of names', async () => {
    await seedEvent(venueId, {
      title: 'Son Little: CityFolk Tour 2026',
      artist: 'Son Little',
      canonicalArtist: 'son little: cityfolk tour 2026',
      canonicalHeadliners: ['son little'],
      canonicalSupporting: ['tonina'],
      showTime: '20:00',
    })
    await seedEvent(venueId, {
      title: 'Wax Harbour',
      artist: 'Wax Harbour',
      canonicalArtist: 'wax harbour',
      canonicalHeadliners: null,
      canonicalSupporting: null,
      showTime: '21:00',
    })
    await seedEvent(venueId, {
      title: 'Bass Bingo',
      artist: 'Bass Bingo',
      canonicalArtist: 'bass bingo',
      canonicalHeadliners: [],
      canonicalSupporting: [],
      showTime: '22:00',
    })

    expect(
      await titlesBillingAny([
        'son little',
        'wax harbour',
        'bass bingo',
        'son little: cityfolk tour 2026',
      ]),
    ).toEqual(['Son Little: CityFolk Tour 2026', 'Wax Harbour'])
  })

  it('rejects an empty name list rather than emitting an untyped ARRAY[]', () => {
    expect(() => billsAnyCanonicalName([])).toThrow()
  })

  describe('portraitCanonicalName', () => {
    const portraitFor = async (title: string): Promise<string | null> => {
      const rows = await testDb
        .select({ name: portraitCanonicalName() })
        .from(events)
        .where(eq(events.title, title))
      const row = rows[0]
      return row === undefined ? null : row.name
    }

    it('resolves a sole headliner rather than the raw title', async () => {
      await seedEvent(venueId, {
        title: 'Son Little: CityFolk Tour 2026',
        artist: 'Son Little',
        canonicalArtist: 'son little: cityfolk tour 2026',
        canonicalHeadliners: ['son little'],
        canonicalSupporting: ['tonina'],
      })

      expect(await portraitFor('Son Little: CityFolk Tour 2026')).toBe(
        'son little',
      )
    })

    // `canonicalizeSupporting` sorts, so element 1 of a co-headline bill is
    // alphabetically first, not the act on top. Picking it would put the wrong
    // face on the row.
    it('declines to pick a face off a co-headline bill', async () => {
      await seedEvent(venueId, {
        title: 'Knocked Loose & Denzel Curry',
        artist: 'Knocked Loose',
        canonicalArtist: 'knocked loose',
        canonicalHeadliners: ['denzel curry', 'knocked loose'],
        canonicalSupporting: [],
      })

      expect(await portraitFor('Knocked Loose & Denzel Curry')).toBe(
        'knocked loose',
      )
    })

    it('falls back to the raw column on a row the ladder never saw', async () => {
      await seedEvent(venueId, {
        title: 'Wax Harbour',
        artist: 'Wax Harbour',
        canonicalArtist: 'wax harbour',
        canonicalHeadliners: null,
        canonicalSupporting: null,
      })

      expect(await portraitFor('Wax Harbour')).toBe('wax harbour')
    })
  })

  describe('displayHeadliner', () => {
    const headlinerFor = async (title: string): Promise<string | null> => {
      const rows = await testDb
        .select({ name: displayHeadliner() })
        .from(events)
        .where(eq(events.title, title))
      const row = rows[0]
      return row === undefined ? null : row.name
    }

    it('prints the derived act rather than the tour it was billed as', async () => {
      await seedEvent(venueId, {
        title: 'Son Little: CityFolk Tour 2026',
        artist: 'Son Little: CityFolk Tour 2026',
        canonicalArtist: 'son little: cityfolk tour 2026',
        headliners: ['Son Little'],
        canonicalHeadliners: ['son little'],
        canonicalSupporting: ['tonina'],
      })

      expect(await headlinerFor('Son Little: CityFolk Tour 2026')).toBe(
        'Son Little',
      )
    })

    // The ladder writes `headliners` wholesale, so a co-headline bill has an
    // ordering we do not trust. `artist` on those rows already names both.
    it('keeps the raw column on a co-headline bill', async () => {
      await seedEvent(venueId, {
        title: 'Knocked Loose & Denzel Curry',
        artist: 'Knocked Loose & Denzel Curry',
        canonicalArtist: 'knocked loose & denzel curry',
        headliners: ['Denzel Curry', 'Knocked Loose'],
        canonicalHeadliners: ['denzel curry', 'knocked loose'],
        canonicalSupporting: [],
      })

      expect(await headlinerFor('Knocked Loose & Denzel Curry')).toBe(
        'Knocked Loose & Denzel Curry',
      )
    })

    it('keeps the raw column on a row the ladder never saw', async () => {
      await seedEvent(venueId, {
        title: 'Wax Harbour',
        artist: 'Wax Harbour',
        canonicalArtist: 'wax harbour',
        headliners: null,
        canonicalHeadliners: null,
        canonicalSupporting: null,
      })

      expect(await headlinerFor('Wax Harbour')).toBe('Wax Harbour')
    })

    // An empty array is the recurring-event answer (bar bingo, karaoke): the
    // ladder read the listing and found no act. There is no better name to
    // print than what the venue billed.
    it('keeps the raw column when the ladder found no act', async () => {
      await seedEvent(venueId, {
        title: 'Bass Bingo',
        artist: 'Bass Bingo',
        canonicalArtist: 'bass bingo',
        headliners: [],
        canonicalHeadliners: [],
        canonicalSupporting: [],
      })

      expect(await headlinerFor('Bass Bingo')).toBe('Bass Bingo')
    })
  })
})

describe('billedCanonicalNames', () => {
  it('mirrors the SQL fallback when the ladder never ran', () => {
    expect([
      ...billedCanonicalNames({
        canonicalArtist: 'wax harbour',
        canonicalHeadliners: null,
        canonicalSupporting: null,
      }),
    ]).toEqual(['wax harbour'])
  })

  // The SQL's supporting arm is unconditional, so the fallback replaces the
  // headliner half only. Dropping supports here would attribute fewer acts than
  // the query that selected the row.
  it('keeps supports on a row the ladder never saw', () => {
    expect([
      ...billedCanonicalNames({
        canonicalArtist: 'wednesday',
        canonicalHeadliners: null,
        canonicalSupporting: ['mj lenderman'],
      }),
    ]).toEqual(['wednesday', 'mj lenderman'])
  })

  it('mirrors the SQL gate when the ladder found no act', () => {
    expect([
      ...billedCanonicalNames({
        canonicalArtist: 'bass bingo',
        canonicalHeadliners: [],
        canonicalSupporting: [],
      }),
    ]).toEqual([])
  })

  it('lists headliners before supports, which the first-wins tie rules rely on', () => {
    expect([
      ...billedCanonicalNames({
        canonicalArtist: 'son little: cityfolk tour 2026',
        canonicalHeadliners: ['son little'],
        canonicalSupporting: ['tonina'],
      }),
    ]).toEqual(['son little', 'tonina'])
  })
})

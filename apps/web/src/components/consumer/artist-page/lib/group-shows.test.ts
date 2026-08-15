import type { ArtistShow } from '@concert-crawl/types'
import { describe, expect, it } from 'vitest'

import { firstIso } from '../definitions/types'

import { groupShows } from './group-shows'

const show = (
  iso: string,
  venue: string,
  city = 'Denver',
  venueSlug = venue.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
): ArtistShow => ({
  eventId: `${venueSlug}-${iso}`,
  iso,
  showTime: null,
  venue,
  venueSlug,
  city,
  price: null,
  tourName: null,
  genres: [],
  imageUrl: null,
  status: 'upcoming',
})

describe('groupShows', () => {
  it('leaves two nights at one venue as two rows', () => {
    const items = groupShows([
      show('2026-08-05', "Ophelia's"),
      show('2026-08-06', "Ophelia's"),
    ])
    expect(items.map((item) => item.kind)).toEqual(['one', 'one'])
  })

  it('collapses three consecutive nights into one run', () => {
    const items = groupShows([
      show('2026-08-05', "Ophelia's"),
      show('2026-08-06', "Ophelia's"),
      show('2026-08-07', "Ophelia's"),
    ])
    expect(items).toHaveLength(1)
    const run = items[0]
    expect(run?.kind).toBe('run')
    if (!run || run.kind !== 'run') throw new Error('expected a run')
    expect(run.shows).toHaveLength(3)
    expect(run.venue).toBe("Ophelia's")
  })

  // Only `venues.slug` is unique in the schema, so a shared name is not a
  // shared room — three nights split across two of them is not a residency.
  it('keeps two same-named venues apart', () => {
    const items = groupShows([
      show('2026-08-05', 'The Venue', 'Denver', 'the-venue-denver'),
      show('2026-08-06', 'The Venue', 'Denver', 'the-venue-denver'),
      show('2026-08-07', 'The Venue', 'Boulder', 'the-venue-boulder'),
    ])
    expect(items.map((item) => item.kind)).toEqual(['one', 'one', 'one'])
  })

  it('does not call three shows spanning 30 days a run', () => {
    // Gaps of 15 days keep them in one cluster, but the 30-day SPAN fails the
    // second test — that is a tour, not a residency.
    const items = groupShows([
      show('2026-08-01', 'Globe Hall'),
      show('2026-08-16', 'Globe Hall'),
      show('2026-08-31', 'Globe Hall'),
    ])
    expect(items.map((item) => item.kind)).toEqual(['one', 'one', 'one'])
  })

  it('groups per venue and orders items by first date', () => {
    const items = groupShows([
      show('2026-09-11', 'Mission Ballroom'),
      show('2026-08-05', "Ophelia's"),
      show('2026-08-06', "Ophelia's"),
      show('2026-08-07', "Ophelia's"),
      show('2026-08-22', 'Gothic Theatre'),
    ])
    expect(items).toHaveLength(3)
    expect(items[0]?.kind).toBe('run')
    expect(items.map((item) => firstIso(item))).toEqual([
      '2026-08-05',
      '2026-08-22',
      '2026-09-11',
    ])
  })

  it('cuts a new cluster when the same venue is revisited months later', () => {
    const items = groupShows([
      show('2026-08-05', "Ophelia's"),
      show('2026-08-06', "Ophelia's"),
      show('2026-08-07', "Ophelia's"),
      show('2026-11-14', "Ophelia's"),
    ])
    expect(items.map((item) => item.kind)).toEqual(['run', 'one'])
  })

  it('returns nothing for no shows', () => {
    expect(groupShows([])).toEqual([])
  })

  // This runs on the client, so the viewer's clock must not change the answer.
  // A local-time parse makes a cluster spanning a DST boundary an hour longer
  // than the calendar says, which tips a span sitting exactly on
  // RESIDENCY_WINDOW over the line and silently un-groups a real residency.
  it('groups a span sitting exactly on the window across a DST boundary', () => {
    const originalTz = process.env.TZ
    process.env.TZ = 'America/Denver'
    try {
      // 2026-10-25 → 2026-11-15 is 21 calendar days, and US DST ends 2026-11-01.
      const items = groupShows([
        show('2026-10-25', "Ophelia's"),
        show('2026-11-04', "Ophelia's"),
        show('2026-11-15', "Ophelia's"),
      ])
      expect(items.map((item) => item.kind)).toEqual(['run'])
    } finally {
      process.env.TZ = originalTz
    }
  })
})

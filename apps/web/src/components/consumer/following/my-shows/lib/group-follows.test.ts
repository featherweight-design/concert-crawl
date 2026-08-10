import { describe, it, expect } from 'vitest'
import type { FollowedArtist } from '@concert-crawl/types'
import { groupFollows, spotifyFollowCount } from './group-follows'

const artist = (
  name: string,
  iso: string | null,
  source: FollowedArtist['source'] = 'manual',
): FollowedArtist => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  canonicalName: name.toLowerCase(),
  photoUrl: null,
  source,
  followedAt: '2026-08-01T00:00:00.000Z',
  nextShow:
    iso === null
      ? null
      : {
          eventId: `evt-${name}`,
          iso,
          venue: 'Bluebird Theater',
          venueSlug: 'bluebird-theater',
          price: 28,
        },
})

describe('groupFollows', () => {
  it('splits dated follows from undated ones', () => {
    const groups = groupFollows([
      artist('Wax Harbour', '2026-09-12'),
      artist('Null Signal', null),
    ])

    expect(groups.dated.map((follow) => follow.name)).toEqual(['Wax Harbour'])
    expect(groups.undated.map((follow) => follow.name)).toEqual(['Null Signal'])
  })

  it('orders the dated group soonest first', () => {
    const groups = groupFollows([
      artist('Later', '2026-11-02'),
      artist('Sooner', '2026-09-01'),
      artist('Middle', '2026-10-04'),
    ])

    expect(groups.dated.map((follow) => follow.name)).toEqual([
      'Sooner',
      'Middle',
      'Later',
    ])
  })

  it('breaks a same-date tie alphabetically rather than by input order', () => {
    const groups = groupFollows([
      artist('Zephyr Court', '2026-09-12'),
      artist('Ash Lantern', '2026-09-12'),
    ])

    expect(groups.dated.map((follow) => follow.name)).toEqual([
      'Ash Lantern',
      'Zephyr Court',
    ])
  })

  it('orders the undated group alphabetically, ignoring case', () => {
    const groups = groupFollows([
      artist('the xx', null),
      artist('Ardent Wire', null),
      artist('Umber', null),
    ])

    expect(groups.undated.map((follow) => follow.name)).toEqual([
      'Ardent Wire',
      'the xx',
      'Umber',
    ])
  })

  it('leaves both groups empty for an empty list', () => {
    expect(groupFollows([])).toEqual({ dated: [], undated: [] })
  })
})

describe('spotifyFollowCount', () => {
  it('counts every follow that did not come from a manual tap', () => {
    expect(
      spotifyFollowCount([
        artist('One', null, 'spotify_followed'),
        artist('Two', null, 'manual'),
        artist('Three', '2026-09-12', 'spotify_followed'),
      ]),
    ).toBe(2)
  })

  it('is zero when every follow was manual', () => {
    expect(spotifyFollowCount([artist('One', null)])).toBe(0)
  })
})

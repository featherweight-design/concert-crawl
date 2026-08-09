import { describe, it, expect } from 'vitest'
import type { FollowedArtist } from '@concert-crawl/types'
import { billArtists, followedSlugSet } from './bill-artists'
import type { BillSource } from './bill-artists'

const source = (over: Partial<BillSource> = {}): BillSource => ({
  artist: 'Headliner',
  artistSlug: 'headliner',
  supportingArtists: ['Support One', 'Support Two'],
  supportingArtistSlugs: ['support-one', 'support-two'],
  ...over,
})

const follow = (slug: string | null): FollowedArtist => ({
  name: slug ?? 'unknown',
  slug,
  canonicalName: slug ?? 'unknown',
  photoUrl: null,
  source: 'manual',
  followedAt: '2026-08-01T00:00:00.000Z',
  nextShow: null,
})

describe('followedSlugSet', () => {
  it('treats an undefined seed as no follows rather than throwing', () => {
    expect(followedSlugSet(undefined).size).toBe(0)
  })

  it('drops slug-less follows, which cannot match a bill row', () => {
    const slugs = followedSlugSet([follow('headliner'), follow(null)])
    expect([...slugs]).toEqual(['headliner'])
  })
})

describe('billArtists', () => {
  it('puts the headliner first and keeps the billed support order', () => {
    const rows = billArtists(source(), followedSlugSet([]))
    expect(rows.map((row) => row.slug)).toEqual([
      'headliner',
      'support-one',
      'support-two',
    ])
  })

  it('marks the rows the viewer already follows', () => {
    const rows = billArtists(source(), followedSlugSet([follow('support-two')]))
    expect(rows.map((row) => row.following)).toEqual([false, false, true])
  })

  it('drops a name the artists projection has no row for', () => {
    const rows = billArtists(
      source({ supportingArtistSlugs: ['support-one', null] }),
      followedSlugSet([]),
    )
    expect(rows.map((row) => row.name)).toEqual(['Headliner', 'Support One'])
  })

  it('renders a co-headliner listed twice as one row', () => {
    const rows = billArtists(
      source({
        supportingArtists: ['Headliner', 'Support One'],
        supportingArtistSlugs: ['headliner', 'support-one'],
      }),
      followedSlugSet([]),
    )
    expect(rows.map((row) => row.slug)).toEqual(['headliner', 'support-one'])
  })

  it('is empty for a legacy row with no slugs at all', () => {
    const rows = billArtists(
      source({
        artistSlug: null,
        supportingArtists: null,
        supportingArtistSlugs: null,
      }),
      followedSlugSet([]),
    )
    expect(rows).toEqual([])
  })
})

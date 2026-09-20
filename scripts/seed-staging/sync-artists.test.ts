import { describe, it, expect, vi } from 'vitest'
import { syncArtists } from './sync-artists.js'

describe('syncArtists', () => {
  const rows = [
    {
      id: 'a1',
      name: 'Khruangbin',
      canonicalName: 'khruangbin',
      slug: 'khruangbin',
      spotifyArtistId: 'spotify-1',
      matchStatus: 'matched',
      matchConfidence: '0.980',
      photoUrl: 'https://i.scdn.co/image/abc',
      photoFetchedAt: new Date('2026-08-01T00:00:00Z'),
      hidden: false,
      matchCheckedAt: new Date('2026-08-01T00:00:00Z'),
      matchAttempts: 0,
      spotifyCandidates: null,
      spotifyCandidatesFetchedAt: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
    {
      id: 'a2',
      name: 'Tobacco City',
      canonicalName: 'tobacco city',
      slug: 'tobacco-city',
      spotifyArtistId: null,
      matchStatus: 'unmatched',
      matchConfidence: null,
      photoUrl: null,
      photoFetchedAt: null,
      hidden: false,
      matchCheckedAt: null,
      matchAttempts: 0,
      spotifyCandidates: null,
      spotifyCandidatesFetchedAt: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
  ]

  const prod = {
    select: vi.fn(
      async (
        fn: (db: {
          select: () => { from: () => typeof rows }
        }) => Promise<typeof rows>,
      ) => fn({ select: () => ({ from: () => rows }) }),
    ),
    close: vi.fn(),
  }

  /**
   * `existing` is what staging already holds — the value the real step reads to
   * build its taken-slug set and to decide insert vs update per row.
   */
  const stagingFor = (
    spies: {
      insert: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    },
    existing: { canonicalName: string; slug: string }[] = [],
  ) => ({
    select: () => ({ from: () => Promise.resolve(existing) }),
    insert: () => ({ values: (row: unknown) => spies.insert(row) }),
    update: () => ({
      set: (row: unknown) => ({ where: () => spies.update(row) }),
    }),
  })

  const makeSpies = () => ({
    insert: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue([]),
  })

  it('inserts one row per prod artist when staging is empty', async () => {
    const spies = makeSpies()
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(spies) as any,
      dryRun: false,
    })
    expect(spies.insert).toHaveBeenCalledTimes(2)
    expect(spies.update).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })

  it('never carries the prod id into the staging insert', async () => {
    const spies = makeSpies()
    await syncArtists({
      prod: prod as any,
      staging: stagingFor(spies) as any,
      dryRun: false,
    })
    expect(spies.insert.mock.calls[0]?.[0]).not.toHaveProperty('id')
  })

  it('updates rather than inserts a canonical name staging already holds', async () => {
    const spies = makeSpies()
    await syncArtists({
      prod: prod as any,
      staging: stagingFor(spies, [
        { canonicalName: 'khruangbin', slug: 'khruangbin-2' },
      ]) as any,
      dryRun: false,
    })
    expect(spies.update).toHaveBeenCalledTimes(1)
    expect(spies.insert).toHaveBeenCalledTimes(1)
    // The update must not reach `slug` — staging's `khruangbin-2` is the URL its
    // pages are already walked by, and prod's `khruangbin` may belong to a
    // different staging artist.
    expect(spies.update.mock.calls[0]?.[0]).not.toHaveProperty('slug')
    expect(spies.insert.mock.calls[0]?.[0]).toMatchObject({
      canonicalName: 'tobacco city',
    })
  })

  it('de-collides a new slug against one staging already holds', async () => {
    const spies = makeSpies()
    // Staging's `khruangbin` belongs to some other canonical name, so the prod
    // row cannot reuse it. Carrying prod's slug through would violate the slug
    // unique index and abort the whole sync.
    await syncArtists({
      prod: prod as any,
      staging: stagingFor(spies, [
        { canonicalName: 'someone else', slug: 'khruangbin' },
      ]) as any,
      dryRun: false,
    })
    expect(spies.insert.mock.calls[0]?.[0]).toMatchObject({
      canonicalName: 'khruangbin',
      slug: 'khruangbin-2',
    })
  })

  it('makes no writes when dryRun is true', async () => {
    const spies = makeSpies()
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(spies) as any,
      dryRun: true,
    })
    expect(spies.insert).not.toHaveBeenCalled()
    expect(spies.update).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })
})

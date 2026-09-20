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

  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (row: unknown) => ({ onConflictDoUpdate: () => upsertSpy(row) }),
    }),
  })

  it('upserts one row per prod artist', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(2)
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })

  it('never carries the prod id into the staging insert', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    const firstArg = upsertSpy.mock.calls[0]?.[0]
    expect(firstArg).not.toHaveProperty('id')
    expect(firstArg).toMatchObject({ slug: 'khruangbin' })
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })
})

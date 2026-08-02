import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'
import { testDb } from './helpers/db.js'
import { clearTables } from './helpers/seed.js'

// The `artists` projection table (#1115 PR-B) supplies the URL identity for
// /artists/{slug}. Its two UNIQUE constraints are load-bearing: canonical_name
// is the join key against events.canonical_artist / canonical_supporting, and
// slug is the public URL. Both must reject duplicates at the DB level, not
// just in application code, because the backfill and the crawler
// write-through insert concurrently.
describe('artists schema', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('inserts a row with the documented defaults', async () => {
    const [row] = await testDb
      .insert(artists)
      .values({
        name: 'Sigur Rós',
        canonicalName: 'sigur ros',
        slug: 'sigur-ros',
      })
      .returning()

    if (!row) throw new Error('insert returned no rows')
    expect(row.name).toBe('Sigur Rós')
    expect(row.matchStatus).toBe('unmatched')
    expect(row.spotifyArtistId).toBeNull()
    expect(row.matchConfidence).toBeNull()
    expect(row.photoUrl).toBeNull()
    expect(row.photoFetchedAt).toBeNull()
    expect(row.matchCheckedAt).toBeNull()
    expect(row.createdAt).toBeInstanceOf(Date)
    expect(row.updatedAt).toBeInstanceOf(Date)
  })

  it('rejects a duplicate canonical_name', async () => {
    await testDb
      .insert(artists)
      .values({ name: 'M.I.A.', canonicalName: 'm.i.a.', slug: 'mia' })

    await expect(
      testDb
        .insert(artists)
        .values({ name: 'MIA', canonicalName: 'm.i.a.', slug: 'mia-2' }),
    ).rejects.toThrow()
  })

  it('rejects a duplicate slug', async () => {
    await testDb
      .insert(artists)
      .values({ name: 'M.I.A.', canonicalName: 'm.i.a.', slug: 'mia' })

    await expect(
      testDb
        .insert(artists)
        .values({ name: 'Mia', canonicalName: 'mia', slug: 'mia' }),
    ).rejects.toThrow()
  })

  it('accepts distinct canonical names that collide on the raw slug once de-collided', async () => {
    await testDb
      .insert(artists)
      .values({ name: 'M.I.A.', canonicalName: 'm.i.a.', slug: 'mia' })
    await testDb
      .insert(artists)
      .values({ name: 'Mia', canonicalName: 'mia', slug: 'mia-2' })

    const rows = await testDb.select().from(artists)
    expect(rows).toHaveLength(2)
  })

  it('stores match status and confidence', async () => {
    await testDb.insert(artists).values({
      name: 'Phoebe Bridgers',
      canonicalName: 'phoebe bridgers',
      slug: 'phoebe-bridgers',
      matchStatus: 'matched',
      matchConfidence: '1.000',
      spotifyArtistId: '1r1uxoy19fzMxunt3ONAkG',
    })

    const [row] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.slug, 'phoebe-bridgers'))

    if (!row) throw new Error('select returned no rows')
    expect(row.matchStatus).toBe('matched')
    expect(row.matchConfidence).toBe('1.000')
  })
})

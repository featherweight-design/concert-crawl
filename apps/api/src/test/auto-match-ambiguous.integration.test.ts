import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { artists, auditLog } from '@concert-crawl/db';
import {
  AUTO_MATCH_ACTOR,
  AUTO_MATCH_AUDIT_ACTION,
  autoMatchAmbiguousArtists,
} from '@concert-crawl/db/scripts/auto-match-ambiguous';
import { testDb } from './helpers/db.js';
import { clearTables } from './helpers/seed.js';
import { MATCH_ATTEMPT_LIMIT } from '../lib/artist-exhaustion.js';

// The backlog pass for the best-effort rule (plan
// 2026-11-10-ambiguous-artist-auto-match). The rule itself is unit-tested in
// packages/types; this pins what the pass selects, writes and records.
describe('auto-match-ambiguous integration', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(auditLog);
  });

  const candidate = (id: string, name: string, imageUrl: string | null) => ({
    id,
    name,
    imageUrl,
    genres: null,
    spotifyUrl: `https://open.spotify.com/artist/${id}`,
  });

  const seedAmbiguous = async (
    slug: string,
    over: Partial<typeof artists.$inferInsert> = {},
  ) => {
    const [row] = await testDb
      .insert(artists)
      .values({
        name: 'Tori Rose',
        canonicalName: 'tori rose',
        slug,
        matchStatus: 'ambiguous',
        photoUrl: 'https://i/stale.jpg',
        spotifyCandidates: [
          candidate('top', 'Tori Rose', 'https://i/top.jpg'),
          candidate('other', 'Tori Rose', 'https://i/other.jpg'),
        ],
        ...over,
      })
      .returning({ id: artists.id });
    return row!.id;
  };

  const read = async (id: string) =>
    (await testDb.select().from(artists).where(eq(artists.id, id)))[0];

  it('matches the top candidate, marks it, takes its photo and audits it', async () => {
    const id = await seedAmbiguous('tori-rose', {
      matchAttempts: MATCH_ATTEMPT_LIMIT,
    });

    const result = await autoMatchAmbiguousArtists(testDb, { dryRun: false });

    expect(result).toMatchObject({ considered: 1, picked: 1, updated: 1 });
    const row = await read(id);
    expect(row?.matchStatus).toBe('matched');
    expect(row?.spotifyArtistId).toBe('top');
    expect(row?.autoMatchedAt).toBeInstanceOf(Date);
    expect(row?.matchAttempts).toBe(0);
    expect(row?.photoUrl).toBe('https://i/top.jpg');
    const audits = await testDb.select().from(auditLog);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: AUTO_MATCH_ACTOR,
      action: AUTO_MATCH_AUDIT_ACTION,
      targetId: id,
    });
  });

  it('writes nothing on a dry run but reports the pick', async () => {
    const id = await seedAmbiguous('tori-rose');

    const result = await autoMatchAmbiguousArtists(testDb, { dryRun: true });

    expect(result).toMatchObject({ picked: 1, updated: 0 });
    expect((await read(id))?.matchStatus).toBe('ambiguous');
    expect(await testDb.select().from(auditLog)).toEqual([]);
  });

  it('tallies the rows it declines and leaves them in the queue', async () => {
    const id = await seedAmbiguous('pearl', {
      name: 'Pearl',
      canonicalName: 'pearl',
      spotifyCandidates: [
        candidate('pj', 'Pearl Jam', 'https://i/pj.jpg'),
        candidate('pearl', 'pearl', 'https://i/p.jpg'),
      ],
    });

    const result = await autoMatchAmbiguousArtists(testDb, { dryRun: false });

    expect(result.declined['top-not-exact']).toBe(1);
    expect((await read(id))?.matchStatus).toBe('ambiguous');
  });

  it('leaves hidden and non-ambiguous rows alone, and a re-run is a no-op', async () => {
    const asAct = (name: string) => ({
      name,
      canonicalName: name.toLowerCase(),
      spotifyCandidates: [candidate(`sp-${name}`, name, 'https://i/x.jpg')],
    });
    await seedAmbiguous('hidden', { ...asAct('Hidden'), hidden: true });
    await seedAmbiguous('matched', {
      ...asAct('Settled'),
      matchStatus: 'no_match',
    });
    await seedAmbiguous('tori-rose');

    await autoMatchAmbiguousArtists(testDb, { dryRun: false });
    const second = await autoMatchAmbiguousArtists(testDb, { dryRun: false });

    expect(second).toMatchObject({ considered: 0, updated: 0 });
    const rows = await testDb.select().from(artists).orderBy(asc(artists.slug));
    expect(rows.map((row) => [row.slug, row.matchStatus])).toEqual([
      ['hidden', 'ambiguous'],
      ['matched', 'no_match'],
      ['tori-rose', 'matched'],
    ]);
  });
});

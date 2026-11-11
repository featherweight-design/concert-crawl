import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { artists, auditLog } from '@concert-crawl/db';
import {
  LOCK_NAMES_ACTOR,
  lockArtistNames,
} from '@concert-crawl/db/scripts/lock-artist-names';
import { testDb } from './helpers/db.js';
import { clearTables } from './helpers/seed.js';

describe('lock-artist-names integration', () => {
  beforeEach(async () => {
    await clearTables();
  });

  const seed = (name: string, slug: string, nameLockedAt: Date | null = null) =>
    testDb
      .insert(artists)
      .values({ name, canonicalName: slug, slug, nameLockedAt });

  const lockedAt = async (slug: string) =>
    (
      await testDb
        .select({ nameLockedAt: artists.nameLockedAt, name: artists.name })
        .from(artists)
        .where(eq(artists.slug, slug))
    )[0];

  it('reports without writing on a dry run', async () => {
    await seed('MGMT', 'mgmt');

    const result = await lockArtistNames(testDb, {
      slugs: ['mgmt', 'nobody'],
      dryRun: true,
    });

    expect(result.found).toEqual([
      { slug: 'mgmt', name: 'MGMT', alreadyLocked: false },
    ]);
    expect(result.missing).toEqual(['nobody']);
    expect(result.locked).toBe(0);
    expect((await lockedAt('mgmt'))?.nameLockedAt).toBeNull();
  });

  it('locks the named rows, keeps their names, and audits each write', async () => {
    await seed('MGMT', 'mgmt');
    await seed('Other', 'other');

    const result = await lockArtistNames(testDb, {
      slugs: ['mgmt'],
      dryRun: false,
    });

    expect(result.locked).toBe(1);
    expect(await lockedAt('mgmt')).toMatchObject({ name: 'MGMT' });
    expect((await lockedAt('mgmt'))?.nameLockedAt).toBeInstanceOf(Date);
    expect((await lockedAt('other'))?.nameLockedAt).toBeNull();
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, LOCK_NAMES_ACTOR));
    expect(audits).toHaveLength(1);
  });

  it('keeps the original lock time on an already-locked row', async () => {
    const original = new Date('2026-01-01T00:00:00Z');
    await seed('bbno$', 'bbno', original);

    const result = await lockArtistNames(testDb, {
      slugs: ['bbno'],
      dryRun: false,
    });

    expect(result.locked).toBe(0);
    expect((await lockedAt('bbno'))?.nameLockedAt).toEqual(original);
  });
});

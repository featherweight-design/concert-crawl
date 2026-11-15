import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import {
  artists,
  clearEventArtists,
  eventArtists,
  events,
  syncEventArtists,
} from '@concert-crawl/db';
import { testDb } from './helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from './helpers/seed.js';

// Admin 4a-2 (docs/superpowers/plans/2026-11-13-admin-4a-events-data.md,
// Decision 5): `event_artists` is a projection of the four artist arrays, and
// `syncEventArtists` is its one writer.
describe('syncEventArtists integration', () => {
  beforeEach(async () => {
    await clearTables();
  });

  const lineupOf = (eventId: string) =>
    testDb
      .select({
        canonicalName: artists.canonicalName,
        role: eventArtists.role,
        position: eventArtists.position,
      })
      .from(eventArtists)
      .innerJoin(artists, eq(artists.id, eventArtists.artistId))
      .where(eq(eventArtists.eventId, eventId))
      .orderBy(asc(eventArtists.position));

  const seedBill = async (overrides: Parameters<typeof seedEvent>[1] = {}) => {
    const venue = await seedVenue({
      slug: `sync-venue-${crypto.randomUUID()}`,
    });
    return seedEvent(venue.id, {
      artist: 'Zeta',
      headliners: ['Zeta', 'Alpha'],
      canonicalHeadliners: ['alpha', 'zeta'],
      supportingArtists: ['Opener'],
      canonicalSupporting: ['opener'],
      ...overrides,
    });
  };

  it('writes the lineup in bill order, headliners first', async () => {
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Alpha' });
    await seedArtist({ name: 'Opener' });
    const event = await seedBill();

    const result = await syncEventArtists(testDb, [event.id]);

    expect(result).toEqual({
      events: 1,
      inserted: 3,
      updated: 0,
      deleted: 0,
      unmatched: 0,
    });
    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'zeta', role: 'headliner', position: 0 },
      { canonicalName: 'alpha', role: 'headliner', position: 1 },
      { canonicalName: 'opener', role: 'support', position: 2 },
    ]);
  });

  it('is idempotent: a second run writes nothing', async () => {
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Opener' });
    const event = await seedBill();
    await syncEventArtists(testDb, [event.id]);
    const before = await lineupOf(event.id);

    const again = await syncEventArtists(testDb, [event.id, event.id]);

    expect(again).toMatchObject({ inserted: 0, updated: 0, deleted: 0 });
    expect(await lineupOf(event.id)).toEqual(before);
  });

  it('leaves an unmatched name without a row, and links it once the artist exists', async () => {
    await seedArtist({ name: 'Zeta' });
    const event = await seedBill();

    const first = await syncEventArtists(testDb, [event.id]);
    expect(first.unmatched).toBe(2);
    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'zeta', role: 'headliner', position: 0 },
    ]);

    // The normal derivation (projectArtists, the artists backfill) creates the
    // artist later; the next sync links it without moving anyone else.
    await seedArtist({ name: 'Opener' });
    const second = await syncEventArtists(testDb, [event.id]);
    expect(second).toMatchObject({ inserted: 1, updated: 0, unmatched: 1 });
    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'zeta', role: 'headliner', position: 0 },
      { canonicalName: 'opener', role: 'support', position: 2 },
    ]);
  });

  it('follows a changed bill: drops a removed act and moves a promoted one', async () => {
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Alpha' });
    await seedArtist({ name: 'Opener' });
    const event = await seedBill();
    await syncEventArtists(testDb, [event.id]);

    await testDb
      .update(events)
      .set({
        headliners: ['Zeta', 'Opener'],
        canonicalHeadliners: ['opener', 'zeta'],
        supportingArtists: [],
        canonicalSupporting: [],
      })
      .where(eq(events.id, event.id));
    const result = await syncEventArtists(testDb, [event.id]);

    expect(result).toMatchObject({ inserted: 0, updated: 1, deleted: 1 });
    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'zeta', role: 'headliner', position: 0 },
      { canonicalName: 'opener', role: 'headliner', position: 1 },
    ]);
  });

  it('projects the saved bill of a lineup an admin edited, not the crawl fallback', async () => {
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Admin Pick' });
    const event = await seedBill({
      headliners: ['Admin Pick'],
      canonicalHeadliners: ['admin pick'],
      supportingArtists: [],
      canonicalSupporting: [],
      lineupEditedAt: new Date(),
    });

    await syncEventArtists(testDb, [event.id]);

    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'admin pick', role: 'headliner', position: 0 },
    ]);
  });

  it("writes inside the caller's transaction and rolls back with it", async () => {
    await seedArtist({ name: 'Zeta' });
    const event = await seedBill();

    await expect(
      testDb.transaction(async (tx) => {
        await syncEventArtists(tx, [event.id]);
        expect(await tx.select().from(eventArtists)).toHaveLength(1);
        throw new Error('caller failed after the sync');
      }),
    ).rejects.toThrow('caller failed after the sync');

    expect(await lineupOf(event.id)).toEqual([]);
  });

  it('never bills canonical_artist as a headliner when the ladder never ruled', async () => {
    // canonical_artist is often a title: an artist row with that name exists
    // here, and is still not linked.
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Opener' });
    const event = await seedBill({ canonicalHeadliners: null });

    await syncEventArtists(testDb, [event.id]);

    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'opener', role: 'support', position: 0 },
    ]);
  });

  it('removes the rows of a show once it is hidden from consumers', async () => {
    await seedArtist({ name: 'Zeta' });
    const event = await seedBill();
    await syncEventArtists(testDb, [event.id]);
    expect(await lineupOf(event.id)).toHaveLength(1);

    await testDb
      .update(events)
      .set({ hiddenFromConsumer: true })
      .where(eq(events.id, event.id));
    const result = await syncEventArtists(testDb, [event.id]);

    expect(result).toMatchObject({ deleted: 1, unmatched: 0 });
    expect(await lineupOf(event.id)).toEqual([]);
  });

  it('clears every row of the events it is given, and only those', async () => {
    await seedArtist({ name: 'Zeta' });
    const cleared = await seedBill();
    const kept = await seedBill();
    await syncEventArtists(testDb, [cleared.id, kept.id]);

    expect(await clearEventArtists(testDb, [cleared.id])).toBe(1);

    expect(await lineupOf(cleared.id)).toEqual([]);
    expect(await lineupOf(kept.id)).toHaveLength(1);
  });

  // The row lock: a writer that changed the arrays and has not committed yet
  // makes the sync wait, so the sync projects the committed (new) arrays and
  // never writes the old lineup back over them.
  it('waits for a concurrent writer of the arrays and projects what it committed', async () => {
    await seedArtist({ name: 'Zeta' });
    await seedArtist({ name: 'Alpha' });
    await seedArtist({ name: 'Opener' });
    const event = await seedBill();

    let signalLocked = (): void => {};
    const locked = new Promise<void>((resolve) => {
      signalLocked = resolve;
    });
    let release = (): void => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = testDb.transaction(async (tx) => {
      await tx
        .update(events)
        .set({
          headliners: ['Alpha'],
          canonicalHeadliners: ['alpha'],
          supportingArtists: [],
          canonicalSupporting: [],
        })
        .where(eq(events.id, event.id));
      signalLocked();
      await released;
    });
    await locked;

    let syncDone = false;
    const sync = syncEventArtists(testDb, [event.id]).then((result) => {
      syncDone = true;
      return result;
    });
    // Long enough for an unlocked sync to have read and written.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(syncDone).toBe(false);

    release();
    await writer;
    await sync;

    expect(await lineupOf(event.id)).toEqual([
      { canonicalName: 'alpha', role: 'headliner', position: 0 },
    ]);
  });

  it('writes nothing on a dry run but counts what it would write', async () => {
    await seedArtist({ name: 'Zeta' });
    const event = await seedBill();

    const result = await syncEventArtists(testDb, [event.id], { dryRun: true });

    expect(result).toMatchObject({ inserted: 1, unmatched: 2 });
    expect(await lineupOf(event.id)).toEqual([]);
  });
});

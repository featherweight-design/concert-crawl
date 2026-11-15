import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { artists, eventArtists, events } from '@concert-crawl/db';
import { mergeDuplicateNights } from '@concert-crawl/crawler-core';
import { testDb } from './helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from './helpers/seed.js';

// Folding a doubled night must keep every act a folded row names: the folded
// row is deleted, so a name only it carried was lost for good. Runs here
// because crawler-core's own integration tests are not in CI.
describe('mergeDuplicateNights keeps the donor-only names on the bill', () => {
  beforeEach(async () => {
    await clearTables();
  });

  const lineupOf = (eventId: string) =>
    testDb
      .select({ canonicalName: artists.canonicalName, role: eventArtists.role })
      .from(eventArtists)
      .innerJoin(artists, eq(artists.id, eventArtists.artistId))
      .where(eq(eventArtists.eventId, eventId))
      .orderBy(asc(eventArtists.position));

  // A timed venue listing and an untimed ticketing listing of one night: the
  // timed row is kept, the untimed one folded into it.
  const seedNight = async (keeper: Partial<typeof events.$inferInsert>) => {
    const venue = await seedVenue({ slug: `fold-${crypto.randomUUID()}` });
    const kept = await seedEvent(venue.id, {
      title: 'Beck',
      artist: 'Beck',
      date: '2026-12-13',
      showTime: '19:00',
      headliners: ['Beck'],
      canonicalHeadliners: ['beck'],
      supportingArtists: ['Opener'],
      canonicalSupporting: ['opener'],
      ...keeper,
    });
    const donor = await seedEvent(venue.id, {
      title: 'Beck (tickets)',
      artist: 'Beck',
      date: '2026-12-13',
      showTime: null,
      headliners: ['BECK', 'Co Star'],
      canonicalHeadliners: ['beck', 'co star'],
      supportingArtists: ['Late Add', 'beck'],
      canonicalSupporting: ['beck', 'late add'],
    });
    return { venueId: venue.id, kept, donor };
  };

  it('unions the donor names into the kept bill and rebuilds its lineup rows', async () => {
    for (const name of ['Beck', 'Co Star', 'Opener', 'Late Add']) {
      await seedArtist({ name });
    }
    const { venueId, kept } = await seedNight({});

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.merged).toBe(1);
    expect(result.groups[0]?.fillError).toBeUndefined();
    const rows = await testDb
      .select()
      .from(events)
      .where(eq(events.venueId, venueId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: kept.id,
      headliners: ['Beck', 'Co Star'],
      canonicalHeadliners: ['beck', 'co star'],
      supportingArtists: ['Opener', 'Late Add'],
      canonicalSupporting: ['late add', 'opener'],
    });
    expect(await lineupOf(kept.id)).toEqual([
      { canonicalName: 'beck', role: 'headliner' },
      { canonicalName: 'co star', role: 'headliner' },
      { canonicalName: 'opener', role: 'support' },
      { canonicalName: 'late add', role: 'support' },
    ]);
  });

  it('leaves a bill an admin saved untouched', async () => {
    const { venueId, kept } = await seedNight({
      supportingArtists: [],
      canonicalSupporting: [],
      lineupEditedAt: new Date('2026-11-01T00:00:00Z'),
    });

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.merged).toBe(1);
    const rows = await testDb
      .select()
      .from(events)
      .where(eq(events.venueId, venueId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: kept.id,
      headliners: ['Beck'],
      canonicalHeadliners: ['beck'],
      supportingArtists: [],
      canonicalSupporting: [],
    });
  });
});

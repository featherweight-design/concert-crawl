import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import {
  artists,
  db,
  eventRedirects,
  events,
  userEvents,
  venues,
} from '@concert-crawl/db';
import {
  chooseSurvivor,
  groupNights,
  mergeDuplicateNights,
  type NightRow,
} from './merge-duplicate-nights.js';

describe('merge-duplicate-nights integration', () => {
  const seedVenue = async () => {
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'The Church',
        slug: `church-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        websiteUrl: 'https://example.com/church',
        city: 'Denver',
      })
      .returning();
    return venue!;
  };

  const seedEvent = async (
    venueId: string,
    values: {
      title: string;
      artist: string;
      date: string;
      showTime?: string;
      imageUrl?: string;
      ticketUrl?: string;
    },
  ) => {
    const [event] = await db
      .insert(events)
      .values({
        venueId,
        title: values.title,
        artist: values.artist,
        canonicalArtist: values.artist.toLowerCase(),
        canonicalTitle: values.title.toLowerCase(),
        date: values.date,
        showTime: values.showTime ?? null,
        imageUrl: values.imageUrl ?? null,
        ticketUrl: values.ticketUrl ?? null,
      })
      .returning();
    return event!;
  };

  const rowsOn = (venueId: string) =>
    db.select().from(events).where(eq(events.venueId, venueId));

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE events, venues, artists, user_events, event_redirects RESTART IDENTITY CASCADE`,
    );
  });

  it('writes nothing on a dry run and lists each night with its survivor', async () => {
    const venue = await seedVenue();
    const plain = await seedEvent(venue.id, {
      title: 'Rossi',
      artist: 'Rossi',
      date: '2026-12-12',
    });
    const dotted = await seedEvent(venue.id, {
      title: 'Rossi.',
      artist: 'Rossi.',
      date: '2026-12-12',
      imageUrl: 'https://example.com/rossi.jpg',
    });

    const result = await mergeDuplicateNights({ dryRun: true });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.fills).toEqual(['imageUrl']);
    expect(
      [
        result.groups[0]?.survivor.id,
        ...(result.groups[0]?.losers ?? []).map((row) => row.id),
      ].sort(),
    ).toEqual([plain.id, dotted.id].sort());
    expect(await rowsOn(venue.id)).toHaveLength(2);
    expect(await db.select().from(eventRedirects)).toHaveLength(0);
  });

  it('folds "Rossi." into the watched "Rossi": the watch, the redirect and the image move', async () => {
    const venue = await seedVenue();
    const plain = await seedEvent(venue.id, {
      title: 'Rossi',
      artist: 'Rossi',
      date: '2026-12-12',
    });
    const dotted = await seedEvent(venue.id, {
      title: 'Rossi.',
      artist: 'Rossi.',
      date: '2026-12-12',
      imageUrl: 'https://example.com/rossi.jpg',
    });
    await db
      .insert(userEvents)
      .values({ userId: 'user-a', eventId: plain.id, status: 'watching' });

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.merged).toBe(1);
    const rows = await rowsOn(venue.id);
    expect(rows.map((row) => row.id)).toEqual([plain.id]);
    expect(rows[0]?.imageUrl).toBe('https://example.com/rossi.jpg');
    const [redirect] = await db.select().from(eventRedirects);
    expect(redirect).toMatchObject({
      sourceId: dotted.id,
      targetId: plain.id,
    });
    const watches = await db.select().from(userEvents);
    expect(watches.map((row) => row.eventId)).toEqual([plain.id]);
  });

  it("keeps the timed row when an untimed copy exists, and takes the copy's ticket link", async () => {
    const venue = await seedVenue();
    const timed = await seedEvent(venue.id, {
      title: 'Beck',
      artist: 'Beck',
      date: '2026-12-13',
      showTime: '19:00',
    });
    await seedEvent(venue.id, {
      title: 'Beck (tickets)',
      artist: 'Beck',
      date: '2026-12-13',
      ticketUrl: 'https://tickets.example.com/beck',
    });

    await mergeDuplicateNights({ dryRun: false });

    const rows = await rowsOn(venue.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(timed.id);
    expect(rows[0]?.showTime).toBe('19:00:00');
    expect(rows[0]?.ticketUrl).toBe('https://tickets.example.com/beck');
  });

  it('leaves an early and a late show, and different dates, alone', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      title: 'Beck early',
      artist: 'Beck',
      date: '2026-12-14',
      showTime: '18:00',
    });
    await seedEvent(venue.id, {
      title: 'Beck late',
      artist: 'Beck',
      date: '2026-12-14',
      showTime: '21:00',
    });
    await seedEvent(venue.id, {
      title: 'Beck next day',
      artist: 'Beck',
      date: '2026-12-15',
    });

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.groups).toHaveLength(0);
    expect(await rowsOn(venue.id)).toHaveLength(3);
  });

  it('lists a doubled night that names two artists for the artists queue, without merging them', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      title: 'Rossi',
      artist: 'Rossi',
      date: '2026-12-12',
    });
    await seedEvent(venue.id, {
      title: 'Rossi.',
      artist: 'Rossi.',
      date: '2026-12-12',
    });
    await db.insert(artists).values([
      { name: 'Rossi', canonicalName: 'rossi', slug: 'rossi' },
      { name: 'Rossi.', canonicalName: 'rossi.', slug: 'rossi-2' },
    ]);

    const result = await mergeDuplicateNights({ dryRun: true });

    expect(result.artistReviews).toHaveLength(1);
    expect(
      result.artistReviews[0]?.artistRows.map((row) => row.name).sort(),
    ).toEqual(['Rossi', 'Rossi.']);
    expect(await db.select().from(artists)).toHaveLength(2);
  });

  it('merges at most max-groups nights and reports the rest as not reached', async () => {
    const venue = await seedVenue();
    for (const date of ['2026-12-16', '2026-12-17']) {
      await seedEvent(venue.id, { title: 'A', artist: 'Aaa', date });
      await seedEvent(venue.id, { title: 'A.', artist: 'Aaa.', date });
    }
    const result = await mergeDuplicateNights({ dryRun: false, maxGroups: 1 });
    expect(result.merged).toBe(1);
    expect(result.failed).toBe(0);
    expect(
      result.groups.filter((plan) => plan.outcome === undefined),
    ).toHaveLength(1);
    expect(await rowsOn(venue.id)).toHaveLength(3);
  });
});

describe('chooseSurvivor and groupNights', () => {
  const night = (
    id: string,
    canonicalArtist: string,
    showTime: string | null,
    refs = 0,
  ): NightRow => ({
    id,
    title: id,
    artist: canonicalArtist,
    canonicalArtist,
    date: '2026-12-12',
    showTime,
    refs,
  });

  it('keeps the row people point at, then a timed row, then the lowest id', () => {
    expect(
      chooseSurvivor([night('b', 'x', '19:00:00', 0), night('a', 'x', null, 3)])
        .id,
    ).toBe('a');
    expect(
      chooseSurvivor([night('a', 'x', null), night('b', 'x', '19:00:00')]).id,
    ).toBe('b');
    expect(
      chooseSurvivor([night('b', 'x', null), night('a', 'x', null)]).id,
    ).toBe('a');
  });

  it("groups by the crawl's night rule", () => {
    const groups = groupNights([
      night('a', 'rossi', null),
      night('b', 'rossi.', null),
      night('c', 'beck', '18:00:00'),
      night('d', 'beck', '21:00:00'),
    ]);
    expect(groups.map((group) => group.map((row) => row.id).sort())).toEqual([
      ['a', 'b'],
    ]);
  });
});

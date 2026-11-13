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
  isMultiDayPass,
  isTwelveHourMisread,
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

  it('never folds a multi-day pass listing into a night, but folds the 12-hour misread', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      title: 'Billy Strings',
      artist: 'Billy Strings',
      date: '2026-09-18',
      showTime: '19:30',
    });
    await seedEvent(venue.id, {
      title: 'Billy Strings 2-Day Ticket (9/18-9/19)',
      artist: 'Billy Strings',
      date: '2026-09-18',
      ticketUrl: 'https://tickets.example.com/2day',
    });
    const evening = await seedEvent(venue.id, {
      title: 'Beck: Ride Lonesome Tour',
      artist: 'Beck',
      date: '2026-10-01',
      showTime: '19:30',
    });
    await seedEvent(venue.id, {
      title: 'Beck: Ride Lonesome Tour',
      artist: 'Beck',
      date: '2026-10-01',
      showTime: '07:30',
    });

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.groups).toHaveLength(1);
    const rows = await rowsOn(venue.id);
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.id === evening.id)?.showTime).toBe(
      '19:30:00',
    );
    expect(rows.filter((row) => row.title.startsWith('Billy'))).toHaveLength(2);
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

  it('sets the evening time on the survivor even when the morning row was the watched one', async () => {
    const venue = await seedVenue();
    const morning = await seedEvent(venue.id, {
      title: 'Beck',
      artist: 'Beck',
      date: '2026-10-01',
      showTime: '07:30',
    });
    await seedEvent(venue.id, {
      title: 'Beck',
      artist: 'Beck',
      date: '2026-10-01',
      showTime: '19:30',
    });
    await db
      .insert(userEvents)
      .values({ userId: 'user-a', eventId: morning.id, status: 'watching' });

    const result = await mergeDuplicateNights({ dryRun: false });

    expect(result.merged).toBe(1);
    const rows = await rowsOn(venue.id);
    expect(rows.map((row) => [row.id, row.showTime])).toEqual([
      [morning.id, '19:30:00'],
    ]);
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

  it('does not read a midnight placeholder, or a seconds difference, as a misread', () => {
    expect(
      isTwelveHourMisread(
        night('a', 'x', '00:00:00'),
        night('b', 'x', '12:00:00'),
      ),
    ).toBe(false);
    expect(
      isTwelveHourMisread(
        night('a', 'x', '07:30:00'),
        night('b', 'x', '19:30:45'),
      ),
    ).toBe(false);
  });

  it('joins a chain of misreads whatever the order of the rows', () => {
    const rows = [
      night('a', 'beck', '07:30:00'),
      night('b', 'beck', '19:30:00'),
      night('c', 'beck', '08:30:00'),
    ];
    for (const order of [
      rows,
      [...rows].reverse(),
      [rows[1]!, rows[0]!, rows[2]!],
    ]) {
      const groups = groupNights(order);
      // 07:30 and 19:30 are one show; 08:30 has no twelve-hour partner.
      expect(groups.map((group) => group.map((row) => row.id).sort())).toEqual([
        ['a', 'b'],
      ]);
    }
  });

  it('reads a multi-day pass or ticket listing as a different product', () => {
    for (const title of [
      'Ghost Canyon (Weekend Passes)',
      'Billy Strings 2-Day Ticket (9/18-9/19)',
      'Festival 3 day pass',
    ]) {
      expect(isMultiDayPass(title)).toBe(true);
    }
    for (const title of [
      'Billy Strings',
      'Ghost Canyon Fest (Friday)',
      'Rossi.',
    ]) {
      expect(isMultiDayPass(title)).toBe(false);
    }
  });

  it('reads 19:30 and 07:30 as one show, and an early and a late show as two', () => {
    expect(
      isTwelveHourMisread(
        night('a', 'beck', '19:30:00'),
        night('b', 'beck', '07:30:00'),
      ),
    ).toBe(true);
    expect(
      isTwelveHourMisread(
        night('a', 'beck', '21:00:00'),
        night('b', 'beck', '18:00:00'),
      ),
    ).toBe(false);
    expect(
      isTwelveHourMisread(
        night('a', 'beck', '22:00:00'),
        night('b', 'beck', '10:00:00'),
      ),
    ).toBe(false);
    const groups = groupNights([
      night('a', 'beck', '07:30:00'),
      night('b', 'beck', '19:30:00'),
    ]);
    expect(groups).toHaveLength(1);
    // The evening row survives the morning misread.
    expect(chooseSurvivor(groups[0] ?? []).id).toBe('b');
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

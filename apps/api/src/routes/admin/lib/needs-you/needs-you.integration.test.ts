import { describe, it, expect, beforeEach } from 'vitest';
import {
  adminQueueSnoozes,
  artistReports,
  auditLog,
  crawlRunPages,
  feedback,
} from '@concert-crawl/db';
import { AUTO_APPROVE_THRESHOLD } from '@concert-crawl/crawler-core';
import {
  clearTables,
  seedArtist,
  seedCrawlRun,
  seedEvent,
  seedPriceSubmission,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../../../../test/helpers/seed.js';
import { testDb } from '../../../../test/helpers/db.js';
import {
  NEEDS_YOU_ANSWER_ACTION,
  NEEDS_YOU_UNDO_ACTION,
  countNeedsYou,
  listNeedsYou,
} from './index.js';
import { addDays, denverDate } from './keys.js';

const HOUR_MS = 60 * 60 * 1000;

const now = (): Date => new Date();
const inDays = (days: number): string => addDays(denverDate(now()), days);

const keysOf = async (
  options: Parameters<typeof listNeedsYou>[0] = { now: now() },
): Promise<string[]> => (await listNeedsYou(options)).map((item) => item.key);

// A low-confidence event is the simplest item with a date and a venue.
const seedLowConfidence = (venueId: string, artist: string, date: string) =>
  seedEvent(venueId, { artist, date, verified: false });

const lowKey = (eventId: string): string => `event-low-confidence:${eventId}`;

describe('Needs you sources and ranking', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('ranks by fan date ascending with undated items last', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const later = await seedLowConfidence(venue.id, 'Later Act', inDays(20));
    const sooner = await seedLowConfidence(venue.id, 'Sooner Act', inDays(5));
    await testDb.insert(feedback).values({
      pageUrl: 'https://concertcrawl.app/',
      category: 'bug',
      message: 'Broken thing',
    });

    expect(await keysOf()).toEqual([
      lowKey(sooner.id),
      lowKey(later.id),
      expect.stringMatching(/^bug:/),
    ]);
  });

  it('carries the reporter device on a bug, cut to a safe length', async () => {
    await testDb.insert(feedback).values([
      {
        pageUrl: 'https://concertcrawl.app/',
        category: 'bug',
        message: 'With a device',
        metadata: { device: 'iPhone · Safari 19' },
      },
      {
        pageUrl: 'https://concertcrawl.app/',
        category: 'bug',
        message: 'No device',
        metadata: { device: 42 },
      },
    ]);
    const items = await listNeedsYou({ kind: 'bug', now: now() });
    const devices = items.flatMap((item) =>
      item.kind === 'bug' ? [item.device ?? null] : [],
    );
    expect(devices).toHaveLength(2);
    expect(devices).toContain('iPhone · Safari 19');
    expect(devices).toContain(null);
  });

  it('breaks a date tie by watchers', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const date = inDays(7);
    const quiet = await seedLowConfidence(venue.id, 'Quiet Act', date);
    const popular = await seedLowConfidence(venue.id, 'Popular Act', date);
    await seedUserProfile('watcher-1');
    await seedUserProfile('watcher-2');
    await seedUserEvent('watcher-1', popular.id);
    await seedUserEvent('watcher-2', popular.id);

    expect(await keysOf()).toEqual([lowKey(popular.id), lowKey(quiet.id)]);
  });

  it('excludes artists whose next show is more than 60 days out', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const near = await seedArtist({
      name: 'Near Act',
      matchStatus: 'ambiguous',
    });
    const far = await seedArtist({ name: 'Far Act', matchStatus: 'ambiguous' });
    await seedEvent(venue.id, { artist: near.name, date: inDays(30) });
    await seedEvent(venue.id, { artist: far.name, date: inDays(90) });

    expect(await keysOf({ kind: 'artist', now: now() })).toEqual([
      `artist:${near.id}:ambiguous`,
    ]);
  });

  it('omits low-confidence events that are hidden from consumers', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const shown = await seedLowConfidence(venue.id, 'Shown Act', inDays(5));
    await seedEvent(venue.id, {
      artist: 'Hidden Act',
      date: inDays(6),
      verified: false,
      hiddenFromConsumer: true,
    });

    expect(await keysOf()).toEqual([lowKey(shown.id)]);
  });

  it('does not also ask whether a missing or cancelled show is a concert', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const plain = await seedLowConfidence(venue.id, 'Plain Act', inDays(5));
    await seedEvent(venue.id, {
      artist: 'Missing Act',
      date: inDays(6),
      verified: false,
      firstMissingAt: new Date(),
    });
    await seedEvent(venue.id, {
      artist: 'Cancelled Act',
      date: inDays(7),
      verified: false,
      status: 'cancelled',
    });

    expect(await keysOf({ kind: 'event-low-confidence', now: now() })).toEqual([
      lowKey(plain.id),
    ]);
  });

  it('carries the show time on show and event items, null when unknown', async () => {
    const venue = await seedVenue({ name: 'Time Hall', slug: 'time-hall' });
    const timed = await seedEvent(venue.id, {
      artist: 'Timed Act',
      date: inDays(5),
      showTime: '20:00:00',
      verified: false,
    });
    const untimed = await seedEvent(venue.id, {
      artist: 'Untimed Act',
      date: inDays(6),
      verified: false,
    });
    const dropped = await seedEvent(venue.id, {
      artist: 'Dropped Act',
      date: inDays(4),
      showTime: '19:30:00',
      verified: true,
      firstMissingAt: new Date(),
    });
    const items = await listNeedsYou({ now: now() });
    const timeOf = (eventId: string) =>
      items.find((item) => 'eventId' in item && item.eventId === eventId);
    expect(timeOf(timed.id)).toMatchObject({ showTime: '20:00:00' });
    expect(timeOf(untimed.id)).toMatchObject({ showTime: null });
    expect(timeOf(dropped.id)).toMatchObject({
      kind: 'show-dropped',
      showTime: '19:30:00',
    });
  });

  it('keeps a venue fault snoozed under one stable key', async () => {
    const venue = await seedVenue({
      name: 'Blocked Hall',
      slug: 'blocked-hall',
      blockedAt: new Date(Date.now() - 3 * 24 * HOUR_MS),
    });

    const keys = await keysOf({ kind: 'venue-blocked', now: now() });
    expect(keys).toEqual([`venue-blocked:${venue.id}`]);
  });

  it('carries live, paused, show count, OK streak and run counts on a failing venue', async () => {
    const pausedAt = new Date(Date.now() - 2 * HOUR_MS);
    const venue = await seedVenue({
      name: 'Failing Hall',
      slug: 'failing-hall',
      crawlPausedAt: pausedAt,
    });
    await seedEvent(venue.id, { artist: 'Up One', date: inDays(5) });
    await seedEvent(venue.id, { artist: 'Up Two', date: inDays(6) });
    await seedEvent(venue.id, {
      artist: 'Hidden Act',
      date: inDays(7),
      hiddenFromConsumer: true,
    });
    await seedEvent(venue.id, {
      artist: 'Missing Act',
      date: inDays(8),
      firstMissingAt: new Date(),
    });
    const hoursAgo = (hours: number): Date =>
      new Date(Date.now() - hours * HOUR_MS);
    for (const hours of [12, 11, 10]) {
      await seedCrawlRun(venue.id, {
        status: 'success',
        eventsFound: 40,
        createdAt: hoursAgo(hours),
      });
    }
    // As in triage, a partial run is an OK reading and counts toward the
    // streak (so 3 successes + 1 partial = 4).
    await seedCrawlRun(venue.id, {
      status: 'partial',
      reason: 'no_events_found',
      createdAt: hoursAgo(9),
    });
    // A skipped run in the middle of the OK streak carries no reading.
    await seedCrawlRun(venue.id, {
      status: 'skipped',
      reason: 'page_unchanged',
      createdAt: hoursAgo(10.5),
    });
    for (const hours of [3, 2, 1]) {
      await seedCrawlRun(venue.id, {
        status: 'failed',
        reason: 'error',
        eventsFound: 0,
        httpStatusCode: 500,
        errorMessage: 'boom',
        createdAt: hoursAgo(hours),
      });
    }

    const [item] = await listNeedsYou({ kind: 'venue-failing', now: now() });
    expect(item).toMatchObject({
      kind: 'venue-failing',
      venueLive: true,
      pausedAt: pausedAt.toISOString(),
      showCount: 2,
      okStreakBefore: 4,
    });
    if (item?.kind !== 'venue-failing')
      throw new Error('expected venue-failing');
    // Up to fourteen, newest first: every seeded run, the oldest last.
    expect(item.lastRuns.length).toBeGreaterThan(5);
    expect(item.lastRuns.length).toBeLessThanOrEqual(14);
    expect(item.lastRuns[0]).toMatchObject({
      status: 'failed',
      eventsFound: 0,
      httpStatus: 500,
    });
    expect(item.lastRuns.at(-1)).toMatchObject({ status: 'success' });
  });

  it('sends at most fourteen runs per venue, newest first', async () => {
    const venue = await seedVenue({ name: 'Junkyard', slug: 'junkyard' });
    const hoursAgo = (hours: number): Date =>
      new Date(now().getTime() - hours * 60 * 60 * 1000);
    for (let hours = 40; hours >= 1; hours -= 2) {
      await seedCrawlRun(venue.id, {
        status: 'failed',
        reason: 'error',
        eventsFound: 0,
        httpStatusCode: 500,
        errorMessage: `boom ${hours}`,
        createdAt: hoursAgo(hours),
      });
    }
    const [item] = await listNeedsYou({ kind: 'venue-failing', now: now() });
    if (item?.kind !== 'venue-failing')
      throw new Error('expected venue-failing');
    expect(item.lastRuns).toHaveLength(14);
    expect(item.lastRuns[0]?.errorMessage).toBe('boom 1');
  });

  it('carries the latest run page count and robots result on a blocked venue', async () => {
    const venue = await seedVenue({
      name: 'Blocked Pages Hall',
      slug: 'blocked-pages-hall',
      blockedAt: new Date(Date.now() - 3 * 24 * HOUR_MS),
    });
    // Two OK runs before the block, then the 403 run (the newest).
    await seedCrawlRun(venue.id, {
      status: 'success',
      createdAt: new Date(Date.now() - 5 * 24 * HOUR_MS),
    });
    await seedCrawlRun(venue.id, {
      status: 'success',
      createdAt: new Date(Date.now() - 4 * 24 * HOUR_MS),
    });
    const run = await seedCrawlRun(venue.id, {
      status: 'failed',
      reason: 'blocked_http',
      httpStatusCode: 403,
      robotsTxtBlocked: 'no',
      createdAt: new Date(Date.now() - 3 * 24 * HOUR_MS),
    });
    await testDb.insert(crawlRunPages).values([
      { crawlRunId: run.id, url: 'https://example.com/a', fetchMode: 'http' },
      { crawlRunId: run.id, url: 'https://example.com/b', fetchMode: 'http' },
    ]);

    const [item] = await listNeedsYou({ kind: 'venue-blocked', now: now() });
    expect(item).toMatchObject({
      kind: 'venue-blocked',
      pagesThisRun: 2,
      robots: 'no',
      // "Before this: 2 OK runs in a row", the same count the failing kind has.
      okStreakBefore: 2,
      venueLive: true,
      pausedAt: null,
      showCount: 0,
    });
  });

  it('counts the other shows the latest successful crawl still saw on a dropped show', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });
    const runAt = new Date(Date.now() - HOUR_MS);
    await seedCrawlRun(venue.id, {
      status: 'success',
      durationMs: 60_000,
      createdAt: runAt,
    });
    const seen = new Date(runAt.getTime() - 30_000);
    const stale = new Date(runAt.getTime() - 24 * HOUR_MS);
    await seedEvent(venue.id, {
      artist: 'Seen One',
      date: inDays(5),
      lastSeenAt: seen,
    });
    await seedEvent(venue.id, {
      artist: 'Seen Two',
      date: inDays(6),
      lastSeenAt: seen,
    });
    await seedEvent(venue.id, {
      artist: 'Not Seen',
      date: inDays(7),
      lastSeenAt: stale,
    });
    const dropped = await seedEvent(venue.id, {
      artist: 'Dropped Act',
      date: inDays(4),
      lastSeenAt: stale,
      firstMissingAt: new Date(),
    });

    const items = await listNeedsYou({ kind: 'show-dropped', now: now() });
    expect(
      items.find((item) => 'eventId' in item && item.eventId === dropped.id),
    ).toMatchObject({ kind: 'show-dropped', otherShowsCrawledFine: 2 });
  });

  it('gives no crawled-fine count when the latest successful run has no duration', async () => {
    const venue = await seedVenue({ name: 'No Duration', slug: 'no-duration' });
    await seedCrawlRun(venue.id, { status: 'success', durationMs: null });
    await seedEvent(venue.id, { artist: 'Seen Act', date: inDays(5) });
    const dropped = await seedEvent(venue.id, {
      artist: 'Dropped Act',
      date: inDays(4),
      firstMissingAt: new Date(),
    });

    const items = await listNeedsYou({ kind: 'show-dropped', now: now() });
    expect(
      items.find((item) => 'eventId' in item && item.eventId === dropped.id),
    ).toMatchObject({ kind: 'show-dropped', otherShowsCrawledFine: null });
  });

  it('leaves out a fault on a removed venue', async () => {
    const live = await seedVenue({
      name: 'Blocked Hall',
      slug: 'blocked-hall',
      blockedAt: new Date(Date.now() - 3 * 24 * HOUR_MS),
    });
    await seedVenue({
      name: 'Gone Hall',
      slug: 'gone-hall',
      active: false,
      blockedAt: new Date(Date.now() - 3 * 24 * HOUR_MS),
      crawlPausedAt: new Date(),
      removedAt: new Date(),
    });

    expect(await keysOf({ kind: 'venue-blocked', now: now() })).toEqual([
      `venue-blocked:${live.id}`,
    ]);
  });

  it('hides a snoozed item until the snooze passes', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Snoozed Act', inDays(5));
    const key = lowKey(event.id);
    const at = now();
    await testDb.insert(adminQueueSnoozes).values({
      itemKey: key,
      kind: 'event-low-confidence',
      venueId: venue.id,
      until: new Date(at.getTime() + HOUR_MS),
      createdBy: 'admin-1',
    });

    expect(await keysOf({ now: at })).not.toContain(key);
    // The same row no longer applies once `until` has passed.
    const later = new Date(at.getTime() + 2 * HOUR_MS);
    expect(await keysOf({ now: later })).toContain(key);
  });

  it('Not useful hides that kind for that venue only', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' });
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' });
    const a1 = await seedLowConfidence(venueA.id, 'A One', inDays(5));
    const a2 = await seedLowConfidence(venueA.id, 'A Two', inDays(6));
    const b1 = await seedLowConfidence(venueB.id, 'B One', inDays(7));
    await testDb.insert(adminQueueSnoozes).values({
      kind: 'event-low-confidence',
      venueId: venueA.id,
      itemKey: null,
      until: null,
      notUseful: true,
      reason: 'noise',
      createdBy: 'admin-1',
    });

    const visible = await keysOf();
    expect(visible).not.toContain(lowKey(a1.id));
    expect(visible).not.toContain(lowKey(a2.id));
    expect(visible).toContain(lowKey(b1.id));
  });

  describe('price batch', () => {
    it('is one item for the whole set, and the count counts it once', async () => {
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const e1 = await seedEvent(venue.id, {
        artist: 'P One',
        date: inDays(10),
      });
      const e2 = await seedEvent(venue.id, {
        artist: 'P Two',
        date: inDays(12),
      });
      await seedPriceSubmission(e1.id, 'user-1', { corroborationCount: 2 });
      await seedPriceSubmission(e2.id, 'user-2', { corroborationCount: 3 });

      const items = await listNeedsYou({ now: now() });
      const batches = items.filter((row) => row.kind === 'price-batch');
      expect(batches).toHaveLength(1);
      const [batch] = batches;
      expect(batch?.kind === 'price-batch' && batch.submissionIds).toHaveLength(
        2,
      );
      expect(batch?.fanDate).toBe(inDays(10));
      // The card's own words: plural at two, and no "submissions".
      expect(batch?.title).toBe('2 new prices');

      const count = await countNeedsYou(now());
      expect(count.byKind['price-batch']).toBe(1);
      expect(count.decisions).toBe(items.length);
    });

    it('is absent with fewer than 2 corroborations', async () => {
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const event = await seedEvent(venue.id, {
        artist: 'P One',
        date: inDays(10),
      });
      await seedPriceSubmission(event.id, 'user-1', { corroborationCount: 1 });

      const items = await listNeedsYou({ now: now() });
      expect(items.filter((row) => row.kind === 'price-batch')).toEqual([]);
    });

    it('always holds a price held for the admin, whatever its corroborations and date', async () => {
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const far = await seedEvent(venue.id, {
        artist: 'Far',
        date: inDays(45),
      });
      const held = await seedPriceSubmission(far.id, 'user-1', {
        corroborationCount: 1,
        heldForAdminAt: new Date(),
      });

      const items = await listNeedsYou({ now: now() });
      const [batch] = items.filter((row) => row.kind === 'price-batch');
      expect(batch?.kind === 'price-batch' && batch.submissionIds).toEqual([
        held.id,
      ]);
    });

    it('is absent when the show is outside 2-30 days', async () => {
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const tooSoon = await seedEvent(venue.id, {
        artist: 'Soon',
        date: inDays(1),
      });
      const tooFar = await seedEvent(venue.id, {
        artist: 'Far',
        date: inDays(45),
      });
      await seedPriceSubmission(tooSoon.id, 'user-1', {
        corroborationCount: 2,
      });
      await seedPriceSubmission(tooFar.id, 'user-2', { corroborationCount: 2 });

      const items = await listNeedsYou({ now: now() });
      expect(items.filter((row) => row.kind === 'price-batch')).toEqual([]);
    });
  });

  it('counts exactly the visible items', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await seedLowConfidence(venue.id, 'One', inDays(5));
    const hidden = await seedLowConfidence(venue.id, 'Two', inDays(6));
    await testDb.insert(adminQueueSnoozes).values({
      itemKey: lowKey(hidden.id),
      kind: 'event-low-confidence',
      venueId: venue.id,
      until: new Date(Date.now() + HOUR_MS),
      createdBy: 'admin-1',
    });

    const at = now();
    const count = await countNeedsYou(at);
    expect(count.decisions).toBe((await listNeedsYou({ now: at })).length);
    expect(count.byKind['event-low-confidence']).toBe(1);
  });

  it('offers "Keep this match" only where the API would accept it', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const bare = await seedArtist({
      name: 'Bare Act',
      matchStatus: 'ambiguous',
    });
    const confirmable = await seedArtist({
      name: 'Auto Act',
      matchStatus: 'ambiguous',
      autoMatchedAt: new Date(),
      spotifyArtistId: 'spotify-auto-act',
    });
    for (const artist of [bare, confirmable]) {
      await seedEvent(venue.id, { artist: artist.name, date: inDays(10) });
    }

    const items = await listNeedsYou({ kind: 'artist', now: now() });
    const slugsOf = (artistId: string) =>
      items
        .find((item) => item.kind === 'artist' && item.artistId === artistId)
        ?.answers.map((offered) => offered.slug);
    expect(slugsOf(bare.id)).toEqual(['pick_the_right_artist', 'no_photo']);
    expect(slugsOf(confirmable.id)).toEqual([
      'pick_the_right_artist',
      'keep_this_match',
      'no_photo',
    ]);
  });

  it('counts an answer as handled today only until it is undone', async () => {
    await testDb
      .insert(auditLog)
      .values({ actorId: 'admin-1', action: NEEDS_YOU_ANSWER_ACTION });
    const undone = await testDb
      .insert(auditLog)
      .values({ actorId: 'admin-1', action: NEEDS_YOU_ANSWER_ACTION })
      .returning({ id: auditLog.id });
    expect((await countNeedsYou(now())).handledToday).toBe(2);

    await testDb.insert(auditLog).values({
      actorId: 'admin-1',
      action: NEEDS_YOU_UNDO_ACTION,
      metadata: { answerAuditId: undone[0]?.id },
    });
    expect((await countNeedsYou(now())).handledToday).toBe(1);
  });

  it('gives an artist item its candidates, venue, photo and report reasons', async () => {
    const venue = await seedVenue({ name: 'Lost Lake', slug: 'lost-lake' });
    const artist = await seedArtist({
      name: 'Cashmere',
      matchStatus: 'ambiguous',
      spotifyArtistId: 'sp-current',
      photoUrl: 'https://img.example.com/current.jpg',
      spotifyCandidates: [
        {
          id: 'sp-cat',
          name: 'Cashmere Cat',
          imageUrl: null,
          genres: ['electronic'],
          spotifyUrl: null,
        },
        {
          id: 'sp-current',
          name: 'Cashmere',
          imageUrl: 'https://img.example.com/current.jpg',
          genres: null,
          spotifyUrl: null,
        },
      ],
    });
    await seedEvent(venue.id, { artist: artist.name, date: inDays(4) });
    await testDb.insert(artistReports).values({
      artistId: artist.id,
      reporterId: 'fan-1',
      reason: 'wrong_photo',
    });

    const [item] = await listNeedsYou({ kind: 'artist', now: now() });
    expect(item).toMatchObject({
      kind: 'artist',
      nextShowVenue: 'Lost Lake',
      spotifyArtistId: 'sp-current',
      photoUrl: 'https://img.example.com/current.jpg',
      reportReasons: ['wrong_photo'],
    });
    // The artist's own name first, then the stored order; the current match
    // is marked, and a candidate we hold shows for plays Denver.
    const candidates = item?.kind === 'artist' ? item.candidates : undefined;
    expect(
      candidates?.map((cand) => [cand.id, cand.exact, cand.current]),
    ).toEqual([
      ['sp-current', true, true],
      ['sp-cat', false, false],
    ]);
    expect(candidates?.[0]?.playsDenver).toBe(true);
    expect(candidates?.[1]?.playsDenver).toBe(false);
  });

  it('gives a low-confidence item its headliner, description and the real bar', async () => {
    const venue = await seedVenue({ name: 'Cervantes', slug: 'cervantes' });
    const event = await seedEvent(venue.id, {
      artist: 'Michael Smoak',
      date: inDays(11),
      verified: false,
      description: 'An evening of conversation.',
      confidenceScore: '0.60',
    });
    const items = await listNeedsYou({
      kind: 'event-low-confidence',
      now: now(),
    });
    expect(items.find((item) => item.key === lowKey(event.id))).toMatchObject({
      artist: 'Michael Smoak',
      description: 'An evening of conversation.',
      confidence: 0.6,
      autoApproveBar: AUTO_APPROVE_THRESHOLD,
    });
  });

  it('gives a price check both ends, the dates, the fans and the checker counts', async () => {
    const venue = await seedVenue({ name: 'Red Rocks', slug: 'red-rocks' });
    const event = await seedEvent(venue.id, {
      artist: 'Clipse',
      date: inDays(1),
      ticketUrl: 'https://tickets.example.com/clipse',
    });
    const listed = await seedPriceSubmission(event.id, 'user-listed', {
      priceMin: '29.00',
      priceMax: '64.00',
      status: 'corroborated',
    });
    await seedPriceSubmission(event.id, 'user-checker', {
      priceMin: '45.00',
      priceMax: null,
      tier: 'GA',
      corroborationCount: 1,
      disputedSubmissionId: listed.id,
    });
    // One price per fan per event: the checker's track record is on another show.
    const other = await seedEvent(venue.id, {
      artist: 'Other Act',
      date: inDays(20),
    });
    await seedPriceSubmission(other.id, 'user-checker', {
      priceMin: '40.00',
      status: 'corroborated',
    });

    const items = await listNeedsYou({ kind: 'price-check', now: now() });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      listedMax: '64.00',
      checkedMax: null,
      tier: 'GA',
      checkedFans: 1,
      ticketUrl: 'https://tickets.example.com/clipse',
      // The checker's other prices only: the check itself is not counted.
      checkerSubmissions: 1,
      checkerApproved: 1,
    });
    expect(items[0]).toHaveProperty('listedAt');
    expect(items[0]).toHaveProperty('checkedAt');
  });

  it('gives a bug the full message, the reporter, the issue and the screenshot', async () => {
    await seedUserProfile('reporter-1', { handle: 'pierresauce' });
    const message = `${'A long bug report. '.repeat(8)}Free shows have no price.`;
    await testDb.insert(feedback).values({
      userId: 'reporter-1',
      pageUrl: 'https://concertcrawl.app/events/x',
      category: 'bug',
      message,
      metadata: { screenshot: 'data:image/png;base64,AAAA' },
      issueUrl: 'https://github.com/example/repo/issues/1',
    });
    const [item] = await listNeedsYou({ kind: 'bug', now: now() });
    expect(item).toMatchObject({
      kind: 'bug',
      message,
      handle: 'pierresauce',
      screenshot: 'data:image/png;base64,AAAA',
      issueUrl: 'https://github.com/example/repo/issues/1',
    });
    expect(item?.title.length).toBeLessThanOrEqual(80);
  });

  it('keeps only a png, jpeg or webp data image as a bug screenshot', async () => {
    await testDb.insert(feedback).values([
      {
        pageUrl: 'https://concertcrawl.app/svg',
        category: 'bug',
        message: 'Script image',
        metadata: { screenshot: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
      },
      {
        pageUrl: 'https://concertcrawl.app/html',
        category: 'bug',
        message: 'Text',
        metadata: { screenshot: 'data:text/html;base64,PGI+aGk8L2I+' },
      },
      {
        pageUrl: 'https://concertcrawl.app/webp',
        category: 'bug',
        message: 'Good image',
        metadata: { screenshot: 'data:image/webp;base64,UklGRg==' },
      },
    ]);
    const items = await listNeedsYou({ kind: 'bug', now: now() });
    expect(
      items.map((item) => [
        item.title,
        item.kind === 'bug' ? item.screenshot : 'x',
      ]),
    ).toEqual(
      expect.arrayContaining([
        ['Script image', null],
        ['Text', null],
        ['Good image', 'data:image/webp;base64,UklGRg=='],
      ]),
    );
  });

  it('keeps only an inline image, under the cap, as a bug screenshot', async () => {
    await testDb.insert(feedback).values([
      {
        pageUrl: 'https://concertcrawl.app/a',
        category: 'bug',
        message: 'Tracking link',
        metadata: { screenshot: 'https://tracker.example.com/pixel.png' },
      },
      {
        pageUrl: 'https://concertcrawl.app/b',
        category: 'bug',
        message: 'Huge image',
        metadata: {
          screenshot: `data:image/png;base64,${'A'.repeat(250_000)}`,
        },
      },
    ]);
    const items = await listNeedsYou({ kind: 'bug', now: now() });
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).toMatchObject({ screenshot: null });
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { adminQueueSnoozes, feedback } from '@concert-crawl/db';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedPriceSubmission,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../../../../test/helpers/seed.js';
import { testDb } from '../../../../test/helpers/db.js';
import { countNeedsYou, listNeedsYou } from './index.js';
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
});

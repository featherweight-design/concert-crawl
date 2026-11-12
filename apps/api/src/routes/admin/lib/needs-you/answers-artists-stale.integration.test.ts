// The Needs you artist answers carry the match status their item showed, so a
// row that changed between the queue load and the click is refused (409) and
// nothing is written over it. The route loads the item and the handler writes
// a moment later; these tests change the row in between by calling the
// handler with an item that is already stale.

import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { artists } from '@concert-crawl/db';
import type { NeedsYouItem } from '@concert-crawl/types';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../../../../test/helpers/seed.js';
import { testDb } from '../../../../test/helpers/db.js';
import { loadNeedsYouItems } from './index.js';
import { keepThisMatch, noPhoto, pickRightArtist } from './answers-artists.js';
import { addDays, denverDate } from './keys.js';

const inDays = (days: number): string => addDays(denverDate(new Date()), days);

const staleItem = async (): Promise<{ item: NeedsYouItem; id: string }> => {
  const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
  const artist = await seedArtist({
    name: 'Shown Ambiguous',
    matchStatus: 'ambiguous',
    spotifyArtistId: 'sp-shown',
    autoMatchedAt: new Date(Date.now() - 60_000),
  });
  await seedEvent(venue.id, { artist: artist.name, date: inDays(10) });
  const [item] = await loadNeedsYouItems({ now: new Date() }, 'artist');
  if (item === undefined) throw new Error('the artist item was not queued');
  expect(item.kind === 'artist' && item.matchStatus).toBe('ambiguous');
  return { item, id: artist.id };
};

// Another admin (or the match job) moves the row on after the item was shown.
const moveOn = (id: string) =>
  testDb
    .update(artists)
    .set({ matchStatus: 'no_match', spotifyArtistId: null })
    .where(eq(artists.id, id));

const rowOf = async (id: string) => {
  const [row] = await testDb.select().from(artists).where(eq(artists.id, id));
  return row;
};

describe('Needs you artist answers against a row that changed since the item was shown', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('pick_the_right_artist: 409, nothing written over the newer status', async () => {
    const { item, id } = await staleItem();
    await moveOn(id);
    const result = await pickRightArtist.run(
      item,
      { spotifyArtistId: 'sp-picked' },
      'admin_1',
    );
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(await rowOf(id)).toMatchObject({
      matchStatus: 'no_match',
      spotifyArtistId: null,
    });
  });

  it('no_photo: 409, the row is left as it is', async () => {
    const { item, id } = await staleItem();
    await testDb
      .update(artists)
      .set({ matchStatus: 'matched', spotifyArtistId: 'sp-newer' })
      .where(eq(artists.id, id));
    const result = await noPhoto.run(item, {}, 'admin_1');
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(await rowOf(id)).toMatchObject({
      matchStatus: 'matched',
      spotifyArtistId: 'sp-newer',
    });
  });

  it('keep_this_match: 409 before confirming or dismissing anything', async () => {
    const { item, id } = await staleItem();
    await moveOn(id);
    const result = await keepThisMatch.run(item, {}, 'admin_1');
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(await rowOf(id)).toMatchObject({ matchStatus: 'no_match' });
  });

  it('still answers when the row is as the item showed it', async () => {
    const { item, id } = await staleItem();
    const result = await noPhoto.run(item, {}, 'admin_1');
    expect(result).toMatchObject({ ok: true });
    expect(await rowOf(id)).toMatchObject({ matchStatus: 'no_match' });
  });
});

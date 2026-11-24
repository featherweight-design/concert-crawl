import { beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { artists, mbArtists } from '@concert-crawl/db';
import { backfillArtistMbids } from '@concert-crawl/db/scripts/backfill-artist-mbids';
import { testDb } from './helpers/db.js';
import { clearTables } from './helpers/seed.js';

// The MBID backfill (artist-search plan, PR 3) gives our artists their
// MusicBrainz identity. The risk is a wrong identity, which a later Follow by
// MBID would make public, so most of these tests are about what stays null:
// several MB acts for one Spotify id or one name, a Spotify-matched row whose
// Spotify id MB does not carry (plan decision 7), an MBID another row already
// holds, and rows a human ruled are not an act.

const MBID = {
  radiohead: '00000000-0000-4000-8000-000000000001',
  sigurRos: '00000000-0000-4000-8000-000000000002',
  ghostA: '00000000-0000-4000-8000-000000000003',
  ghostB: '00000000-0000-4000-8000-000000000004',
  twinA: '00000000-0000-4000-8000-000000000005',
  twinB: '00000000-0000-4000-8000-000000000006',
  bjork: '00000000-0000-4000-8000-000000000007',
  heldAct: '00000000-0000-4000-8000-000000000008',
  sharedAct: '00000000-0000-4000-8000-000000000009',
  notAnAct: '00000000-0000-4000-8000-00000000000a',
} as const;

const mbAct = (
  mbid: string,
  name: string,
  extra: {
    aliases?: string[];
    spotifyId?: string;
    area?: string | null;
  } = {},
) => ({
  mbid,
  name,
  sortName: name,
  aliases: extra.aliases ?? [],
  type: 'Group',
  area: extra.area === undefined ? 'United States' : extra.area,
  disambiguation: null,
  spotifyId: extra.spotifyId ?? null,
  wikidataId: null,
});

const artist = (
  name: string,
  extra: {
    spotifyArtistId?: string;
    mbid?: string;
    matchStatus?: 'matched' | 'unmatched' | 'ambiguous' | 'not_an_artist';
  } = {},
): typeof artists.$inferInsert => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    name,
    canonicalName: `${slug} canonical`,
    slug,
    spotifyArtistId: extra.spotifyArtistId ?? null,
    matchStatus:
      extra.matchStatus ?? (extra.spotifyArtistId ? 'matched' : 'unmatched'),
    mbid: extra.mbid ?? null,
  };
};

const mbidsByName = async (): Promise<Record<string, string | null>> => {
  const rows = await testDb
    .select({ name: artists.name, mbid: artists.mbid })
    .from(artists)
    .orderBy(asc(artists.name));
  return Object.fromEntries(rows.map((row) => [row.name, row.mbid]));
};

describe('backfill-artist-mbids integration', () => {
  beforeEach(async () => {
    await clearTables();
    // `clearTables` leaves the slim copy alone (the loader's tests own it).
    await testDb.delete(mbArtists);
  });

  it('fills by Spotify id, then by a sole name or alias hit, and leaves the rest null', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.radiohead, 'Radiohead', { spotifyId: 'sp-radiohead' }),
        mbAct(MBID.sigurRos, 'Sigur Rós', { aliases: ['Sigur Ros Band'] }),
        mbAct(MBID.ghostA, 'Ghost', { area: 'Sweden' }),
        mbAct(MBID.ghostB, 'Ghost', { area: 'Japan' }),
        mbAct(MBID.twinA, 'Twin One', { spotifyId: 'sp-twin' }),
        mbAct(MBID.twinB, 'Twin Two', { spotifyId: 'sp-twin' }),
        mbAct(MBID.bjork, 'Björk'),
      ]);
    await testDb.insert(artists).values([
      artist('Radiohead', { spotifyArtistId: 'sp-radiohead' }),
      artist('Sigur Ros'), // accent fold onto the MB name
      artist('SIGUR ROS BAND'), // case fold onto an alias of the same act
      artist('Ghost'), // two MB acts: ambiguous
      artist('Twin One', { spotifyArtistId: 'sp-twin' }), // two MB acts share the Spotify id
      // Spotify-matched, MB has the name but not our Spotify id: decision 7.
      artist('Björk', { spotifyArtistId: 'sp-some-other-bjork' }),
      artist('Nobody Anywhere'),
    ]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes).toEqual({
      'spotify:filled': 1,
      'spotify:several-acts': 1,
      'spotify:no-hit': 1,
      'spotify:act-taken': 0,
      'name:filled': 0,
      'name:several-acts': 1,
      'name:no-hit': 1,
      'name:out-of-area': 0,
      // "Sigur Ros" and "SIGUR ROS BAND" both land on one act, so neither may
      // take it.
      'name:act-taken': 2,
    });
    expect(result.updated).toBe(1);
    expect(await mbidsByName()).toEqual({
      Björk: null,
      Ghost: null,
      'Nobody Anywhere': null,
      Radiohead: MBID.radiohead,
      'SIGUR ROS BAND': null,
      'Sigur Ros': null,
      'Twin One': null,
    });
  });

  it('fills a sole name hit through the accent and case fold, and lists it', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.sigurRos, 'Sigur Rós', { aliases: ['Sigur Ros Band'] }),
      ]);
    await testDb.insert(artists).values([artist('sigur ros')]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes['name:filled']).toBe(1);
    expect(result.nameFills).toEqual([
      {
        name: 'sigur ros',
        mbid: MBID.sigurRos,
        mbName: 'Sigur Rós',
        area: 'United States',
        disambiguation: null,
      },
    ]);
    expect(await mbidsByName()).toEqual({ 'sigur ros': MBID.sigurRos });
  });

  it('accepts a name-only hit only for a US, Colorado or blank area (rule A)', async () => {
    const abroad = '00000000-0000-4000-8000-0000000000b1';
    const colorado = '00000000-0000-4000-8000-0000000000b2';
    const blank = '00000000-0000-4000-8000-0000000000b3';
    const usTwin = '00000000-0000-4000-8000-0000000000b4';
    const abroadTwin = '00000000-0000-4000-8000-0000000000b5';
    await testDb.insert(mbArtists).values([
      mbAct(abroad, 'Far Away Band', { area: 'Iceland' }),
      mbAct(colorado, 'Front Range Duo', { area: 'Colorado' }),
      mbAct(blank, 'No Area Act', { area: null }),
      // Two acts share the name: still ambiguous even though one is local.
      mbAct(usTwin, 'Same Name', { area: 'United States' }),
      mbAct(abroadTwin, 'Same Name', { area: 'Germany' }),
    ]);
    await testDb
      .insert(artists)
      .values([
        artist('Far Away Band'),
        artist('Front Range Duo'),
        artist('No Area Act'),
        artist('Same Name'),
      ]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes['name:out-of-area']).toBe(1);
    expect(result.outcomes['name:filled']).toBe(2);
    expect(result.outcomes['name:several-acts']).toBe(1);
    expect(await mbidsByName()).toEqual({
      'Far Away Band': null,
      'Front Range Duo': colorado,
      'No Area Act': blank,
      'Same Name': null,
    });
  });

  it('a dry run counts an out-of-area act and lists no fill for it', async () => {
    const act = '00000000-0000-4000-8000-0000000000c1';
    await testDb
      .insert(mbArtists)
      .values([mbAct(act, 'Lone Act', { area: 'Japan' })]);
    await testDb.insert(artists).values([artist('Lone Act')]);

    const dry = await backfillArtistMbids(testDb, { dryRun: true });

    expect(dry.outcomes['name:out-of-area']).toBe(1);
    expect(dry.nameFills).toEqual([]);
    expect(await mbidsByName()).toEqual({ 'Lone Act': null });
  });

  it('never takes an MBID another row holds, and a Spotify claim beats a name claim', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.heldAct, 'Held Act', { spotifyId: 'sp-held' }),
        mbAct(MBID.sharedAct, 'Shared Act', { spotifyId: 'sp-shared' }),
      ]);
    await testDb.insert(artists).values([
      artist('Already Held', { mbid: MBID.heldAct }),
      artist('Held Act Again', { spotifyArtistId: 'sp-held' }),
      artist('Shared By Spotify', { spotifyArtistId: 'sp-shared' }),
      artist('Shared Act'), // name hit on the act the Spotify row takes
    ]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes['spotify:act-taken']).toBe(1);
    expect(result.outcomes['spotify:filled']).toBe(1);
    expect(result.outcomes['name:act-taken']).toBe(1);
    expect(await mbidsByName()).toEqual({
      'Already Held': MBID.heldAct,
      'Held Act Again': null,
      'Shared Act': null,
      'Shared By Spotify': MBID.sharedAct,
    });
  });

  it('counts an alias that is another act name as several acts, and never matches a blank fold', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.ghostA, 'Ghost'),
        mbAct(MBID.ghostB, 'Ghost Band', { aliases: ['Ghost'] }),
        mbAct(MBID.twinA, 'Blank', { aliases: ['   '] }),
      ]);
    await testDb.insert(artists).values([artist('Ghost'), artist(' ')]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes['name:several-acts']).toBe(1);
    expect(result.outcomes['name:no-hit']).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('a name row never takes an MBID a Spotify row matched, even one the Spotify rows lost', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.sharedAct, 'Shared Act', { spotifyId: 'sp-shared' }),
      ]);
    await testDb
      .insert(artists)
      .values([
        artist('Shared One', { spotifyArtistId: 'sp-shared' }),
        artist('Shared Two', { spotifyArtistId: 'sp-shared' }),
        artist('Shared Act'),
      ]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(result.outcomes['spotify:act-taken']).toBe(2);
    expect(result.outcomes['name:act-taken']).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('skips rows a human ruled are not an act and rows whose Spotify id is not trusted', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.notAnAct, 'Trivia Night'),
        mbAct(MBID.heldAct, 'Karaoke', { spotifyId: 'sp-karaoke' }),
        mbAct(MBID.radiohead, 'Radiohead', { spotifyId: 'sp-radiohead' }),
      ]);
    await testDb.insert(artists).values([
      artist('Trivia Night', { matchStatus: 'not_an_artist' }),
      artist('Karaoke', {
        spotifyArtistId: 'sp-karaoke',
        matchStatus: 'not_an_artist',
      }),
      // A tentative Spotify id on an ambiguous row is not a match.
      artist('Radiohead', {
        spotifyArtistId: 'sp-radiohead',
        matchStatus: 'ambiguous',
      }),
    ]);

    const result = await backfillArtistMbids(testDb, { dryRun: false });

    expect(Object.values(result.outcomes).every((count) => count === 0)).toBe(
      true,
    );
    expect(await mbidsByName()).toEqual({
      Karaoke: null,
      Radiohead: null,
      'Trivia Night': null,
    });
  });

  it('a dry run reports what an apply writes and writes nothing; a re-run reconsiders only null rows', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        mbAct(MBID.radiohead, 'Radiohead', { spotifyId: 'sp-radiohead' }),
        mbAct(MBID.bjork, 'Björk'),
      ]);
    await testDb
      .insert(artists)
      .values([
        artist('Radiohead', { spotifyArtistId: 'sp-radiohead' }),
        artist('Bjork'),
      ]);

    const dry = await backfillArtistMbids(testDb, { dryRun: true });
    expect(dry.updated).toBe(0);
    expect(await mbidsByName()).toEqual({ Bjork: null, Radiohead: null });

    const applied = await backfillArtistMbids(testDb, { dryRun: false });
    expect(applied.outcomes).toEqual(dry.outcomes);
    expect(applied.nameFills).toEqual(dry.nameFills);
    expect(applied.updated).toBe(2);
    expect(await mbidsByName()).toEqual({
      Bjork: MBID.bjork,
      Radiohead: MBID.radiohead,
    });

    const again = await backfillArtistMbids(testDb, { dryRun: false });
    expect(again.updated).toBe(0);
    expect(Object.values(again.outcomes).every((count) => count === 0)).toBe(
      true,
    );
  });
});

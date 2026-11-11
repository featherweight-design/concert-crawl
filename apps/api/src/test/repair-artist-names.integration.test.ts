import { beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { artists } from '@concert-crawl/db';
import { repairArtistNames } from '@concert-crawl/db/scripts/repair-artist-names';
import { testDb } from './helpers/db.js';
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js';

// The projection is insert-only, so a row keeps whatever display name it was
// born with. Rows created before the derivation ladder split a title into
// headliners carry the whole title as their name — `Dogstar: ALL IN NOW TOUR`
// — while their canonical name is already correct.
//
// The safety property under test is directional: the repair may shorten or
// re-case a name, never lengthen it. Adopting a longer billing is how the bad
// rows were made, so a rule that could do it would be the bug rather than the
// fix.
describe('repair-artist-names integration', () => {
  beforeEach(async () => {
    await clearTables();
  });

  const listArtists = async () =>
    testDb.select().from(artists).orderBy(asc(artists.canonicalName));

  /** A single-act bill: one raw headliner, one canonical headliner. */
  const seedSingleActBill = async (billed: string, canonical: string) => {
    const venue = await seedVenue({
      slug: `repair-${Date.now()}-${canonical}`,
    });
    return seedEvent(venue.id, {
      artist: billed,
      canonicalArtist: canonical,
      headliners: [billed],
      canonicalHeadliners: [canonical],
    });
  };

  const seedArtist = async (name: string, canonicalName: string) =>
    testDb.insert(artists).values({
      name,
      canonicalName,
      slug: canonicalName.replace(/[^a-z0-9]+/g, '-'),
    });

  /**
   * An artist matched to Spotify, whose snapshot carries Spotify's own
   * spelling under the matched id, as the match job writes it.
   */
  const seedMatchedArtist = async (
    name: string,
    canonicalName: string,
    spotifyName: string,
    matchStatus: 'matched' | 'ambiguous' = 'matched',
  ) =>
    testDb.insert(artists).values({
      name,
      canonicalName,
      slug: canonicalName.replace(/[^a-z0-9]+/g, '-'),
      matchStatus,
      spotifyArtistId: matchStatus === 'matched' ? `sp-${canonicalName}` : null,
      spotifyCandidates: [
        {
          id: `sp-${canonicalName}`,
          name: spotifyName,
          imageUrl: null,
          genres: null,
          spotifyUrl: null,
        },
      ],
    });

  it('strips a tour suffix the billing does not carry', async () => {
    await seedSingleActBill('Dogstar', 'dogstar');
    await seedArtist('Dogstar: ALL IN NOW TOUR', 'dogstar');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.repaired).toBe(1);
    expect(result.byKind).toEqual({ shorten: 1 });
    const [row] = await listArtists();
    expect(row?.name).toBe('Dogstar');
  });

  it('fixes casing the venue billing disagrees with', async () => {
    await seedSingleActBill('Chief Keef', 'chief keef');
    await seedArtist('CHIEF KEEF', 'chief keef');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.repaired).toBe(1);
    expect(result.byKind).toEqual({ recase: 1 });
    const [row] = await listArtists();
    expect(row?.name).toBe('Chief Keef');
  });

  // The whole point of the rule. A billing longer than the stored name is the
  // failure mode being repaired, not evidence about the act's name.
  it('never lengthens a name, even when the billing is longer', async () => {
    await seedSingleActBill('Dogstar: ALL IN NOW TOUR', 'dogstar');
    await seedArtist('Dogstar', 'dogstar');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.candidates).toBe(0);
    const [row] = await listArtists();
    expect(row?.name).toBe('Dogstar');
  });

  // A different spelling is not a suffix strip and not a casing fix, so there
  // is no evidence about which one is right. It goes to a human.
  it('leaves an unrelated billing alone', async () => {
    await seedSingleActBill('Ministry', 'acid bath');
    await seedArtist('Acid Bath', 'acid bath');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.candidates).toBe(0);
    const [row] = await listArtists();
    expect(row?.name).toBe('Acid Bath');
  });

  // A multi-act bill is paired by value, not position: canonical_headliners is
  // deduped and sorted, so headliners[1] is not guaranteed to be the same act,
  // but a raw headliner that folds to the canonical name is.
  it('repairs each act on a co-headline bill from its own billing', async () => {
    // Regression: "Clipse & J.I.D". The primary act was born with the whole
    // billing as its name and the second act with its lowercase canonical.
    const venue = await seedVenue({ slug: `repair-multi-${Date.now()}` });
    await seedEvent(venue.id, {
      artist: 'Clipse & J.I.D',
      canonicalArtist: 'clipse',
      headliners: ['Clipse', 'J.I.D'],
      canonicalHeadliners: ['clipse', 'j.i.d'],
    });
    await seedArtist('Clipse & J.I.D', 'clipse');
    await seedArtist('j.i.d', 'j.i.d');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.byKind).toEqual({ shorten: 1, recase: 1 });
    expect((await listArtists()).map((row) => row.name)).toEqual([
      'Clipse',
      'J.I.D',
    ]);
  });

  it('still shortens a tour title to a single-case billing', async () => {
    await seedSingleActBill('DOGSTAR', 'dogstar');
    await seedArtist('Dogstar: ALL IN NOW TOUR', 'dogstar');

    await repairArtistNames(testDb, { dryRun: false });

    expect((await listArtists())[0]?.name).toBe('DOGSTAR');
  });

  it('pairs a co-headliner whose billing carries accents', async () => {
    const venue = await seedVenue({ slug: `repair-accent-${Date.now()}` });
    await seedEvent(venue.id, {
      artist: 'Beyoncé & JAY-Z',
      canonicalArtist: 'beyonce',
      headliners: ['Beyoncé', 'JAY-Z'],
      canonicalHeadliners: ['beyonce', 'jay-z'],
    });
    await seedArtist('beyonce', 'beyonce');

    await repairArtistNames(testDb, { dryRun: false });

    expect((await listArtists())[0]?.name).toBe('Beyoncé');
  });

  // Only a single-case name is re-cased. A mixed-case name was cased by
  // someone, and a venue's capitalisation is no better evidence (regression:
  // "Book of Love" became "Book Of Love"); an all-caps name never takes a
  // lowercase billing.
  it.each([
    ['Book of Love', 'book of love', 'Book Of Love'],
    ['Rezz', 'rezz', 'ReZZ'],
    ['Rezz', 'rezz', 'REZZ'],
    ['Maná', 'mana', 'MANÁ'],
    ['Ivri', 'ivri', 'ivri'],
    ['Chief Keef', 'chief keef', 'CHIEF Keef'],
    ['REZZ', 'rezz', 'rezz'],
  ])('never re-cases %s to %s', async (name, canonical, billed) => {
    await seedSingleActBill(billed, canonical);
    await seedArtist(name, canonical);

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.candidates).toBe(0);
    expect((await listArtists())[0]?.name).toBe(name);
  });

  it.each([
    ['CHIEF KEEF', 'chief keef', 'Chief Keef'],
    ['j.i.d', 'j.i.d', 'J.I.D'],
    ['ivri', 'ivri', 'Ivri'],
  ])('re-cases the single-case %s to %s', async (name, canonical, billed) => {
    await seedSingleActBill(billed, canonical);
    await seedArtist(name, canonical);

    await repairArtistNames(testDb, { dryRun: false });

    expect((await listArtists())[0]?.name).toBe(billed);
  });

  // A shorten, because a re-case can never swap back: lowercase may move to
  // all-caps or mixed case, all-caps only to mixed case, and mixed case never
  // moves, so a later run can only take it one step further. Only a shorten
  // can meet a rival billing it would trade places with on every run.
  it('settles: the current name votes, so a second run never shortens it again', async () => {
    for (let i = 0; i < 5; i += 1)
      await seedSingleActBill('Dogstar: ALL IN', 'dogstar');
    for (let i = 0; i < 2; i += 1)
      await seedSingleActBill('Dogstar', 'dogstar');
    await seedArtist('Dogstar: ALL IN NOW TOUR', 'dogstar');

    await repairArtistNames(testDb, { dryRun: false });
    expect((await listArtists())[0]?.name).toBe('Dogstar: ALL IN');
    const second = await repairArtistNames(testDb, { dryRun: false });

    expect(second.candidates).toBe(0);
    expect((await listArtists())[0]?.name).toBe('Dogstar: ALL IN');
  });

  it('fixes an all-caps name even when the venue mostly shouts it', async () => {
    for (let i = 0; i < 5; i += 1) await seedSingleActBill('REZZ', 'rezz');
    await seedSingleActBill('Rezz', 'rezz');
    await seedArtist('REZZ', 'rezz');

    await repairArtistNames(testDb, { dryRun: false });

    expect((await listArtists())[0]?.name).toBe('Rezz');
  });

  it('reads a one-act bill whose raw array repeats the act', async () => {
    const venue = await seedVenue({ slug: `repair-ewf-${Date.now()}` });
    await seedEvent(venue.id, {
      artist: 'Earth, Wind & Fire',
      canonicalArtist: 'earth, wind',
      headliners: ['Earth, Wind & Fire', 'Earth, Wind & Fire'],
      canonicalHeadliners: ['earth, wind'],
    });
    await seedArtist('Earth, Wind & Fire: Final Tour', 'earth, wind');

    await repairArtistNames(testDb, { dryRun: false });

    expect((await listArtists())[0]?.name).toBe('Earth, Wind & Fire');
  });

  it('skips an event an admin has hidden', async () => {
    const venue = await seedVenue({ slug: `repair-hidden-${Date.now()}` });
    await seedEvent(venue.id, {
      artist: 'Bingo Night',
      canonicalArtist: 'bingo night',
      headliners: ['Bingo Night'],
      canonicalHeadliners: ['bingo night'],
      hiddenFromConsumer: true,
    });
    await seedArtist('Bingo Night: Every Tuesday', 'bingo night');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.candidates).toBe(0);
  });

  it('reports candidates without writing on a dry run', async () => {
    await seedSingleActBill('Baby Keem', 'baby keem');
    await seedArtist('Baby Keem - The Ca$ino Tour', 'baby keem');

    const result = await repairArtistNames(testDb, { dryRun: true });

    expect(result.candidates).toBe(1);
    expect(result.repaired).toBe(0);
    expect(result.sample).toEqual([
      {
        slug: 'baby-keem',
        from: 'Baby Keem - The Ca$ino Tour',
        to: 'Baby Keem',
        kind: 'shorten',
        source: 'billing',
      },
    ]);
    const [row] = await listArtists();
    expect(row?.name).toBe('Baby Keem - The Ca$ino Tour');
  });

  // Billing strings are raw venue data. A name carrying a LIKE wildcard must
  // be compared literally, or it matches rows it has no business matching.
  it('treats a billing containing a LIKE wildcard literally', async () => {
    await seedSingleActBill('Just_Graham', 'just_graham');
    await seedArtist('JustXGraham and Friends', 'just_graham');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.candidates).toBe(0);
    const [row] = await listArtists();
    expect(row?.name).toBe('JustXGraham and Friends');
  });

  // Two events can bill the same act two ways. Whichever wins, it must be the
  // same one on every run.
  it('picks the most frequent billing deterministically', async () => {
    const venue = await seedVenue({ slug: `repair-dupe-${Date.now()}` });
    for (const showTime of ['19:00:00', '20:00:00']) {
      await seedEvent(venue.id, {
        artist: 'Rezz',
        canonicalArtist: 'rezz',
        headliners: ['Rezz'],
        canonicalHeadliners: ['rezz'],
        showTime,
      });
    }
    // Mixed case too, so count decides rather than the cased-first rank.
    await seedEvent(venue.id, {
      artist: 'ReZZ',
      canonicalArtist: 'rezz',
      headliners: ['ReZZ'],
      canonicalHeadliners: ['rezz'],
      showTime: '21:00:00',
    });
    await seedArtist('rezz', 'rezz');

    const result = await repairArtistNames(testDb, { dryRun: false });

    expect(result.repaired).toBe(1);
    const [row] = await listArtists();
    expect(row?.name).toBe('Rezz');
  });

  // canonical_name is uniquely indexed and slug is derived from it, so a
  // rename that touched either could collide or break a live artist URL.
  it('leaves canonical name and slug untouched', async () => {
    await seedSingleActBill('Baby Keem', 'baby keem');
    await seedArtist('Baby Keem - The Ca$ino Tour', 'baby keem');

    await repairArtistNames(testDb, { dryRun: false });

    const [row] = await listArtists();
    expect(row?.canonicalName).toBe('baby keem');
    expect(row?.slug).toBe('baby-keem');
  });

  describe('a row matched to Spotify takes its casing from Spotify', () => {
    it('keeps an all-caps Spotify styling the venue lowers', async () => {
      await seedSingleActBill('Mvtant', 'mvtant');
      await seedMatchedArtist('MVTANT', 'mvtant', 'MVTANT');

      const result = await repairArtistNames(testDb, { dryRun: false });

      expect(result.candidates).toBe(0);
      expect((await listArtists())[0]?.name).toBe('MVTANT');
    });

    it('keeps a lowercase Spotify styling the venue shouts', async () => {
      await seedSingleActBill('BBNO$', 'bbno$');
      await seedMatchedArtist('bbno$', 'bbno$', 'bbno$');

      const result = await repairArtistNames(testDb, { dryRun: false });

      expect(result.candidates).toBe(0);
      expect((await listArtists())[0]?.name).toBe('bbno$');
    });

    it('re-cases a mixed-case name to Spotify, which billing alone may not', async () => {
      await seedSingleActBill('Book Of Love', 'book of love');
      await seedMatchedArtist('Book Of Love', 'book of love', 'Book of Love');

      await repairArtistNames(testDb, { dryRun: false });

      expect((await listArtists())[0]?.name).toBe('Book of Love');
    });

    it('fixes both acts of the Clipse & J.I.D bill to their Spotify names', async () => {
      const venue = await seedVenue({ slug: `repair-spotify-${Date.now()}` });
      await seedEvent(venue.id, {
        artist: 'Clipse & J.I.D',
        canonicalArtist: 'clipse',
        headliners: ['CLIPSE', 'j.i.d'],
        canonicalHeadliners: ['clipse', 'j.i.d'],
      });
      await seedMatchedArtist('Clipse & J.I.D', 'clipse', 'Clipse');
      await seedMatchedArtist('j.i.d', 'j.i.d', 'J.I.D');

      const result = await repairArtistNames(testDb, { dryRun: false });

      expect(result.sample).toEqual([
        {
          slug: 'clipse',
          from: 'Clipse & J.I.D',
          to: 'Clipse',
          kind: 'shorten',
          source: 'spotify',
        },
        {
          slug: 'j-i-d',
          from: 'j.i.d',
          to: 'J.I.D',
          kind: 'recase',
          source: 'spotify',
        },
      ]);
      expect((await listArtists()).map((row) => row.name)).toEqual([
        'Clipse',
        'J.I.D',
      ]);
    });

    it('never adopts a billing that spells the act differently from Spotify', async () => {
      await seedSingleActBill('Beatles', 'beatles');
      await seedMatchedArtist('beatles', 'beatles', 'The Beatles');

      const result = await repairArtistNames(testDb, { dryRun: false });

      expect(result.candidates).toBe(0);
      expect((await listArtists())[0]?.name).toBe('beatles');
    });

    it('ignores the candidates of a row that is not matched', async () => {
      await seedSingleActBill('Ivri', 'ivri');
      await seedMatchedArtist('ivri', 'ivri', 'IVRI', 'ambiguous');

      await repairArtistNames(testDb, { dryRun: false });

      expect((await listArtists())[0]?.name).toBe('Ivri');
    });
  });
});

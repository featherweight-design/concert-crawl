import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db, events, venues } from '@concert-crawl/db';
import { rederiveEventArtists } from './rederive-event-artists.js';
import type { Adjudicator } from './lib/derive-artists.js';

// The one-off pass that runs the derivation ladder over rows crawled before the
// ladder existed. Its whole risk surface is the write: `canonical_artist` backs
// the partial UNIQUE index the crawler's ON CONFLICT targets, so a pass that
// moved it would split every affected show into a duplicate on its next crawl.
describe('rederive-event-artists integration', () => {
  const seedVenue = async () => {
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'Rederive Venue',
        slug: `rederive-venue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        websiteUrl: 'https://example.com/rederive-venue',
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
      canonicalArtist: string;
      canonicalTitle: string;
      date: string;
      supportingArtists?: string[];
      hiddenFromConsumer?: boolean;
      canonicalHeadliners?: string[] | null;
      headliners?: string[] | null;
      canonicalSupporting?: string[] | null;
    },
  ) => {
    const [event] = await db
      .insert(events)
      .values({
        venueId,
        title: values.title,
        artist: values.artist,
        canonicalArtist: values.canonicalArtist,
        canonicalTitle: values.canonicalTitle,
        date: values.date,
        supportingArtists: values.supportingArtists ?? null,
        hiddenFromConsumer: values.hiddenFromConsumer ?? false,
        canonicalHeadliners: values.canonicalHeadliners ?? null,
        headliners: values.headliners ?? null,
        canonicalSupporting: values.canonicalSupporting ?? null,
      })
      .returning();
    return event!;
  };

  const readEvent = async (id: string) => {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    return row!;
  };

  // Rules "not a concert" on anything that looks like a listing title, which is
  // the only case the ladder ever reaches it on here.
  const stubAdjudicator = (): Adjudicator =>
    vi.fn(async () => ({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    }));

  const run = (
    adjudicate: Adjudicator,
    dryRun: boolean,
    aiUseAllowed: (url: string) => Promise<boolean> = async () => true,
  ) =>
    rederiveEventArtists({
      dryRun,
      adjudicate,
      adjudicationIntervalMs: 0,
      aiUseAllowed,
      hideNonConcerts: true,
    });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE events, venues RESTART IDENTITY CASCADE`,
    );
  });

  it('keeps the bill of an event whose artist is a real performer', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Sigur Rós with Julianna Barwick',
      artist: 'Sigur Rós',
      canonicalArtist: 'sigur ros',
      canonicalTitle: 'sigur ros with julianna barwick',
      date: '2026-09-01',
      supportingArtists: ['Julianna Barwick'],
      headliners: ['Sigur Rós'],
      canonicalHeadliners: ['sigur ros'],
      canonicalSupporting: ['julianna barwick'],
    });

    const adjudicate = stubAdjudicator();
    const result = await run(adjudicate, false);

    const after = await readEvent(event.id);
    expect(after.headliners).toEqual(['Sigur Rós']);
    expect(after.canonicalHeadliners).toEqual(['sigur ros']);
    expect(after.supportingArtists).toEqual(['Julianna Barwick']);
    expect(after.canonicalSupporting).toEqual(['julianna barwick']);
    expect(after.hiddenFromConsumer).toBe(false);
    // Step 1 answered it, so no call was spent.
    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies.observed).toBe(1);
  });

  it('clears the real artists a live crawl attached to a cover night: bill empty, title and visibility kept', async () => {
    const venue = await seedVenue();
    const title =
      "Halloween Cover Show: The B52's + Wire + Misfits + The Monks + Beat Happening";
    const event = await seedEvent(venue.id, {
      title,
      // What the live extraction stored: the honored artists as the bill.
      artist: "The B-52's",
      canonicalArtist: "the b-52's",
      canonicalTitle: title.toLowerCase(),
      date: '2026-10-31',
      headliners: ["The B-52's"],
      canonicalHeadliners: ["the b-52's"],
      supportingArtists: ['Wire', 'Misfits'],
      canonicalSupporting: ['wire', 'misfits'],
    });
    const adjudicate: Adjudicator = vi.fn(async () => ({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
      coversOtherArtists: true,
    }));

    const dry = await run(adjudicate, true);
    // The dry run lists it, as a cleared bill, and writes nothing.
    expect(dry.sample).toHaveLength(1);
    expect(dry.sample[0]).toMatchObject({
      strategy: 'tribute-or-cover',
      headliners: [],
      supportingArtists: [],
      before: {
        headliners: ["The B-52's"],
        supportingArtists: ['Wire', 'Misfits'],
      },
      hides: false,
    });
    expect((await readEvent(event.id)).headliners).toEqual(["The B-52's"]);

    const result = await run(adjudicate, false);

    const after = await readEvent(event.id);
    // EMPTY, not NULL: an empty array is "ran, nobody billed", which every
    // artist page and follow match reads as no act; NULL would fall back to the
    // title.
    expect(after.headliners).toEqual([]);
    expect(after.canonicalHeadliners).toEqual([]);
    expect(after.supportingArtists).toEqual([]);
    expect(after.canonicalSupporting).toEqual([]);
    // The title and the dedup keys stay, and the show stays on the calendar.
    expect(after.title).toBe(title);
    expect(after.artist).toBe("The B-52's");
    expect(after.canonicalArtist).toBe("the b-52's");
    expect(after.hiddenFromConsumer).toBe(false);
    expect(result.strategies['tribute-or-cover']).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.hidden).toBe(0);
  });

  it.each([
    ['a lineup an admin saved', { lineupEditedAt: new Date() }],
    ['a show added by hand', { manual: true }],
  ])('never rewrites the bill of %s (admin 4a)', async (_label, lock) => {
    const venue = await seedVenue();
    const title = 'Halloween Cover Show: Wire + Misfits';
    const event = await seedEvent(venue.id, {
      title,
      artist: 'Wire',
      canonicalArtist: 'wire',
      canonicalTitle: title.toLowerCase(),
      date: '2026-10-31',
      headliners: ['Wire'],
      canonicalHeadliners: ['wire'],
      supportingArtists: ['Misfits'],
      canonicalSupporting: ['misfits'],
    });
    await db.update(events).set(lock).where(eq(events.id, event.id));
    // Would clear the bill on any row the pass reads.
    const adjudicate: Adjudicator = vi.fn(async () => ({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
      coversOtherArtists: true,
    }));

    const result = await run(adjudicate, false);

    const after = await readEvent(event.id);
    expect(after.headliners).toEqual(['Wire']);
    expect(after.supportingArtists).toEqual(['Misfits']);
    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.scanned).toBe(0);
  });

  it('lists each change with the bill it replaces', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      title: 'Clipse & J.I.D',
      artist: 'Clipse & J.I.D',
      canonicalArtist: 'clipse & j.i.d',
      canonicalTitle: 'clipse & j.i.d',
      date: '2026-11-12',
      headliners: ['Clipse & J.I.D'],
      canonicalHeadliners: ['clipse & j.i.d'],
    });
    const adjudicate: Adjudicator = vi.fn(async () => ({
      isConcert: true,
      headliners: ['Clipse', 'J.I.D'],
      supportingArtists: ['Friends', 'Clipse'],
    }));

    const result = await run(adjudicate, true);

    expect(result.sample).toHaveLength(1);
    expect(result.sample[0]).toMatchObject({
      title: 'Clipse & J.I.D',
      // The verdict's generic word and doubled act are cleaned before the list.
      headliners: ['Clipse', 'J.I.D'],
      supportingArtists: [],
      before: { headliners: ['Clipse & J.I.D'], supportingArtists: [] },
    });
  });

  it('does not clear a bill on a model verdict alone: only the title word rule does', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Concrete & Jerry Garcia ',
      artist: 'Concrete & Jerry Garcia ',
      canonicalArtist: 'concrete',
      canonicalTitle: 'concrete & jerry garcia',
      date: '2026-12-20',
      headliners: ['Concrete & Jerry Garcia'],
      canonicalHeadliners: ['concrete & jerry garcia'],
    });
    const result = await run(
      vi.fn(async () => ({
        isConcert: true,
        headliners: [],
        supportingArtists: [],
        coversOtherArtists: true,
      })),
      false,
    );
    expect((await readEvent(event.id)).headliners).toEqual([
      'Concrete & Jerry Garcia',
    ]);
    expect(result.updated).toBe(0);
    expect(result.notWritten.map((item) => item.reason)).toEqual([
      'model-cover-verdict-only',
    ]);
  });

  it('never attaches a split part as supporting', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Concrete & Jerry Garcia',
      artist: 'Concrete & Jerry Garcia',
      canonicalArtist: 'concrete',
      canonicalTitle: 'concrete & jerry garcia',
      date: '2026-12-21',
      headliners: ['Concrete & Jerry Garcia'],
      canonicalHeadliners: ['concrete & jerry garcia'],
    });
    const result = await run(
      vi.fn(async () => ({
        isConcert: true,
        headliners: ['Concrete'],
        supportingArtists: ['Jerry Garcia'],
      })),
      false,
    );
    expect((await readEvent(event.id)).headliners).toEqual([
      'Concrete & Jerry Garcia',
    ]);
    expect(result.notWritten.map((item) => item.reason)).toEqual([
      'would-demote-split-part',
    ]);
  });

  it('splits a billing a structured source flattened into one name (Clipse & J.I.D, Galdive & rum.gold)', async () => {
    const venue = await seedVenue();
    const clipse = await seedEvent(venue.id, {
      title: 'Clipse & J.I.D with Samara Cyn',
      artist: 'Clipse & J.I.D',
      canonicalArtist: 'clipse',
      canonicalTitle: 'clipse',
      date: '2026-11-12',
      headliners: ['Clipse & J.I.D'],
      canonicalHeadliners: ['clipse'],
      supportingArtists: ['Samara Cyn'],
      canonicalSupporting: ['samara cyn'],
    });
    const galdive = await seedEvent(venue.id, {
      title: 'Galdive & rum.gold',
      artist: 'Galdive & rum.gold',
      canonicalArtist: 'galdive',
      canonicalTitle: 'galdive',
      date: '2027-02-12',
      headliners: ['Galdive & rum.gold'],
      canonicalHeadliners: ['galdive'],
    });
    const adjudicate: Adjudicator = vi.fn(async ({ title }) =>
      title.startsWith('Clipse')
        ? {
            isConcert: true,
            headliners: ['Clipse', 'J.I.D'],
            supportingArtists: ['Samara Cyn'],
          }
        : {
            isConcert: true,
            headliners: ['Galdive', 'rum.gold'],
            supportingArtists: [],
          },
    );

    const dry = await run(adjudicate, true);
    expect(dry.updated).toBe(2);
    expect((await readEvent(clipse.id)).headliners).not.toEqual([
      'Clipse',
      'J.I.D',
    ]);

    await run(adjudicate, false);

    const clipseAfter = await readEvent(clipse.id);
    expect(clipseAfter.headliners).toEqual(['Clipse', 'J.I.D']);
    expect(clipseAfter.canonicalHeadliners).toEqual(['clipse', 'j.i.d']);
    expect(clipseAfter.supportingArtists).toEqual(['Samara Cyn']);
    // The dedup key and the display string are never rewritten.
    expect(clipseAfter.canonicalArtist).toBe('clipse');
    expect(clipseAfter.artist).toBe('Clipse & J.I.D');

    const galdiveAfter = await readEvent(galdive.id);
    expect(galdiveAfter.headliners).toEqual(['Galdive', 'rum.gold']);
    expect(galdiveAfter.canonicalHeadliners).toEqual(['galdive', 'rum.gold']);
    expect(galdiveAfter.canonicalArtist).toBe('galdive');
  });

  it('reads only flattened billings when asked, and stops at once when told to', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      title: 'Plain Band',
      artist: 'Plain Band',
      canonicalArtist: 'plain band',
      canonicalTitle: 'plain band',
      date: '2026-11-20',
    });
    for (const [index, name] of ['Aaa & Bbb', 'Ccc & Ddd'].entries()) {
      await seedEvent(venue.id, {
        title: name,
        artist: name,
        canonicalArtist: name.split(' & ')[0]!.toLowerCase(),
        canonicalTitle: name.toLowerCase(),
        date: `2026-12-0${index + 1}`,
      });
    }
    let calls = 0;
    const adjudicate: Adjudicator = vi.fn(async ({ title }) => {
      calls += 1;
      const [first, second] = title.split(' & ');
      return {
        isConcert: true,
        headliners: [first!, second!],
        supportingArtists: [],
      };
    });

    const result = await rederiveEventArtists({
      dryRun: true,
      adjudicate,
      adjudicationIntervalMs: 0,
      aiUseAllowed: async () => true,
      onlyFlattenedBillings: true,
      shouldStop: () => calls >= 1,
    });

    // The plain row is never read; the second flattened row is never reached.
    expect(result.scanned).toBe(1);
    expect(calls).toBe(1);
    expect(result.stopped).toBe(true);
  });

  it('leaves an event with an unsettled joined name untouched and lists the name', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Jade Cicada & Mickman',
      artist: 'Jade Cicada & Mickman',
      canonicalArtist: 'jade cicada',
      canonicalTitle: 'jade cicada & mickman',
      date: '2026-09-02',
    });
    const result = await rederiveEventArtists({
      dryRun: false,
      adjudicate: vi.fn(async () => ({
        isConcert: true,
        headliners: ['Jade Cicada', 'Mickman'],
        supportingArtists: [],
      })),
      adjudicationIntervalMs: 0,
      aiUseAllowed: async () => true,
      joinedEvidence: {
        whole: async () => false,
        part: async () => false,
      },
    });
    const after = await readEvent(event.id);
    expect(after.canonicalHeadliners).toBeNull();
    expect(result.updated).toBe(0);
    expect(result.strategies['joined-unresolved']).toBe(1);
    expect(result.unresolvedJoined).toEqual([
      {
        eventId: event.id,
        title: 'Jade Cicada & Mickman',
        name: 'Jade Cicada & Mickman',
        guess: ['Jade Cicada', 'Mickman'],
      },
    ]);
  });

  it('leaves a row the adjudicator rules not a concert exactly as it was unless hiding is asked for', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Concrete & Jerry Garcia',
      artist: 'Concrete & Jerry Garcia',
      canonicalArtist: 'concrete & jerry garcia',
      canonicalTitle: 'concrete & jerry garcia',
      date: '2026-09-02',
    });
    const result = await rederiveEventArtists({
      dryRun: false,
      adjudicate: stubAdjudicator(),
      adjudicationIntervalMs: 0,
      aiUseAllowed: async () => true,
    });
    const after = await readEvent(event.id);
    expect(after.hiddenFromConsumer).toBe(false);
    expect(after.canonicalHeadliners).toBeNull();
    expect(result.hidden).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.strategies['non-concert-left']).toBe(1);
  });

  it('hides an event whose artist echoes its title and the adjudicator rejects', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-02',
    });

    const adjudicate = stubAdjudicator();
    const result = await run(adjudicate, false);

    const after = await readEvent(event.id);
    expect(after.canonicalHeadliners).toEqual([]);
    expect(after.headliners).toEqual([]);
    expect(after.hiddenFromConsumer).toBe(true);
    expect(adjudicate).toHaveBeenCalledTimes(1);
    expect(result.hidden).toBe(1);
    expect(result.strategies.adjudicated).toBe(1);
  });

  // The safety assertion of the whole phase. `canonical_artist` is the live
  // dedup key; `artist` is what it is derived from. Neither may move.
  it('leaves artist and canonical_artist byte-identical', async () => {
    const venue = await seedVenue();
    const performer = await seedEvent(venue.id, {
      title: 'Tribute to Kokoroko',
      artist: 'Kokoroko',
      canonicalArtist: 'kokoroko',
      canonicalTitle: 'tribute to kokoroko',
      date: '2026-09-03',
      headliners: ['Kokoroko'],
      canonicalHeadliners: ['kokoroko'],
    });
    const observed = await seedEvent(venue.id, {
      title: 'AC/DC — Power Up Tour',
      artist: 'AC/DC',
      canonicalArtist: 'ac/dc',
      canonicalTitle: 'ac dc power up tour',
      date: '2026-09-04',
    });

    const before = [
      await readEvent(performer.id),
      await readEvent(observed.id),
    ];

    await run(
      vi.fn(async () => ({
        isConcert: true,
        headliners: ['Kokoroko'],
        supportingArtists: [],
      })),
      false,
    );

    const after = [await readEvent(performer.id), await readEvent(observed.id)];
    expect(after.map((row) => row.artist)).toEqual(
      before.map((row) => row.artist),
    );
    expect(after.map((row) => row.canonicalArtist)).toEqual(
      before.map((row) => row.canonicalArtist),
    );
    expect(after.map((row) => row.canonicalTitle)).toEqual(
      before.map((row) => row.canonicalTitle),
    );
    // And the one row that is written is the tribute night: its bill is cleared.
    expect(after[0]?.headliners).toEqual([]);
  });

  // The repair writes only what the stored row evidences (lib/repair-evidence.ts).
  // Each of these is a bill the ladder derives and the pass refuses to write.
  describe('leaves a derived bill unwritten, and lists why, when nothing stored evidences it', () => {
    const adjudicateWith = (
      headliners: string[],
      supportingArtists: string[] = [],
    ): Adjudicator =>
      vi.fn(async () => ({ isConcert: true, headliners, supportingArtists }));

    it('never adds a recurring series (or any artist) to a bill that stored none', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        title: 'BASS BINGO – Special Edition!',
        artist: 'BASS BINGO',
        canonicalArtist: 'bass bingo',
        canonicalTitle: 'bass bingo special edition',
        date: '2026-12-01',
        headliners: [],
        canonicalHeadliners: [],
      });
      const result = await run(adjudicateWith([]), false);
      const after = await readEvent(event.id);
      expect(after.headliners).toEqual([]);
      expect(result.updated).toBe(0);
      expect(result.notWritten).toMatchObject([
        {
          eventId: event.id,
          reason: 'would-add-an-artist',
          guess: { headliners: ['BASS BINGO'] },
        },
      ]);
    });

    it('never drops a stored co-headliner', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        title: 'Def Leppard and Goo Goo Dolls',
        artist: 'Def Leppard',
        canonicalArtist: 'def leppard',
        canonicalTitle: 'def leppard and goo goo dolls',
        date: '2026-12-02',
        headliners: ['Def Leppard', 'Goo Goo Dolls'],
        canonicalHeadliners: ['def leppard', 'goo goo dolls'],
      });
      const result = await run(adjudicateWith(['Def Leppard']), false);
      expect((await readEvent(event.id)).headliners).toEqual([
        'Def Leppard',
        'Goo Goo Dolls',
      ]);
      expect(result.notWritten.map((item) => item.reason)).toEqual([
        'would-drop-stored-headliner',
      ]);
    });

    it('leaves a row with no stored bill to the nightly crawl', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        title: 'Sub.mission presents: The Widdler',
        artist: 'Sub.mission presents: The Widdler',
        canonicalArtist: 'sub.mission presents: the widdler',
        canonicalTitle: 'sub mission presents the widdler',
        date: '2026-12-03',
      });
      const result = await run(adjudicateWith(['The Widdler']), false);
      expect((await readEvent(event.id)).canonicalHeadliners).toBeNull();
      expect(result.notWritten.map((item) => item.reason)).toEqual([
        'stored-bill-unknown',
      ]);
    });
  });

  it('writes nothing on a dry run', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Trivia Night at the Bar',
      artist: 'Trivia Night at the Bar',
      canonicalArtist: 'trivia night at the bar',
      canonicalTitle: 'trivia night at the bar',
      date: '2026-09-05',
    });

    const result = await run(stubAdjudicator(), true);

    const after = await readEvent(event.id);
    expect(after.canonicalHeadliners).toBeNull();
    expect(after.hiddenFromConsumer).toBe(false);
    // The dry run still reports what it would have done, `updated` included —
    // that count is what the decision to apply turns on.
    expect(result.updated).toBe(1);
    expect(result.derived).toBe(1);
    expect(result.hidden).toBe(1);
    expect(result.sample[0]?.hides).toBe(true);
  });

  it('is idempotent — a second run leaves the same rows', async () => {
    const venue = await seedVenue();
    const bingo = await seedEvent(venue.id, {
      title: 'BINGO BASH',
      artist: 'BINGO BASH',
      canonicalArtist: 'bingo bash',
      canonicalTitle: 'bingo bash',
      date: '2026-09-06',
    });
    const band = await seedEvent(venue.id, {
      title: 'Kokoroko live',
      artist: 'Kokoroko',
      canonicalArtist: 'kokoroko',
      canonicalTitle: 'kokoroko live',
      date: '2026-09-07',
    });

    await run(stubAdjudicator(), false);
    const first = [await readEvent(bingo.id), await readEvent(band.id)];

    const secondAdjudicator = stubAdjudicator();
    const second = await run(secondAdjudicator, false);
    const after = [await readEvent(bingo.id), await readEvent(band.id)];

    expect(after.map((row) => row.headliners)).toEqual(
      first.map((row) => row.headliners),
    );
    expect(after.map((row) => row.canonicalHeadliners)).toEqual(
      first.map((row) => row.canonicalHeadliners),
    );
    expect(after.map((row) => row.hiddenFromConsumer)).toEqual(
      first.map((row) => row.hiddenFromConsumer),
    );
    // The settled row is not re-adjudicated, so a re-run does not re-spend the
    // LLM bill on rows the previous run already closed out.
    expect(secondAdjudicator).not.toHaveBeenCalled();
    expect(second.strategies.settled).toBe(1);
    expect(second.hidden).toBe(0);
    // The band row IS re-derived — step 1 is free — but it derives to what it
    // already stores, so nothing is written and `updated_at` does not move.
    // Surfaces that read `updated_at` as "this show changed" must not see the
    // whole table go stale-dated the day this pass runs.
    expect(second.updated).toBe(0);
    expect(after.map((row) => row.updatedAt)).toEqual(
      first.map((row) => row.updatedAt),
    );
  });

  it('leaves a row untouched when the adjudicator is unreachable', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'Open Mic Night',
      artist: 'Open Mic Night',
      canonicalArtist: 'open mic night',
      canonicalTitle: 'open mic night',
      date: '2026-09-08',
    });

    const result = await run(
      vi.fn(async () => {
        throw new Error('haiku down');
      }),
      false,
    );

    const after = await readEvent(event.id);
    // NULL still means "never derived" rather than "nobody is billed", so the
    // next run picks the row up again.
    expect(after.canonicalHeadliners).toBeNull();
    expect(after.hiddenFromConsumer).toBe(false);
    expect(result.updated).toBe(0);
    expect(result.strategies['adjudicator-unavailable']).toBe(1);
  });

  // The crawl never sends a page to the model when robots.txt refuses AI use;
  // this admin pass must not either. The row keeps its stored bill.
  it('does not adjudicate a row whose venue refuses AI use', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-09',
    });

    const adjudicate = stubAdjudicator();
    const result = await run(adjudicate, false, async () => false);

    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies['ai-use-refused']).toBe(1);
    const after = await readEvent(event.id);
    expect(after.canonicalHeadliners).toBeNull();
    expect(after.hiddenFromConsumer).toBe(false);
  });

  // A VenuePilot venue's rows come from VenuePilot's endpoint, so its verdict
  // counts even when the venue's own site allows AI use.
  it('does not adjudicate a platform row whose payload host refuses AI use', async () => {
    const venue = await seedVenue();
    await db
      .update(venues)
      .set({ apiProvider: 'venuepilot', apiAccountId: '1105' })
      .where(eq(venues.id, venue.id));
    await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-10',
    });

    const adjudicate = stubAdjudicator();
    const result = await run(
      adjudicate,
      false,
      async (url) => !url.startsWith('https://www.venuepilot.co/'),
    );

    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies['ai-use-refused']).toBe(1);
  });

  // The venue's site allows AI use but the page the row came from does not.
  it('does not adjudicate a row whose own source page refuses AI use', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-11',
    });
    await db
      .update(events)
      .set({ sourceUrl: 'https://example.com/no-ai/calendar' })
      .where(eq(events.id, event.id));

    const adjudicate = stubAdjudicator();
    const result = await run(
      adjudicate,
      false,
      async (url) => !url.includes('/no-ai/'),
    );

    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies['ai-use-refused']).toBe(1);
    const after = await readEvent(event.id);
    expect(after.canonicalHeadliners).toBeNull();
    expect(after.hiddenFromConsumer).toBe(false);
  });

  // Live Nation rows come from pages the row does not record, so their
  // provenance cannot be checked here.
  it('does not adjudicate a Live Nation row at all', async () => {
    const venue = await seedVenue();
    await db
      .update(venues)
      .set({ platform: 'livenation', platformVenueId: 'KovZpZAEkn6A' })
      .where(eq(venues.id, venue.id));
    await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-12',
    });

    const adjudicate = stubAdjudicator();
    const result = await run(adjudicate, false);

    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies['provenance-unknown']).toBe(1);
  });

  // A venue that moved off Live Nation keeps the rows it wrote there. The row's
  // recorded strategy, not the venue's current setting, decides provenance.
  it("treats a row by the adapter that wrote it, not the venue's current one", async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      title: 'BASS BINGO NIGHT',
      artist: 'BASS BINGO NIGHT',
      canonicalArtist: 'bass bingo night',
      canonicalTitle: 'bass bingo night',
      date: '2026-09-13',
    });
    await db
      .update(events)
      .set({ extractionStrategy: 'platform:livenation' })
      .where(eq(events.id, event.id));

    const adjudicate = stubAdjudicator();
    const result = await run(adjudicate, false);

    expect(adjudicate).not.toHaveBeenCalled();
    expect(result.strategies['provenance-unknown']).toBe(1);
  });
});

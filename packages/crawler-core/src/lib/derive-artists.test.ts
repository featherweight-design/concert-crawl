import { describe, expect, it, vi } from 'vitest';
import {
  deriveArtists,
  isSuspiciousObservation,
  joinsSeveralNames,
  tidyBill,
  wouldAdjudicate,
} from './derive-artists.js';

const neverCalled = vi.fn(() => {
  throw new Error('adjudicator must not be called');
});

const base = { rawTitle: '', description: undefined };

describe('ladder step 0 — an extractor verdict of "not a concert" is final', () => {
  it('drops the observed performer instead of projecting a bingo host', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: 'Drag Bingo with Shirley Delta Blow',
        observedPerformers: ['Shirley Delta Blow'],
        isConcert: false,
      },
      neverCalled,
    );

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: false,
    });
  });

  it('does not read an unclassified event as a negative', async () => {
    // JSON-LD and most vendor fetchers emit no verdict at all. Treating
    // `undefined` as false would hide the majority of the catalogue.
    const result = await deriveArtists(
      { ...base, title: 'Khruangbin', observedPerformers: ['Khruangbin'] },
      neverCalled,
    );

    expect(result.isConcert).toBe(true);
    expect(result.headliners).toEqual(['Khruangbin']);
  });
});

describe('ladder step 1 — observed performers win', () => {
  it('takes the headliner and supporting acts without an LLM call', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: 'Thee Sacred Souls at the Ogden',
        observedPerformers: ['Thee Sacred Souls'],
        observedSupportingArtists: ['LA LOM'],
      },
      neverCalled,
    );

    expect(result).toEqual({
      headliners: ['Thee Sacred Souls'],
      supportingArtists: ['LA LOM'],
      isConcert: true,
      adjudicated: false,
    });
  });

  it('keeps a co-headline bill as two headliners, never demoting the second', async () => {
    // #1203. Only the LLM extractor reads billing emphasis well enough to
    // report two headliners; the ladder must pass that through rather than
    // treating everything past [0] as an opener.
    const result = await deriveArtists(
      {
        ...base,
        title: 'Desert Dwellers & Great Dane',
        observedPerformers: ['Desert Dwellers', 'Great Dane'],
        observedSupportingArtists: ['Numatik'],
      },
      neverCalled,
    );

    expect(result).toEqual({
      headliners: ['Desert Dwellers', 'Great Dane'],
      supportingArtists: ['Numatik'],
      isConcert: true,
      adjudicated: false,
    });
  });
});

describe('ladder step 2 — escalation', () => {
  it('skips escalation without a verdict when AI use is not allowed', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: [],
      },
      null,
    );

    // No verdict, so the upsert keeps the stored bill and the show stays up.
    expect(result).toEqual({
      headliners: null,
      supportingArtists: null,
      isConcert: true,
      adjudicated: false,
    });
  });

  it('still takes observed performers when AI use is not allowed', async () => {
    const result = await deriveArtists(
      { ...base, title: 'Daedelus', observedPerformers: ['Daedelus Live'] },
      null,
    );
    expect(result.headliners).toEqual(['Daedelus Live']);
  });

  it('escalates when nobody was named', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    });

    const result = await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: [],
      },
      adjudicate,
    );

    expect(adjudicate).toHaveBeenCalledOnce();
    expect(result.headliners).toEqual(['Daedelus']);
    expect(result.adjudicated).toBe(true);
  });

  it('keeps observed openers the adjudicator never got to read', async () => {
    // Ticketure parses openers out of a prose field and populates no
    // description, so the adjudicator sees only the title. Taking its verdict
    // wholesale would delete the only record of the bill's support.
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Dutch Melrose'],
      supportingArtists: [],
    });

    const result = await deriveArtists(
      {
        ...base,
        title: 'Dutch Melrose',
        observedPerformers: [],
        observedSupportingArtists: ['Kiltro', 'Neighbor Andy'],
      },
      adjudicate,
    );

    expect(result.supportingArtists).toEqual(['Kiltro', 'Neighbor Andy']);
  });

  it('lets the verdict outrank an observed opener it promoted to the bill', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Dutch Melrose', 'Kiltro'],
      supportingArtists: ['Neighbor Andy'],
    });

    const result = await deriveArtists(
      {
        ...base,
        title: 'Dutch Melrose & Kiltro',
        observedPerformers: [],
        observedSupportingArtists: ['kiltro', 'Neighbor Andy'],
      },
      adjudicate,
    );

    // Listed once, as a headliner — not again under a second role, and not
    // duplicated against the verdict's own spelling.
    expect(result.supportingArtists).toEqual(['Neighbor Andy']);
  });

  it('escalates when the observed performer is just the title', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    });

    await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: ['@adsfradio presents: Daedelus'],
      },
      adjudicate,
    );

    expect(adjudicate).toHaveBeenCalledOnce();
  });
});

describe('ladder step 3 — no performer is a real answer', () => {
  it('resolves to an empty headliner list and a non-concert', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    });

    const result = await deriveArtists(
      { ...base, title: 'HUMP! Film Festival', observedPerformers: [] },
      adjudicate,
    );

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: true,
    });
  });

  it('never falls back to the title when the adjudicator returns nothing', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
    });

    const result = await deriveArtists(
      { ...base, title: 'Bass Package', observedPerformers: [] },
      adjudicate,
    );

    expect(result.headliners).toEqual([]);
  });

  it('treats an adjudicator failure as unresolved rather than as the title', async () => {
    const adjudicate = vi.fn().mockRejectedValue(new Error('haiku 529'));

    const result = await deriveArtists(
      { ...base, title: '80s Bash', observedPerformers: [] },
      adjudicate,
    );

    // NULL, not []. An empty set is a verdict that nobody is billed, and the
    // upsert persists it — which would let one Haiku 529 erase a correct bill.
    expect(result).toEqual({
      headliners: null,
      supportingArtists: null,
      isConcert: true,
      adjudicated: false,
    });
  });
});

describe('isSuspiciousObservation', () => {
  const suspicious: [string, string][] = [
    ['80s Bash', '80s Bash'],
    ['@adsfradio presents: Daedelus', '@adsfradio presents: Daedelus'],
    ['303 Boards Benefit Show', '303 Boards Benefit Show'],
    ['A Great Night in Hip Hop', 'A Great Night in Hip Hop'],
  ];
  it.each(suspicious)('flags %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(true);
  });

  // Real band names that must NOT be escalated — escalating them would spend
  // an LLM call and risk the model second-guessing correct venue data.
  const clean: [string, string][] = [
    ['Goodnight, Texas', 'Goodnight, Texas at Globe Hall'],
    ['hey, nothing', 'hey, nothing — Denver'],
    ['Crosby, Stills & Nash', 'Crosby, Stills & Nash'],
    ['Earth, Wind & Fire', 'Earth, Wind & Fire at Red Rocks'],
    ['blink-182', 'blink-182 at Ball Arena'],
    ['311', '311 at Red Rocks'],
  ];
  it.each(clean)('does not flag %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(false);
  });
});

// AEG's headlinersText, a JSON-LD performer and a Ticketure act arrive as ONE
// string even when the venue billed two acts. The ladder used to trust it, and
// the artist projection then keyed the show on the first name alone.
describe('a lone observed name that joins several', () => {
  const clipse = {
    ...base,
    title: 'Clipse & J.I.D with Samara Cyn',
    observedPerformers: ['Clipse & J.I.D'],
  };
  const galdive = {
    ...base,
    title: 'Galdive & rum.gold',
    observedPerformers: ['Galdive & rum.gold'],
  };

  it('is escalated, so Clipse & J.I.D bill as two headliners with Samara Cyn as an opener', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Clipse', 'J.I.D'],
      supportingArtists: ['Samara Cyn'],
    });

    const result = await deriveArtists(clipse, adjudicate);

    expect(adjudicate).toHaveBeenCalledOnce();
    expect(result).toEqual({
      headliners: ['Clipse', 'J.I.D'],
      supportingArtists: ['Samara Cyn'],
      isConcert: true,
      adjudicated: true,
    });
  });

  it('bills Galdive & rum.gold as two headliners', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Galdive', 'rum.gold'],
      supportingArtists: [],
    });

    const result = await deriveArtists(galdive, adjudicate);

    expect(result.headliners).toEqual(['Galdive', 'rum.gold']);
  });

  it('keeps one act whose own name has the joiner whole when the adjudicator says so', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Iron & Wine'],
      supportingArtists: [],
    });

    const result = await deriveArtists(
      { ...base, title: 'Iron & Wine', observedPerformers: ['Iron & Wine'] },
      adjudicate,
    );

    expect(result.headliners).toEqual(['Iron & Wine']);
  });

  it('still takes the observed bill when AI use is not allowed', async () => {
    const result = await deriveArtists(clipse, null);

    expect(result).toEqual({
      headliners: ['Clipse & J.I.D'],
      supportingArtists: [],
      isConcert: true,
      adjudicated: false,
    });
  });

  it('still takes the observed bill when the adjudicator fails', async () => {
    const adjudicate = vi.fn().mockRejectedValue(new Error('overloaded'));

    const result = await deriveArtists(clipse, adjudicate);

    expect(result.headliners).toEqual(['Clipse & J.I.D']);
    expect(result.adjudicated).toBe(false);
  });

  it('keeps the observed bill when the adjudicator names nobody for a concert', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
    });

    const result = await deriveArtists(clipse, adjudicate);

    expect(result.headliners).toEqual(['Clipse & J.I.D']);
    expect(result.isConcert).toBe(true);
  });

  it('honours a not-a-concert ruling', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    });

    const result = await deriveArtists(clipse, adjudicate);

    expect(result.isConcert).toBe(false);
    expect(result.headliners).toEqual([]);
  });

  it('does not ask the verdict-reuse gate about a bill the extractor already split', () => {
    expect(
      wouldAdjudicate({
        ...base,
        title: 'Iron & Wine with Other Act',
        observedPerformers: ['Iron & Wine', 'Other Act'],
      }),
    ).toBe(false);
  });

  it('does not re-escalate a bill the extractor already split', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: 'Desert Dwellers & Great Dane',
        observedPerformers: ['Desert Dwellers', 'Great Dane'],
      },
      neverCalled,
    );

    expect(result.headliners).toEqual(['Desert Dwellers', 'Great Dane']);
  });

  it('is what the verdict-reuse gate asks about', () => {
    expect(wouldAdjudicate(clipse)).toBe(true);
    expect(wouldAdjudicate({ ...clipse, observedPerformers: ['Clipse'] })).toBe(
      false,
    );
  });

  it.each([
    ['Clipse & J.I.D', true],
    ['Galdive & rum.gold', true],
    ['for KING + COUNTRY', true],
    ['Clipse', false],
    ['blink-182', false],
    ['Earth, Wind and Fire', false],
  ])('joinsSeveralNames(%s) is %s', (observed, expected) => {
    expect(joinsSeveralNames(observed)).toBe(expected);
  });
});

describe('tidyBill: generic words and doubled acts never reach a stored bill', () => {
  it('drops generic words as acts', () => {
    expect(
      tidyBill(
        ['Hirshi & Friends'],
        ['Friends', 'Special Guests', 'TBA', 'Zen'],
      ),
    ).toEqual({ headliners: ['Hirshi & Friends'], supportingArtists: ['Zen'] });
    expect(tidyBill(['Friends'], [])).toEqual({
      headliners: [],
      supportingArtists: [],
    });
    // Only a whole generic word goes: a real act whose name contains one stays.
    expect(tidyBill(['Friends of Mine'], [])).toEqual({
      headliners: ['Friends of Mine'],
      supportingArtists: [],
    });
  });

  it('removes a supporting act already listed as a headliner', () => {
    expect(tidyBill(['Blakkfish'], ['blakkfish', 'Opener'])).toEqual({
      headliners: ['Blakkfish'],
      supportingArtists: ['Opener'],
    });
  });

  it('removes a supporting act that is a member of a combined headliner', () => {
    expect(
      tidyBill(
        ['Brothers of Brass & Hot Like Mars', 'Zen Selekta / LivSings'],
        [
          'Brothers of Brass',
          'Hot Like Mars',
          'Zen Selekta',
          'LivSings',
          'Real Opener',
        ],
      ),
    ).toEqual({
      headliners: [
        'Brothers of Brass & Hot Like Mars',
        'Zen Selekta / LivSings',
      ],
      supportingArtists: ['Real Opener'],
    });
  });

  it('ignores a trailing parenthetical when comparing', () => {
    expect(
      tidyBill(['LivSings'], ['LivSings (Beyonce Tribute)', 'Other']),
    ).toEqual({
      headliners: ['LivSings'],
      supportingArtists: ['Other'],
    });
  });

  it('keeps each supporting act once', () => {
    expect(tidyBill(['A'], ['B', 'b', 'C'])).toEqual({
      headliners: ['A'],
      supportingArtists: ['B', 'C'],
    });
  });
});

describe('a cover or tribute night', () => {
  const coverTitle =
    "Halloween Cover Show: The B52's + Wire + Misfits + The Monks + Beat Happening";

  it('bills nobody, stays a concert and never calls the adjudicator, whatever the extractor said', async () => {
    for (const isConcert of [undefined, true, false]) {
      const result = await deriveArtists(
        {
          ...base,
          title: coverTitle,
          observedPerformers: [coverTitle],
          isConcert,
        },
        neverCalled,
      );
      expect(result).toMatchObject({
        headliners: [],
        supportingArtists: [],
        isConcert: true,
        coversOtherArtists: true,
        adjudicated: false,
      });
    }
  });

  it.each([
    'HIDE DEPECHE MODE TRIBUTES!',
    'Tributes to Oingo Boingo & DEVO!',
    'Night 0 Tributes to Steely Dan, Grateful Dead & Tyler Childers',
  ])('settles "%s" from the title: no bill, never hidden', async (title) => {
    const result = await deriveArtists(
      {
        ...base,
        title,
        observedPerformers: ['Steely Dan & Grateful Dead'],
        observedSupportingArtists: [
          'Psychedelic Furs Tribute',
          'Tyler Childers',
        ],
        isConcert: false,
      },
      neverCalled,
    );
    expect(result.headliners).toEqual([]);
    expect(result.supportingArtists).toEqual([]);
    expect(result.isConcert).toBe(true);
  });

  it('does not ask the reuse gate for a verdict on a tribute title', () => {
    expect(
      wouldAdjudicate({
        title: 'Tributes to The Cure',
        observedPerformers: [],
      }),
    ).toBe(false);
  });

  it('keeps the performers a venue credits when a verdict calls a non-tribute title a cover night', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title:
          "Michael Shannon & Jason Narducy and Friends play R.E.M.'s Document",
        observedPerformers: ['Michael Shannon', 'Jason Narducy'],
      },
      async () => ({
        isConcert: true,
        headliners: [],
        supportingArtists: [],
        coversOtherArtists: true,
      }),
    );
    expect(result.headliners).toEqual(['Michael Shannon', 'Jason Narducy']);
    expect(result.coversOtherArtists).toBeUndefined();
  });
});

describe('a joined name the venue lists as separate acts', () => {
  const ask = (title: string, performers: string[], headliners: string[]) =>
    deriveArtists(
      { ...base, title, observedPerformers: performers },
      async () => ({ isConcert: true, headliners, supportingArtists: [] }),
    );

  it('is split whatever the model decided', async () => {
    const result = await ask(
      'Nas & The Roots Night',
      ['Nas', 'The Roots'],
      ['Nas & The Roots'],
    );
    expect(result.headliners).toEqual(['Nas', 'The Roots']);
  });

  it('stays whole when the venue prints it as one entry', async () => {
    const result = await ask(
      'Haute & Freddy: Big Disgrace Tour',
      ['Haute & Freddy'],
      ['Haute & Freddy'],
    );
    expect(result.headliners).toEqual(['Haute & Freddy']);
  });
});

describe('what the adjudicator is given', () => {
  it("passes the venue's own performer field, so a named act cannot vanish unseen", async () => {
    const adjudicate = vi.fn(async () => ({
      isConcert: true,
      headliners: ['Haute', 'Freddy'],
      supportingArtists: ['Rubin Brothers'],
    }));
    await deriveArtists(
      {
        ...base,
        title: 'KGNU Presents Haute & Freddy Big Disgrace Tour Rubin Brothers',
        observedPerformers: ['Haute & Freddy'],
      },
      adjudicate,
    );
    expect(adjudicate).toHaveBeenCalledWith(
      expect.objectContaining({ venuePerformers: ['Haute & Freddy'] }),
    );
  });

  it('does not pass a performer field that only echoes the title', async () => {
    const adjudicate = vi.fn(async () => ({
      isConcert: true,
      headliners: ['X'],
      supportingArtists: [],
    }));
    await deriveArtists(
      {
        ...base,
        title: 'Open Mic Night',
        observedPerformers: ['Open Mic Night'],
      },
      adjudicate,
    );
    expect(adjudicate).toHaveBeenCalledWith(
      expect.objectContaining({ venuePerformers: [] }),
    );
  });

  it('cleans the verdict: no "Friends" act and no act listed twice', async () => {
    const result = await deriveArtists(
      { ...base, title: 'Hirshi & Friends + Opener' },
      async () => ({
        isConcert: true,
        headliners: ['Hirshi & Friends'],
        supportingArtists: ['Friends', 'Hirshi', 'Opener'],
      }),
    );
    expect(result.headliners).toEqual(['Hirshi & Friends']);
    expect(result.supportingArtists).toEqual(['Opener']);
  });
});

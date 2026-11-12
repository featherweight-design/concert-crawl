import { describe, expect, it, vi } from 'vitest';
import {
  deriveArtists,
  isSuspiciousObservation,
  joinsSeveralNames,
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

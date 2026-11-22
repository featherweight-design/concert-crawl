import { describe, it, expect } from 'vitest';
import { rowChips, chipBudget } from './row-chips';
import type { EventRowShow } from './row-model';

function makeShow(partial: Partial<EventRowShow> = {}): EventRowShow {
  return {
    id: 'evt-1',
    headliner: 'Test Artist',
    fallbackTitle: 'Test Artist at Test Ballroom',
    supports: [],
    tourName: null,
    imageUrl: null,
    artistPhotoUrl: null,
    venueName: 'Test',
    venueSlug: 'test',
    dateLabel: 'Sat, Aug 15',
    timeLabel: '8:00 PM',
    price: null,
    saved: null,
    genres: [],
    crewGoing: null,
    isWatching: false,
    status: 'live',
    lifecycle: 'upcoming',
    delistedAt: null,
    ...partial,
  };
}

// A row price carries no observation time: with the Stale chip gone, nothing
// on a row reads a price's age.
function priceFrom(source: 'boxoffice' | null) {
  return {
    amount: 68,
    isFloor: true,
    source,
    isPending: false,
  };
}

describe('rowChips', () => {
  it('offers nothing when the row has no claim to make', () => {
    expect(rowChips(makeShow(), 'browse')).toEqual([]);
  });

  it('offers no provenance on Browse, whatever the price', () => {
    const chips = rowChips(
      makeShow({ price: priceFrom('boxoffice') }),
      'browse',
    );
    expect(chips).toEqual([]);
  });

  // B+ dropped the Stale price chip everywhere: an old price is no chip at all.
  it('offers no Stale chip on Watching, however old the price', () => {
    const chips = rowChips(
      makeShow({ price: priceFrom('boxoffice') }),
      'watching',
    );
    expect(chips.map((chip) => chip.key)).toEqual(['provenance']);
    expect(chips.some((chip) => chip.label.includes('Stale'))).toBe(false);
  });

  it('offers no Stale chip on any surface', () => {
    for (const surface of [
      'browse',
      'venue',
      'watching',
      'related',
      'crew',
      'crewLens',
      'artist',
    ] as const) {
      const chips = rowChips(makeShow({ price: priceFrom(null) }), surface);
      expect(chips.map((chip) => chip.label).join('|')).not.toContain('Stale');
    }
  });

  it('offers no provenance for a crawled price, which has none', () => {
    const chips = rowChips(makeShow({ price: priceFrom(null) }), 'watching');
    expect(chips).toEqual([]);
  });

  it('labels provenance the way admin does, and leaves box office neutral', () => {
    const [chip] = rowChips(
      makeShow({ price: priceFrom('boxoffice') }),
      'watching',
    );
    expect(chip?.label).toBe('Box office');
    expect(chip?.tone).toBe('neutral');
  });

  it('carries the provenance meaning for screen readers, not just the label', () => {
    const [chip] = rowChips(
      makeShow({ price: priceFrom('boxoffice') }),
      'watching',
    );
    expect(chip?.srLabel).toBe('Price source: Box office');
  });

  it('carries two genres on one chip rather than spending both slots', () => {
    const chips = rowChips(makeShow({ genres: ['indie', 'rock'] }), 'browse');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.label).toBe('indie');
    expect(chips[0]?.secondaryLabel).toBe('rock');
  });

  // B+ rule 2: the first genre colors the dot; the second stays muted.
  it('dots the genre chip with its lead genre', () => {
    const chips = rowChips(makeShow({ genres: ['indie', 'rock'] }), 'browse');
    expect(chips[0]?.genreDot).toBe('indie');
  });

  it('leads with the genre the active Vibe filter matched', () => {
    const chips = rowChips(
      makeShow({ genres: ['indie', 'garage rock'] }),
      'browse',
      ['rock', 'garage rock'],
    );
    expect(chips[0]?.label).toBe('garage rock');
    expect(chips[0]?.secondaryLabel).toBe('indie');
  });

  it('offers no second half when the row has one genre', () => {
    const chips = rowChips(makeShow({ genres: ['indie'] }), 'browse');
    expect(chips[0]?.label).toBe('indie');
    expect(chips[0]?.secondaryLabel).toBeUndefined();
  });

  it('offers no crew chip on a surface with no crew context', () => {
    const chips = rowChips(
      makeShow({ crewGoing: { count: 2, names: ['ada'] } }),
      'browse',
    );
    expect(chips).toEqual([]);
  });

  it('takes the first chip slot when a crew is going', () => {
    const chips = rowChips(
      makeShow({
        genres: ['rock'],
        crewGoing: { count: 3, names: ['ada', 'gil'] },
      }),
      'crewLens',
    );
    expect(chips.map((chip) => chip.key).slice(0, 1)).toEqual(['crew']);
    expect(chips[0]?.label).toBe('3 going');
    expect(chips[0]?.tone).toBe('signal');
  });

  it('offers no crew chip when nobody in the crew is going', () => {
    const chips = rowChips(
      makeShow({ crewGoing: { count: 0, names: [] } }),
      'crew',
    );
    expect(chips).toEqual([]);
  });

  it('names the crew for screen readers, and counts those it cannot name', () => {
    const [chip] = rowChips(
      makeShow({ crewGoing: { count: 3, names: ['ada', 'gil'] } }),
      'crew',
    );
    expect(chip?.srLabel).toBe('From your crews: ada, gil and 1 more going');
  });
});

describe('chipBudget', () => {
  it('spends the second slot on the support line when there is one', () => {
    expect(chipBudget(false)).toBe(2);
    expect(chipBudget(true)).toBe(1);
  });
});

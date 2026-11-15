import { describe, expect, it } from 'vitest';
import {
  desiredEventArtists,
  diffEventArtists,
  plannedLineup,
  type EventArtistRow,
  type LineupSource,
} from './event-artists-sync.js';

const source = (overrides: Partial<LineupSource> = {}): LineupSource => ({
  headliners: null,
  supportingArtists: null,
  canonicalHeadliners: null,
  canonicalSupporting: null,
  canonicalArtist: 'fallback act',
  ...overrides,
});

describe('plannedLineup', () => {
  it('orders headliners by display order, then supports, with one running position', () => {
    expect(
      plannedLineup(
        source({
          headliners: ['Zeta', 'Alpha'],
          // Sorted, so never used for order.
          canonicalHeadliners: ['alpha', 'zeta'],
          supportingArtists: ['Yankee', 'Bravo'],
          canonicalSupporting: ['bravo', 'yankee'],
        }),
      ),
    ).toEqual([
      { canonicalName: 'zeta', role: 'headliner', position: 0 },
      { canonicalName: 'alpha', role: 'headliner', position: 1 },
      { canonicalName: 'yankee', role: 'support', position: 2 },
      { canonicalName: 'bravo', role: 'support', position: 3 },
    ]);
  });

  it('canonicalizes display names the way the arrays do', () => {
    expect(
      plannedLineup(
        source({
          headliners: ['Sigur Rós'],
          canonicalHeadliners: ['sigur ros'],
        }),
      ),
    ).toEqual([{ canonicalName: 'sigur ros', role: 'headliner', position: 0 }]);
  });

  it('falls back to canonical_artist as the lone headliner when the ladder never ruled', () => {
    expect(
      plannedLineup(
        source({
          headliners: ['Ignored'],
          supportingArtists: ['Opener'],
        }),
      ),
    ).toEqual([
      { canonicalName: 'fallback act', role: 'headliner', position: 0 },
      { canonicalName: 'opener', role: 'support', position: 1 },
    ]);
  });

  it('bills nobody as headliner when the ladder ruled an empty bill', () => {
    expect(
      plannedLineup(source({ headliners: [], canonicalHeadliners: [] })),
    ).toEqual([]);
  });

  it('keeps the headliner row of an artist billed twice', () => {
    expect(
      plannedLineup(
        source({
          headliners: ['Twice'],
          canonicalHeadliners: ['twice'],
          supportingArtists: ['Twice', 'Other'],
        }),
      ),
    ).toEqual([
      { canonicalName: 'twice', role: 'headliner', position: 0 },
      { canonicalName: 'other', role: 'support', position: 1 },
    ]);
  });

  it('reads canonical_supporting when the display supports are missing', () => {
    expect(
      plannedLineup(
        source({
          headliners: ['Act'],
          canonicalHeadliners: ['act'],
          canonicalSupporting: ['opener'],
        }),
      ),
    ).toEqual([
      { canonicalName: 'act', role: 'headliner', position: 0 },
      { canonicalName: 'opener', role: 'support', position: 1 },
    ]);
  });
});

describe('desiredEventArtists', () => {
  const lineup = plannedLineup(
    source({
      headliners: ['Known', 'Unknown'],
      canonicalHeadliners: ['known', 'unknown'],
      supportingArtists: ['Later'],
    }),
  );

  it('links known artists, counts unmatched names, and leaves their position as a gap', () => {
    const planned = desiredEventArtists(
      'ev1',
      lineup,
      new Map([
        ['known', 'a-known'],
        ['later', 'a-later'],
      ]),
    );
    expect(planned.unmatched).toBe(1);
    expect(planned.rows).toEqual([
      { eventId: 'ev1', artistId: 'a-known', role: 'headliner', position: 0 },
      { eventId: 'ev1', artistId: 'a-later', role: 'support', position: 2 },
    ]);
  });

  it('keeps the first slot when two names resolve to one artist', () => {
    const planned = desiredEventArtists(
      'ev1',
      lineup,
      new Map([
        ['known', 'same'],
        ['unknown', 'same'],
      ]),
    );
    expect(planned.rows).toEqual([
      { eventId: 'ev1', artistId: 'same', role: 'headliner', position: 0 },
    ]);
  });
});

describe('diffEventArtists', () => {
  const row = (
    artistId: string,
    role: EventArtistRow['role'],
    position: number,
  ): EventArtistRow => ({ eventId: 'ev1', artistId, role, position });

  it('is empty when the rows already match, so a re-run writes nothing', () => {
    const rows = [row('a', 'headliner', 0), row('b', 'support', 1)];
    expect(diffEventArtists(rows, rows)).toEqual({
      insert: [],
      update: [],
      delete: [],
    });
  });

  it('inserts new rows, updates moved ones and deletes dropped ones', () => {
    expect(
      diffEventArtists(
        [
          row('a', 'headliner', 0),
          row('b', 'headliner', 1),
          row('c', 'support', 2),
        ],
        [
          row('a', 'headliner', 0),
          row('b', 'support', 1),
          row('d', 'support', 2),
        ],
      ),
    ).toEqual({
      insert: [row('c', 'support', 2)],
      update: [row('b', 'headliner', 1)],
      delete: [{ eventId: 'ev1', artistId: 'd' }],
    });
  });
});

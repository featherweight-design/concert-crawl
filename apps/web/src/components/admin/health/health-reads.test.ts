import { describe, expect, it } from 'vitest';
import { parseNeedsYouVenueIds, parseNewestNightly } from './health-reads';

describe('parseNewestNightly', () => {
  it('reads the newest nightly row', () => {
    expect(
      parseNewestNightly([
        { kind: 'nightly', night: '2026-11-12', didntStart: true, extra: 1 },
      ]),
    ).toEqual({ night: '2026-11-12', didntStart: true });
  });

  it.each([
    ['an empty list', []],
    ['a by-hand row', [{ kind: 'by_hand', night: null, didntStart: false }]],
    ['a row missing didntStart', [{ kind: 'nightly', night: '2026-11-12' }]],
    ['a body that is not a list', { data: [] }],
    ['nothing', undefined],
  ])('is null for %s', (_, raw) => {
    expect(parseNewestNightly(raw)).toBeNull();
  });
});

describe('parseNeedsYouVenueIds', () => {
  it('keeps failing and blocked venues from the whole queue, dropping the rest', () => {
    expect(
      parseNeedsYouVenueIds([
        { kind: 'venue-failing', venueId: 'a' },
        { kind: 'venue-failing', venueId: null },
        { kind: 'venue-failing' },
        'junk',
        { kind: 'venue-blocked', venueId: 'b' },
        // Other kinds carry a venue too, but are not the venue's own failure.
        { kind: 'show-dropped', venueId: 'c' },
        { kind: 'venue-failing', venueId: 'a' },
      ]),
    ).toEqual(new Set(['a', 'b']));
  });

  it('is null when the body is not a list', () => {
    expect(parseNeedsYouVenueIds({ success: true })).toBeNull();
    expect(parseNeedsYouVenueIds(undefined)).toBeNull();
  });
});

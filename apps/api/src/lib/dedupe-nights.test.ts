import { describe, it, expect } from 'vitest';
import { dedupeNights } from './dedupe-nights.js';

const night = (
  eventId: string,
  over: Partial<{
    venueSlug: string;
    iso: string;
    showTime: string | null;
  }> = {},
) => ({
  eventId,
  venueSlug: 'red-rocks',
  iso: '2026-10-01',
  showTime: '19:00:00' as string | null,
  ...over,
});

describe('dedupeNights', () => {
  it('shows one night once, however many rows the crawler kept', () => {
    const rows = [night('a'), night('b'), night('c')];
    expect(dedupeNights(rows).map((row) => row.eventId)).toEqual(['a']);
  });

  it('keeps different venues and different dates apart', () => {
    const rows = [
      night('a'),
      night('b', { venueSlug: 'gothic' }),
      night('c', { iso: '2026-10-02' }),
    ];
    expect(dedupeNights(rows)).toHaveLength(3);
  });

  it('keeps an early and a late show on one date as two nights', () => {
    const rows = [
      night('early', { showTime: '16:00:00' }),
      night('late', { showTime: '20:00:00' }),
    ];
    expect(dedupeNights(rows)).toHaveLength(2);
  });

  it('treats a row with no time as the same night as a timed one', () => {
    const rows = [night('timed'), night('untimed', { showTime: null })];
    expect(dedupeNights(rows).map((row) => row.eventId)).toEqual(['timed']);
  });

  it('keeps the duplicate the caller attended, in the first one’s place', () => {
    const rows = [
      night('a'),
      night('b'),
      night('other', { iso: '2026-09-01' }),
    ];
    const kept = dedupeNights(rows, new Set(['b']));
    expect(kept.map((row) => row.eventId)).toEqual(['b', 'other']);
  });

  it('keeps the lowest id when the caller attended none or several', () => {
    // The lowest id wins whatever order the rows arrive in, so the artist page
    // and the Add list agree on which row stands for a night.
    const rows = [night('b'), night('a')];
    expect(dedupeNights(rows, new Set()).map((row) => row.eventId)).toEqual([
      'a',
    ]);
    expect(
      dedupeNights(rows, new Set(['a', 'b'])).map((row) => row.eventId),
    ).toEqual(['a']);
  });

  // An untimed row must not chain two real shows into one night.
  it('keeps an early and a late show even when an untimed row sits beside them', () => {
    const rows = [
      night('a', { showTime: null }),
      night('b', { showTime: '19:00:00' }),
      night('c', { showTime: '21:00:00' }),
    ];
    expect(dedupeNights(rows).map((row) => row.eventId)).toEqual(['b', 'c']);
  });

  it('collapses untimed duplicates of a night that has no timed row', () => {
    const rows = [
      night('b', { showTime: null }),
      night('a', { showTime: null }),
    ];
    expect(dedupeNights(rows).map((row) => row.eventId)).toEqual(['a']);
  });

  it('returns an empty list for no rows', () => {
    expect(dedupeNights([])).toEqual([]);
  });
});

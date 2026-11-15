import { describe, expect, it } from 'vitest';
import { alignToNights, manualLandingTarget } from './align-nights.js';

const listing = (canonicalArtist: string, showTime: string | null) => ({
  canonicalArtist,
  date: '2026-12-12',
  showTime,
});
const stored = (
  id: string,
  canonicalArtist: string,
  showTime: string | null,
) => ({
  id,
  ...listing(canonicalArtist, showTime),
});

describe('alignToNights: a time misread on the same show page', () => {
  const page =
    'https://www.redrocksonline.com/events/beck-ride-lonesome-tour-1407922/';
  const withUrl = <T extends object>(row: T, eventUrl: string | null) => ({
    ...row,
    eventUrl,
  });

  it('corrects a stored 07:30 in place when the same page now says 19:30', () => {
    const { aligned, promotions } = alignToNights(
      [withUrl(listing('beck', '19:30:00'), page)],
      [withUrl(stored('a', 'beck', '07:30:00'), page)],
    );
    expect(promotions).toEqual([{ id: 'a', showTime: '19:30:00' }]);
    expect(aligned[0]).toMatchObject({
      canonicalArtist: 'beck',
      showTime: '19:30:00',
    });
  });

  it('keeps a stored 19:30 when a later listing says 07:30 on the same page', () => {
    const { aligned, promotions } = alignToNights(
      [withUrl(listing('beck', '07:30:00'), page)],
      [withUrl(stored('a', 'beck', '19:30:00'), page)],
    );
    expect(promotions).toEqual([]);
    expect(aligned[0]?.showTime).toBe('19:30:00');
  });

  it('joins the two readings inside one crawl, so both upsert under the evening time', () => {
    const { aligned } = alignToNights(
      [
        withUrl(listing('beck', '07:30:00'), page),
        withUrl(listing('beck', '19:30:00'), page),
      ],
      [],
    );
    expect(aligned.map((row) => row.showTime)).toEqual([
      '19:30:00',
      '19:30:00',
    ]);
  });

  it('needs the same page URL: without one, or on another page, two times stay two nights', () => {
    for (const eventUrl of [
      null,
      'https://www.redrocksonline.com/events/other/',
    ]) {
      const { aligned, promotions } = alignToNights(
        [withUrl(listing('beck', '19:30:00'), eventUrl)],
        [withUrl(stored('a', 'beck', '07:30:00'), page)],
      );
      expect(promotions).toEqual([]);
      expect(aligned[0]?.showTime).toBe('19:30:00');
    }
  });
});

describe('alignToNights', () => {
  it('leaves an exact match and a new night alone', () => {
    const { aligned, promotions } = alignToNights(
      [listing('beck', '19:00:00'), listing('nas', null)],
      [stored('a', 'beck', '19:00:00')],
    );
    expect(aligned).toEqual([
      listing('beck', '19:00:00'),
      listing('nas', null),
    ]);
    expect(promotions).toEqual([]);
  });

  it('folds "Rossi." into a stored "rossi" (both untimed)', () => {
    const { aligned } = alignToNights(
      [listing('rossi.', null)],
      [stored('a', 'rossi', null)],
    );
    expect(aligned[0]?.canonicalArtist).toBe('rossi');
  });

  it('folds two listings of one night inside a single crawl', () => {
    const { aligned } = alignToNights(
      [listing('rossi', null), listing('rossi.', null)],
      [],
    );
    expect(aligned.map((row) => row.canonicalArtist)).toEqual([
      'rossi',
      'rossi',
    ]);
  });

  it('folds an untimed listing into a stored timed row, keeping its time', () => {
    const { aligned, promotions } = alignToNights(
      [listing('beck', null)],
      [stored('a', 'beck', '19:00:00')],
    );
    expect(aligned[0]).toEqual(listing('beck', '19:00:00'));
    expect(promotions).toEqual([]);
  });

  it('dates a stored untimed row from a timed listing', () => {
    const { aligned, promotions } = alignToNights(
      [listing('beck', '19:30')],
      [stored('a', 'beck', null)],
    );
    expect(aligned[0]?.showTime).toBe('19:30:00');
    expect(promotions).toEqual([{ id: 'a', showTime: '19:30:00' }]);
  });

  it('lets a timed listing claim the night even when the untimed one comes first', () => {
    const { aligned } = alignToNights(
      [listing('beck', null), listing('beck', '19:00:00')],
      [],
    );
    expect(aligned.map((row) => row.showTime)).toEqual([
      '19:00:00',
      '19:00:00',
    ]);
  });

  it('keeps an early and a late show as two nights', () => {
    const { aligned } = alignToNights(
      [listing('beck', '20:30:00')],
      [stored('a', 'beck', '18:00:00')],
    );
    expect(aligned[0]).toEqual(listing('beck', '20:30:00'));
  });

  it('does not guess for an untimed listing two timed shows both fit', () => {
    const { aligned } = alignToNights(
      [listing('beck', null)],
      [stored('a', 'beck', '18:00:00'), stored('b', 'beck', '21:00:00')],
    );
    expect(aligned[0]).toEqual(listing('beck', null));
  });

  it('never merges different artists or different dates', () => {
    const other = { ...listing('beck', null), date: '2026-12-13' };
    const { aligned } = alignToNights(
      [listing('nas', null), other],
      [stored('a', 'beck', null)],
    );
    expect(aligned[0]?.canonicalArtist).toBe('nas');
    expect(aligned[1]).toEqual(other);
  });
});

interface Bill {
  headliners?: string[];
  supportingArtists?: string[];
  canonicalHeadliners?: string[];
  canonicalSupporting?: string[];
}

// A title-shaped listing whose ladder named the real act.
const titled = (showTime: string | null) => ({
  ...listing('jazz series presents', showTime),
  headliners: ['Kokoroko'],
});
// That listing once it has landed on the manual row keyed `kokoroko`.
const landed = (showTime: string) => ({
  ...titled(showTime),
  canonicalArtist: 'kokoroko',
});

describe('alignToNights: landing on a show added by hand', () => {
  // As the events row holds it: the canonical lineup beside the key.
  const manual = (
    id: string,
    canonicalArtist: string,
    showTime: string | null,
    bill: Bill = { canonicalHeadliners: [canonicalArtist] },
  ) => ({ ...stored(id, canonicalArtist, showTime), manual: true, ...bill });

  it('inserts a different act on the same night, both untimed', () => {
    const other = {
      ...listing('nubya garcia', null),
      headliners: ['Nubya Garcia'],
    };
    const { aligned, promotions } = alignToNights(
      [other],
      [manual('m', 'kokoroko', null)],
    );
    expect(aligned[0]).toEqual(other);
    expect(promotions).toEqual([]);
  });

  it('lands a title-shaped listing on a manual row that has only its raw headliners', () => {
    const { aligned } = alignToNights(
      [titled('19:00:00')],
      [manual('m', 'kokoroko', '19:00:00', { headliners: ['Kokoroko'] })],
    );
    expect(aligned[0]).toEqual(landed('19:00:00'));
  });

  it('lands when the headliner differs only in casing and punctuation', () => {
    const shouted = {
      ...listing('jazz series presents', '19:00:00'),
      headliners: ['KOKOROKO!'],
    };
    const { aligned } = alignToNights(
      [shouted],
      [manual('m', 'kokoroko', '19:00:00', { headliners: ['Kokoroko'] })],
    );
    expect(aligned[0]).toEqual({ ...shouted, canonicalArtist: 'kokoroko' });
  });

  it('lands when the only act on both bills is a supporting one', () => {
    const opener = {
      ...listing('jazz series presents', '19:00:00'),
      headliners: ['Alfa Mist'],
      supportingArtists: ['Ego Ella May'],
    };
    const { aligned } = alignToNights(
      [opener],
      [
        manual('m', 'kokoroko', '19:00:00', {
          headliners: ['Kokoroko'],
          supportingArtists: ['Ego Ella May'],
        }),
      ],
    );
    expect(aligned[0]).toEqual({ ...opener, canonicalArtist: 'kokoroko' });
  });

  it('inserts when a manual name is only part of a word in the listing', () => {
    const lowland = {
      ...listing('lowland hum', '19:00:00'),
      headliners: ['Lowland Hum'],
    };
    const { aligned } = alignToNights(
      [lowland],
      [manual('m', 'low', '19:00:00', { headliners: ['Low'] })],
    );
    expect(aligned[0]).toEqual(lowland);
  });

  it('lands a title-shaped listing on the one manual row with its real headliner', () => {
    const { aligned, promotions } = alignToNights(
      [titled('19:00:00')],
      [manual('m', 'kokoroko', '19:00:00')],
    );
    expect(aligned[0]).toEqual(landed('19:00:00'));
    expect(promotions).toEqual([]);
  });

  it('lands the matching time of an early and a late show and leaves the other to insert', () => {
    const { aligned, promotions } = alignToNights(
      [titled('22:00:00'), titled('19:00:00')],
      [manual('m', 'kokoroko', '19:00:00')],
    );
    expect(aligned).toEqual([titled('22:00:00'), landed('19:00:00')]);
    expect(promotions).toEqual([]);
  });

  it('inserts when two manual rows share the date', () => {
    const { aligned } = alignToNights(
      [titled('19:00:00')],
      [manual('m1', 'kokoroko', '19:00:00'), manual('m2', 'nubya', null)],
    );
    expect(aligned[0]).toEqual(titled('19:00:00'));
  });

  it('inserts when the date has no manual row', () => {
    const { aligned } = alignToNights(
      [titled('19:00:00')],
      [stored('c', 'kokoroko', '19:00:00')],
    );
    expect(aligned[0]).toEqual(titled('19:00:00'));
  });

  it('inserts when both sides have a time and the times differ', () => {
    const { aligned, promotions } = alignToNights(
      [titled('21:00:00')],
      [manual('m', 'kokoroko', '19:00:00')],
    );
    expect(aligned[0]).toEqual(titled('21:00:00'));
    expect(promotions).toEqual([]);
  });

  it('lands an untimed listing on a timed manual row, under the row time', () => {
    const { aligned, promotions } = alignToNights(
      [titled(null)],
      [manual('m', 'kokoroko', '19:00:00')],
    );
    expect(aligned[0]).toEqual(landed('19:00:00'));
    expect(promotions).toEqual([]);
  });

  it('lands a timed listing on an untimed manual row and dates the row', () => {
    const { aligned, promotions } = alignToNights(
      [titled('19:30')],
      [manual('m', 'kokoroko', null)],
    );
    expect(aligned[0]).toEqual(landed('19:30:00'));
    expect(promotions).toEqual([{ id: 'm', showTime: '19:30:00' }]);
  });

  it('does not guess an untimed manual row onto one of an early and a late listing', () => {
    const { aligned, promotions } = alignToNights(
      [titled('19:00:00'), titled('22:00:00')],
      [manual('m', 'kokoroko', null)],
    );
    expect(aligned.map((row) => row.canonicalArtist)).toEqual([
      'jazz series presents',
      'jazz series presents',
    ]);
    expect(promotions).toEqual([]);
  });

  it('never lands on a manual row of another date', () => {
    const { aligned } = alignToNights(
      [{ ...titled(null), date: '2026-12-13' }],
      [manual('m', 'kokoroko', null)],
    );
    expect(aligned[0]?.canonicalArtist).toBe('jazz series presents');
  });

  it('prefers a same-night row over the manual one', () => {
    const { aligned } = alignToNights(
      [titled('19:00:00')],
      [
        stored('c', 'jazz series presents', '19:00:00'),
        manual('m', 'kokoroko', '19:00:00'),
      ],
    );
    expect(aligned[0]).toEqual(titled('19:00:00'));
  });
});

describe('manualLandingTarget', () => {
  const slot = (showTime: string | null, isManual = true) => ({
    ...listing('kokoroko', showTime),
    manual: isManual,
  });
  const none = new Set<string>();
  // A listing keyed on something else that bills the manual row's act.
  const act = (showTime: string | null) => ({
    ...listing('x', showTime),
    headliners: ['Kokoroko'],
  });

  it('returns the one manual row when the times agree or one side is untimed', () => {
    const row = slot('19:00:00');
    expect(manualLandingTarget([row], act('19:00'), none)).toBe(row);
    expect(manualLandingTarget([row], act(null), none)).toBe(row);
  });

  it('returns null for zero or several manual rows, or differing times', () => {
    expect(
      manualLandingTarget([slot(null, false)], act(null), none),
    ).toBeNull();
    expect(
      manualLandingTarget([slot(null), slot(null)], act(null), none),
    ).toBeNull();
    expect(
      manualLandingTarget([slot('19:00:00')], act('21:00'), none),
    ).toBeNull();
  });

  it('returns null when the two bills share no act', () => {
    expect(
      manualLandingTarget([slot('19:00:00')], listing('x', '19:00'), none),
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { alignToNights } from './align-nights.js';

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

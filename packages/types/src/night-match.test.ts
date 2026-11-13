import { describe, expect, it } from 'vitest';
import { nightArtistKey, sameNight, showTimeKey } from './night-match.js';

const night = (canonicalArtist: string, showTime: string | null) => ({
  canonicalArtist,
  date: '2026-12-12',
  showTime,
});

describe('showTimeKey', () => {
  it('pads to HH:MM:SS and reads junk as untimed', () => {
    expect(showTimeKey('7:30')).toBe('07:30:00');
    expect(showTimeKey('19:00:15')).toBe('19:00:15');
    expect(showTimeKey('')).toBe('');
    expect(showTimeKey(null)).toBe('');
    expect(showTimeKey('doors')).toBe('');
  });
});

describe('nightArtistKey', () => {
  it('trims edge punctuation only', () => {
    expect(nightArtistKey('rossi.')).toBe('rossi');
    expect(nightArtistKey(' "rossi" ')).toBe('rossi');
    expect(nightArtistKey('m.i.a.')).toBe('m.i.a');
    expect(nightArtistKey('blink-182')).toBe('blink-182');
  });
});

describe('sameNight', () => {
  it('matches the Church case: two untimed rows, one trailing period', () => {
    expect(sameNight(night('rossi', null), night('rossi.', null))).toBe(true);
  });

  it('matches equal times and an untimed row against a timed one', () => {
    expect(sameNight(night('beck', '19:00'), night('beck', '19:00:00'))).toBe(
      true,
    );
    expect(sameNight(night('beck', null), night('beck', '19:00:00'))).toBe(
      true,
    );
  });

  it('keeps two different times, dates and artists apart', () => {
    expect(
      sameNight(night('beck', '18:00:00'), night('beck', '21:00:00')),
    ).toBe(false);
    expect(
      sameNight(night('beck', null), {
        ...night('beck', null),
        date: '2026-12-13',
      }),
    ).toBe(false);
    expect(sameNight(night('beck', null), night('nas', null))).toBe(false);
  });

  it('never matches an artist that trims to nothing', () => {
    expect(sameNight(night('...', null), night('!', null))).toBe(false);
  });
});

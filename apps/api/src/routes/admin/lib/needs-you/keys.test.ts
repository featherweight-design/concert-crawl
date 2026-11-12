import { describe, expect, it } from 'vitest';
import { NEEDS_YOU_KINDS, addDays, denverDate, parseItemKey } from './keys.js';

describe('parseItemKey', () => {
  it('reads the kind and the rest of a <kind>:<id>[:<evidence>] key', () => {
    expect(parseItemKey('show-dropped:abc:1731000000000')).toEqual({
      kind: 'show-dropped',
      rest: 'abc:1731000000000',
    });
    expect(parseItemKey('price-batch:all')).toEqual({
      kind: 'price-batch',
      rest: 'all',
    });
  });

  it.each(['', 'show-dropped', 'show-dropped:', ':abc', 'nonsense:abc'])(
    'refuses %j',
    (key) => {
      expect(parseItemKey(key)).toBeNull();
    },
  );

  it('knows every kind the type lists', () => {
    expect([...NEEDS_YOU_KINDS].sort()).toEqual([
      'artist',
      'bug',
      'event-low-confidence',
      'price-batch',
      'price-check',
      'show-dropped',
      'show-moved',
      'venue-blocked',
      'venue-failing',
    ]);
  });
});

describe('denverDate', () => {
  it('uses the Denver calendar day, not the UTC one', () => {
    // 03:30 UTC on the 13th is 8:30 PM MST on the 12th.
    expect(denverDate(new Date('2026-11-13T03:30:00Z'))).toBe('2026-11-12');
    // 15:00 UTC is the same Denver day.
    expect(denverDate(new Date('2026-11-13T15:00:00Z'))).toBe('2026-11-13');
  });
});

describe('addDays', () => {
  it('adds calendar days across a month and a year boundary', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-11-12', 0)).toBe('2026-11-12');
  });

  it.each(['garbage', '2026-1-2', '', '2026-11-12T00:00:00Z'])(
    'refuses %j rather than guessing a date',
    (bad) => {
      expect(() => addDays(bad, 1)).toThrow(RangeError);
    },
  );

  it('refuses a fractional day count', () => {
    expect(() => addDays('2026-11-12', 1.5)).toThrow(RangeError);
  });
});

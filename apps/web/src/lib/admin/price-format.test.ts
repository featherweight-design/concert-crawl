import { describe, expect, it } from 'vitest';
import {
  adminDollars,
  adminPriceRange,
  adminSubmittedRange,
} from './price-format';

describe('adminDollars', () => {
  it('drops cents on whole dollars and keeps two places otherwise', () => {
    expect(adminDollars('44.00')).toBe('$44');
    expect(adminDollars('44.5')).toBe('$44.50');
    expect(adminDollars(45.5)).toBe('$45.50');
    expect(adminDollars('0')).toBe('$0');
  });

  it('groups thousands', () => {
    expect(adminDollars('1250.00')).toBe('$1,250');
    expect(adminDollars(1250.5)).toBe('$1,250.50');
  });

  it('is null for no price or one that does not parse', () => {
    expect(adminDollars(null)).toBeNull();
    expect(adminDollars(undefined)).toBeNull();
    expect(adminDollars('')).toBeNull();
    expect(adminDollars('  ')).toBeNull();
    expect(adminDollars('n/a')).toBeNull();
    expect(adminDollars(Number.NaN)).toBeNull();
  });
});

// Rows both helpers agree on: everything but a missing top.
const SHARED: ReadonlyArray<[string | number, string | number, string]> = [
  ['40.00', '60.00', '$40–$60'],
  ['40.00', '40.00', '$40'],
  ['40', '40.00', '$40'],
  ['45.5', '60.00', '$45.50–$60'],
  ['0.00', '0.00', '$0'],
  ['0.00', '20.00', '$0–$20'],
  ['89.50', '1250.00', '$89.50–$1,250'],
  ['1250.00', '1250.50', '$1,250–$1,250.50'],
  ['60.00', '40.00', '$60–$40'],
  [65, 495, '$65–$495'],
];

describe('adminPriceRange (an event price)', () => {
  it.each(SHARED)('(%s, %s) reads %s', (min, max, expected) => {
    expect(adminPriceRange(min, max)).toBe(expected);
  });

  it('reads a price with no top as the single price it is', () => {
    expect(adminPriceRange('15.00', null)).toBe('$15');
    expect(adminPriceRange('45.50', null)).toBe('$45.50');
    expect(adminPriceRange('0.00', null)).toBe('$0');
    expect(adminPriceRange('40.00', 'n/a')).toBe('$40');
  });

  it('is null without a readable bottom price', () => {
    expect(adminPriceRange(null, null)).toBeNull();
    expect(adminPriceRange(null, '20.00')).toBeNull();
    expect(adminPriceRange('', null)).toBeNull();
    expect(adminPriceRange('n/a', '20.00')).toBeNull();
  });
});

describe('adminSubmittedRange (a fan submission)', () => {
  it.each(SHARED)('(%s, %s) reads %s', (min, max, expected) => {
    expect(adminSubmittedRange(min, max)).toBe(expected);
  });

  it('reads a price with no top as "and up", except a free one', () => {
    expect(adminSubmittedRange('45.00', null)).toBe('$45+');
    expect(adminSubmittedRange('45.50', null)).toBe('$45.50+');
    expect(adminSubmittedRange('1250.00', null)).toBe('$1,250+');
    expect(adminSubmittedRange('0.00', null)).toBe('$0');
  });

  it('reads an unreadable top as the single price, not "and up"', () => {
    expect(adminSubmittedRange('45.00', 'n/a')).toBe('$45');
    expect(adminSubmittedRange('45.00', '')).toBe('$45');
  });

  it('is null without a readable bottom price', () => {
    expect(adminSubmittedRange(null, null)).toBeNull();
    expect(adminSubmittedRange('', '20.00')).toBeNull();
  });
});

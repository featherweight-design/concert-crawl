import { describe, expect, it } from 'vitest';
import { formatDelistedDate } from './delisted-date';

describe('formatDelistedDate', () => {
  it('prints a short Mountain Time date', () => {
    expect(formatDelistedDate('2026-11-10T18:00:00.000Z')).toBe('Nov 10');
  });

  it('reads the date in Denver, not UTC', () => {
    // 03:00 UTC on Nov 11 is still the evening of Nov 10 in Denver.
    expect(formatDelistedDate('2026-11-11T03:00:00.000Z')).toBe('Nov 10');
  });

  it('returns null for an absent or unreadable timestamp', () => {
    expect(formatDelistedDate(null)).toBeNull();
    expect(formatDelistedDate(undefined)).toBeNull();
    expect(formatDelistedDate('not-a-date')).toBeNull();
  });
});

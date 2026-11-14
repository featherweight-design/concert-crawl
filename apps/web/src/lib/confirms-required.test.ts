import { afterEach, describe, expect, it, vi } from 'vitest';
import { SP_POLICY } from '@concert-crawl/types';
import { corroborationConfirmsRequired } from './confirms-required';

// A fixed "now" at noon Mountain on 2026-06-10, so day arithmetic is exact.
const NOW = new Date('2026-06-10T18:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

const at = (date: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  return corroborationConfirmsRequired(date);
};

describe('corroborationConfirmsRequired', () => {
  it('needs the standard count for a show well ahead', () => {
    expect(at('2026-09-01')).toBe(SP_POLICY.confirmsRequired);
  });

  it('needs the imminent count on the day of the show', () => {
    expect(at('2026-06-10')).toBe(SP_POLICY.confirmsRequiredImminent);
  });

  it('is imminent through the threshold and standard just past it', () => {
    const edge = SP_POLICY.imminentThresholdDays;
    const day = (offset: number) =>
      new Date(Date.UTC(2026, 5, 10 + offset)).toISOString().slice(0, 10);
    expect(at(day(edge))).toBe(SP_POLICY.confirmsRequiredImminent);
    expect(at(day(edge + 1))).toBe(SP_POLICY.confirmsRequired);
  });

  it('is not imminent for a show already past', () => {
    expect(at('2026-06-01')).toBe(SP_POLICY.confirmsRequired);
  });

  it('falls back to the standard count for a date it cannot read', () => {
    expect(at('soon')).toBe(SP_POLICY.confirmsRequired);
    expect(at('')).toBe(SP_POLICY.confirmsRequired);
  });
});

import { describe, expect, it } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.passport;

// `passport_book` / `passport_book_m`: the subtitle counts the stamps.
describe('passport copy', () => {
  it('counts nights, venues and pages in the subtitle', () => {
    expect(COPY.statsSubtitle(11, 8, 3)).toBe(
      '11 nights, 8 venues, three pages so far.',
    );
  });

  it('uses the singular for one, and digits past ten pages', () => {
    expect(COPY.statsSubtitle(1, 1, 1)).toBe(
      '1 night, 1 venue, one page so far.',
    );
    expect(COPY.statsSubtitle(44, 12, 12)).toBe(
      '44 nights, 12 venues, 12 pages so far.',
    );
  });

  it('reads the phone pager as "Page 3 · 11 nights", without "so far"', () => {
    expect(COPY.pageNightsSoFar(3, 11)).toBe('Page 3 · 11 nights');
    expect(COPY.pageNightsSoFar(1, 1)).toBe('Page 1 · 1 night');
  });
});

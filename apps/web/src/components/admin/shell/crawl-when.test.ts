import { describe, expect, it } from 'vitest';
import { crawlWhen } from './crawl-when';

// Nov 13 2026 3:00 AM Mountain (MST, UTC-7) is 10:00 UTC.
const NOW = new Date('2026-11-13T18:00:00Z');

describe('crawlWhen', () => {
  it('says today, yesterday, then the day, in Mountain Time', () => {
    expect(crawlWhen('2026-11-13T10:00:00Z', NOW)).toBe('today, 3:00 AM');
    expect(crawlWhen('2026-11-12T10:00:00Z', NOW)).toBe('yesterday, 3:00 AM');
    expect(crawlWhen('2026-11-09T10:00:00Z', NOW)).toBe('Nov 9, 3:00 AM');
  });

  it('is null for a time it cannot read', () => {
    expect(crawlWhen('nope', NOW)).toBeNull();
  });
});

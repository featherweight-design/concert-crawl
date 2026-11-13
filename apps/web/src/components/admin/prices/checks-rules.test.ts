import { describe, expect, it } from 'vitest';
import { decidedWhen, filedWhen, shortDay } from './checks-rules';

const words = { today: 'Today', yesterday: 'Yesterday' };
// Noon on Nov 12 in Denver (UTC-7).
const now = new Date('2026-11-12T19:00:00Z');

describe('shortDay', () => {
  it('draws a show date, with the weekday on request', () => {
    expect(shortDay('2026-09-18')).toBe('Sep 18');
    expect(shortDay('2026-11-12', true)).toBe('Thu Nov 12');
    expect(shortDay('nope')).toBe('nope');
  });
});

describe('filedWhen', () => {
  it('says Today, Yesterday or the date, by Mountain Time day', () => {
    expect(filedWhen('2026-11-12T16:14:00Z', words, now)).toBe('Today');
    expect(filedWhen('2026-11-11T20:00:00Z', words, now)).toBe('Yesterday');
    expect(filedWhen('2026-09-18T15:00:00Z', words, now)).toBe('Sep 18');
  });

  it('counts the Denver evening as the same day, not the next UTC day', () => {
    // 03:00 UTC Nov 13 is 8 PM Nov 12 in Denver.
    expect(filedWhen('2026-11-13T03:00:00Z', words, now)).toBe('Today');
  });

  it('finds yesterday by calendar day across the spring-forward night', () => {
    // 00:30 MDT on Mar 9 2026 (DST began Mar 8); 24 hours earlier is still Mar 7.
    const afterDst = new Date('2026-03-09T06:30:00Z');
    expect(filedWhen('2026-03-08T20:00:00Z', words, afterDst)).toBe(
      'Yesterday',
    );
  });

  it('is empty for a bad timestamp', () => {
    expect(filedWhen('not a date', words, now)).toBe('');
  });
});

describe('decidedWhen', () => {
  it('adds the time for a recent decision and drops it for an older one', () => {
    expect(decidedWhen('2026-11-11T16:40:00Z', now)).toBe('Nov 11, 9:40 AM');
    expect(decidedWhen('2026-11-09T16:40:00Z', now)).toBe('Nov 9');
  });
});

import { describe, expect, it } from 'vitest';
import {
  countAfterRemoval,
  eightAmMountain,
  mountainDayAhead,
  snoozeDayLabel,
} from './needs-you-rules';

describe('snooze times', () => {
  it('returns at 8 AM Mountain, with the offset that day has', () => {
    expect(eightAmMountain('2026-11-14')).toBe('2026-11-14T08:00:00-07:00');
    expect(eightAmMountain('2026-07-01')).toBe('2026-07-01T08:00:00-06:00');
  });

  it('counts days from Mountain Time, not from UTC', () => {
    // 2026-11-13 03:00 UTC is still the evening of the 12th in Denver.
    const now = new Date('2026-11-13T03:00:00Z');
    expect(mountainDayAhead(now, 1)).toBe('2026-11-13');
    expect(mountainDayAhead(now, 7)).toBe('2026-11-19');
  });

  it('labels the return day', () => {
    expect(snoozeDayLabel('2026-11-18')).toBe('Wed, Nov 18');
  });
});

describe('countAfterRemoval', () => {
  const count = {
    decisions: 3,
    handledToday: 2,
    byKind: {
      'show-dropped': 2,
      'show-moved': 0,
      'venue-failing': 1,
      'venue-blocked': 0,
      artist: 0,
      'event-low-confidence': 0,
      'price-check': 0,
      'price-batch': 0,
      bug: 0,
    },
  };

  it('an answer is one fewer of its kind and one more handled', () => {
    const next = countAfterRemoval(count, 'show-dropped', true);
    expect(next.decisions).toBe(2);
    expect(next.handledToday).toBe(3);
    expect(next.byKind['show-dropped']).toBe(1);
  });

  it('a snooze leaves handled alone and never goes below zero', () => {
    const next = countAfterRemoval(count, 'bug', false);
    expect(next.handledToday).toBe(2);
    expect(next.byKind.bug).toBe(0);
  });
});

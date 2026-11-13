import { describe, expect, it } from 'vitest';
import {
  countAfterRemoval,
  eightAmMountain,
  evidenceText,
  metaTime,
  mountainDayAhead,
  snoozeDayLabel,
} from './needs-you-rules';

describe('metaTime', () => {
  it('says a stored time the way the board does', () => {
    expect(metaTime('20:00:00')).toBe('8 PM');
    expect(metaTime('19:30:00')).toBe('7:30 PM');
    expect(metaTime('11:00:00')).toBe('11 AM');
  });

  it('handles midnight and noon', () => {
    expect(metaTime('00:00:00')).toBe('12 AM');
    expect(metaTime('12:15:00')).toBe('12:15 PM');
  });

  it('leaves the time out when there is none or it does not parse', () => {
    expect(metaTime(null)).toBeNull();
    expect(metaTime(undefined)).toBeNull();
    expect(metaTime('')).toBeNull();
    expect(metaTime('TBA')).toBeNull();
    expect(metaTime('25:00:00')).toBeNull();
  });
});

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

describe('evidenceText', () => {
  it('says an ISO date the way the rest of the app does', () => {
    expect(evidenceText('Next show', '2026-11-12')).toBe('Thu Nov 12');
    expect(evidenceText('Last seen', '2026-11-05T18:00:00Z')).toBe('Thu Nov 5');
  });

  it('puts an artist match status in words and passes the rest through', () => {
    expect(evidenceText('Match status', 'no_match')).toBe('No match found');
    expect(evidenceText('Match status', 'ambiguous')).toBe(
      'More than one artist fits',
    );
    expect(evidenceText('Match status', 'unmatched')).toBe('unmatched');
    expect(evidenceText('Page', '/events/abc')).toBe('/events/abc');
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

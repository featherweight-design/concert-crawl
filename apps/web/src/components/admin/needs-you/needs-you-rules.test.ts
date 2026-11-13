import { describe, expect, it } from 'vitest';
import {
  causeText,
  countAfterRemoval,
  eightAmMountain,
  evidenceText,
  lastRunsOf,
  leadFirst,
  metaTime,
  mountainDay,
  mountainDayAhead,
  mountainStamp,
  snoozeDayLabel,
  statusPhrase,
  whenChipOf,
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

describe('panel helpers', () => {
  it('says an instant in Mountain Time', () => {
    expect(mountainDay('2026-11-11T12:00:00Z')).toBe('Nov 11');
    expect(mountainStamp('2026-11-09T10:00:00Z')).toBe('Nov 9, 3 AM');
    expect(mountainStamp('2026-11-11T10:02:00Z')).toBe('Nov 11, 3:02 AM');
    expect(mountainStamp('nope')).toBeNull();
  });

  it('builds the when chip', () => {
    expect(whenChipOf('2026-11-13', '2026-11-12')).toEqual({
      text: 'Tomorrow · Fri Nov 13',
      soon: true,
    });
    expect(whenChipOf('2026-11-15', '2026-11-12')?.text).toBe(
      'In 3 days · Sun Nov 15',
    );
    expect(whenChipOf('2026-12-30', '2026-11-12')?.text).toBe('Wed Dec 30');
    expect(whenChipOf(null, '2026-11-12')).toBeNull();
  });

  it('names an HTTP status, or falls back', () => {
    expect(statusPhrase('429')).toBe('429 Too Many Requests');
    expect(statusPhrase('418')).toBe('HTTP 418');
  });

  it('puts the suggested answer first and keeps the rest in order', () => {
    const base = { notifiesFans: false, undoable: false };
    const ordered = leadFirst({
      answers: [
        { ...base, slug: 'a', label: 'A', suggested: false },
        { ...base, slug: 'b', label: 'B', suggested: true },
        { ...base, slug: 'c', label: 'C', suggested: false },
      ],
    }).map((item) => item.slug);
    expect(ordered).toEqual(['b', 'a', 'c']);
  });

  it('keeps the four newest runs and the status words', () => {
    const runs = ['01', '02', '03', '04', '05'].map((day) => ({
      at: `2026-11-${day}T12:00:00Z`,
      status: day === '05' ? 'success' : 'failed',
      errorMessage: null,
    }));
    const listed = lastRunsOf({ lastRuns: runs });
    expect(listed.map((run) => run.day)).toEqual([
      'Nov 5',
      'Nov 4',
      'Nov 3',
      'Nov 2',
    ]);
    expect(listed[0]?.status).toBe('OK');
    expect(listed[1]?.status).toBe('Failed');
  });

  it('turns an error class into a sentence and passes an unknown one through', () => {
    expect(causeText('timeout')).toBe('The site is not answering in time.');
    expect(causeText('weird')).toBe('weird');
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

import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildPauseBody,
  isPickable,
  monthGrid,
  pausedStateLine,
  resumeDate,
  shiftMonth,
  type PausedVenue,
} from './pause-rules';

const TODAY = '2026-11-12';

describe('pause rules', () => {
  it('builds the full body, and refuses Other without a note or a date unpicked', () => {
    expect(
      buildPauseBody('waiting_on_permission', 'ignored', 'manual', null),
    ).toEqual({
      reason: 'waiting_on_permission',
      resume: { mode: 'manual' },
    });
    expect(buildPauseBody('other', '  moved  ', 'twoWeeks', null)).toEqual({
      reason: 'other',
      note: 'moved',
      resume: { mode: 'in_days', days: 14 },
    });
    expect(buildPauseBody('other', '   ', 'manual', null)).toBeNull();
    expect(buildPauseBody('site_broken_or_moved', '', 'date', null)).toBeNull();
    expect(
      buildPauseBody('site_broken_or_moved', '', 'date', '2026-11-16'),
    ).toEqual({
      reason: 'site_broken_or_moved',
      resume: { mode: 'on', date: '2026-11-16' },
    });
  });

  it('dates the resume line', () => {
    expect(resumeDate('manual', null, TODAY)).toBeNull();
    expect(resumeDate('twoWeeks', null, TODAY)).toBe('2026-11-26');
    expect(resumeDate('date', '2026-12-01', TODAY)).toBe('2026-12-01');
  });

  it('lets you pick after today and within a year', () => {
    expect(isPickable(TODAY, TODAY)).toBe(false);
    expect(isPickable('2026-11-13', TODAY)).toBe(true);
    expect(isPickable(addDays(TODAY, 366), TODAY)).toBe(true);
    expect(isPickable(addDays(TODAY, 367), TODAY)).toBe(false);
  });

  it('lays a month out from Sunday', () => {
    // Nov 1 2026 is a Sunday: no padding, as `A3/03/pause-panel-d` draws it.
    const november = monthGrid('2026-11');
    expect(november[0]).toBe('2026-11-01');
    expect(november).toHaveLength(30);
    // Dec 1 2026 is a Tuesday.
    const december = monthGrid('2026-12');
    expect(december.slice(0, 3)).toEqual([null, null, '2026-12-01']);
    expect(december.at(-1)).toBe('2026-12-31');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('writes the paused state line', () => {
    const paused = (over: Partial<PausedVenue>): PausedVenue => ({
      crawlPausedAt: '2026-10-28T15:00:00Z',
      crawlPauseReason: null,
      crawlPauseNote: null,
      consecutiveFailures: 0,
      ...over,
    });
    expect(pausedStateLine(paused({ crawlPausedAt: null }))).toBeNull();
    expect(
      pausedStateLine(
        paused({
          crawlPausedByName: 'Hugh',
          crawlPauseReason: 'waiting_on_permission',
        }),
      ),
    ).toBe('Paused by Hugh, Oct 28: waiting on permission.');
    expect(
      pausedStateLine(
        paused({
          crawlPausedByName: 'a former admin',
          crawlPauseReason: 'other',
          crawlPauseNote: 'Check back Monday.',
        }),
      ),
    ).toBe('Paused by a former admin, Oct 28: Check back Monday.');
    expect(pausedStateLine(paused({ crawlPausedByName: 'Hugh' }))).toBe(
      'Paused by Hugh, Oct 28.',
    );
    expect(pausedStateLine(paused({ consecutiveFailures: 3 }))).toBe(
      'Auto-paused after 3 failures.',
    );
    expect(pausedStateLine(paused({}))).toBe('Paused since Oct 28.');
  });
});

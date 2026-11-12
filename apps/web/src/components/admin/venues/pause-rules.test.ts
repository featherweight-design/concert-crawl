import { describe, expect, it } from 'vitest';
import type { VenueWithEventCount } from '@concert-crawl/types';
import {
  addDays,
  buildPauseBody,
  canRecrawl,
  fanOut,
  formFromBody,
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
    expect(pausedStateLine(paused({}))).toBe('Paused since Oct 28.');
  });

  it('tells an auto-pause by its missing reason, not its missing name', () => {
    const paused = (over: Partial<PausedVenue>): PausedVenue => ({
      crawlPausedAt: '2026-10-28T15:00:00Z',
      crawlPauseReason: null,
      crawlPauseNote: null,
      consecutiveFailures: 3,
      crawlPausedByName: null,
      ...over,
    });
    // The crawler's auto-pause writes no reason and no pauser.
    expect(pausedStateLine(paused({}))).toBe('Auto-paused after 3 failures.');
    // A hand pause on a failing venue, by an admin since deleted: still theirs.
    expect(
      pausedStateLine(
        paused({
          crawlPausedByName: 'a former admin',
          crawlPauseReason: 'site_broken_or_moved',
        }),
      ),
    ).toBe('Paused by a former admin, Oct 28: site is broken or moved.');
    // An admin kept an auto-pause: a reason now, but the crawler stays the
    // pauser, so there is no name. Not an auto-pause any more.
    expect(
      pausedStateLine(paused({ crawlPauseReason: 'waiting_on_permission' })),
    ).toBe('Paused since Oct 28: waiting on permission.');
  });

  it('reopens the form a body was sent from', () => {
    expect(formFromBody(null)).toEqual({
      reason: 'waiting_on_permission',
      note: '',
      choice: 'manual',
      picked: null,
    });
    expect(
      formFromBody({
        reason: 'other',
        note: 'moved',
        resume: { mode: 'on', date: '2026-11-16' },
      }),
    ).toEqual({
      reason: 'other',
      note: 'moved',
      choice: 'date',
      picked: '2026-11-16',
    });
    expect(
      formFromBody({
        reason: 'site_broken_or_moved',
        resume: { mode: 'in_days', days: 14 },
      }).choice,
    ).toBe('twoWeeks');
  });
});

describe('bulk rules', () => {
  it('re-crawls only a live, verified venue that is crawling', () => {
    const base = {
      active: true,
      verified: true,
      crawlPausedAt: null,
      blockedAt: null,
      consecutiveFailures: 0,
      robotsTxtAllowed: true,
    };
    // fixture: the rule reads only these fields
    const row = (over: object) => ({ ...base, ...over }) as VenueWithEventCount;
    expect(canRecrawl(row({}))).toBe(true);
    expect(canRecrawl(row({ crawlPausedAt: TODAY }))).toBe(false);
    expect(
      canRecrawl(row({ crawlPausedAt: TODAY, consecutiveFailures: 3 })),
    ).toBe(false);
    expect(canRecrawl(row({ blockedAt: TODAY }))).toBe(false);
    expect(canRecrawl(row({ robotsTxtAllowed: false }))).toBe(false);
    expect(canRecrawl(row({ active: false }))).toBe(false);
    expect(canRecrawl(row({ verified: false }))).toBe(false);
  });

  it('fans out per id and collects failures and the first inline error', async () => {
    const result = await fanOut(['a', 'b', 'c', 'd'], (id) => {
      if (id === 'b') return Promise.reject(new Error('network'));
      if (id === 'c') {
        return Promise.resolve({ ok: false, error: 'Pick a date after today' });
      }
      if (id === 'd') return Promise.resolve({ ok: false, error: null });
      return Promise.resolve({ ok: true });
    });
    expect(result).toEqual({
      failed: ['b', 'c', 'd'],
      inlineError: 'Pick a date after today',
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { VenueLatestRun } from '@concert-crawl/types';
import {
  crawlingLabel,
  foldOk,
  latestRunLine,
  matchesFilter,
  needsByVenue,
  parseNeedsYou,
  sortWorstFirst,
  type VenueListRow,
} from './venue-list-rules';

const venue = (name: string, over: Partial<VenueListRow> = {}): VenueListRow =>
  ({
    id: name,
    name,
    slug: name.toLowerCase(),
    active: true,
    crawlPausedAt: null,
    crawlPauseReason: null,
    crawlPauseNote: null,
    blockedAt: null,
    consecutiveFailures: 0,
    robotsTxtAllowed: true,
    removedAt: null,
    neighborhood: null,
    eventCount: 0,
    lastRunStatus: 'success',
    latestRun: null,
    ...over,
  }) as VenueListRow; // fixture: the rules read only these fields

const PAUSED = '2026-11-10T00:00:00Z';

// 2:00 PM in Denver on Nov 12; the runs below are at 3:04 AM that morning.
const NOW = new Date('2026-11-12T21:00:00Z');
const run = (over: Partial<VenueLatestRun> = {}): VenueLatestRun => ({
  status: 'success',
  reason: null,
  at: '2026-11-12T10:04:00Z',
  eventsFound: 40,
  eventsInserted: 0,
  errorMessage: null,
  ...over,
});
const lineFor = (latestRun: VenueLatestRun, over: Partial<VenueListRow> = {}) =>
  latestRunLine(venue('V', { latestRun, ...over }), NOW);

describe('venue list rules', () => {
  it('sorts worst first, then OK by name', () => {
    const sorted = sortWorstFirst([
      venue('Zed'),
      venue('Paused', { crawlPausedAt: PAUSED }),
      venue('Hidden', { active: false }),
      venue('Failing', { lastRunStatus: 'failed', consecutiveFailures: 1 }),
      venue('Auto', { crawlPausedAt: PAUSED, consecutiveFailures: 3 }),
      venue('Blocked', { blockedAt: PAUSED }),
      venue('Abe'),
    ]);
    expect(sorted.map((row) => row.name)).toEqual([
      'Blocked',
      'Auto',
      'Failing',
      'Paused',
      'Hidden',
      'Abe',
      'Zed',
    ]);
  });

  it('ranks the Needs you dot after failing and before paused (ruling 19)', () => {
    const sorted = sortWorstFirst([
      venue('Ok'),
      venue('Paused', { crawlPausedAt: PAUSED }),
      venue('Dot', { needsLook: true }),
      venue('Failing', { lastRunStatus: 'failed', consecutiveFailures: 1 }),
      venue('Paused dot', { crawlPausedAt: PAUSED, needsLook: true }),
    ]);
    expect(sorted.map((row) => row.name)).toEqual([
      'Failing',
      'Dot',
      'Paused dot',
      'Paused',
      'Ok',
    ]);
    // A dot is not OK, so it never folds away.
    expect(foldOk(sorted).shown.map((row) => row.name)).toContain('Dot');
  });

  it('ranks a hidden venue with a dot as the dot, not as hidden', () => {
    const sorted = sortWorstFirst([
      venue('Hidden', { active: false }),
      venue('Paused', { crawlPausedAt: PAUSED }),
      venue('Hidden dot', { active: false, needsLook: true }),
    ]);
    expect(sorted.map((row) => row.name)).toEqual([
      'Hidden dot',
      'Paused',
      'Hidden',
    ]);
  });

  it('accepts a Needs you reply only when each item has a venueId', () => {
    expect(
      parseNeedsYou([{ venueId: 'a', kind: 'bug' }, { venueId: null }]),
    ).toEqual([{ venueId: 'a' }, { venueId: null }]);
    expect(parseNeedsYou([])).toEqual([]);
    expect(parseNeedsYou({ data: [] })).toBeNull();
    expect(parseNeedsYou(null)).toBeNull();
    expect(parseNeedsYou([{ venueId: 42 }])).toBeNull();
    expect(parseNeedsYou([{ kind: 'bug' }])).toBeNull();
    expect(parseNeedsYou(['a'])).toBeNull();
  });

  it('counts every Needs you item with a venue, of any kind, per venue', () => {
    const counts = needsByVenue([
      { venueId: 'a' },
      { venueId: 'a' },
      { venueId: 'b' },
      { venueId: null },
    ]);
    expect([...counts.entries()]).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('filters Needs a look to the venues with a dot', () => {
    expect(matchesFilter(venue('A', { needsLook: true }), 'needsLook')).toBe(
      true,
    );
    expect(matchesFilter(venue('B', { needsLook: false }), 'needsLook')).toBe(
      false,
    );
    expect(matchesFilter(venue('C'), 'needsLook')).toBe(false);
  });

  it('folds OK venues past ten rows, never a single one', () => {
    const many = Array.from({ length: 21 }, (_, i) =>
      venue(`V${String(i).padStart(2, '0')}`),
    );
    expect(foldOk(many).folded).toHaveLength(11);
    expect(foldOk(many.slice(0, 11)).folded).toHaveLength(0);
  });

  it('names the pause reason, and the note for Other', () => {
    expect(
      crawlingLabel(
        venue('A', {
          crawlPausedAt: PAUSED,
          crawlPauseReason: 'waiting_on_permission',
        }),
      ),
    ).toBe('Paused: awaiting reply');
    expect(
      crawlingLabel(
        venue('B', {
          crawlPausedAt: PAUSED,
          crawlPauseReason: 'other',
          crawlPauseNote: 'Ticketmaster migration',
        }),
      ),
    ).toBe('Paused: Ticketmaster migration');
    expect(crawlingLabel(venue('C', { crawlPausedAt: PAUSED }))).toBe(
      undefined,
    );
  });

  it('filters paused, hidden and disallowed apart', () => {
    const hiddenPaused = venue('H', { active: false, crawlPausedAt: PAUSED });
    expect(matchesFilter(hiddenPaused, 'paused')).toBe(false);
    expect(matchesFilter(hiddenPaused, 'hidden')).toBe(true);
    expect(
      matchesFilter(venue('R', { robotsTxtAllowed: false }), 'disallowed'),
    ).toBe(true);
  });

  it('reads an OK run with its time and new shows', () => {
    expect(lineFor(run({ eventsInserted: 2 }))).toBe('OK · 3:04 AM · 2 new');
    expect(lineFor(run())).toBe('OK · 3:04 AM');
    expect(lineFor(run({ at: '2026-11-10T10:04:00Z' }))).toBe('OK · Nov 10');
  });

  it('reads a failure with its reason, or the error line', () => {
    expect(
      lineFor(run({ status: 'failed', reason: 'calendar_not_found' })),
    ).toBe('Failed: calendar block not found');
    expect(
      lineFor(
        run({ status: 'failed', reason: 'error', errorMessage: 'boom\nstack' }),
      ),
    ).toBe('Failed: boom');
    expect(lineFor(run({ status: 'failed', reason: null }))).toBe('Failed');
  });

  it('reads skips by their outcome', () => {
    expect(lineFor(run({ status: 'skipped', reason: 'page_unchanged' }))).toBe(
      'Unchanged · 3:04 AM',
    );
    expect(
      lineFor(run({ status: 'skipped', reason: 'robots_disallowed' })),
    ).toBe('robots.txt: disallowed');
  });

  it('reads a hand-paused venue as its pause, and auto-paused as its run', () => {
    expect(
      lineFor(run({ status: 'skipped', reason: 'crawl_paused' }), {
        crawlPausedAt: '2026-10-28T18:00:00Z',
      }),
    ).toBe('Paused · Oct 28');
    expect(
      lineFor(run({ status: 'failed', reason: 'calendar_not_found' }), {
        crawlPausedAt: PAUSED,
        consecutiveFailures: 3,
      }),
    ).toBe('Failed: calendar block not found');
    expect(
      lineFor(run({ status: 'skipped', reason: 'crawl_paused' }), {
        crawlPausedAt: '2026-10-28T18:00:00Z',
        consecutiveFailures: 3,
      }),
    ).toBe('Paused · Oct 28');
  });

  it('names who paused it when someone did', () => {
    expect(
      lineFor(run({ status: 'skipped', reason: 'crawl_paused' }), {
        crawlPausedAt: '2026-10-28T18:00:00Z',
        crawlPausedByName: 'Hugh',
      }),
    ).toBe('Paused by Hugh · Oct 28');
  });

  it('reads a partial run as partial, whatever its reason', () => {
    expect(
      lineFor(
        run({
          status: 'partial',
          reason: 'no_events_found',
          eventsInserted: 1,
        }),
      ),
    ).toBe('Partial · 3:04 AM · 1 new');
  });

  it('says No runs yet for a venue that never crawled', () => {
    expect(latestRunLine(venue('A'), NOW)).toBe('No runs yet');
  });
});

import { describe, expect, it } from 'vitest';
import type { VenueWithEventCount } from '@concert-crawl/types';
import {
  crawlingLabel,
  foldOk,
  latestRunLine,
  matchesFilter,
  sortWorstFirst,
  withoutTakenDown,
} from './venue-list-rules';

const venue = (
  name: string,
  over: Partial<VenueWithEventCount> = {},
): VenueWithEventCount =>
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
    ...over,
  }) as VenueWithEventCount; // fixture: the rules read only these fields

const PAUSED = '2026-11-10T00:00:00Z';

describe('venue list rules', () => {
  it('drops taken-down venues', () => {
    expect(
      withoutTakenDown([venue('A'), venue('B', { removedAt: PAUSED })]),
    ).toHaveLength(1);
  });

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
    ).toBe('Paused: waiting on permission');
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

  it('reads the latest run as a word until #242', () => {
    expect(latestRunLine(venue('A', { lastRunStatus: null }))).toBe(
      'No runs yet',
    );
    expect(latestRunLine(venue('B', { lastRunStatus: 'failed' }))).toBe(
      'Failed',
    );
  });
});

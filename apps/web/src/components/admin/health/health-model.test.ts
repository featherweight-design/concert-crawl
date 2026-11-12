import { describe, expect, it } from 'vitest';
import {
  artistsTile,
  costTile,
  crawlTileState,
  groupVenues,
  lastNightWindow,
  monthSeries,
  monthToDate,
  summarizeCrawl,
  type CostTileState,
  type GridVenue,
  type HealthStatusRow,
} from './health-model';

const iso = (ms: number) => new Date(ms).toISOString();
const windowOf = (now: string) => {
  const { start, end } = lastNightWindow(new Date(now));
  return [iso(start), iso(end)];
};

describe('lastNightWindow', () => {
  it('is today in MT once the 3 AM crawl has started', () => {
    expect(windowOf('2026-11-12T17:00:00Z')).toEqual([
      '2026-11-12T07:00:00.000Z',
      '2026-11-13T07:00:00.000Z',
    ]);
  });

  it('is yesterday before 3 AM MT', () => {
    expect(windowOf('2026-11-12T08:30:00Z')).toEqual([
      '2026-11-11T07:00:00.000Z',
      '2026-11-12T07:00:00.000Z',
    ]);
  });

  it('spans 25 hours on the night the clocks fall back', () => {
    expect(windowOf('2026-11-01T15:00:00Z')).toEqual([
      '2026-11-01T06:00:00.000Z',
      '2026-11-02T07:00:00.000Z',
    ]);
  });

  it('spans 23 hours on the night the clocks spring forward', () => {
    expect(windowOf('2026-03-08T16:00:00Z')).toEqual([
      '2026-03-08T07:00:00.000Z',
      '2026-03-09T06:00:00.000Z',
    ]);
  });
});

const lastNight = lastNightWindow(new Date('2026-11-12T17:00:00Z'));
const run = (
  status: 'success' | 'failed' | 'skipped' | 'in_progress',
  createdAt = '2026-11-12T10:41:00Z',
  reason: 'page_unchanged' | null = null,
) => ({ status, reason, createdAt, eventsFound: 10, eventsInserted: 2 });
const row = (
  id: string,
  lastRun: HealthStatusRow['lastRun'],
): HealthStatusRow => ({ id, name: id, lastRun });

describe('summarizeCrawl and crawlTileState', () => {
  it('counts only last night’s finished runs', () => {
    const summary = summarizeCrawl(
      [
        row('a', run('success')),
        row('b', run('skipped', '2026-11-12T10:20:00Z')),
        row('c', run('failed')),
        row('d', run('success', '2026-11-10T10:00:00Z')),
        row('e', run('in_progress')),
        row('f', null),
      ],
      lastNight,
    );
    expect(summary).toEqual({
      ok: 2,
      total: 3,
      failed: 1,
      finishedAt: '2026-11-12T10:41:00Z',
      shows: 30,
      added: 6,
    });
    expect(crawlTileState(summary)).toBe('failed');
  });

  it('is On time with no failures, and noRuns with no runs', () => {
    const ok = summarizeCrawl([row('a', run('success'))], lastNight);
    expect(crawlTileState(ok)).toBe('onTime');
    expect(crawlTileState(summarizeCrawl([], lastNight))).toBe('noRuns');
  });
});

describe('costTile', () => {
  const month = monthToDate(new Date('2026-11-12T17:00:00Z'));

  it('knows the MT month', () => {
    expect(month).toEqual({
      year: 2026,
      month: 11,
      dayOfMonth: 12,
      daysInMonth: 30,
    });
  });

  it('paces the month to date across the whole month', () => {
    expect(costTile(4, 15, month).paceUsd).toBe(10);
  });

  const cases: Array<[number, number | null, CostTileState]> = [
    [4, 15, 'under'],
    [12, 15, 'willGoOver'],
    [16, 15, 'over'],
    [4, null, 'noBudget'],
  ];
  it.each(cases)('$%s against %s is %s', (mtd, budget, state) => {
    expect(costTile(mtd, budget, month).state).toBe(state);
  });

  it('fills the month, leaving days to come empty', () => {
    const series = monthSeries([{ date: '2026-11-03', costUsd: 0.4 }], month);
    expect(series).toHaveLength(30);
    expect(series[2]).toEqual({ date: '2026-11-03', costUsd: 0.4 });
    expect(series[0]?.costUsd).toBe(0);
    expect(series[12]?.costUsd).toBeNull();
  });
});

describe('artistsTile', () => {
  const base = { matched: 1800, auto_matched: 42, unmatched: 5, ambiguous: 4 };

  it('reads To check and its soon chip from the counts', () => {
    expect(artistsTile({ ...base, to_check: 23, to_check_soon: 9 })).toEqual({
      matched: 1842,
      soon: 9,
      toCheck: 23,
    });
  });

  it('drops the soon line when nothing unsure has a show soon', () => {
    expect(artistsTile({ ...base, to_check: 23, to_check_soon: 0 })).toEqual({
      matched: 1842,
      soon: null,
      toCheck: 23,
    });
  });

  it('never sums unmatched and ambiguous into To check', () => {
    expect(
      artistsTile({ ...base, to_check: 0, to_check_soon: 0 }).toCheck,
    ).toBe(0);
  });
});

describe('groupVenues', () => {
  const venue = (id: string, patch: Partial<GridVenue> = {}): GridVenue => ({
    id,
    active: true,
    crawlPausedAt: null,
    blockedAt: null,
    consecutiveFailures: 0,
    robotsTxtAllowed: true,
    ...patch,
  });

  it('groups worst first, by name, and leaves out what has no group', () => {
    const groups = groupVenues(
      [
        row('Zed', run('success')),
        row('Junkyard', run('failed')),
        row('Levitt', run('skipped', undefined, null)),
        row('Ball Arena', run('skipped', undefined, 'page_unchanged')),
        row('Alpha', run('success')),
        row('Hidden', run('success')),
        row('Blocked', run('failed')),
        row('Robots', run('success')),
        row('Never', null),
        row('Stale', run('success', '2026-11-01T10:00:00Z')),
      ],
      [
        venue('Zed'),
        venue('Junkyard', {
          crawlPausedAt: '2026-11-12T10:41:00Z',
          consecutiveFailures: 3,
        }),
        venue('Levitt', { crawlPausedAt: '2026-11-01T00:00:00Z' }),
        venue('Ball Arena'),
        venue('Alpha'),
        venue('Hidden', { active: false }),
        venue('Blocked', { blockedAt: '2026-11-12T10:00:00Z' }),
        venue('Robots', { robotsTxtAllowed: false }),
        venue('Never'),
        venue('Stale'),
      ],
      lastNight,
    );
    const names = (key: keyof typeof groups) =>
      groups[key].map((cell) => cell.name);
    expect(names('failed')).toEqual(['Junkyard']);
    expect(groups.failed[0]).toMatchObject({ failures: 3, autoPaused: true });
    expect(names('paused')).toEqual(['Levitt']);
    expect(names('quiet')).toEqual(['Ball Arena']);
    expect(names('ok')).toEqual(['Alpha', 'Zed']);
  });
});

import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortTime } from '@/components/admin/venues/overview/overview-rules';
import type { RunRow } from './run-data';
import {
  RUNS_CAP,
  RUNS_STEP,
  defaultInspectPage,
  filterRuns,
  firstFailedPage,
  hasMore,
  inspectHref,
  isFailedPage,
  isNotOk,
  lastFullRuns,
  mergeRuns,
  nextLimit,
  pageLine,
  pageSize,
  runCost,
  runDuration,
  runLine,
  runSummary,
  shortUrl,
} from './runs-rules';

const RUN = ADMIN_COPY.venuesList.latestRun;

const row = (overrides: Partial<RunRow> = {}): RunRow => ({
  id: 'run-1',
  status: 'success',
  reason: null,
  eventsFound: 106,
  eventsInserted: 2,
  durationMs: 230000,
  llmCostUsd: 0.15,
  errorMessage: null,
  createdAt: '2026-11-10T10:01:00.000Z',
  ...overrides,
});

// Newest first, as the API sends them.
const RUNS: RunRow[] = [
  row({
    id: 'nov-11',
    status: 'skipped',
    reason: 'page_unchanged',
    eventsFound: 0,
    eventsInserted: 0,
    durationMs: null,
    llmCostUsd: null,
    createdAt: '2026-11-11T10:02:00.000Z',
  }),
  row({ id: 'nov-10', createdAt: '2026-11-10T10:01:00.000Z' }),
  row({
    id: 'nov-9',
    status: 'failed',
    reason: 'timeout',
    eventsFound: 0,
    eventsInserted: 0,
    createdAt: '2026-11-09T10:02:00.000Z',
  }),
  row({
    id: 'nov-8',
    status: 'skipped',
    reason: 'crawl_paused',
    eventsFound: 0,
    eventsInserted: 0,
    createdAt: '2026-11-08T10:02:00.000Z',
  }),
  row({
    id: 'nov-7',
    eventsFound: 104,
    eventsInserted: 0,
    createdAt: '2026-11-07T10:01:00.000Z',
  }),
];

describe('Load more', () => {
  it('asks for one more step each time, never past the cap', () => {
    expect(nextLimit(RUNS_STEP)).toBe(40);
    expect(nextLimit(80)).toBe(RUNS_CAP);
    expect(nextLimit(RUNS_CAP)).toBe(RUNS_CAP);
  });

  it('shows while a full page came back under the cap', () => {
    expect(hasMore(20, 20)).toBe(true);
    expect(hasMore(40, 40)).toBe(true);
  });

  it('hides when the page came back short', () => {
    expect(hasMore(19, 20)).toBe(false);
    expect(hasMore(0, 20)).toBe(false);
  });

  it('hides at the cap', () => {
    expect(hasMore(RUNS_CAP, RUNS_CAP)).toBe(false);
  });
});

describe('Not OK', () => {
  it('keeps everything but OK and Unchanged', () => {
    expect(RUNS.filter(isNotOk).map((run) => run.id)).toEqual([
      'nov-9',
      'nov-8',
    ]);
  });

  it('All keeps every run, in order', () => {
    expect(filterRuns(RUNS, 'all').map((run) => run.id)).toEqual(
      RUNS.map((run) => run.id),
    );
  });

  it('Not OK can leave nothing (the filter-empty state)', () => {
    expect(filterRuns([RUNS[0]!, RUNS[1]!], 'notOk')).toEqual([]);
  });

  it('counts a partial run as Not OK', () => {
    expect(isNotOk(row({ status: 'partial' }))).toBe(true);
  });
});

describe('duration and cost', () => {
  it('reads seconds, or the dash when none was recorded', () => {
    expect(runDuration(230000)).toBe('230 s');
    expect(runDuration(212400)).toBe('212 s');
    expect(runDuration(null)).toBe('—');
  });

  it('reads dollars to the cent, "$0" for nothing spent', () => {
    expect(runCost(0.15)).toBe('$0.15');
    expect(runCost(0.1449)).toBe('$0.14');
    expect(runCost(1.2)).toBe('$1.20');
    expect(runCost(0)).toBe('$0');
    expect(runCost(null)).toBe('$0');
    expect(runCost(undefined)).toBe('$0');
  });

  it('says under a cent rather than "$0.00" for a spend that rounds away', () => {
    expect(runCost(0.0012)).toBe('<$0.01');
    expect(runCost(0.005)).toBe('$0.01');
  });
});

describe('the last full run', () => {
  it('finds the next older OK run for each run, in one map', () => {
    const map = lastFullRuns(RUNS);
    expect(map.get('nov-11')).toEqual({
      id: 'nov-10',
      at: '2026-11-10T10:01:00.000Z',
      eventsFound: 106,
    });
    expect(map.get('nov-10')?.at).toBe('2026-11-07T10:01:00.000Z');
    expect(map.get('nov-9')?.at).toBe('2026-11-07T10:01:00.000Z');
    expect(map.get('nov-8')?.at).toBe('2026-11-07T10:01:00.000Z');
  });

  it('carries the run id Compare opens: the previous success, older than this run', () => {
    const map = lastFullRuns(RUNS);
    expect(map.get('nov-11')?.id).toBe('nov-10');
    expect(map.get('nov-10')?.id).toBe('nov-7');
    expect(map.get('nov-9')?.id).toBe('nov-7');
  });

  it('has none for the oldest loaded run, or a run not in the list', () => {
    const map = lastFullRuns(RUNS);
    expect(map.has('nov-7')).toBe(false);
    expect(map.has('gone')).toBe(false);
    expect(lastFullRuns([]).size).toBe(0);
  });
});

describe('mergeRuns', () => {
  it('lays a refresh over the loaded list: fresh wins, the rest stay, newest first', () => {
    const loaded = [RUNS[1]!, RUNS[2]!, RUNS[3]!, RUNS[4]!];
    const freshNov10 = { ...RUNS[1]!, eventsInserted: 9 };
    const merged = mergeRuns(loaded, [RUNS[0]!, freshNov10]);
    expect(merged.map((run) => run.id)).toEqual([
      'nov-11',
      'nov-10',
      'nov-9',
      'nov-8',
      'nov-7',
    ]);
    expect(merged[1]!.eventsInserted).toBe(9);
  });
});

describe('runLine', () => {
  const lastFull = { at: '2026-11-10T10:01:00.000Z', eventsFound: 106 };

  it('reads shows and new for a run that read shows', () => {
    expect(runLine(row(), null)).toBe('106 shows · 2 new');
    expect(runLine(row({ eventsInserted: 0, eventsFound: 1 }), null)).toBe(
      '1 show',
    );
    expect(runLine(row({ status: 'partial', eventsInserted: 0 }), null)).toBe(
      '106 shows',
    );
  });

  it('names the date an Unchanged run kept', () => {
    expect(runLine(RUNS[0]!, lastFull)).toBe('Page unchanged since Nov 10');
    expect(runLine(RUNS[0]!, null)).toBe(RUN.unchanged);
  });

  it('reads the list’s reason line otherwise', () => {
    expect(runLine(RUNS[2]!, null)).toBe('Failed: timed out');
    expect(runLine(RUNS[3]!, null)).toBe('Skipped: paused');
    expect(
      runLine(
        row({
          status: 'failed',
          reason: 'error',
          errorMessage: 'net::ERR_NAME_NOT_RESOLVED\nat fetch',
        }),
        null,
      ),
    ).toBe('Failed: net::ERR_NAME_NOT_RESOLVED');
  });

  it('falls back to the outcome when there is no reason to read', () => {
    expect(runLine(row({ status: 'failed', reason: null }), null)).toBe(
      RUN.failed,
    );
    expect(runLine(row({ status: 'skipped', reason: null }), null)).toBe(
      RUN.skipped,
    );
  });
});

describe('shortTime', () => {
  it('reads Mountain Time with a plain space', () => {
    expect(shortTime('2026-11-11T10:02:00.000Z')).toBe('3:02 AM');
  });
});

describe('defaultInspectPage', () => {
  it('is the first failed page', () => {
    const pages = [
      { id: 'a', httpStatus: 200 },
      { id: 'b', httpStatus: 503 },
      { id: 'c', httpStatus: 404 },
    ];
    expect(defaultInspectPage(pages)?.id).toBe('b');
  });

  it('is the first page when none failed, and null with none', () => {
    expect(
      defaultInspectPage([
        { id: 'a', httpStatus: null },
        { id: 'b', httpStatus: 301 },
      ])?.id,
    ).toBe('a');
    expect(defaultInspectPage([])).toBeNull();
  });
});

describe('inspectHref', () => {
  it('names the page when given one', () => {
    expect(inspectHref('venue-1', 'run-9', 'page/2')).toBe(
      '/admin/venues/venue-1/inspect/run-9?page=page%2F2',
    );
    expect(inspectHref('venue-1', 'run-9', null)).toBe(
      '/admin/venues/venue-1/inspect/run-9',
    );
  });

  it('points at the venue’s Inspect route for the run', () => {
    expect(inspectHref('venue-1', 'run-9')).toBe(
      '/admin/venues/venue-1/inspect/run-9',
    );
  });

  it('encodes both ids', () => {
    expect(inspectHref('a/b', 'r?1&x')).toBe(
      '/admin/venues/a%2Fb/inspect/r%3F1%26x',
    );
  });
});

describe('runSummary', () => {
  it('adds a sentence only where it says more (Unchanged)', () => {
    expect(runSummary(row(), null)).toEqual({
      title: '106 shows · 2 new',
      body: null,
    });
    const unchanged = runSummary(RUNS[0]!, {
      at: '2026-11-10T10:01:00.000Z',
      eventsFound: 106,
    });
    expect(unchanged.title).toBe('Page unchanged since Nov 10');
    expect(unchanged.body).toContain('Nov 10');
  });
});

describe('pages', () => {
  const first = 'https://www.ballarena.com/events';

  it('shortens URLs as the board does', () => {
    expect(shortUrl(first, null)).toBe('ballarena.com/events');
    expect(shortUrl('https://www.ballarena.com/events?page=2', first)).toBe(
      '…/events?page=2',
    );
    expect(shortUrl('https://tickets.example.com/x', first)).toBe(
      'tickets.example.com/x',
    );
    expect(shortUrl('https://ballarena.com/', null)).toBe('ballarena.com');
    expect(shortUrl('not a url', first)).toBe('not a url');
  });

  it('reads a later page that repeats the first, or is the root, as its path', () => {
    expect(shortUrl(first, first)).toBe('/events');
    expect(shortUrl('https://ballarena.com/', first)).toBe('/');
    // A later page with a query keeps the board's "…/" form.
    expect(shortUrl('https://ballarena.com/?page=2', first)).toBe('…/?page=2');
  });

  it('reads sizes in B, KB and MB', () => {
    expect(pageSize(512)).toBe('512 B');
    expect(pageSize(640 * 1024)).toBe('640 KB');
    expect(pageSize(Math.round(1.9 * 1024 * 1024))).toBe('1.9 MB');
  });

  it('rounds before choosing the unit, so 1,024 KB reads as MB', () => {
    expect(pageSize(1_048_100)).toBe('1.0 MB');
    expect(pageSize(1_047_000)).toBe('1,022 KB');
  });

  it('reads status and size; no time is stored', () => {
    expect(pageLine({ httpStatus: 200, bytes: 2_000_000 })).toBe(
      '200 · 1.9 MB',
    );
    expect(pageLine({ httpStatus: 503, bytes: null })).toBe('503');
    expect(pageLine({ httpStatus: null, bytes: null })).toBe(
      ADMIN_COPY.runDetail.noStatus,
    );
    expect(ADMIN_COPY.runDetail.noStatus).toBe('—');
  });

  it('fails only an error status; no status, 2xx and 3xx pass', () => {
    expect(isFailedPage({ httpStatus: null })).toBe(false);
    expect(isFailedPage({ httpStatus: 404 })).toBe(true);
    expect(isFailedPage({ httpStatus: 503 })).toBe(true);
    expect(isFailedPage({ httpStatus: 200 })).toBe(false);
    expect(isFailedPage({ httpStatus: 204 })).toBe(false);
    expect(isFailedPage({ httpStatus: 301 })).toBe(false);
    expect(isFailedPage({ httpStatus: 304 })).toBe(false);
  });

  it('marks the first page that failed, passing a page with no status', () => {
    expect(
      firstFailedPage([
        { httpStatus: 200 },
        { httpStatus: null },
        { httpStatus: 304 },
        { httpStatus: 404 },
      ]),
    ).toBe(3);
    expect(firstFailedPage([{ httpStatus: 200 }, { httpStatus: null }])).toBe(
      -1,
    );
    expect(firstFailedPage([{ httpStatus: 200 }, { httpStatus: 301 }])).toBe(
      -1,
    );
  });
});

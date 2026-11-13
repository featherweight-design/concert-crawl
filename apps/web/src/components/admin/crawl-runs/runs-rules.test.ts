import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortTime } from '@/components/admin/venues/overview/overview-rules';
import type { RunRow } from './run-data';
import {
  INSPECT_READY,
  RUNS_CAP,
  RUNS_STEP,
  compareTarget,
  filterRuns,
  firstFailedPage,
  hasMore,
  isNotOk,
  lastFullRunBefore,
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

describe('Inspect gate', () => {
  it('stays hidden until Inspect lands (3b part 5)', () => {
    expect(INSPECT_READY).toBe(false);
  });
});

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

describe('the last full run and Compare', () => {
  it('finds the next older OK run', () => {
    expect(lastFullRunBefore(RUNS, { id: 'nov-11' })).toEqual({
      at: '2026-11-10T10:01:00.000Z',
      eventsFound: 106,
    });
    expect(lastFullRunBefore(RUNS, { id: 'nov-9' })?.at).toBe(
      '2026-11-07T10:01:00.000Z',
    );
  });

  it('Compare targets the previous success, older than this run', () => {
    expect(compareTarget(RUNS, { id: 'nov-9' })?.id).toBe('nov-7');
    expect(compareTarget(RUNS, { id: 'nov-10' })?.id).toBe('nov-7');
    expect(compareTarget(RUNS, { id: 'nov-11' })?.id).toBe('nov-10');
  });

  it('has none for the oldest loaded run, or a run not in the list', () => {
    expect(compareTarget(RUNS, { id: 'nov-7' })).toBeNull();
    expect(compareTarget(RUNS, { id: 'gone' })).toBeNull();
    expect(lastFullRunBefore(RUNS, { id: 'nov-7' })).toBeNull();
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

describe('shortTime', () => {
  it('reads Mountain Time with a plain space', () => {
    expect(shortTime('2026-11-11T10:02:00.000Z')).toBe('3:02 AM');
  });
});

describe('pages', () => {
  const first = 'https://www.ballarena.com/events';

  it('shortens URLs as the board does', () => {
    expect(shortUrl(first, first)).toBe('ballarena.com/events');
    expect(shortUrl('https://www.ballarena.com/events?page=2', first)).toBe(
      '…/events?page=2',
    );
    expect(shortUrl('https://tickets.example.com/x', first)).toBe(
      'tickets.example.com/x',
    );
    expect(shortUrl('https://ballarena.com/', first)).toBe('ballarena.com');
    expect(shortUrl('not a url', first)).toBe('not a url');
  });

  it('reads sizes in B, KB and MB', () => {
    expect(pageSize(512)).toBe('512 B');
    expect(pageSize(640 * 1024)).toBe('640 KB');
    expect(pageSize(Math.round(1.9 * 1024 * 1024))).toBe('1.9 MB');
  });

  it('reads status and size; no time is stored', () => {
    expect(pageLine({ httpStatus: 200, bytes: 2_000_000 })).toBe(
      '200 · 1.9 MB',
    );
    expect(pageLine({ httpStatus: 503, bytes: null })).toBe('503');
    expect(pageLine({ httpStatus: null, bytes: null })).toBe(
      ADMIN_COPY.runDetail.noResponse,
    );
  });

  it('marks the first page that failed or never answered', () => {
    expect(
      firstFailedPage([
        { httpStatus: 200 },
        { httpStatus: 404 },
        { httpStatus: null },
      ]),
    ).toBe(1);
    expect(firstFailedPage([{ httpStatus: 200 }, { httpStatus: null }])).toBe(
      1,
    );
    expect(firstFailedPage([{ httpStatus: 200 }, { httpStatus: 204 }])).toBe(
      -1,
    );
  });
});

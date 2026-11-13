import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortTime } from '@/components/admin/venues/overview/overview-rules';
import type { RunRow } from './run-data';
import {
  RUNS_CAP,
  RUNS_STEP,
  filterRuns,
  hasMore,
  isNotOk,
  lastFullRuns,
  mergeRuns,
  nextLimit,
  runCost,
  runDuration,
  runLine,
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
      at: '2026-11-10T10:01:00.000Z',
      eventsFound: 106,
    });
    expect(map.get('nov-10')?.at).toBe('2026-11-07T10:01:00.000Z');
    expect(map.get('nov-9')?.at).toBe('2026-11-07T10:01:00.000Z');
    expect(map.get('nov-8')?.at).toBe('2026-11-07T10:01:00.000Z');
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

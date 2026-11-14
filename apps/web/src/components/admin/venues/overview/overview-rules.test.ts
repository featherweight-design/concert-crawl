import { describe, it, expect } from 'vitest';
import {
  FORMER_ADMIN_NAME,
  type CrawlRun,
  type CrawlStatus,
  type VenueLatestRun,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  NEEDS_YOU_KIND_LABEL,
  barKind,
  isUnchanged,
  legendKinds,
  offSinceLine,
  runBars,
  runOutcome,
  runOutcomeKey,
  runSentence,
  runWhen,
} from './overview-rules';
import {
  parseOverviewNeedsYou,
  parseOverviewRuns,
  parseOverviewSnoozes,
} from './overview-data';

const RUN = ADMIN_COPY.venuesList.latestRun;
const COPY = ADMIN_COPY.venueOverview;

const latest = (over: Partial<VenueLatestRun> = {}): VenueLatestRun => ({
  id: 'run-1',
  status: 'success',
  reason: null,
  at: '2026-11-11T10:02:00.000Z',
  eventsFound: 106,
  eventsInserted: 0,
  errorMessage: null,
  ...over,
});

type BarRun = Pick<CrawlRun, 'id' | 'reason' | 'createdAt'> & {
  status: CrawlStatus;
};
const run = (over: Partial<BarRun> = {}): BarRun => ({
  id: 'run',
  status: 'success',
  reason: null,
  createdAt: '2026-11-11T10:02:00.000Z',
  ...over,
});

describe('runWhen', () => {
  it('reads date and time in Mountain Time', () => {
    // 10:02 UTC is 3:02 AM MST.
    expect(runWhen('2026-11-11T10:02:00.000Z')).toBe('Nov 11 · 3:02 AM');
  });
});

describe('runOutcome', () => {
  it('uses the list’s outcome words, Unchanged for an unchanged skip', () => {
    expect(runOutcome({ status: 'success', reason: null })).toBe(RUN.success);
    expect(runOutcome({ status: 'partial', reason: null })).toBe(RUN.partial);
    expect(runOutcome({ status: 'failed', reason: 'timeout' })).toBe(
      RUN.failed,
    );
    expect(runOutcome({ status: 'skipped', reason: 'page_unchanged' })).toBe(
      RUN.unchanged,
    );
    expect(runOutcome({ status: 'skipped', reason: 'crawl_paused' })).toBe(
      RUN.skipped,
    );
  });

  // `A3/09/run-result-chips`: the reason wins over the stored status.
  it.each([
    ['failed', 'blocked_http', RUN.blocked],
    ['skipped', 'robots_disallowed', RUN.robots],
    ['skipped', 'robots_unreachable', RUN.robots],
    ['skipped', 'robots_crawl_delay', RUN.robots],
    ['failed', 'llm_account', RUN.notRun],
    ['failed', 'no_events_found', RUN.failed],
    ['failed', 'calendar_not_found', RUN.failed],
    ['failed', 'error', RUN.failed],
    ['partial', 'no_events_found', RUN.partial],
  ] as const)('a %s run with reason %s reads %s', (status, reason, word) => {
    expect(runOutcome({ status, reason })).toBe(word);
  });

  it('keys each outcome for its chip', () => {
    expect(runOutcomeKey({ status: 'failed', reason: 'blocked_http' })).toBe(
      'blocked',
    );
    expect(
      runOutcomeKey({ status: 'skipped', reason: 'robots_disallowed' }),
    ).toBe('robots');
    expect(runOutcomeKey({ status: 'failed', reason: 'llm_account' })).toBe(
      'notRun',
    );
    expect(runOutcomeKey({ status: 'partial', reason: null })).toBe('partial');
  });

  it('offers Re-crawl anyway only on an unchanged skip', () => {
    expect(isUnchanged({ status: 'skipped', reason: 'page_unchanged' })).toBe(
      true,
    );
    expect(isUnchanged({ status: 'skipped', reason: 'crawl_paused' })).toBe(
      false,
    );
    expect(isUnchanged({ status: 'success', reason: null })).toBe(false);
  });
});

describe('runSentence', () => {
  it('names the last full run on Unchanged (the board’s caption)', () => {
    expect(
      runSentence(latest({ status: 'skipped', reason: 'page_unchanged' }), {
        at: '2026-11-10T10:00:00.000Z',
        eventsFound: 106,
      }),
    ).toBe(
      'The calendar page hasn’t changed since Nov 10’s full run, so we kept its 106 shows and didn’t re-read it. Nothing to do.',
    );
  });

  it('falls back when there is no full run to name', () => {
    expect(
      runSentence(
        latest({ status: 'skipped', reason: 'page_unchanged' }),
        null,
      ),
    ).toBe(COPY.latestRun.unchangedNoFullRun);
  });

  it('says how many shows a run read, and how many were new', () => {
    expect(runSentence(latest({ eventsInserted: 2 }), null)).toBe(
      'Found 106 shows, 2 new.',
    );
    expect(
      runSentence(latest({ status: 'partial', eventsFound: 1 }), null),
    ).toBe('Found 1 show.');
  });

  it('reads other outcomes as the list’s reason line', () => {
    expect(
      runSentence(latest({ status: 'failed', reason: 'timeout' }), null),
    ).toBe('Failed: timed out.');
    expect(
      runSentence(
        latest({ status: 'skipped', reason: 'robots_disallowed' }),
        null,
      ),
    ).toBe('robots.txt: disallowed.');
    expect(
      runSentence(
        latest({ status: 'failed', reason: null, errorMessage: 'boom\nstack' }),
        null,
      ),
    ).toBe('Failed: boom.');
    expect(
      runSentence(latest({ status: 'skipped', reason: null }), null),
    ).toBeNull();
  });
});

describe('barKind', () => {
  it('maps each run to its drawn bar', () => {
    expect(barKind({ status: 'success', reason: null })).toBe('found');
    expect(barKind({ status: 'partial', reason: null })).toBe('partial');
    expect(barKind({ status: 'failed', reason: 'timeout' })).toBe('failed');
    expect(barKind({ status: 'skipped', reason: 'page_unchanged' })).toBe(
      'unchanged',
    );
    for (const reason of [
      'crawl_paused',
      'robots_disallowed',
      'robots_unreachable',
      'llm_account',
      null,
    ] as const) {
      expect(barKind({ status: 'skipped', reason })).toBe('paused');
    }
  });
});

describe('runBars', () => {
  it('keeps the newest 14 runs, oldest first, each labelled', () => {
    const runs = Array.from({ length: 16 }, (_, index) =>
      run({
        id: `run-${index}`,
        // Newest first, a day apart.
        createdAt: new Date(
          Date.UTC(2026, 10, 20 - index, 10, 2),
        ).toISOString(),
      }),
    );
    const bars = runBars(runs);
    expect(bars).toHaveLength(14);
    expect(bars[13]?.id).toBe('run-0');
    expect(bars[0]?.id).toBe('run-13');
    expect(bars[13]?.label).toBe('Nov 20: Shows found');
  });

  it('draws fewer bars for fewer runs, and none for none', () => {
    expect(runBars([run()])).toHaveLength(1);
    expect(runBars([])).toEqual([]);
  });
});

describe('legendKinds', () => {
  it('lists only the kinds drawn, in the legend’s order', () => {
    const bars = runBars([
      run({ id: 'a', status: 'failed' }),
      run({ id: 'b', status: 'skipped', reason: 'page_unchanged' }),
      run({ id: 'c' }),
    ]);
    expect(legendKinds(bars)).toEqual(['found', 'unchanged', 'failed']);
    expect(legendKinds([])).toEqual([]);
  });
});

describe('NEEDS_YOU_KIND_LABEL', () => {
  it('maps each Needs you kind to its label', () => {
    expect(NEEDS_YOU_KIND_LABEL['show-dropped']).toBe('show');
    expect(NEEDS_YOU_KIND_LABEL['show-moved']).toBe('show');
    expect(NEEDS_YOU_KIND_LABEL['venue-failing']).toBe('venue');
    expect(NEEDS_YOU_KIND_LABEL['venue-blocked']).toBe('venue');
    expect(NEEDS_YOU_KIND_LABEL['event-low-confidence']).toBe('event');
    expect(NEEDS_YOU_KIND_LABEL.artist).toBe('artist');
    expect(NEEDS_YOU_KIND_LABEL['price-batch']).toBe('prices');
    expect(NEEDS_YOU_KIND_LABEL['price-check']).toBe('priceCheck');
    expect(NEEDS_YOU_KIND_LABEL.bug).toBe('bug');
  });
});

describe('offSinceLine', () => {
  const snooze = {
    createdAt: '2026-11-03T18:00:00.000Z',
    createdByName: 'hugh',
    reason: 'It’s normal for this venue',
  };

  it('tags the admin and quotes the reason', () => {
    expect(offSinceLine(snooze)).toBe(
      'Off since Nov 3, by @hugh · “It’s normal for this venue”',
    );
  });

  it('leaves the reason off when there is none', () => {
    expect(offSinceLine({ ...snooze, reason: null })).toBe(
      'Off since Nov 3, by @hugh',
    );
  });

  it('never tags a former admin', () => {
    expect(
      offSinceLine({
        ...snooze,
        createdByName: 'a former admin',
        reason: null,
      }),
    ).toBe('Off since Nov 3, by a former admin');
  });

  it('matches the name the API gives a former admin', () => {
    expect(FORMER_ADMIN_NAME).toBe('a former admin');
  });
});

describe('the Overview’s boundary checks', () => {
  it('keeps a run list and reads an unknown reason as none', () => {
    expect(
      parseOverviewRuns([
        {
          id: 'r',
          status: 'skipped',
          reason: 'something_new',
          createdAt: '2026-11-11T10:02:00.000Z',
          eventsFound: 0,
        },
      ]),
    ).toEqual([
      {
        id: 'r',
        status: 'skipped',
        reason: null,
        createdAt: '2026-11-11T10:02:00.000Z',
      },
    ]);
  });

  it('refuses a body that isn’t the list', () => {
    expect(parseOverviewRuns({ data: [] })).toBeNull();
    expect(parseOverviewNeedsYou({ items: [] })).toBeNull();
    expect(parseOverviewSnoozes(null)).toBeNull();
  });

  it('drops a row this build can’t read, keeping the rest', () => {
    const good = { key: 'k', kind: 'bug', title: 'Broken' };
    expect(
      parseOverviewNeedsYou([{ key: 'n', kind: 'nope', title: 't' }, good]),
    ).toEqual([good]);
    expect(
      parseOverviewRuns([
        {
          id: 'going',
          status: 'in_progress',
          reason: null,
          createdAt: '2026-11-11T10:02:00.000Z',
        },
        {
          id: 'r',
          status: 'success',
          reason: null,
          createdAt: '2026-11-11T10:02:00.000Z',
        },
      ]),
    ).toEqual([
      {
        id: 'r',
        status: 'success',
        reason: null,
        createdAt: '2026-11-11T10:02:00.000Z',
      },
    ]);
    expect(
      parseOverviewSnoozes([
        {
          id: 's',
          kind: 'something-new',
          reason: null,
          createdAt: '2026-11-03T18:00:00.000Z',
          createdByName: 'hugh',
        },
      ]),
    ).toEqual([]);
  });

  it('keeps Needs you items and snoozes', () => {
    expect(
      parseOverviewNeedsYou([
        { key: 'k', kind: 'bug', title: 'Broken', venueId: 'v' },
      ]),
    ).toEqual([{ key: 'k', kind: 'bug', title: 'Broken' }]);
    expect(
      parseOverviewSnoozes([
        {
          id: 's',
          kind: 'show-dropped',
          venueId: 'v',
          reason: null,
          createdAt: '2026-11-03T18:00:00.000Z',
          createdByName: 'hugh',
        },
      ]),
    ).toHaveLength(1);
  });
});

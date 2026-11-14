import { describe, it, expect } from 'vitest';
import {
  ESTIMATE_NIGHTS,
  groupCrawlBatches,
  parseBatchKey,
  usualNightly,
  type BatchRunInput,
  type BatchTriggerInput,
} from './crawl-batches.js';

const run = (
  id: string,
  at: string,
  over: Partial<BatchRunInput> = {},
): BatchRunInput => ({
  id,
  venueId: over.venueId ?? `venue-${id}`,
  venueName: `Venue ${id}`,
  status: 'success',
  reason: null,
  eventsFound: 10,
  eventsInserted: 2,
  durationMs: 30_000,
  llmCostUsd: null,
  errorMessage: null,
  createdAt: new Date(at),
  ...over,
});

const trigger = (
  id: string,
  at: string,
  over: Partial<BatchTriggerInput> = {},
): BatchTriggerInput => ({
  id,
  venueId: `venue-${id}`,
  triggeredBy: 'user_a',
  status: 'done',
  crawlRunId: null,
  createdAt: new Date(at),
  ...over,
});

// 20:00Z on Nov 12 is 1 PM Mountain (MST), after the 6 AM deadline.
const NOW = new Date('2026-11-12T20:00:00Z');

const keys = (batches: { key: string }[]) => batches.map((batch) => batch.key);

describe('groupCrawlBatches: nightly', () => {
  it('groups scheduled runs by Mountain Time night, across a late-evening UTC date', () => {
    const batches = groupCrawlBatches({
      runs: [
        run('a', '2026-11-11T10:10:00Z'),
        run('b', '2026-11-11T10:12:00Z'),
        // 03:30Z on the 12th is 8:30 PM MST on the 11th: still the 11th's night.
        run('c', '2026-11-12T03:30:00Z'),
        run('d', '2026-11-12T10:10:00Z'),
      ],
      triggers: [],
      now: NOW,
    });
    const nights = batches.filter((batch) => batch.kind === 'nightly');
    expect(keys(nights)).toEqual(['nightly:2026-11-12', 'nightly:2026-11-11']);
    expect(nights[1]?.counts.total).toBe(3);
    expect(nights[0]?.counts.total).toBe(1);
  });

  it('puts the night on the right date across the spring and fall DST changes', () => {
    const batches = groupCrawlBatches({
      runs: [
        // Mar 8 2026, DST starts at 2 AM: 3 AM MDT is 09:10Z, 4 AM MDT is 10:10Z.
        run('a', '2026-03-07T10:10:00Z'),
        run('b', '2026-03-08T09:10:00Z'),
        run('c', '2026-03-09T09:10:00Z'),
        // Nov 1 2026, DST ends at 2 AM: 3 AM MST is 10:10Z.
        run('d', '2026-11-01T10:10:00Z'),
      ],
      triggers: [],
      now: new Date('2026-11-01T20:00:00Z'),
    });
    const withRuns = batches.filter((batch) => !batch.didntStart);
    expect(keys(withRuns).sort()).toEqual([
      'nightly:2026-03-07',
      'nightly:2026-03-08',
      'nightly:2026-03-09',
      'nightly:2026-11-01',
    ]);
  });

  it('counts ok, not ok and unchanged runs apart, and sums the events', () => {
    const [batch] = groupCrawlBatches({
      runs: [
        run('a', '2026-11-12T10:10:00Z'),
        run('b', '2026-11-12T10:11:00Z', {
          status: 'skipped',
          reason: 'page_unchanged',
          eventsFound: 0,
          eventsInserted: 0,
        }),
        run('c', '2026-11-12T10:12:00Z', {
          status: 'failed',
          reason: 'timeout',
          eventsFound: 0,
          eventsInserted: 0,
        }),
        run('d', '2026-11-12T10:13:00Z', {
          status: 'skipped',
          reason: 'crawl_paused',
        }),
      ],
      triggers: [],
      now: NOW,
    });
    expect(batch?.counts).toEqual({
      ok: 1,
      unchanged: 1,
      skipped: 1,
      notOk: 1,
      total: 4,
    });
    expect(batch?.eventsFound).toBe(20);
    expect(batch?.venueCount).toBe(4);
  });

  it('calls a night retried only when its runs come in a second wave', () => {
    const [together, retried] = [
      groupCrawlBatches({
        runs: [
          run('a', '2026-11-12T10:10:00Z'),
          run('b', '2026-11-12T10:40:00Z'),
        ],
        triggers: [],
        now: NOW,
      })[0],
      groupCrawlBatches({
        runs: [
          run('a', '2026-11-12T10:10:00Z'),
          run('b', '2026-11-12T13:30:00Z'),
        ],
        triggers: [],
        now: NOW,
      })[0],
    ];
    expect(together?.retried).toBe(false);
    expect(retried?.retried).toBe(true);
  });
});

describe('usualNightly: the Crawl all estimate', () => {
  // A night of two runs: 10:00Z start, the second starts 20 min later and
  // takes 30 s, so the night spans 20.5 min.
  const night = (
    date: string,
    cost = 0.4,
    over: Partial<BatchRunInput> = {},
  ) => [
    run(`${date}-a`, `${date}T10:00:00Z`, { llmCostUsd: cost, ...over }),
    run(`${date}-b`, `${date}T10:20:00Z`, { llmCostUsd: cost, ...over }),
  ];
  // Every night in these inputs is whole unless a test says otherwise.
  const estimate = (input: {
    runs: BatchRunInput[];
    triggers: BatchTriggerInput[];
    now: Date;
    firstNight?: string;
  }) => usualNightly({ firstNight: '2026-01-01', ...input });

  it('averages the span and the summed LLM cost of each night, to the cent', () => {
    const usual = estimate({
      runs: [...night('2026-11-10', 0.4), ...night('2026-11-11', 0.201)],
      triggers: [],
      now: NOW,
    });
    expect(usual).toEqual({
      durationMs: 20.5 * 60 * 1000,
      costUsd: 0.6,
      nights: 2,
    });
  });

  it('is null with no nightly history', () => {
    expect(estimate({ runs: [], triggers: [], now: NOW })).toBeNull();
  });

  it('leaves out a night before the first whole one in the window', () => {
    const usual = estimate({
      runs: [...night('2026-11-10', 5), ...night('2026-11-11', 0.1)],
      triggers: [],
      now: NOW,
      firstNight: '2026-11-11',
    });
    expect(usual).toMatchObject({ nights: 1, costUsd: 0.2 });
  });

  it('leaves out by-hand runs, retried nights and tonight, even past 6 AM', () => {
    // NOW is 1 PM Mountain on Nov 12; the backup dispatch can land after 6.
    const usual = estimate({
      runs: [
        ...night('2026-11-10'),
        // Retried: a second wave three hours later.
        run('r1', '2026-11-11T10:00:00Z', { llmCostUsd: 5 }),
        run('r2', '2026-11-11T13:30:00Z', { llmCostUsd: 5 }),
        // Tonight, whose retry may still come.
        run('t1', '2026-11-12T10:00:00Z', { llmCostUsd: 5 }),
        // By hand: its trigger points at it.
        run('h1', '2026-11-10T18:00:00Z', { llmCostUsd: 5 }),
      ],
      triggers: [trigger('x', '2026-11-10T17:59:00Z', { crawlRunId: 'h1' })],
      now: NOW,
    });
    expect(usual).toMatchObject({ nights: 1, costUsd: 0.8 });
  });

  it(`takes the newest ${ESTIMATE_NIGHTS} nights only`, () => {
    const dates = Array.from(
      { length: ESTIMATE_NIGHTS + 2 },
      (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`,
    );
    const usual = estimate({
      runs: dates.flatMap((date, index) =>
        // The two oldest nights cost far more, so taking them would show.
        night(date, index < 2 ? 10 : 0.1),
      ),
      triggers: [],
      now: NOW,
    });
    expect(usual).toMatchObject({ nights: ESTIMATE_NIGHTS, costUsd: 0.2 });
  });

  it('reads a run with no cost as free', () => {
    const usual = estimate({
      runs: night('2026-11-10', 0, { llmCostUsd: null }),
      triggers: [],
      now: NOW,
    });
    expect(usual?.costUsd).toBe(0);
  });
});

describe("groupCrawlBatches: Didn't start", () => {
  it('derives a night with no scheduled run between two that had one', () => {
    const batches = groupCrawlBatches({
      runs: [
        run('a', '2026-11-09T10:10:00Z'),
        run('b', '2026-11-11T10:10:00Z'),
      ],
      triggers: [],
      now: new Date('2026-11-11T20:00:00Z'),
    });
    const missing = batches.filter((batch) => batch.didntStart);
    expect(keys(missing)).toEqual(['nightly:2026-11-10']);
    expect(missing[0]).toMatchObject({
      startedAt: null,
      venueCount: 0,
      counts: { total: 0 },
    });
  });

  it("does not call today's night missed before 6 AM Mountain, but does after", () => {
    const runs = [run('a', '2026-11-10T10:10:00Z')];
    // 12:00Z is 5 AM MST on the 11th.
    const early = groupCrawlBatches({
      runs,
      triggers: [],
      now: new Date('2026-11-11T12:00:00Z'),
    });
    expect(early.some((batch) => batch.didntStart)).toBe(false);
    // 13:30Z is 6:30 AM MST.
    const late = groupCrawlBatches({
      runs,
      triggers: [],
      now: new Date('2026-11-11T13:30:00Z'),
    });
    expect(keys(late.filter((batch) => batch.didntStart))).toEqual([
      'nightly:2026-11-11',
    ]);
  });

  it('invents nothing before the first night it has runs for', () => {
    const batches = groupCrawlBatches({ runs: [], triggers: [], now: NOW });
    expect(batches).toEqual([]);
  });
});

describe('groupCrawlBatches: by hand', () => {
  it("makes one batch of a person's triggers a few minutes apart, and another after a gap", () => {
    const batches = groupCrawlBatches({
      runs: [
        run('r1', '2026-11-12T16:00:30Z'),
        run('r2', '2026-11-12T16:01:30Z'),
      ],
      triggers: [
        trigger('t1', '2026-11-12T16:00:00Z', { crawlRunId: 'r1' }),
        trigger('t2', '2026-11-12T16:05:00Z', { crawlRunId: 'r2' }),
        trigger('t3', '2026-11-12T16:30:00Z', { status: 'pending' }),
      ],
      now: NOW,
    });
    const byHand = batches.filter((batch) => batch.kind === 'by_hand');
    expect(byHand).toHaveLength(2);
    const [later, earlier] = byHand;
    expect(later).toMatchObject({ actor: 'user_a', pending: 1, venueCount: 1 });
    expect(later?.counts.total).toBe(0);
    expect(earlier?.counts.total).toBe(2);
    expect(earlier?.venueCount).toBe(2);
    expect(earlier?.key).toBe(
      `by_hand:user_a:${Date.parse('2026-11-12T16:00:00Z') / 1000}`,
    );
  });

  it('keeps two people apart even when their triggers interleave', () => {
    const batches = groupCrawlBatches({
      runs: [],
      triggers: [
        trigger('t1', '2026-11-12T16:00:00Z', { triggeredBy: 'user_a' }),
        trigger('t2', '2026-11-12T16:01:00Z', { triggeredBy: 'user_b' }),
        trigger('t3', '2026-11-12T16:02:00Z', { triggeredBy: 'user_a' }),
      ],
      now: NOW,
    });
    const actors = batches
      .filter((batch) => batch.kind === 'by_hand')
      .map((batch) => batch.actor)
      .sort();
    expect(actors).toEqual(['user_a', 'user_b']);
  });

  it('leaves a run a trigger asked for out of the nightly batches', () => {
    const batches = groupCrawlBatches({
      runs: [
        run('scheduled', '2026-11-12T10:10:00Z'),
        run('hand', '2026-11-12T16:00:30Z'),
      ],
      triggers: [trigger('t1', '2026-11-12T16:00:00Z', { crawlRunId: 'hand' })],
      now: NOW,
    });
    const nightly = batches.find((batch) => batch.kind === 'nightly');
    expect(nightly?.counts.total).toBe(1);
    expect(nightly?.runs.map((entry) => entry.id)).toEqual(['scheduled']);
  });
});

describe('groupCrawlBatches: a trigger whose run is not linked yet', () => {
  it('claims a run on its venue that started after it, so the run is not filed as nightly', () => {
    const batches = groupCrawlBatches({
      runs: [
        run('scheduled', '2026-11-12T10:10:00Z', { venueId: 'venue-a' }),
        // Started minutes after the trigger; crawl_run_id is not written yet.
        run('hand', '2026-11-12T16:02:00Z', { venueId: 'venue-b' }),
      ],
      triggers: [
        trigger('t1', '2026-11-12T16:00:00Z', {
          venueId: 'venue-b',
          status: 'processing',
        }),
      ],
      now: NOW,
    });
    const nightly = batches.find((batch) => batch.kind === 'nightly');
    expect(nightly?.runs.map((entry) => entry.id)).toEqual(['scheduled']);
    const byHand = batches.find((batch) => batch.kind === 'by_hand');
    expect(byHand?.runs.map((entry) => entry.id)).toEqual(['hand']);
    expect(byHand?.pending).toBe(0);
  });

  it('does not claim a run on another venue, or one hours later', () => {
    const batches = groupCrawlBatches({
      runs: [
        run('other-venue', '2026-11-12T16:02:00Z', { venueId: 'venue-c' }),
        run('too-late', '2026-11-12T23:30:00Z', { venueId: 'venue-b' }),
      ],
      triggers: [
        trigger('t1', '2026-11-12T16:00:00Z', {
          venueId: 'venue-b',
          status: 'processing',
        }),
      ],
      now: NOW,
    });
    const nightly = batches.find((batch) => batch.kind === 'nightly');
    expect(nightly?.runs.map((entry) => entry.id).sort()).toEqual([
      'other-venue',
      'too-late',
    ]);
    expect(batches.find((batch) => batch.kind === 'by_hand')?.pending).toBe(1);
  });
});

describe('parseBatchKey', () => {
  it('reads both key shapes and refuses the rest', () => {
    expect(parseBatchKey('nightly:2026-11-12')).toEqual({
      kind: 'nightly',
      night: '2026-11-12',
    });
    expect(parseBatchKey('by_hand:user_a:1794000000')).toEqual({
      kind: 'by_hand',
      actor: 'user_a',
      epoch: 1794000000,
    });
    expect(parseBatchKey('nightly:2026-02-30')).toBeNull();
    expect(parseBatchKey('nightly:tomorrow')).toBeNull();
    expect(parseBatchKey('by_hand:user_a')).toBeNull();
    expect(parseBatchKey('')).toBeNull();
  });
});

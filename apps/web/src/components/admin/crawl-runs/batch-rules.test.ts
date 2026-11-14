import { describe, expect, it } from 'vitest';
import { batchesPath, parseBatchPage, type BatchRow } from './batch-data';
import {
  appendBatches,
  batchCost,
  batchLabel,
  batchStatus,
  batchSummary,
  batchTime,
  batchWhen,
  crawlRunsHref,
  filterFromParam,
  isClickableBatch,
  finalCounts,
  isNotOkBatch,
  keepForFilter,
  notOkCountOf,
} from './batch-rules';

const COUNTS = {
  ok: 0,
  notOk: 0,
  unchanged: 0,
  skipped: 0,
  total: 0,
  failed: 0,
  blocked: 0,
};

// Nov 11, 3:00 AM MT is 10:00 UTC.
const nightly = (over: Partial<BatchRow> = {}): BatchRow => ({
  key: 'nightly:2026-11-11',
  kind: 'nightly',
  startedAt: '2026-11-11T10:00:00.000Z',
  endedAt: '2026-11-11T10:18:00.000Z',
  night: '2026-11-11',
  venueCount: 21,
  counts: {
    ...COUNTS,
    ok: 14,
    unchanged: 4,
    notOk: 3,
    failed: 1,
    total: 21,
  },
  eventsFound: 900,
  pending: 0,
  didntStart: false,
  costUsd: 0.71,
  linkKey: 'nightly:2026-11-11',
  crawlAll: false,
  venueName: null,
  actorHandle: null,
  retry: null,
  ...over,
});

const byHand = (over: Partial<BatchRow> = {}): BatchRow =>
  nightly({
    key: 'by_hand:user_1:1762812840',
    kind: 'by_hand',
    startedAt: '2026-11-10T21:14:00.000Z',
    endedAt: '2026-11-10T21:18:00.000Z',
    night: null,
    venueCount: 1,
    counts: { ...COUNTS, ok: 1, total: 1 },
    eventsFound: 106,
    costUsd: 0.15,
    linkKey: 'run:1762812840:abcd1234',
    venueName: 'Ball Arena',
    actorHandle: 'hugh',
    ...over,
  });

const didntStart = nightly({
  key: 'nightly:2026-11-08',
  startedAt: null,
  endedAt: null,
  night: '2026-11-08',
  venueCount: 0,
  counts: { ...COUNTS },
  costUsd: 0,
  didntStart: true,
  linkKey: 'nightly:2026-11-08',
});

const blockedNight = nightly({
  key: 'nightly:2026-11-10',
  counts: {
    ...COUNTS,
    ok: 13,
    unchanged: 6,
    notOk: 2,
    failed: 1,
    blocked: 1,
    total: 21,
  },
});

const failedRecrawl = byHand({
  key: 'by_hand:user_1:1762790000',
  counts: { ...COUNTS, notOk: 1, failed: 1, total: 1 },
});

describe('batchLabel (WHAT)', () => {
  it('reads Nightly for a night', () => {
    expect(batchLabel(nightly())).toBe('Nightly');
  });

  it('names a one-venue re-crawl and its actor', () => {
    expect(batchLabel(byHand())).toBe('Re-crawl · Ball Arena · by @hugh');
  });

  it('counts the venues of a bulk re-crawl', () => {
    expect(batchLabel(byHand({ venueName: null, venueCount: 3 }))).toBe(
      'Re-crawl · 3 venues · by @hugh',
    );
  });

  it('reads Crawl all from crawlAll, whatever the venues', () => {
    expect(
      batchLabel(byHand({ crawlAll: true, venueName: null, venueCount: 19 })),
    ).toBe('Crawl all · by @hugh');
  });

  it('drops "by" when the actor has no handle', () => {
    expect(batchLabel(byHand({ actorHandle: null }))).toBe(
      'Re-crawl · Ball Arena',
    );
  });
});

describe('batchStatus (RESULT)', () => {
  it('is a green Done with failures alone (row 3)', () => {
    expect(batchStatus(nightly())).toMatchObject({
      key: 'done',
      label: 'Done',
      tone: 'var(--success)',
    });
  });

  it('turns Done amber on a Blocked run only', () => {
    const blocked = nightly({
      counts: { ...nightly().counts, blocked: 1, notOk: 4 },
    });
    expect(batchStatus(blocked).tone).toBe('var(--warning)');
  });

  it("reads Didn't start in danger", () => {
    expect(batchStatus(didntStart)).toMatchObject({
      key: 'didntStart',
      label: 'Didn’t start',
      tone: 'var(--danger)',
    });
  });

  it('reads Running while triggers are queued', () => {
    expect(batchStatus(byHand({ pending: 11 }))).toMatchObject({
      key: 'running',
      tone: 'var(--signal)',
    });
  });

  it('reads Failed when no run read its page', () => {
    const failed = byHand({
      counts: { ...COUNTS, notOk: 1, failed: 1, total: 1 },
    });
    expect(batchStatus(failed)).toMatchObject({
      key: 'failed',
      tone: 'var(--danger)',
    });
  });
});

describe('batchSummary (SUMMARY)', () => {
  it('lists the venues and the non-zero counts', () => {
    expect(batchSummary(nightly())).toBe(
      '21 venues · 14 OK · 4 unchanged · 1 failed · 2 not OK',
    );
  });

  it('leaves skipped venues out of the venue count (row 5)', () => {
    const paused = nightly({
      counts: { ...COUNTS, ok: 20, skipped: 1, total: 21 },
    });
    expect(batchSummary(paused)).toBe('20 venues · 20 OK');
  });

  it('names the shows for one venue that read its page', () => {
    expect(batchSummary(byHand())).toBe('1 venue · 106 shows');
  });

  it("says nothing more for a night that didn't start (row 1)", () => {
    expect(batchSummary(didntStart)).toBe('');
  });

  it('counts a running batch so far', () => {
    const running = byHand({
      crawlAll: true,
      venueCount: 19,
      pending: 11,
      counts: { ...COUNTS, ok: 7, unchanged: 1, total: 8 },
    });
    expect(batchSummary(running)).toBe('8 of 19 so far · 7 OK · 1 unchanged');
  });

  it('ends a retried night with its retry time, counting each venue once (ruling 18)', () => {
    // 3:00: 14 OK, 4 unchanged, 3 failed. 4:10: the 3 re-run, 2 OK, 1 failed.
    const retried = nightly({
      counts: {
        ...COUNTS,
        ok: 16,
        unchanged: 4,
        notOk: 4,
        failed: 4,
        total: 24,
      },
      retry: {
        at: '2026-11-11T11:10:00.000Z',
        counts: { ...COUNTS, ok: 2, notOk: 1, failed: 1, total: 3 },
      },
    });
    expect(batchSummary(retried)).toBe(
      '21 venues · 16 OK · 4 unchanged · 1 failed · retried at 4:10 AM',
    );
  });
});

describe('finalCounts (a retried night, M1)', () => {
  const ALL_FAILED = { ...COUNTS, notOk: 21, failed: 21, total: 21 };
  const ALL_OK = { ...COUNTS, ok: 21, total: 21 };

  it('takes the retry over a night where every venue failed, then read OK', () => {
    const night = nightly({
      counts: { ...COUNTS, ok: 21, notOk: 21, failed: 21, total: 42 },
      retry: { at: '2026-11-11T11:10:00.000Z', counts: ALL_OK },
    });
    expect(finalCounts(night)).toMatchObject({ ok: 21, notOk: 0, failed: 0 });
    expect(batchSummary(night)).toBe('21 venues · 21 OK · retried at 4:10 AM');
    expect(batchStatus(night)).toMatchObject({
      key: 'done',
      tone: 'var(--success)',
    });
    expect(isNotOkBatch(night)).toBe(false);
  });

  it('stays Failed when the retry failed every venue again', () => {
    const night = nightly({
      counts: { ...COUNTS, notOk: 42, failed: 42, total: 42 },
      retry: { at: '2026-11-11T11:10:00.000Z', counts: ALL_FAILED },
    });
    expect(finalCounts(night)).toMatchObject({ ok: 0, notOk: 21, failed: 21 });
    expect(batchStatus(night).key).toBe('failed');
  });

  it('keeps the counts as sent without a retry', () => {
    expect(finalCounts(nightly())).toEqual(nightly().counts);
  });

  it('counts a paused venue once though it skipped in both waves', () => {
    const night = nightly({
      counts: {
        ...COUNTS,
        ok: 20,
        notOk: 20,
        failed: 20,
        skipped: 2,
        total: 42,
      },
      retry: {
        at: '2026-11-11T11:10:00.000Z',
        counts: { ...COUNTS, ok: 20, skipped: 1, total: 21 },
      },
    });
    expect(finalCounts(night)).toMatchObject({ ok: 20, skipped: 1, notOk: 0 });
  });
});

describe('when, time and cost', () => {
  it('reads the first run in Mountain Time', () => {
    expect(batchWhen(nightly())).toEqual({ date: 'Nov 11', time: '3:00 AM' });
  });

  it("gives a night that didn't start its date and the schedule's time", () => {
    expect(batchWhen(didntStart)).toEqual({ date: 'Nov 8', time: '3:00 AM' });
  });

  it('reads whole minutes, never under 1', () => {
    expect(batchTime(nightly())).toBe('18 min');
    expect(batchTime(byHand({ endedAt: '2026-11-10T21:14:20.000Z' }))).toBe(
      '1 min',
    );
  });

  it("reads the dash while running and for a night that didn't start", () => {
    expect(batchTime(byHand({ pending: 2 }))).toBe('—');
    expect(batchTime(didntStart)).toBe('—');
  });

  it('reads the cost, $0 for nothing spent', () => {
    expect(batchCost(nightly())).toBe('$0.71');
    expect(batchCost(didntStart)).toBe('$0');
  });

  it("keeps a night that didn't start from opening a detail (row 14)", () => {
    expect(isClickableBatch(didntStart)).toBe(false);
    expect(isClickableBatch(nightly())).toBe(true);
  });
});

describe('filters', () => {
  it('reads ?kind=, falling back to All', () => {
    expect(filterFromParam('by_hand')).toBe('by_hand');
    expect(filterFromParam('not_ok')).toBe('not_ok');
    expect(filterFromParam('bogus')).toBe('all');
    expect(filterFromParam(null)).toBe('all');
  });

  it('writes ?kind= and ?run=, leaving All bare', () => {
    expect(crawlRunsHref('all')).toBe('/admin/crawl');
    expect(crawlRunsHref('nightly')).toBe('/admin/crawl?kind=nightly');
    expect(crawlRunsHref('all', 'run:1762812840:abcd1234')).toBe(
      '/admin/crawl?run=run%3A1762812840%3Aabcd1234',
    );
  });

  it('calls a batch Not OK as the API does', () => {
    // A green Done with a failed run is not Not OK (07/crawl-runs-desktop).
    expect(isNotOkBatch(nightly())).toBe(false);
    expect(isNotOkBatch(didntStart)).toBe(true);
    expect(isNotOkBatch(byHand())).toBe(false);
    expect(isNotOkBatch(blockedNight)).toBe(true);
    expect(isNotOkBatch(failedRecrawl)).toBe(true);
    expect(isNotOkBatch(byHand({ pending: 3 }))).toBe(false);
  });

  it('keeps only the chip’s Not OK under Not OK', () => {
    const rows = [nightly(), blockedNight, didntStart, failedRecrawl];
    expect(keepForFilter('not_ok', rows)).toEqual([
      blockedNight,
      didntStart,
      failedRecrawl,
    ]);
    expect(keepForFilter('all', rows)).toEqual(rows);
  });

  it('counts Not OK under All and Not OK, and holds under the others', () => {
    // The board: green "1 failed" nights don't count; amber and Didn't start do.
    const rows = [nightly(), byHand(), blockedNight, didntStart];
    expect(notOkCountOf('all', rows)).toBe(2);
    expect(notOkCountOf('not_ok', [nightly()])).toBe(1);
    expect(notOkCountOf('nightly', rows)).toBeNull();
    expect(notOkCountOf('by_hand', rows)).toBeNull();
  });
});

describe('paging', () => {
  it('asks for a page by filter, size and cursor', () => {
    expect(batchesPath('all', 25, null)).toBe(
      '/v1/admin/crawl/batches?kind=all&limit=25',
    );
    expect(batchesPath('by_hand', 25, '2026-11-01T10:00:00.000Z')).toBe(
      '/v1/admin/crawl/batches?kind=by_hand&limit=25&before=2026-11-01T10%3A00%3A00.000Z',
    );
  });

  it('lays a page under the loaded rows, keeping a repeat in its first place', () => {
    const first = [nightly(), byHand()];
    const next = [byHand({ costUsd: 0.2 }), didntStart];
    const merged = appendBatches(first, next);
    expect(merged.map((batch) => batch.key)).toEqual([
      'nightly:2026-11-11',
      'by_hand:user_1:1762812840',
      'nightly:2026-11-08',
    ]);
    expect(merged[1]?.costUsd).toBe(0.15);
  });

  it('reads a page, dropping a row it cannot read but keeping the cursor', () => {
    const page = parseBatchPage({
      success: true,
      data: [nightly(), { key: 'broken' }],
      hasMore: true,
      nextBefore: '2026-11-01T10:00:00.000Z',
    });
    expect(page?.rows).toHaveLength(1);
    expect(page?.hasMore).toBe(true);
    expect(page?.nextBefore).toBe('2026-11-01T10:00:00.000Z');
  });

  it('stops paging without a cursor, and refuses a body that is not a page', () => {
    expect(
      parseBatchPage({
        success: true,
        data: [],
        hasMore: true,
        nextBefore: null,
      })?.hasMore,
    ).toBe(false);
    expect(parseBatchPage({ success: true, data: [] })).toBeNull();
    expect(parseBatchPage(null)).toBeNull();
  });
});

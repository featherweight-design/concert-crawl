// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportRejectedError } from './send-report';
import {
  clearPendingReport,
  flushPendingReport,
  loadPendingReport,
  savePendingReport,
} from './pending-report';

const sendErrorReport = vi.hoisted(() => vi.fn());
vi.mock('./send-report', async (importOriginal) => ({
  // Everything real (the error class the store checks for) except the send.
  ...(await importOriginal<Record<string, unknown>>()),
  sendErrorReport,
}));

const draft = {
  doing: 'Opening a show',
  note: 'It went blank.',
  digest: '2849204133',
  page: '/venues/bluebird-theater',
};

beforeEach(() => {
  localStorage.clear();
  sendErrorReport.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('the saved report', () => {
  it('round-trips, and keeps only the newest', () => {
    savePendingReport(draft);
    savePendingReport({ ...draft, doing: 'Searching' });

    expect(loadPendingReport()?.doing).toBe('Searching');
  });

  it('drops one older than a week, and anything that is not a report', () => {
    savePendingReport(draft);
    const week = 8 * 24 * 60 * 60 * 1000;
    expect(loadPendingReport(Date.now() + week)).toBeNull();

    localStorage.setItem('cc-pending-error-report', '{"doing":3}');
    expect(loadPendingReport()).toBeNull();
    expect(localStorage.getItem('cc-pending-error-report')).toBeNull();
  });
});

describe('flushPendingReport', () => {
  it('sends the saved report once and clears it', async () => {
    savePendingReport(draft);
    sendErrorReport.mockResolvedValue(undefined);

    const sent = await flushPendingReport('UA');

    expect(sent).toBe(true);
    expect(sendErrorReport).toHaveBeenCalledWith(
      expect.objectContaining({ doing: 'Opening a show' }),
      'UA',
    );
    expect(loadPendingReport()).toBeNull();
  });

  it('keeps the report when the send fails on the network or times out', async () => {
    for (const err of [
      new TypeError('Failed to fetch'),
      new DOMException('signal timed out', 'TimeoutError'),
    ]) {
      savePendingReport(draft);
      sendErrorReport.mockRejectedValueOnce(err);
      expect(await flushPendingReport('UA')).toBe(false);
      expect(loadPendingReport()).not.toBeNull();
    }
  });

  // 429 is refused (README §18, Decided 6): retrying it on every app open for
  // a week was the bug.
  it.each([400, 403, 413, 422, 429])(
    'drops a report answered %i',
    async (status) => {
      savePendingReport(draft);
      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(status));
      expect(await flushPendingReport('UA')).toBe(false);
      expect(loadPendingReport()).toBeNull();
    },
  );

  // 401 is kept: Clerk's client can say signed in over a stale cookie.
  it.each([401, 408, 425, 500, 502, 503, 504])(
    'keeps a report answered %i for the next launch',
    async (status) => {
      savePendingReport(draft);
      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(status));
      expect(await flushPendingReport('UA')).toBe(false);
      expect(loadPendingReport()).not.toBeNull();
    },
  );

  it('does nothing when nothing is saved', async () => {
    clearPendingReport();
    expect(await flushPendingReport('UA')).toBe(false);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });
});

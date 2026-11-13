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

    const sent = await flushPendingReport(async () => 'token', 'UA');

    expect(sent).toBe(true);
    expect(sendErrorReport).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ doing: 'Opening a show' }),
      'UA',
    );
    expect(loadPendingReport()).toBeNull();
  });

  it('keeps the report when signed out or when the send fails again', async () => {
    savePendingReport(draft);

    expect(await flushPendingReport(async () => null, 'UA')).toBe(false);
    expect(sendErrorReport).not.toHaveBeenCalled();

    sendErrorReport.mockRejectedValue(new Error('503'));
    expect(await flushPendingReport(async () => 'token', 'UA')).toBe(false);
    expect(loadPendingReport()).not.toBeNull();
  });

  it('drops a report the API refuses on its merits, but keeps one it may take later', async () => {
    savePendingReport(draft);
    sendErrorReport.mockRejectedValue(new ReportRejectedError(400));
    expect(await flushPendingReport(async () => 'token', 'UA')).toBe(false);
    expect(loadPendingReport()).toBeNull();

    // Sign in again, slow down and timed out can all succeed on a later open.
    for (const status of [401, 408, 429, 503]) {
      savePendingReport(draft);
      sendErrorReport.mockRejectedValue(new ReportRejectedError(status));
      await flushPendingReport(async () => 'token', 'UA');
      expect(loadPendingReport()).not.toBeNull();
    }
  });

  it('does nothing when nothing is saved', async () => {
    clearPendingReport();
    expect(await flushPendingReport(async () => 'token', 'UA')).toBe(false);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });
});

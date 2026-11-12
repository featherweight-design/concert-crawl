// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPendingReport,
  flushPendingReport,
  loadPendingReport,
  savePendingReport,
} from './pending-report';

const sendErrorReport = vi.hoisted(() => vi.fn());
vi.mock('./send-report', () => ({ sendErrorReport }));

const draft = {
  doing: 'Opening a show',
  note: 'It went blank.',
  errorId: '2849204133',
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

  it('does nothing when nothing is saved', async () => {
    clearPendingReport();
    expect(await flushPendingReport(async () => 'token', 'UA')).toBe(false);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });
});

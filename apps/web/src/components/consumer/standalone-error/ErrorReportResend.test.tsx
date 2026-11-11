// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { ErrorReportResend, flushPendingReports } from './ErrorReportResend';
import {
  PENDING_CAP,
  PENDING_REPORTS_KEY,
  RESEND_LOCK_KEY,
  readPendingReports,
  savePendingReport,
} from './lib/pending';
import type { ErrorReportBody } from './lib/report';

const OWNER = 'uat:1731300000';

const report = (errorId: string): ErrorReportBody => ({
  errorId,
  doing: 'opening',
  note: 'It went blank.',
  page: '/venues/bluebird-theater',
  device: 'iPhone · Safari',
});

const ids = () => readPendingReports().map((entry) => entry.report.errorId);

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(null, { status: 201 }),
);

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = '__client_uat=1731300000';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('the saved report list', () => {
  it('keeps the newest few, one per error id', () => {
    for (let idx = 0; idx < PENDING_CAP + 2; idx += 1) {
      vi.spyOn(Date, 'now').mockReturnValue(1000 + idx);
      savePendingReport(report(`id${idx}`), OWNER);
    }
    savePendingReport(report('id4'), OWNER);
    expect(ids()).toHaveLength(PENDING_CAP);
    expect(ids()).toContain('id4');
    expect(ids()).not.toContain('id0');
    expect(ids().filter((id) => id === 'id4')).toHaveLength(1);
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readPendingReports()).toEqual([]);
    expect(() => savePendingReport(report('x1'), OWNER)).not.toThrow();
  });
});

describe('resending saved reports on launch', () => {
  it('sends once per tab, even under the double effect, and clears them', async () => {
    savePendingReport(report('a1'), OWNER);
    render(
      <StrictMode>
        <ErrorReportResend />
      </StrictMode>,
    );
    await waitFor(() => expect(ids()).toEqual([]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1].body))).toEqual(
      report('a1'),
    );
    expect(
      new Headers(fetchMock.mock.calls[0]![1].headers).get('Idempotency-Key'),
    ).toBe('error-report:a1');
    // A second mount in the same tab sends nothing.
    savePendingReport(report('a2'), OWNER);
    render(<ErrorReportResend />);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves them alone while signed out', async () => {
    savePendingReport(report('b1'), OWNER);
    document.cookie = '__client_uat=0';
    await flushPendingReports();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ids()).toEqual(['b1']);
  });

  it('drops reports saved under another session, unsent', async () => {
    savePendingReport(report('c1'), 'uat:999');
    savePendingReport(report('c2'), OWNER);
    await flushPendingReports();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual([]);
  });

  it('removes only what it sent, keeping a failure and a report saved meanwhile', async () => {
    savePendingReport(report('d1'), OWNER);
    savePendingReport(report('d2'), OWNER);
    fetchMock.mockImplementationOnce(async () => {
      // The error page saves another while this send is in flight.
      savePendingReport(report('d3'), OWNER);
      return new Response(null, { status: 503 });
    });
    await flushPendingReports();
    // One of d1/d2 failed (kept), the other was sent (removed), and d3,
    // written mid-flight, survives the removal.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(ids()).toHaveLength(2);
    expect(ids()).toContain('d3');
  });

  it('drops one the server always refuses', async () => {
    savePendingReport(report('e1'), OWNER);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
    await flushPendingReports();
    expect(ids()).toEqual([]);
  });

  it('stands back while another tab holds the lock', async () => {
    savePendingReport(report('f1'), OWNER);
    localStorage.setItem(RESEND_LOCK_KEY, `${Date.now()}:other`);
    await flushPendingReports();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ids()).toEqual(['f1']);
  });

  it('ignores an unreadable store', async () => {
    localStorage.setItem(PENDING_REPORTS_KEY, '{nope');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await flushPendingReports();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

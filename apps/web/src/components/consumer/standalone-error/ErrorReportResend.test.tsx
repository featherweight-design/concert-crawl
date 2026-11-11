// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { ErrorReportResend, flushPendingReport } from './ErrorReportResend';
import { PENDING_REPORT_KEY } from './lib/report';

const SAVED = {
  errorId: '2849204133',
  doing: 'opening',
  note: 'It went blank.',
  page: '/venues/bluebird-theater',
  device: 'iPhone · Safari',
};

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(null, { status: 201 }),
);

const save = (value: unknown) =>
  localStorage.setItem(PENDING_REPORT_KEY, JSON.stringify(value));

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

describe('resending a saved error report on launch', () => {
  it('sends it once on mount, even under the double effect, and clears it', async () => {
    save(SAVED);
    render(
      <StrictMode>
        <ErrorReportResend />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(localStorage.getItem(PENDING_REPORT_KEY)).toBeNull(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1].body))).toEqual(SAVED);
  });

  it('does nothing when nothing is saved', async () => {
    await flushPendingReport();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for a session before sending', async () => {
    save(SAVED);
    document.cookie = '__client_uat=0';
    await flushPendingReport();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(PENDING_REPORT_KEY)).not.toBeNull();
  });

  it('keeps it for a later launch when the send fails', async () => {
    save(SAVED);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await flushPendingReport();
    expect(localStorage.getItem(PENDING_REPORT_KEY)).not.toBeNull();
  });

  it('drops one the server rejects, or one it cannot read', async () => {
    save(SAVED);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
    await flushPendingReport();
    expect(localStorage.getItem(PENDING_REPORT_KEY)).toBeNull();

    save({ errorId: 'not an id; drop' });
    await flushPendingReport();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(PENDING_REPORT_KEY)).toBeNull();
  });

  it('survives storage that throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    await expect(flushPendingReport()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  classifyReportFailure,
  classifyReportStatus,
  ReportRejectedError,
  sendErrorReport,
} from './send-report';

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<unknown>>();

const answer = (status: number, type = 'basic') => ({
  ok: status >= 200 && status < 300,
  status,
  type,
});

const draft = {
  doing: 'Opening a show',
  note: '  It went blank.  ',
  digest: '2849204133',
  page: '/venues/bluebird-theater',
};

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const lastInit = (): RequestInit => {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch was not called');
  return call[1];
};

describe('sendErrorReport', () => {
  it('posts same-origin, keepalive, with an 8s timeout and no bearer token', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(answer(201));

    await sendErrorReport(draft, IPHONE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/error-report');
    const init = lastInit();
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(8000);
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('sends the report as a bug with the error page metadata', async () => {
    fetchMock.mockResolvedValue(answer(201));

    await sendErrorReport({ ...draft, sentryEventId: 'not an id!' }, IPHONE);

    expect(JSON.parse(String(lastInit().body))).toEqual({
      category: 'bug',
      message: 'Opening a show. It went blank.',
      pageUrl: '/venues/bluebird-theater',
      metadata: {
        source: 'error',
        build: expect.any(String),
        device: 'Safari on iPhone',
        doing: 'Opening a show',
        digest: '2849204133',
      },
    });
  });

  it('treats a redirect as signed out rather than following it to a 200', async () => {
    fetchMock.mockResolvedValue(answer(0, 'opaqueredirect'));

    const err: unknown = await sendErrorReport(draft, IPHONE).catch(
      (caught: unknown) => caught,
    );

    expect(err).toBeInstanceOf(ReportRejectedError);
    expect(classifyReportFailure(err)).toBe('signed-out');
  });

  it.each([
    [401, 'signed-out'],
    [400, 'refused'],
    [403, 'refused'],
    [422, 'refused'],
    [429, 'refused'],
    [408, 'transient'],
    [425, 'transient'],
    [500, 'transient'],
    [502, 'transient'],
    [503, 'transient'],
    [504, 'transient'],
  ] as const)('classifies a %i answer as %s', async (status, outcome) => {
    fetchMock.mockResolvedValue(answer(status));

    const err: unknown = await sendErrorReport(draft, IPHONE).catch(
      (caught: unknown) => caught,
    );

    expect(err).toBeInstanceOf(ReportRejectedError);
    expect(classifyReportStatus(status)).toBe(outcome);
    expect(classifyReportFailure(err)).toBe(outcome);
  });

  it('classifies a network failure and a timeout as transient', async () => {
    for (const thrown of [
      new TypeError('Failed to fetch'),
      new DOMException('signal timed out', 'TimeoutError'),
    ]) {
      fetchMock.mockRejectedValueOnce(thrown);

      const err: unknown = await sendErrorReport(draft, IPHONE).catch(
        (caught: unknown) => caught,
      );

      expect(err).toBe(thrown);
      expect(classifyReportFailure(err)).toBe('transient');
    }
  });
});

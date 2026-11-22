import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RobotsState {
  disallowed: Set<string>;
  unreachable: boolean;
  crawlDelayMs: number | null;
}

const { robotsState, fetchMock, waits } = vi.hoisted(() => {
  const state: RobotsState = {
    disallowed: new Set(),
    unreachable: false,
    crawlDelayMs: null,
  };
  const recorded: number[] = [];
  return { robotsState: state, fetchMock: vi.fn(), waits: recorded };
});

vi.mock('@concert-crawl/crawler-core/robots', () => ({
  checkRobots: async (url: string) => {
    if (robotsState.unreachable) {
      return { status: 'unreachable', reason: 'timeout' };
    }
    return robotsState.disallowed.has(new URL(url).pathname)
      ? { status: 'disallowed' }
      : { status: 'allowed' };
  },
  getCrawlDelayMs: async () => robotsState.crawlDelayMs,
  resolveCrawlDelayMs: (venueMs: number, robotsMs: number | null) =>
    robotsMs !== null && robotsMs > 30_000
      ? null
      : Math.max(venueMs, robotsMs ?? 0, 3_000),
}));

// Pacing is recorded, not slept: the delay each wait was asked for.
vi.mock('@concert-crawl/crawler-core/jitter', () => ({
  jitter: (delayMs: number) => {
    waits.push(delayMs);
    return 0;
  },
}));

vi.mock('@concert-crawl/crawler-core/robots-fetch', () => ({
  raceSignal: <TResult>(promise: Promise<TResult>) => promise,
  fetchFollowingRobots: fetchMock,
}));

import { GUIDE_PAGE_MAX_CHARS, readGuidePages } from './guide-pages.js';

const SITE = 'https://www.dazzledenver.com/';
const PAGE_TEXT = 'Parking is in the garage under the arts complex. '.repeat(5);

const page = (
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
) =>
  new Response(`<html><body><p>${body}</p></body></html>`, {
    ...init,
    headers: { 'content-type': 'text/html; charset=utf-8', ...init.headers },
  });

const statuses = (result: Awaited<ReturnType<typeof readGuidePages>>) =>
  result.attempts.map((attempt) => [
    new URL(attempt.url).pathname,
    attempt.status,
  ]);

describe('readGuidePages', () => {
  beforeEach(() => {
    robotsState.disallowed = new Set();
    robotsState.unreachable = false;
    robotsState.crawlDelayMs = null;
    fetchMock.mockReset();
    waits.length = 0;
  });

  it('reads each allowed page, paced, and reports every path tried', async () => {
    robotsState.disallowed = new Set(['/info']);
    fetchMock.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === '/policies') {
        return { response: page('', { status: 404 }), finalUrl: url };
      }
      return {
        response: page(`${path} ${PAGE_TEXT}`, {
          headers: { 'last-modified': 'Tue, 02 Jan 2024 00:00:00 GMT' },
        }),
        finalUrl: url,
      };
    });

    const result = await readGuidePages(SITE, 3_000);

    expect(statuses(result)).toEqual([
      ['/faq', 'read'],
      ['/accessibility', 'read'],
      ['/info', 'disallowed'],
      ['/policies', 'notFound'],
    ]);
    expect(result.pages.map((read) => read.url)).toEqual([
      'https://www.dazzledenver.com/faq',
      'https://www.dazzledenver.com/accessibility',
    ]);
    expect(result.pages[0]?.lastModified).toBe('Tue, 02 Jan 2024 00:00:00 GMT');
    // A disallowed path is never requested; every request waits first.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([3_000, 3_000, 3_000]);
  });

  it('paces at the longer robots.txt Crawl-delay and skips a site over the cap', async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      response: page(PAGE_TEXT),
      finalUrl: url,
    }));
    robotsState.crawlDelayMs = 10_000;
    await readGuidePages(SITE, 3_000);
    expect(new Set(waits)).toEqual(new Set([10_000]));
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      crawlDelayMs: 10_000,
    });

    fetchMock.mockClear();
    robotsState.crawlDelayMs = 60_000;
    const capped = await readGuidePages(SITE, 3_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(capped.attempts.every((item) => item.status === 'skipped')).toBe(
      true,
    );
  });

  it('never reads anything when robots.txt is unreachable', async () => {
    robotsState.unreachable = true;
    const result = await readGuidePages(SITE, 3_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.attempts.every((item) => item.status === 'unreachable')).toBe(
      true,
    );
  });

  it('refuses a redirect off the venue’s site, and allows one to the bare domain', async () => {
    fetchMock.mockImplementation(
      async (
        url: string,
        options: { onRedirect: (from: string, to: string) => void },
      ) => {
        const path = new URL(url).pathname;
        const target =
          path === '/faq'
            ? 'https://help.ticketing.example/dazzle'
            : `https://dazzledenver.com${path}`;
        options.onRedirect(url, target);
        return { response: page(`${path} ${PAGE_TEXT}`), finalUrl: target };
      },
    );
    const result = await readGuidePages(SITE, 3_000);
    expect(statuses(result)[0]).toEqual(['/faq', 'offSite']);
    expect(statuses(result)[1]).toEqual(['/accessibility', 'read']);
    expect(result.pages[0]?.url).toBe('https://dazzledenver.com/accessibility');
  });

  it('stops at a 403 or 429, leaving the pages after it skipped', async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      response: page('', { status: 429 }),
      finalUrl: url,
    }));
    const result = await readGuidePages(SITE, 3_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(statuses(result)).toEqual([
      ['/faq', 'unreachable'],
      ['/accessibility', 'skipped'],
      ['/info', 'skipped'],
      ['/policies', 'skipped'],
    ]);
  });

  it('counts two paths that land on one page once, drops an empty page, and caps the text', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === '/info') {
        return { response: page('Hi'), finalUrl: url };
      }
      return {
        response: page('x '.repeat(GUIDE_PAGE_MAX_CHARS) + '[link: x]'),
        finalUrl: 'https://www.dazzledenver.com/faq',
      };
    });
    const result = await readGuidePages(SITE, 3_000);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.text.length).toBeLessThanOrEqual(
      GUIDE_PAGE_MAX_CHARS,
    );
    expect(statuses(result)).toEqual([
      ['/faq', 'read'],
      ['/accessibility', 'read'],
      ['/info', 'notFound'],
      ['/policies', 'read'],
    ]);
  });

  it('skips a page that is not HTML and reads only the first 512 KB of a huge one', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === '/faq') {
        return {
          response: page(PAGE_TEXT, {
            headers: { 'content-type': 'application/pdf' },
          }),
          finalUrl: url,
        };
      }
      return {
        response: page(`${path} ${PAGE_TEXT}${'y'.repeat(2 * 1024 * 1024)}`, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
        finalUrl: url,
      };
    });
    const result = await readGuidePages(SITE, 3_000);
    expect(statuses(result)[0]).toEqual(['/faq', 'notFound']);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0]?.text.length).toBeLessThanOrEqual(
      GUIDE_PAGE_MAX_CHARS,
    );
  });

  it('reads a failed request as unreachable and carries on', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockImplementation(async (url: string) => ({
        response: page(PAGE_TEXT),
        finalUrl: url,
      }));
    const result = await readGuidePages(SITE, 3_000);
    expect(statuses(result)[0]).toEqual(['/faq', 'unreachable']);
    expect(result.pages).toHaveLength(3);
  });
});

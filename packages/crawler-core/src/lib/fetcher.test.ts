import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  CrawlSelectorTimeoutError,
} from './fetcher.js';
import { RobotsDisallowedError } from './robots-fetch.js';
import type {
  Browser,
  BrowserContext,
  CDPSession,
  Page,
  Request,
  Response,
  Route,
} from 'playwright';
import * as robots from './robots.js';
import { FetchLog } from './fetch-log.js';
import { jitter } from './fetchers/jitter.js';

// jitter() floors every wait at 3 s, so the real one would make each request
// here sleep 3-4 s. Stubbed to 0 by default; a test that asserts pacing on
// purpose switches the real one back in and drives it with fake timers.
vi.mock('./fetchers/jitter.js', () => ({ jitter: vi.fn(() => 0) }));
const { jitter: realJitter } = await vi.importActual<
  typeof import('./fetchers/jitter.js')
>('./fetchers/jitter.js');

// Pinning random keeps any test that runs the real jitter deterministic.
// Every redirect hop clears robots.txt; allowed unless a test says otherwise.
let isAllowedSpy: ReturnType<typeof vi.spyOn>;
let crawlDelaySpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.mocked(jitter).mockImplementation(() => 0);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  isAllowedSpy = vi.spyOn(robots, 'isAllowedOrSkip').mockResolvedValue(true);
  crawlDelaySpy = vi.spyOn(robots, 'getCrawlDelayMs').mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// Playwright signals selector timeouts by error name, not by class.
function makeTimeoutError(message: string): Error {
  const err = new Error(message);
  err.name = 'TimeoutError';
  return err;
}

// A Playwright response for `url`, reached through `redirectedFrom` (oldest
// hop first) when given.
function makeResponse(
  status: number,
  url = 'https://example.com',
  redirectedFrom: string[] = [],
): Response {
  let previous: Request | null = null;
  for (const hop of redirectedFrom) {
    const prior = previous;
    previous = {
      url: () => hop,
      redirectedFrom: () => prior,
    } as unknown as Request;
  }
  const head = previous;
  return {
    status: () => status,
    url: () => url,
    request: () => ({ redirectedFrom: () => head }),
  } as unknown as Response;
}

function makeMockPage(overrides: Partial<Page> = {}): Page {
  return {
    on: vi.fn(),
    route: vi.fn().mockResolvedValue(undefined),
    mainFrame: vi.fn().mockReturnValue('main-frame'),
    goto: vi.fn().mockResolvedValue(makeResponse(200)),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForEvent: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue('<html><body>loaded</body></html>'),
    url: vi.fn().mockReturnValue('https://example.com'),
    ...overrides,
  } as unknown as Page;
}

// A paused main-frame document, as CDP's Fetch.requestPaused reports it.
interface PausedEvent {
  url: string;
  frameId?: string;
  networkId?: string;
  redirectedRequestId?: string;
}
type Verdict = 'continue' | 'fail';

// The CDP session fetchPage gates main-frame documents through. `pause`
// raises Fetch.requestPaused and resolves with how the handler answered it;
// `emit` raises any other event.
function makeMockCdp() {
  const listeners = new Map<string, (event: unknown) => void>();
  const emit = (name: string, event: unknown = {}): void =>
    listeners.get(name)?.(event);
  const answers = new Map<string, (verdict: Verdict) => void>();
  let nextId = 0;
  const send = vi.fn(
    async (method: string, params?: { requestId?: string }) => {
      if (method === 'Page.getFrameTree') {
        return { frameTree: { frame: { id: 'main-frame-id' } } };
      }
      const requestId = params?.requestId ?? '';
      if (method === 'Fetch.continueRequest') {
        answers.get(requestId)?.('continue');
      }
      if (method === 'Fetch.failRequest') answers.get(requestId)?.('fail');
      return {};
    },
  );
  const session = {
    send,
    on: vi.fn((name: string, fn: (event: unknown) => void) => {
      listeners.set(name, fn);
    }),
    detach: vi.fn().mockResolvedValue(undefined),
  } as unknown as CDPSession;
  const pause = (event: PausedEvent): Promise<Verdict> => {
    const requestId = `req-${++nextId}`;
    return new Promise<Verdict>((resolve) => {
      answers.set(requestId, resolve);
      emit('Fetch.requestPaused', {
        requestId,
        request: { url: event.url },
        frameId: event.frameId ?? 'main-frame-id',
        networkId: event.networkId ?? requestId,
        redirectedRequestId: event.redirectedRequestId,
      });
    });
  };
  // Every request id the handler answered with `method`.
  const answered = (method: string): string[] =>
    send.mock.calls
      .filter(([called]) => called === method)
      .map(([, params]) => params?.requestId ?? '');
  return { session, send, pause, emit, answered };
}

function makeMockBrowser(
  page: Page,
  cdp: ReturnType<typeof makeMockCdp> = makeMockCdp(),
): Browser {
  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    newCDPSession: vi.fn().mockResolvedValue(cdp.session),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserContext;
  return {
    newContext: vi.fn().mockResolvedValue(context),
  } as unknown as Browser;
}

describe('fetchPage — navigation timeout', () => {
  it("replaces goto()'s timeout with a 60-second clock that throws Playwright's TimeoutError", async () => {
    vi.useFakeTimers();
    try {
      const page = makeMockPage({
        goto: vi.fn(() => new Promise(() => {})) as unknown as Page['goto'],
      });
      const run = fetchPage('https://example.com', makeMockBrowser(page), 0);
      const settled = run.catch((caught: unknown) => caught);
      await vi.advanceTimersByTimeAsync(59_000);
      expect(page.goto).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ timeout: 0 }),
      );
      await vi.advanceTimersByTimeAsync(1_500);
      const err = await settled;
      // crawl.ts reads a timeout by this name (failureReason, isTimeoutBlock).
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).name).toBe('TimeoutError');
      expect((err as Error).message).toContain('Timeout 60000ms exceeded');
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops the clock while a redirect hop waits its pacing', async () => {
    vi.useFakeTimers();
    try {
      const cdp = makeMockCdp();
      let hop: Verdict | undefined;
      const page = makeMockPage({
        goto: vi.fn(async () => {
          await cdp.pause({ url: 'https://example.com/', networkId: 'nav' });
          hop = await cdp.pause({
            url: 'https://example.com/events',
            networkId: 'nav',
            redirectedRequestId: 'nav',
          });
          return new Promise(() => {});
        }) as unknown as Page['goto'],
      });
      // The first wait is fetchPage's own; the hop then waits 50 s.
      vi.mocked(jitter).mockReturnValueOnce(0).mockReturnValue(50_000);
      const settled = fetchPage(
        'https://example.com',
        makeMockBrowser(page, cdp),
        0,
      ).catch((caught: unknown) => caught);
      let done = false;
      void settled.then(() => {
        done = true;
      });

      await vi.advanceTimersByTimeAsync(51_000);
      expect(hop).toBe('continue');
      // 100 s on the wall, but only ~50 s of it was the site's.
      await vi.advanceTimersByTimeAsync(49_000);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(12_000);
      expect(((await settled) as Error).name).toBe('TimeoutError');
    } finally {
      vi.useRealTimers();
    }
  });

  it('never continues a hop still pending at teardown, and closes rather than detaches', async () => {
    const cdp = makeMockCdp();
    let release: ((allowed: boolean) => void) | undefined;
    isAllowedSpy.mockImplementation(async (url: string) =>
      url.endsWith('/events')
        ? new Promise<boolean>((resolve) => {
            release = resolve;
          })
        : true,
    );
    let hop: Promise<Verdict> | undefined;
    const page = makeMockPage({
      // The last read before teardown: a meta refresh pauses here and is
      // still being checked when fetchPage closes the context.
      content: vi.fn(async () => {
        hop = cdp.pause({ url: 'https://example.com/events' });
        return '<html><body>loaded</body></html>';
      }) as unknown as Page['content'],
    });
    const browser = makeMockBrowser(page, cdp);

    await fetchPage('https://example.com', browser, 0);
    const context = (await vi.mocked(browser.newContext).mock.results[0]
      ?.value) as BrowserContext;
    expect(context.close).toHaveBeenCalled();
    release?.(true);

    await expect(hop).resolves.toBe('fail');
    expect(cdp.answered('Fetch.continueRequest')).toEqual([]);
    expect(cdp.session.detach).not.toHaveBeenCalled();
  });

  it('passes the waitUntil strategy to page.goto when no selector is provided', async () => {
    const page = makeMockPage();
    const browser = makeMockBrowser(page);
    await fetchPage('https://example.com', browser, 0, 'load');
    expect(page.goto).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ waitUntil: 'load' }),
    );
  });
});

describe('fetchPage — waitForSelector', () => {
  it('calls page.waitForSelector and forces domcontentloaded when selector is provided', async () => {
    const page = makeMockPage();
    const browser = makeMockBrowser(page);

    await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    );

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 0,
    });
    expect(page.waitForSelector).toHaveBeenCalledWith('.event-card', {
      timeout: 30_000,
    });
  });

  it('does not call waitForSelector when no selector is provided', async () => {
    const page = makeMockPage();
    const browser = makeMockBrowser(page);

    await fetchPage('https://example.com', browser, 0, 'networkidle');

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'networkidle',
      timeout: 0,
    });
    expect(page.waitForSelector).not.toHaveBeenCalled();
  });

  it('throws CrawlFetchError before calling waitForSelector when response is 403', async () => {
    const page = makeMockPage({
      goto: vi.fn().mockResolvedValue(makeResponse(403)),
    });
    const browser = makeMockBrowser(page);

    await expect(
      fetchPage(
        'https://example.com',
        browser,
        0,
        'networkidle',
        '.event-card',
      ),
    ).rejects.toThrow('HTTP 403');
    expect(page.waitForSelector).not.toHaveBeenCalled();
  });

  it('captures the rendered html on the error when waitForSelector times out', async () => {
    const page = makeMockPage({
      waitForSelector: vi
        .fn()
        .mockRejectedValue(
          makeTimeoutError('page.waitForSelector: Timeout 30000ms exceeded.'),
        ),
      content: vi.fn().mockResolvedValue('<html><body>challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/blocked'),
    });
    const browser = makeMockBrowser(page);

    const err = await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    ).catch((caught: unknown) => caught);

    if (!(err instanceof CrawlSelectorTimeoutError)) {
      throw new Error('expected a CrawlSelectorTimeoutError');
    }
    expect(err.html).toBe('<html><body>challenge</body></html>');
    expect(err.finalUrl).toBe('https://example.com/blocked');
    expect(err.httpStatus).toBe(200);
    expect(err.selector).toBe('.event-card');
    expect(err.message).toContain('Timeout 30000ms exceeded');
    expect(err.message).toContain('.event-card');
    expect(err.message).toContain('https://example.com/blocked');
  });

  it('still throws when the page content is unreadable after a selector timeout', async () => {
    const page = makeMockPage({
      waitForSelector: vi.fn().mockRejectedValue(makeTimeoutError('Timeout')),
      content: vi.fn().mockRejectedValue(new Error('page closed')),
    });
    const browser = makeMockBrowser(page);

    const err = await fetchPage(
      'https://example.com',
      browser,
      0,
      'networkidle',
      '.event-card',
    ).catch((caught: unknown) => caught);

    if (!(err instanceof CrawlSelectorTimeoutError)) {
      throw new Error('expected a CrawlSelectorTimeoutError');
    }
    expect(err.html).toBeNull();
  });

  it('returns html and status on success', async () => {
    const page = makeMockPage();
    const browser = makeMockBrowser(page);

    const result = await fetchPage('https://example.com', browser, 0);

    expect(result.html).toBe('<html><body>loaded</body></html>');
    expect(result.httpStatus).toBe(200);
    expect(result.finalUrl).toBe('https://example.com');
  });
});

describe('fetchPage — robots.txt on redirects and navigations', () => {
  it('discards the page when a server redirect passed through a disallowed URL', async () => {
    const page = makeMockPage({
      goto: vi
        .fn()
        .mockResolvedValue(
          makeResponse(200, 'https://example.com/final', [
            'https://example.com',
            'https://example.com/private',
          ]),
        ),
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    );

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page), 0),
    ).rejects.toThrow('robots.txt disallows redirect target');
    expect(page.content).not.toHaveBeenCalled();
  });

  it('logs a page that never answered', async () => {
    const page = makeMockPage({
      goto: vi.fn().mockRejectedValue(makeTimeoutError('Navigation timeout')),
    });
    const log = new FetchLog();

    await expect(
      fetchPage(
        'https://example.com',
        makeMockBrowser(page),
        0,
        'networkidle',
        undefined,
        log,
      ),
    ).rejects.toThrow('Navigation timeout');
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({
      url: 'https://example.com',
      httpStatus: null,
      fetchMode: 'browser',
    });
  });

  it('reports a block even when the redirect chain passed a disallowed URL', async () => {
    const page = makeMockPage({
      goto: vi
        .fn()
        .mockResolvedValue(
          makeResponse(403, 'https://example.com/final', [
            'https://example.com',
            'https://example.com/private',
          ]),
        ),
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    );

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page), 0),
    ).rejects.toBeInstanceOf(CrawlFetchError);
  });

  // A fetchPage whose goto() starts at https://example.com/ and then raises
  // the redirect hop `to` through the CDP session, as Chromium would.
  function navigatingTo(to: string) {
    const cdp = makeMockCdp();
    const verdicts: Verdict[] = [];
    const page = makeMockPage({
      goto: vi.fn(async () => {
        verdicts.push(
          await cdp.pause({ url: 'https://example.com/', networkId: 'nav' }),
        );
        const hop = await cdp.pause({
          url: to,
          networkId: 'nav',
          redirectedRequestId: 'nav',
        });
        verdicts.push(hop);
        if (hop === 'fail') throw new Error('net::ERR_BLOCKED_BY_CLIENT');
        return makeResponse(200, to, ['https://example.com/']);
      }) as unknown as Page['goto'],
    });
    return { cdp, page, verdicts };
  }

  it('paces an allowed redirect hop at least 3 s, then lets Chromium send it', async () => {
    vi.mocked(jitter).mockImplementation(realJitter);
    vi.useFakeTimers();
    try {
      const { cdp, page, verdicts } = navigatingTo(
        'https://example.com/events',
      );
      const run = fetchPage(
        'https://example.com',
        makeMockBrowser(page, cdp),
        0,
      );

      // fetchPage's own wait (3000 + 500 jitter); goto()'s request is not
      // paced again.
      await vi.advanceTimersByTimeAsync(3_600);
      expect(verdicts).toEqual(['continue']);
      // The hop clears robots.txt, then waits its own 3000 + 500.
      expect(isAllowedSpy).toHaveBeenCalledWith(
        'https://example.com/events',
        'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
      );
      await vi.advanceTimersByTimeAsync(2_999);
      expect(verdicts).toEqual(['continue']);
      await vi.advanceTimersByTimeAsync(600);
      expect(verdicts).toEqual(['continue', 'continue']);
      await expect(run).resolves.toMatchObject({ httpStatus: 200 });
      expect(cdp.answered('Fetch.failRequest')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails a disallowed redirect hop with BlockedByClient, never sends it, and throws the disallow', async () => {
    const { cdp, page, verdicts } = navigatingTo('https://example.com/private');
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    );

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page, cdp), 0),
    ).rejects.toBeInstanceOf(RobotsDisallowedError);
    expect(verdicts).toEqual(['continue', 'fail']);
    expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
      requestId: 'req-2',
      errorReason: 'BlockedByClient',
    });
    expect(cdp.answered('Fetch.continueRequest')).toEqual(['req-1']);
  });

  // Runs fetchPage and calls `during` from content(), the last read before
  // teardown, so the gate is still open; returns what `during` returned.
  async function duringFetch<T>(
    cdp: ReturnType<typeof makeMockCdp>,
    during: () => Promise<T>,
  ): Promise<T> {
    let out: { value: T } | undefined;
    const page = makeMockPage({
      content: vi.fn(async () => {
        out = { value: await during() };
        return '<html><body>loaded</body></html>';
      }) as unknown as Page['content'],
    });
    await fetchPage('https://example.com', makeMockBrowser(page, cdp), 0);
    if (!out) throw new Error('content() was never read');
    return out.value;
  }

  it("continues goto()'s own request for a bare-origin URL with no lookup or wait", async () => {
    const cdp = makeMockCdp();
    let setTimeoutSpy: ReturnType<typeof vi.spyOn> | undefined;
    const verdict = await duringFetch(cdp, async () => {
      isAllowedSpy.mockClear();
      setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const answer = await cdp.pause({ url: 'https://example.com/' });
      setTimeoutSpy.mockRestore();
      return answer;
    });

    expect(verdict).toBe('continue');
    expect(isAllowedSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('gates a later navigation back to the starting URL', async () => {
    const cdp = makeMockCdp();
    await duringFetch(cdp, async () => {
      await cdp.pause({ url: 'https://example.com/' }); // goto()'s own request
      isAllowedSpy.mockClear();
      // A reload: must clear robots.txt and pacing.
      return cdp.pause({ url: 'https://example.com/' });
    });

    expect(isAllowedSpy).toHaveBeenCalledWith(
      'https://example.com/',
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    );
  });

  it('blocks a disallowed navigation the page starts after goto() and still returns the page', async () => {
    const cdp = makeMockCdp();
    const listeners: Record<string, (arg: unknown) => void> = {};
    let verdict: Verdict | undefined;
    const page = makeMockPage({
      on: vi.fn((event: string, fn: (arg: unknown) => void) => {
        listeners[event] = fn;
      }) as unknown as Page['on'],
      // A script navigates once the page has loaded. Playwright still
      // reports the request it raised, though Chromium never sends it.
      waitForSelector: vi.fn(async () => {
        listeners.request?.({
          isNavigationRequest: () => true,
          frame: () => 'main-frame',
          url: () => 'https://example.com/private/x.html',
        });
        verdict = await cdp.pause({
          url: 'https://example.com/private/x.html',
        });
        return null;
      }) as unknown as Page['waitForSelector'],
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.includes('/private/'),
    );

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page, cdp),
      0,
      'networkidle',
      '.event-card',
    );

    expect(verdict).toBe('fail');
    // Aborted, not BlockedByClient: Chromium keeps the loaded page rather
    // than commit its error page over it.
    expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
      requestId: expect.any(String),
      errorReason: 'Aborted',
    });
    expect(cdp.answered('Fetch.continueRequest')).toEqual([]);
    expect(result.html).toBe('<html><body>loaded</body></html>');
  });

  it('waits for a gate still deciding a page-started navigation, then reads the page it lands on', async () => {
    const cdp = makeMockCdp();
    let landed = 'original';
    let hop: Promise<Verdict> | undefined;
    const events: string[] = [];
    // The hop's robots.txt lookup is still running when content() would be
    // read.
    isAllowedSpy.mockImplementation(async (url: string) => {
      if (url.endsWith('/next')) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return true;
    });
    const page = makeMockPage({
      // A script navigates after load, while the selector wait runs.
      waitForSelector: vi.fn(async () => {
        hop = cdp.pause({ url: 'https://example.com/next' });
        // Chromium commits the navigation a little after it is continued,
        // and the new page reaches DOMContentLoaded. Until then the old page
        // is what content() would read.
        void hop.then((verdict) => {
          if (verdict !== 'continue') return;
          setTimeout(() => {
            landed = 'next';
            events.push('domContentEventFired');
            cdp.emit('Page.domContentEventFired');
          }, 50);
        });
        return null;
      }) as unknown as Page['waitForSelector'],
      content: vi.fn(async () => {
        events.push('content');
        return `<html><body>${landed}</body></html>`;
      }) as unknown as Page['content'],
      url: vi.fn(() =>
        landed === 'next' ? 'https://example.com/next' : 'https://example.com',
      ) as unknown as Page['url'],
    });

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page, cdp),
      0,
      'networkidle',
      '.event-card',
    );

    expect(cdp.answered('Fetch.continueRequest')).toHaveLength(1);
    // The read waited for the gate's own session to report the new page's
    // DOMContentLoaded, and only then read it.
    expect(events).toEqual(['domContentEventFired', 'content']);
    expect(result.html).toBe('<html><body>next</body></html>');
    expect(result.finalUrl).toBe('https://example.com/next');
  });

  it('stops waiting for a page-started navigation whose later hop is refused, and reads the original page', async () => {
    const cdp = makeMockCdp();
    const verdicts: Verdict[] = [];
    const page = makeMockPage({
      // A meta refresh to /ok/hop, which the server redirects to a path
      // robots.txt disallows. Nothing ever commits.
      waitForSelector: vi.fn(async () => {
        verdicts.push(
          await cdp.pause({
            url: 'https://example.com/ok/hop',
            networkId: 'jr',
          }),
        );
        verdicts.push(
          await cdp.pause({
            url: 'https://example.com/private/y.html',
            networkId: 'jr',
            redirectedRequestId: 'req-1',
          }),
        );
        return null;
      }) as unknown as Page['waitForSelector'],
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.includes('/private/'),
    );
    const startedAt = Date.now();

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page, cdp),
      0,
      'networkidle',
      '.event-card',
    );

    expect(verdicts).toEqual(['continue', 'fail']);
    expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
      requestId: 'req-2',
      errorReason: 'Aborted',
    });
    // Not the 20 s settle budget.
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(result.html).toBe('<html><body>loaded</body></html>');
  });

  it('blocks a disallowed navigation the page starts during goto() and still returns the page', async () => {
    const cdp = makeMockCdp();
    const verdicts: Verdict[] = [];
    const page = makeMockPage({
      // A meta refresh 0 fires before networkidle lets goto() settle.
      goto: vi.fn(async () => {
        verdicts.push(
          await cdp.pause({ url: 'https://example.com/', networkId: 'nav' }),
        );
        verdicts.push(
          await cdp.pause({
            url: 'https://example.com/private/x.html',
            networkId: 'refresh',
          }),
        );
        return makeResponse(200, 'https://example.com/');
      }) as unknown as Page['goto'],
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.includes('/private/'),
    );

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page, cdp),
      0,
    );

    expect(verdicts).toEqual(['continue', 'fail']);
    expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
      requestId: 'req-2',
      errorReason: 'Aborted',
    });
    expect(result.html).toBe('<html><body>loaded</body></html>');
  });

  it("still throws a disallowed server redirect of goto()'s request, linked by redirectedRequestId alone", async () => {
    const cdp = makeMockCdp();
    const page = makeMockPage({
      goto: vi.fn(async () => {
        await cdp.pause({ url: 'https://example.com/' });
        const hop = await cdp.pause({
          url: 'https://example.com/private',
          networkId: 'unrelated',
          redirectedRequestId: 'req-1',
        });
        if (hop === 'fail') throw new Error('net::ERR_BLOCKED_BY_CLIENT');
        return makeResponse(200);
      }) as unknown as Page['goto'],
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    );

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page, cdp), 0),
    ).rejects.toBeInstanceOf(RobotsDisallowedError);
    expect(cdp.send).toHaveBeenCalledWith('Fetch.failRequest', {
      requestId: 'req-2',
      errorReason: 'BlockedByClient',
    });
  });

  it('follows at most 3 navigations a page starts itself, then aborts the rest and reads the page', async () => {
    const cdp = makeMockCdp();
    const verdicts: Verdict[] = [];
    const page = makeMockPage({
      // A page that meta-refreshes to itself, over and over.
      goto: vi.fn(async () => {
        await cdp.pause({ url: 'https://example.com/', networkId: 'nav' });
        for (let i = 0; i < 5; i++) {
          verdicts.push(
            await cdp.pause({
              url: 'https://example.com/',
              networkId: `refresh-${i}`,
            }),
          );
        }
        return makeResponse(200, 'https://example.com/');
      }) as unknown as Page['goto'],
    });
    isAllowedSpy.mockClear();

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page, cdp),
      0,
    );

    expect(verdicts).toEqual([
      'continue',
      'continue',
      'continue',
      'fail',
      'fail',
    ]);
    // A refused one past the cap costs no robots lookup.
    expect(
      isAllowedSpy.mock.calls.filter(
        (call: unknown[]) => call[0] === 'https://example.com/',
      ),
    ).toHaveLength(3);
    expect(result.html).toBe('<html><body>loaded</body></html>');
  });

  it('stops waiting for page-started navigations after 20 s of wall time, gate waits included', async () => {
    vi.useFakeTimers();
    try {
      const cdp = makeMockCdp();
      const page = makeMockPage({
        // A script navigates after load; its gate then paces for 50 s.
        waitForSelector: vi.fn(async () => {
          void cdp.pause({ url: 'https://example.com/slow' });
          return null;
        }) as unknown as Page['waitForSelector'],
      });
      vi.mocked(jitter).mockReturnValueOnce(0).mockReturnValue(50_000);
      let done = false;
      const run = fetchPage(
        'https://example.com',
        makeMockBrowser(page, cdp),
        0,
        'networkidle',
        '.event-card',
      ).finally(() => {
        done = true;
      });

      await vi.advanceTimersByTimeAsync(19_000);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(done).toBe(true);
      await expect(run).resolves.toMatchObject({ httpStatus: 200 });
      expect(cdp.answered('Fetch.continueRequest')).toEqual([]);
      await vi.advanceTimersByTimeAsync(40_000);
      expect(cdp.answered('Fetch.continueRequest')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  const navigatingError = (): Error =>
    new Error(
      'page.content: Unable to retrieve content because the page is navigating and changing the content.',
    );

  it('retries content() after a navigation caught it mid-commit', async () => {
    const page = makeMockPage({
      content: vi
        .fn()
        .mockRejectedValueOnce(navigatingError())
        .mockRejectedValueOnce(navigatingError())
        .mockResolvedValue('<html><body>landed</body></html>'),
    });

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page),
      0,
    );

    expect(page.waitForLoadState).toHaveBeenCalledWith(
      'domcontentloaded',
      expect.anything(),
    );
    expect(result.html).toBe('<html><body>landed</body></html>');
  });

  it('gives up on content() after the navigation cap allows no more retries', async () => {
    const page = makeMockPage({
      content: vi.fn().mockRejectedValue(navigatingError()),
    });

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page), 0),
    ).rejects.toThrow('is navigating');
    // The first read plus MAX_PAGE_NAVIGATIONS + 1 retries.
    expect(page.content).toHaveBeenCalledTimes(5);
  });

  it('leaves an iframe document to page.route, with no lookup or wait', async () => {
    const cdp = makeMockCdp();
    let setTimeoutSpy: ReturnType<typeof vi.spyOn> | undefined;
    const verdict = await duringFetch(cdp, async () => {
      isAllowedSpy.mockClear();
      crawlDelaySpy.mockClear();
      setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const answer = await cdp.pause({
        url: 'https://ads.example/private/frame.html',
        frameId: 'child-frame-id',
      });
      setTimeoutSpy.mockRestore();
      return answer;
    });

    expect(verdict).toBe('continue');
    expect(isAllowedSpy).not.toHaveBeenCalled();
    expect(crawlDelaySpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('fails the request, rather than leaving it paused, when the gate itself errors', async () => {
    const { cdp, page, verdicts } = navigatingTo('https://example.com/events');
    isAllowedSpy.mockRejectedValueOnce(new Error('robots cache exploded'));

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page, cdp), 0),
    ).rejects.toThrow('robots cache exploded');
    expect(verdicts).toEqual(['continue', 'fail']);
  });

  it('swallows an answer to a request whose page already closed', async () => {
    const cdp = makeMockCdp();
    await duringFetch(cdp, async () => {
      cdp.send.mockRejectedValue(
        new Error('Target page, context or browser has been closed'),
      );
      cdp.pause({ url: 'https://example.com/' }).catch(() => undefined);
      await vi.waitFor(() =>
        expect(cdp.send).toHaveBeenLastCalledWith('Fetch.continueRequest', {
          requestId: expect.any(String),
        }),
      );
    });
    // No unhandled rejection: vitest would fail the run on one.
  });

  it('discards the page when a later navigation redirected somewhere disallowed', async () => {
    const listeners: Record<string, (arg: unknown) => void> = {};
    const page = makeMockPage({
      on: vi.fn((event: string, fn: (arg: unknown) => void) => {
        listeners[event] = fn;
      }) as unknown as Page['on'],
      waitForSelector: vi.fn(async () => {
        listeners.request?.({
          isNavigationRequest: () => true,
          frame: () => 'main-frame',
          url: () => 'https://example.com/private',
        });
        return null;
      }) as unknown as Page['waitForSelector'],
    });
    isAllowedSpy.mockImplementation(
      async (url: string) => !url.endsWith('/private'),
    );

    await expect(
      fetchPage(
        'https://example.com',
        makeMockBrowser(page),
        0,
        'networkidle',
        '.event-card',
      ),
    ).rejects.toThrow('robots.txt disallows redirect target');
    expect(page.content).not.toHaveBeenCalled();
  });

  it('reports a skip, not a failure, when a navigation target cannot be checked', async () => {
    const { cdp, page, verdicts } = navigatingTo('https://elsewhere.example/');
    isAllowedSpy.mockRejectedValueOnce(
      new robots.CrawlSkipError('robots.txt unreachable', 'robots_unreachable'),
    );

    await expect(
      fetchPage('https://example.com', makeMockBrowser(page, cdp), 0),
    ).rejects.toBeInstanceOf(robots.CrawlSkipError);
    expect(verdicts).toEqual(['continue', 'fail']);
  });
});

describe('fetchPage — iframe documents', () => {
  type Handler = (route: Route) => Promise<void>;

  const routeFor = (
    url: string,
    { navigation = true, frame = 'child-frame' } = {},
  ) =>
    ({
      request: () => ({
        isNavigationRequest: () => navigation,
        frame: () => frame,
        url: () => url,
      }),
      continue: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
    }) as unknown as Route;

  async function handlerOf(page: Page): Promise<Handler> {
    await fetchPage('https://example.com', makeMockBrowser(page), 0);
    return vi.mocked(page.route).mock.calls[0]?.[1] as Handler;
  }

  it('aborts an iframe document before it is requested, and the page still loads', async () => {
    let handler: Handler | undefined;
    const frame = routeFor('https://ads.example/private/frame.html');
    const page = makeMockPage({
      route: vi.fn(async (_pattern: string, fn: Handler) => {
        handler = fn;
      }) as unknown as Page['route'],
      goto: vi.fn(async () => {
        await handler?.(frame);
        return makeResponse(200);
      }) as unknown as Page['goto'],
    });

    const result = await fetchPage(
      'https://example.com',
      makeMockBrowser(page),
      0,
    );

    expect(frame.abort).toHaveBeenCalledWith('blockedbyclient');
    expect(frame.continue).not.toHaveBeenCalled();
    expect(result.html).toBe('<html><body>loaded</body></html>');
  });

  it('aborts every iframe document, robots.txt allowed or not, without a lookup or a wait', async () => {
    const handler = await handlerOf(makeMockPage());
    isAllowedSpy.mockClear();
    crawlDelaySpy.mockClear();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const frames = [
      routeFor('https://www.youtube.example/embed/abc'),
      routeFor('https://example.com/widget'),
      routeFor('https://maps.example/embed', { frame: 'nested-frame' }),
    ];

    for (const frame of frames) await handler(frame);

    for (const frame of frames) {
      expect(frame.abort).toHaveBeenCalledWith('blockedbyclient');
      expect(frame.continue).not.toHaveBeenCalled();
    }
    expect(isAllowedSpy).not.toHaveBeenCalled();
    expect(crawlDelaySpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('leaves subresources and the main frame as they were', async () => {
    const handler = await handlerOf(makeMockPage());
    isAllowedSpy.mockClear();

    const script = routeFor('https://cdn.example/app.js', {
      navigation: false,
    });
    await handler(script);
    const start = routeFor('https://example.com/', { frame: 'main-frame' });
    await handler(start);

    expect(script.continue).toHaveBeenCalled();
    expect(start.continue).toHaveBeenCalled();
    expect(isAllowedSpy).not.toHaveBeenCalled();
  });
});

describe('fetchPageHttp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the URL with the ConcertCrawl user agent', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      status: 200,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('<html>events</html>'),
    } as unknown as Response);

    await fetchPageHttp('https://example.com', 0);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
        }),
      }),
    );
  });

  it('always sleeps the paced wait before the request', async () => {
    // jitter() never returns under 3 s, so there is no "no wait" case to
    // skip: the sleep is unconditional, even for the 0 this suite's stub
    // returns.
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>events</html>', { status: 200 }),
    );

    await fetchPageHttp('https://example.com', 0);

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
  });

  it('returns html, httpStatus, and finalUrl on success', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: '/redirected' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('<html>event content</html>'),
      } as unknown as Response);

    const result = await fetchPageHttp('https://example.com', 0);

    expect(result).toEqual({
      html: '<html>event content</html>',
      httpStatus: 200,
      finalUrl: 'https://example.com/redirected',
    });
  });

  it('throws CrawlFetchError on 403', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      status: 403,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    );
  });

  it('throws CrawlFetchError on 429', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      status: 429,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    );
  });

  it('throws a generic Error on other 4xx', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      status: 404,
      url: 'https://example.com',
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'HTTP 404',
    );
  });

  it('does not follow a redirect robots.txt disallows', async () => {
    const mockFetch = vi.mocked(fetch);
    const cancel = vi.fn().mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({ location: 'https://other.example/private' }),
      body: { cancel },
    } as unknown as Response);
    isAllowedSpy.mockResolvedValueOnce(false);

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'robots.txt disallows redirect target https://other.example/private',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // The unread redirect body is released even though we stop here.
    expect(cancel).toHaveBeenCalled();
    expect(isAllowedSpy).toHaveBeenCalledWith(
      'https://other.example/private',
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    );
  });

  it('skips rather than follow a redirect whose Crawl-delay exceeds the cap', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({ location: 'https://slow.example/events' }),
    } as unknown as Response);
    crawlDelaySpy.mockResolvedValueOnce(robots.CRAWL_DELAY_CAP_MS + 1000);

    await expect(
      fetchPageHttp('https://example.com', 0),
    ).rejects.toBeInstanceOf(robots.CrawlSkipError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("waits the redirect target's Crawl-delay before following it", async () => {
    vi.mocked(jitter).mockImplementation(realJitter);
    vi.useFakeTimers();
    try {
      const mockFetch = vi.mocked(fetch);
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: '/next' }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers(),
          text: vi.fn().mockResolvedValue('<html></html>'),
        } as unknown as Response);
      crawlDelaySpy.mockResolvedValueOnce(10_000);

      // A delay of 0 is floored: the first request waits 3000 + 500 jitter.
      const run = fetchPageHttp('https://example.com', 0);
      await vi.advanceTimersByTimeAsync(3_000);
      expect(mockFetch).toHaveBeenCalledTimes(0);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // The redirect hop then waits the target's 10 s + 500 jitter (~14 s in).
      await vi.advanceTimersByTimeAsync(9_000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2_000);
      await run;
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

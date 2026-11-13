import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PlatformFetchDeadlineError,
  createDeadline,
} from './fetchers/deadline.js';
import * as robots from './robots.js';
import {
  clearRedirect,
  fetchFollowingRobots,
  raceSignal,
} from './robots-fetch.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clearRedirect', () => {
  it('starts no robots.txt lookup once the signal has aborted', async () => {
    const isAllowedSpy = vi.spyOn(robots, 'isAllowedOrSkip');
    const controller = new AbortController();
    controller.abort(new DOMException('budget spent', 'TimeoutError'));

    await expect(
      clearRedirect(
        'https://a.example/from',
        'https://b.example/to',
        0,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(isAllowedSpy).not.toHaveBeenCalled();
  });
});

/**
 * Put `AbortSignal.timeout` on the fake clock and record each one asked for,
 * with the fake time it was asked at.
 */
function fakeClockTimeouts(): Array<{ ms: number; at: number }> {
  const asked: Array<{ ms: number; at: number }> = [];
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
    asked.push({ ms, at: Date.now() });
    const controller = new AbortController();
    setTimeout(
      () =>
        controller.abort(
          new DOMException('The operation timed out.', 'TimeoutError'),
        ),
      ms,
    );
    return controller.signal;
  });
  return asked;
}

// `from` 302s to `to`; `to` answers 200.
function stubRedirect(from: string, to: string): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) =>
    url === from
      ? {
          ok: false,
          status: 302,
          headers: new Headers({ location: to }),
          body: null,
        }
      : { ok: true, status: 200, headers: new Headers(), body: null },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchFollowingRobots under a deadline', () => {
  const FROM = 'https://a.example/from';
  const TO = 'https://a.example/to';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(robots, 'isAllowedOrSkip').mockResolvedValue(true);
    vi.spyOn(robots, 'getCrawlDelayMs').mockResolvedValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("breaches up front when a hop's pacing wait can't fit the budget", async () => {
    // A 5 s delay (jitter makes it 5-6 s) against a 4 s budget: the hop's
    // wait goes through the deadline's wait, which throws before sleeping.
    const fetchMock = stubRedirect(FROM, TO);
    const deadline = createDeadline({ overallTimeoutMs: 4_000 });
    const run = deadline.run('page', (timeoutMs, budget) =>
      fetchFollowingRobots(FROM, {
        crawlDelayMs: 5_000,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(budget !== undefined ? { budget } : {}),
      }),
    );
    // No fake time advanced at all: the breach is immediate, not slept into.
    await expect(run).rejects.toBeInstanceOf(PlatformFetchDeadlineError);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([FROM]);
  });

  it('caps each hop at the live remaining budget, never a timeout computed at the start', async () => {
    // The budget (10 s) is shorter than the per-request cap (20 s), so the
    // first request's timeout is budget-bound. The hop goes out 3-4 s later,
    // and nothing it is handed may run past the budget's end.
    const asked = fakeClockTimeouts();
    const fetchMock = stubRedirect(FROM, TO);
    const startedAt = Date.now();
    const deadline = createDeadline({
      perRequestTimeoutMs: 20_000,
      overallTimeoutMs: 10_000,
    });
    const run = deadline.run('page', (timeoutMs, budget) =>
      fetchFollowingRobots(FROM, {
        crawlDelayMs: 3_000,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(budget !== undefined ? { budget } : {}),
      }),
    );
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(run).resolves.toMatchObject({ finalUrl: TO });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const { ms, at } of asked) {
      expect(at + ms).toBeLessThanOrEqual(startedAt + 10_000);
    }
  });

  it("bounds a hop's robots.txt read by the per-request cap, not only the budget", async () => {
    // The hop's robots.txt never answers. The cap (2 s) ends the read long
    // before the budget (60 s) would.
    fakeClockTimeouts();
    stubRedirect(FROM, TO);
    vi.mocked(robots.isAllowedOrSkip).mockImplementation(
      () => new Promise<boolean>(() => undefined),
    );
    const startedAt = Date.now();
    const deadline = createDeadline({
      perRequestTimeoutMs: 2_000,
      overallTimeoutMs: 60_000,
    });
    const run = deadline.run('page', (timeoutMs, budget) =>
      fetchFollowingRobots(FROM, {
        crawlDelayMs: 3_000,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(budget !== undefined ? { budget } : {}),
      }),
    );
    const settled = expect(run).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(2_500);
    await settled;
    expect(Date.now() - startedAt).toBeLessThanOrEqual(2_500);
  });
});

describe('raceSignal', () => {
  // Driven directly rather than through clearRedirect: a vi spy records how
  // its returned promise settles, which handles the rejection and would
  // hide exactly the bug this guards against.
  it('leaves no unhandled rejection when the lookup fails after the caller stopped waiting', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('budget spent', 'TimeoutError'));
    let rejectLookup: (err: unknown) => void = () => undefined;
    const lookup = new Promise<boolean>((_, reject) => {
      rejectLookup = reject;
    });
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      await expect(raceSignal(lookup, controller.signal)).rejects.toMatchObject(
        { name: 'TimeoutError' },
      );
      rejectLookup(new robots.CrawlSkipError('robots.txt unreachable'));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

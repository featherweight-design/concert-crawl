import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformFetchDeadlineError, createDeadline } from './deadline.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createDeadline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression guard for #1263. The abort timer and `Date.now()` are separate
  // clocks, so the timer can fire a fraction before the wall clock agrees the
  // budget is spent. The relabel used to re-read the clock and, on that
  // reading, decline — letting the raw TimeoutError escape and failing the
  // suite intermittently under CI load. Pinning the clock one millisecond
  // short of the budget reproduces that reading every time.
  it('relabels a budget abort even when the clock reads just short of the budget', async () => {
    const startedAt = 1_000_000;
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(startedAt) // createDeadline's startedAt
      .mockReturnValue(startedAt + 39); // every later read: 39ms of a 40ms budget

    const deadline = createDeadline({ overallTimeoutMs: 40 });

    const err = await deadline
      .run('page-1', async () => {
        const abort = new Error('The operation was aborted due to timeout');
        abort.name = 'TimeoutError';
        throw abort;
      })
      .catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(PlatformFetchDeadlineError);
    if (!(err instanceof PlatformFetchDeadlineError))
      throw new Error('unreachable');
    // Reported elapsed never undershoots the budget it just blew, however the
    // two clocks happen to line up.
    expect(err.elapsedMs).toBeGreaterThanOrEqual(40);
  });

  it('relabels an abort of the budget signal while the per-request cap is shorter', async () => {
    // A redirect chain's hop wait can run the budget out while each hop's
    // own timeout is the per-request cap, so `budgetBound` is false.
    const deadline = createDeadline({
      perRequestTimeoutMs: 10,
      overallTimeoutMs: 40,
    });

    const err = await deadline
      .run('page-1', async (timeoutMs, budget) => {
        expect(timeoutMs).toBe(10);
        if (!budget) throw new Error('no budget signal handed to the request');
        await new Promise((resolve) =>
          budget.addEventListener('abort', resolve, { once: true }),
        );
        throw budget.reason;
      })
      .catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(PlatformFetchDeadlineError);
  });

  it('hands no budget signal when no overall budget is set', async () => {
    const deadline = createDeadline({ perRequestTimeoutMs: 5_000 });
    let seen: AbortSignal | undefined = new AbortController().signal;

    await deadline.run('page-1', async (_timeoutMs, budget) => {
      seen = budget;
    });

    expect(seen).toBeUndefined();
  });

  it('passes the per-request timeout through when no overall budget is set', async () => {
    const deadline = createDeadline({ perRequestTimeoutMs: 5_000 });
    const seen: (number | undefined)[] = [];

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs);
    });

    expect(seen).toEqual([5_000]);
  });

  it('passes no timeout at all when neither budget is set', async () => {
    const deadline = createDeadline({});
    const seen: (number | undefined)[] = [];

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs);
    });

    expect(seen).toEqual([undefined]);
  });

  it('caps the per-request timeout at the remaining overall budget', async () => {
    const deadline = createDeadline({
      perRequestTimeoutMs: 10_000,
      overallTimeoutMs: 200,
    });
    const seen: (number | undefined)[] = [];

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs);
    });

    // A single request must not be allowed to outlive the overall budget.
    expect(seen[0]).toBeLessThanOrEqual(200);
  });

  it('never hands a request a negative timeout', async () => {
    // AbortSignal.timeout() throws on a negative delay, so a budget that
    // runs out mid-call must floor at zero rather than go negative.
    const deadline = createDeadline({ overallTimeoutMs: 500 });
    const seen: (number | undefined)[] = [];

    // Walk the budget down to the boundary so the last request admitted runs
    // with almost none of it left. Timings are generous enough that CI timer
    // jitter can't collapse the loop to a single pass.
    for (let i = 0; i < 40; i++) {
      const breached = await deadline
        .run(`page-${i}`, async (timeoutMs) => {
          seen.push(timeoutMs);
          await sleep(20);
        })
        .then(() => false)
        .catch(() => true);
      if (breached) break;
    }

    expect(seen.length).toBeGreaterThan(1);
    for (const timeoutMs of seen) {
      expect(timeoutMs).toBeGreaterThanOrEqual(0);
      expect(() => AbortSignal.timeout(timeoutMs ?? 0)).not.toThrow();
    }
  });

  it('throws up front, without sleeping, when the budget cannot hold the wait', async () => {
    // Politeness pacing is real wall-clock time. Sleeping a truncated wait and
    // then requesting would send the request early; the wait is never cut.
    const deadline = createDeadline({ overallTimeoutMs: 100 });
    const startedAt = Date.now();

    await expect(deadline.wait(5_000)).rejects.toBeInstanceOf(
      PlatformFetchDeadlineError,
    );

    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it('throws rather than requesting when the budget left is under the 3 s floor', async () => {
    // A 1 s pace is floored to 3 s, and 2.5 s of budget can't hold that, so
    // the request after it is never made.
    const deadline = createDeadline({ overallTimeoutMs: 2_500 });
    const request = vi.fn(async () => 'page');

    const outcome = await deadline
      .wait(1_000)
      .then(() => deadline.run('page-1', request))
      .catch((caught: unknown) => caught);

    expect(outcome).toBeInstanceOf(PlatformFetchDeadlineError);
    expect(request).not.toHaveBeenCalled();
  });

  it('floors a short pace at 3 s', async () => {
    vi.useFakeTimers();
    try {
      const deadline = createDeadline({});
      let done = false;
      const waiting = deadline.wait(1_000).then(() => {
        done = true;
      });
      await vi.advanceTimersByTimeAsync(2_999);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await waiting;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not pace a caller that asked for no delay', async () => {
    // Only a test stub of jitter() passes 0; jitter itself never returns one.
    const deadline = createDeadline({ overallTimeoutMs: 5_000 });
    const startedAt = Date.now();

    await deadline.wait(0);

    expect(Date.now() - startedAt).toBeLessThan(50);
  });

  it('throws rather than returning what it gathered once the budget is spent', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 60 });
    const stages: string[] = [];

    const run = async () => {
      for (const stage of ['page-1', 'page-2', 'page-3']) {
        await deadline.run(stage, async () => {
          stages.push(stage);
          await sleep(40);
        });
      }
    };

    await expect(run()).rejects.toThrow(PlatformFetchDeadlineError);
    // Partial progress is abandoned, not returned — a truncated event set
    // would read downstream as shows that have disappeared.
    expect(stages.length).toBeLessThan(3);
  });

  it('names the stage that breached the budget', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 });

    await deadline.run('sitemap', async () => {
      await sleep(50);
    });

    await expect(
      deadline.run('calendar-2026-08', async () => undefined),
    ).rejects.toThrow(/calendar-2026-08/);
  });

  it('reports the configured budget and the elapsed time on breach', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 });
    await sleep(50);

    const err = await deadline
      .run('page-1', async () => undefined)
      .catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(PlatformFetchDeadlineError);
    if (!(err instanceof PlatformFetchDeadlineError))
      throw new Error('unreachable');
    expect(err.overallTimeoutMs).toBe(30);
    expect(err.elapsedMs).toBeGreaterThanOrEqual(30);
    expect(err.stage).toBe('page-1');
  });

  it('relabels an abort caused by the overall budget as a deadline breach', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 40 });

    await expect(
      deadline.run('page-1', async (timeoutMs) => {
        const signal = AbortSignal.timeout(timeoutMs ?? 1_000);
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        });
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError);
  });

  it('leaves an abort caused by the per-request cap unwrapped', async () => {
    // The per-request cap, not the budget, is what aborts here — a slow single
    // request rather than an exhausted budget, so the caller should still see
    // the original abort.
    const deadline = createDeadline({
      perRequestTimeoutMs: 20,
      overallTimeoutMs: 10_000,
    });

    const err = await deadline
      .run('page-1', async (timeoutMs) => {
        const signal = AbortSignal.timeout(timeoutMs ?? 1_000);
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        });
      })
      .catch((caught: unknown) => caught);

    expect(err).not.toBeInstanceOf(PlatformFetchDeadlineError);
    expect(err).toBeInstanceOf(Error);
    if (!(err instanceof Error)) throw new Error('unreachable');
    expect(['TimeoutError', 'AbortError']).toContain(err.name);
  });

  it('leaves a genuine request failure unwrapped', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 5_000 });

    await expect(
      deadline.run('page-1', async () => {
        throw new Error('HTTP 503');
      }),
    ).rejects.toThrow('HTTP 503');
  });

  it('does not relabel a non-abort failure that happens to land past the budget', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 });

    await expect(
      deadline.run('page-1', async () => {
        await sleep(50);
        throw new Error('HTTP 503');
      }),
    ).rejects.toThrow('HTTP 503');
  });
});

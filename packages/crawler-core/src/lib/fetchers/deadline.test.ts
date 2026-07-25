import { describe, expect, it } from 'vitest'

import { PlatformFetchDeadlineError, createDeadline } from './deadline.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('createDeadline', () => {
  it('passes the per-request timeout through when no overall budget is set', async () => {
    const deadline = createDeadline({ perRequestTimeoutMs: 5_000 })
    const seen: (number | undefined)[] = []

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs)
    })

    expect(seen).toEqual([5_000])
  })

  it('passes no timeout at all when neither budget is set', async () => {
    const deadline = createDeadline({})
    const seen: (number | undefined)[] = []

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs)
    })

    expect(seen).toEqual([undefined])
  })

  it('caps the per-request timeout at the remaining overall budget', async () => {
    const deadline = createDeadline({
      perRequestTimeoutMs: 10_000,
      overallTimeoutMs: 200,
    })
    const seen: (number | undefined)[] = []

    await deadline.run('page-1', async (timeoutMs) => {
      seen.push(timeoutMs)
    })

    // A single request must not be allowed to outlive the overall budget.
    expect(seen[0]).toBeLessThanOrEqual(200)
  })

  it('never hands a request a negative timeout', async () => {
    // AbortSignal.timeout() throws on a negative delay, so a budget that
    // runs out mid-call must floor at zero rather than go negative.
    const deadline = createDeadline({ overallTimeoutMs: 500 })
    const seen: (number | undefined)[] = []

    // Walk the budget down to the boundary so the last request admitted runs
    // with almost none of it left. Timings are generous enough that CI timer
    // jitter can't collapse the loop to a single pass.
    for (let i = 0; i < 40; i++) {
      const breached = await deadline
        .run(`page-${i}`, async (timeoutMs) => {
          seen.push(timeoutMs)
          await sleep(20)
        })
        .then(() => false)
        .catch(() => true)
      if (breached) break
    }

    expect(seen.length).toBeGreaterThan(1)
    for (const timeoutMs of seen) {
      expect(timeoutMs).toBeGreaterThanOrEqual(0)
      expect(() => AbortSignal.timeout(timeoutMs ?? 0)).not.toThrow()
    }
  })

  it('caps the crawl delay at the remaining budget', async () => {
    // Politeness pacing is real wall-clock time. An unbounded sleep between
    // requests would overshoot the overall deadline by up to a full delay
    // however tightly each individual request is capped.
    const deadline = createDeadline({ overallTimeoutMs: 100 })
    const startedAt = Date.now()

    await deadline.wait(5_000)

    expect(Date.now() - startedAt).toBeLessThan(1_000)
  })

  it('does not pace a caller that asked for no delay', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 5_000 })
    const startedAt = Date.now()

    await deadline.wait(0)

    expect(Date.now() - startedAt).toBeLessThan(50)
  })

  it('throws rather than returning what it gathered once the budget is spent', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 60 })
    const stages: string[] = []

    const run = async () => {
      for (const stage of ['page-1', 'page-2', 'page-3']) {
        await deadline.run(stage, async () => {
          stages.push(stage)
          await sleep(40)
        })
      }
    }

    await expect(run()).rejects.toThrow(PlatformFetchDeadlineError)
    // Partial progress is abandoned, not returned — a truncated event set
    // would read downstream as shows that have disappeared.
    expect(stages.length).toBeLessThan(3)
  })

  it('names the stage that breached the budget', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 })

    await deadline.run('sitemap', async () => {
      await sleep(50)
    })

    await expect(
      deadline.run('calendar-2026-08', async () => undefined),
    ).rejects.toThrow(/calendar-2026-08/)
  })

  it('reports the configured budget and the elapsed time on breach', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 })
    await sleep(50)

    const err = await deadline
      .run('page-1', async () => undefined)
      .catch((caught: unknown) => caught)

    expect(err).toBeInstanceOf(PlatformFetchDeadlineError)
    if (!(err instanceof PlatformFetchDeadlineError))
      throw new Error('unreachable')
    expect(err.overallTimeoutMs).toBe(30)
    expect(err.elapsedMs).toBeGreaterThanOrEqual(30)
    expect(err.stage).toBe('page-1')
  })

  it('relabels an abort caused by the overall budget as a deadline breach', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 40 })

    await expect(
      deadline.run('page-1', async (timeoutMs) => {
        const signal = AbortSignal.timeout(timeoutMs ?? 1_000)
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason))
        })
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError)
  })

  it('leaves a genuine request failure unwrapped', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 5_000 })

    await expect(
      deadline.run('page-1', async () => {
        throw new Error('HTTP 503')
      }),
    ).rejects.toThrow('HTTP 503')
  })

  it('does not relabel a non-abort failure that happens to land past the budget', async () => {
    const deadline = createDeadline({ overallTimeoutMs: 30 })

    await expect(
      deadline.run('page-1', async () => {
        await sleep(50)
        throw new Error('HTTP 503')
      }),
    ).rejects.toThrow('HTTP 503')
  })
})

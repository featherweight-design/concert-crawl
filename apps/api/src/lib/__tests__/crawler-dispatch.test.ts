import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCaptureException = vi.fn()
const mockFlush = vi.fn()
vi.mock('@sentry/hono/node', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  flush: (...args: unknown[]) => mockFlush(...args),
}))

import {
  crawlerDispatchEnvironment,
  dispatchCrawler,
  dispatchCrawlerInBackground,
  startDailyCrawl,
  startOfUtcDay,
} from '../crawler-dispatch.js'
import { drainBackgroundTasks } from '../background-tasks.js'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  mockCaptureException.mockReset()
  mockFlush.mockReset()
  mockFlush.mockResolvedValue(true)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('CRAWLER_DISPATCH_TOKEN', 'test-token')
  vi.stubEnv('CRAWLER_DISPATCH_REPO', '')
  vi.stubEnv('VERCEL_TARGET_ENV', 'production')
  vi.stubEnv('SENTRY_ENVIRONMENT', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function lastReported(): Error {
  const [err] = mockCaptureException.mock.calls.at(-1) as [Error]
  return err
}

describe('dispatchCrawler', () => {
  it('does nothing when no token is set', async () => {
    vi.stubEnv('CRAWLER_DISPATCH_TOKEN', '')
    expect(await dispatchCrawler()).toBe('skipped_no_token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('dispatches crawler-triggers.yml on main for this environment', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    expect(await dispatchCrawler()).toBe('dispatched')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://api.github.com/repos/featherweight-design/concert-crawl/actions/workflows/crawler-triggers.yml/dispatches',
    )
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer test-token',
    )
    expect(JSON.parse(String(init.body))).toEqual({
      ref: 'main',
      inputs: { environment: 'production' },
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(mockCaptureException).not.toHaveBeenCalled()
  })

  it('targets staging from the staging API', async () => {
    vi.stubEnv('VERCEL_TARGET_ENV', 'staging')
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await dispatchCrawler()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body)).inputs).toEqual({
      environment: 'staging',
    })
  })

  it('uses CRAWLER_DISPATCH_REPO when it names a repository', async () => {
    vi.stubEnv('CRAWLER_DISPATCH_REPO', 'featherweight-design/concert-crawl')
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await dispatchCrawler()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/repos/featherweight-design/concert-crawl/',
    )
  })

  it('does not dispatch from a preview deployment', async () => {
    vi.stubEnv('VERCEL_TARGET_ENV', 'preview')
    expect(await dispatchCrawler()).toBe('skipped_environment')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a refused token to Sentry and flushes, without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"Bad credentials"}', { status: 401 }),
    )
    expect(await dispatchCrawler()).toBe('failed')
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(lastReported().message).toContain(
      'CRAWLER_DISPATCH_TOKEN is expired',
    )
    expect(mockFlush).toHaveBeenCalledTimes(1)
  })

  it('does not blame the token for a rate limit', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"You have exceeded a secondary rate limit"}', {
        status: 403,
      }),
    )
    await dispatchCrawler()
    expect(lastReported().message).toContain('rate-limited')
    expect(lastReported().message).not.toContain('expired')
  })

  it('names both causes of a 404', async () => {
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }))
    expect(await dispatchCrawler()).toBe('failed')
    expect(lastReported().message).toContain('cannot see')
    expect(lastReported().message).toContain('crawler-triggers.yml')
  })

  it('names the workflow inputs on a 422', async () => {
    fetchMock.mockResolvedValue(new Response('Unprocessable', { status: 422 }))
    await dispatchCrawler()
    expect(lastReported().message).toContain('does not accept the inputs')
  })

  it('reports a timeout as a warning, since GitHub may still have run it', async () => {
    const timeout = new Error('The operation was aborted due to timeout')
    timeout.name = 'TimeoutError'
    fetchMock.mockRejectedValue(timeout)
    expect(await dispatchCrawler()).toBe('failed')
    expect(lastReported().message).toContain('may still have started')
    const [, context] = mockCaptureException.mock.calls[0] as [
      Error,
      { level: string },
    ]
    expect(context.level).toBe('warning')
  })

  it('reports a GitHub server error to Sentry without throwing', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 502 }))
    expect(await dispatchCrawler()).toBe('failed')
    expect(lastReported().message).toBe('Crawler dispatch failed (502)')
  })

  it('survives a failing Sentry flush', async () => {
    mockFlush.mockRejectedValue(new Error('transport down'))
    fetchMock.mockResolvedValue(new Response('oops', { status: 502 }))
    expect(await dispatchCrawler()).toBe('failed')
  })
})

describe('dispatchCrawlerInBackground', () => {
  it('returns at once and dispatches in the background', async () => {
    let release: (value: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve
      }),
    )
    // Returns before GitHub has answered: nothing for the caller to await.
    expect(dispatchCrawlerInBackground()).toBeUndefined()
    release(new Response(null, { status: 204 }))
    await drainBackgroundTasks()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('swallows a dispatch that throws', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error('fetch exploded')
    })
    expect(() => dispatchCrawlerInBackground()).not.toThrow()
    await drainBackgroundTasks()
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
  })
})

describe('crawlerDispatchEnvironment', () => {
  it('ignores SENTRY_ENVIRONMENT off Vercel, so a local API never dispatches', () => {
    vi.stubEnv('VERCEL_TARGET_ENV', '')
    vi.stubEnv('SENTRY_ENVIRONMENT', 'production')
    expect(crawlerDispatchEnvironment()).toBeNull()
  })

  it('reads the staging custom environment', () => {
    vi.stubEnv('VERCEL_TARGET_ENV', 'staging')
    expect(crawlerDispatchEnvironment()).toBe('staging')
  })
})

describe('startDailyCrawl', () => {
  const NOW = new Date('2026-11-02T09:07:30Z')
  const PROD = 'Crawler daily: production'
  interface FakeRun {
    id: number
    display_title?: string
    head_branch?: string
    created_at?: string
    status?: string
    conclusion?: string | null
  }
  const runsResponse = (runs: FakeRun[]) =>
    new Response(
      JSON.stringify({
        total_count: runs.length,
        workflow_runs: runs.map((run) => ({
          display_title: PROD,
          head_branch: 'main',
          created_at: '2026-11-02T03:00:00Z',
          status: 'completed',
          conclusion: 'success',
          ...run,
        })),
      }),
      { status: 200 },
    )
  const jobsResponse = (
    crawlStep: string | null | undefined,
    environment = 'production',
  ) =>
    new Response(
      JSON.stringify({
        jobs: [
          {
            name: 'guard',
            steps: [{ name: 'Skip check', conclusion: 'success' }],
          },
          {
            name: `daily / Crawl (all, ${environment})`,
            steps:
              crawlStep === undefined
                ? []
                : [
                    { name: 'Check inputs', conclusion: 'success' },
                    { name: 'Run crawler', conclusion: crawlStep },
                  ],
          },
        ],
      }),
      { status: 200 },
    )
  const dispatched = () => new Response(null, { status: 204 })
  const urls = () => fetchMock.mock.calls.map((call) => String(call[0]))

  it("lists today's main runs, then dispatches crawler-daily.yml for production", async () => {
    fetchMock
      .mockResolvedValueOnce(runsResponse([]))
      .mockResolvedValueOnce(dispatched())
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'dispatched' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const listUrl = new URL(urls()[0] ?? '')
    expect(listUrl.pathname).toBe(
      '/repos/featherweight-design/concert-crawl/actions/workflows/crawler-daily.yml/runs',
    )
    expect(listUrl.searchParams.get('created')).toBe('>=2026-11-02T00:00:00Z')
    expect(listUrl.searchParams.get('branch')).toBe('main')

    const dispatchCall = fetchMock.mock.calls[1]
    expect(String(dispatchCall?.[0])).toBe(
      'https://api.github.com/repos/featherweight-design/concert-crawl/actions/workflows/crawler-daily.yml/dispatches',
    )
    const dispatchInit: RequestInit | undefined = dispatchCall?.[1]
    expect(JSON.parse(String(dispatchInit?.body))).toEqual({
      ref: 'main',
      inputs: { environment: 'production', skip_if_ran_today: 'true' },
    })
  })

  it('skips for a run that is still in progress, without reading its jobs', async () => {
    fetchMock.mockResolvedValueOnce(
      runsResponse([{ id: 9, status: 'in_progress', conclusion: null }]),
    )
    expect(await startDailyCrawl(NOW)).toEqual({
      outcome: 'skipped_already_ran',
      run: {
        id: 9,
        createdAt: '2026-11-02T03:00:00Z',
        status: 'in_progress',
        conclusion: null,
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['success', 'failure'])(
    'skips for a finished run whose crawl step ended in %s',
    async (stepConclusion) => {
      fetchMock
        .mockResolvedValueOnce(runsResponse([{ id: 9, conclusion: 'failure' }]))
        .mockResolvedValueOnce(jobsResponse(stepConclusion))
      const result = await startDailyCrawl(NOW)
      expect(result.outcome).toBe('skipped_already_ran')
      expect(urls()[1]).toContain('/actions/runs/9/jobs')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    },
  )

  it.each([
    ['skipped', 'skipped'],
    ['never reached', undefined],
  ] as const)(
    'dispatches when the only run today crawled nothing (crawl step %s)',
    async (_label, crawlStep) => {
      fetchMock
        .mockResolvedValueOnce(runsResponse([{ id: 9, conclusion: 'failure' }]))
        .mockResolvedValueOnce(jobsResponse(crawlStep))
        .mockResolvedValueOnce(dispatched())
      expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'dispatched' })
      expect(urls()[2]).toContain('/dispatches')
    },
  )

  it('counts a legacy-titled run only when its crawl job names production', async () => {
    fetchMock
      .mockResolvedValueOnce(
        runsResponse([
          { id: 5, display_title: 'Crawler daily' },
          { id: 6, display_title: 'Crawler daily', status: 'in_progress' },
        ]),
      )
      .mockResolvedValueOnce(jobsResponse('success', 'staging'))
      .mockResolvedValueOnce(jobsResponse(null, 'production'))
    const result = await startDailyCrawl(NOW)
    expect(result).toMatchObject({
      outcome: 'skipped_already_ran',
      run: { id: 6 },
    })
    expect(urls()[1]).toContain('/actions/runs/5/jobs')
    expect(urls()[2]).toContain('/actions/runs/6/jobs')
  })

  it('ignores staging, other branches and yesterday, without reading jobs', async () => {
    fetchMock
      .mockResolvedValueOnce(
        runsResponse([
          { id: 8, display_title: 'Crawler daily: staging' },
          { id: 7, head_branch: 'fix/something' },
          { id: 6, created_at: '2026-11-01T23:59:59Z' },
        ]),
      )
      .mockResolvedValueOnce(dispatched())
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'dispatched' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed when the runs cannot be listed', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }))
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'check_failed' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(lastReported().message).toContain('could not check')
  })

  it("fails closed when a run's jobs cannot be read", async () => {
    fetchMock
      .mockResolvedValueOnce(runsResponse([{ id: 9 }]))
      .mockResolvedValueOnce(new Response('nope', { status: 502 }))
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'check_failed' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed on a response it cannot parse', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ workflow_runs: [{ id: 'x' }] }), {
        status: 200,
      }),
    )
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'check_failed' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a refused dispatch', async () => {
    fetchMock
      .mockResolvedValueOnce(runsResponse([]))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'dispatch_failed' })
    expect(lastReported().message).toContain('crawler-daily.yml')
  })

  it('does nothing outside production', async () => {
    vi.stubEnv('VERCEL_TARGET_ENV', 'staging')
    expect(await startDailyCrawl(NOW)).toEqual({
      outcome: 'skipped_environment',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a missing token instead of skipping quietly', async () => {
    vi.stubEnv('CRAWLER_DISPATCH_TOKEN', '')
    expect(await startDailyCrawl(NOW)).toEqual({ outcome: 'skipped_no_token' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(lastReported().message).toContain('CRAWLER_DISPATCH_TOKEN')
  })
})

describe('startOfUtcDay', () => {
  it('uses the UTC date, not Mountain Time', () => {
    // 23:30 MST on Nov 1 is already Nov 2 in UTC.
    expect(startOfUtcDay(new Date('2026-11-02T06:30:00Z'))).toBe(
      '2026-11-02T00:00:00Z',
    )
  })
})

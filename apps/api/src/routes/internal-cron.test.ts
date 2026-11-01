import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The router's default jobs import the real job modules; every test here
// injects its own, so stub the modules to keep this a pure unit test.
vi.mock('../jobs/match-artists.js', () => ({ runMatchArtists: vi.fn() }))
vi.mock('../jobs/spotify-weekly.js', () => ({ runSpotifyWeekly: vi.fn() }))
vi.mock('../lib/rate-limit.js', () => ({
  sweepExpiredRateLimitBuckets: vi.fn(),
}))
vi.mock('../lib/crawler-dispatch.js', () => ({ startDailyCrawl: vi.fn() }))
vi.mock('@concert-crawl/db', () => ({ db: {}, auditLog: {} }))

import { Hono } from 'hono'
import {
  createInternalCronRouter,
  isAuthorizedCronRequest,
  type InternalCronJobs,
} from './internal-cron.js'

const SECRET = 'test-cron-secret-value'

const makeJobs = () => ({
  matchArtists: vi.fn<InternalCronJobs['matchArtists']>(async () => ({
    matched: 1,
  })),
  spotifyWeekly: vi.fn<InternalCronJobs['spotifyWeekly']>(async () => {}),
  sweepRateLimitBuckets: vi.fn<InternalCronJobs['sweepRateLimitBuckets']>(
    async () => 2,
  ),
  startDailyCrawl: vi.fn<InternalCronJobs['startDailyCrawl']>(async () => ({
    outcome: 'dispatched' as const,
  })),
  auditDailyCrawl: vi.fn<InternalCronJobs['auditDailyCrawl']>(async () => {}),
})

const makeApp = (jobs: InternalCronJobs) => {
  const app = new Hono()
  app.route('/v1/internal/cron', createInternalCronRouter(jobs))
  return app
}

const PATHS = [
  '/v1/internal/cron/match-artists',
  '/v1/internal/cron/spotify-weekly',
  '/v1/internal/cron/crawler-daily',
] as const

const expectNothingRan = (jobs: ReturnType<typeof makeJobs>) => {
  expect(jobs.matchArtists).not.toHaveBeenCalled()
  expect(jobs.spotifyWeekly).not.toHaveBeenCalled()
  expect(jobs.startDailyCrawl).not.toHaveBeenCalled()
  expect(jobs.auditDailyCrawl).not.toHaveBeenCalled()
}

describe('internal cron routes', () => {
  const original = process.env['CRON_SECRET']

  beforeEach(() => {
    process.env['CRON_SECRET'] = SECRET
  })

  afterEach(() => {
    if (original === undefined) delete process.env['CRON_SECRET']
    else process.env['CRON_SECRET'] = original
  })

  describe.each(PATHS)('%s', (path) => {
    it('returns 404 and runs nothing when CRON_SECRET is unset', async () => {
      delete process.env['CRON_SECRET']
      const jobs = makeJobs()
      const res = await makeApp(jobs).request(path, {
        headers: { authorization: `Bearer ${SECRET}` },
      })
      expect(res.status).toBe(404)
      expectNothingRan(jobs)
    })

    it('returns 404 when CRON_SECRET is empty, even for "Bearer "', async () => {
      process.env['CRON_SECRET'] = ''
      const jobs = makeJobs()
      const res = await makeApp(jobs).request(path, {
        headers: { authorization: 'Bearer ' },
      })
      expect(res.status).toBe(404)
      expectNothingRan(jobs)
    })

    it('returns 401 with no Authorization header', async () => {
      const jobs = makeJobs()
      const res = await makeApp(jobs).request(path)
      expect(res.status).toBe(401)
      expectNothingRan(jobs)
    })

    it('returns 401 with the wrong secret', async () => {
      const jobs = makeJobs()
      const res = await makeApp(jobs).request(path, {
        headers: { authorization: 'Bearer not-the-secret' },
      })
      expect(res.status).toBe(401)
      expectNothingRan(jobs)
    })

    it('returns 401 for the bare secret without the Bearer scheme', async () => {
      const jobs = makeJobs()
      const res = await makeApp(jobs).request(path, {
        headers: { authorization: SECRET },
      })
      expect(res.status).toBe(401)
      expectNothingRan(jobs)
    })
  })

  it('runs match-artists and the bucket sweep with the right secret', async () => {
    const jobs = makeJobs()
    const res = await makeApp(jobs).request(PATHS[0], {
      headers: { authorization: `Bearer ${SECRET}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, summary: { matched: 1 } })
    expect(jobs.matchArtists).toHaveBeenCalledTimes(1)
    expect(jobs.sweepRateLimitBuckets).toHaveBeenCalledTimes(1)
    expect(jobs.spotifyWeekly).not.toHaveBeenCalled()
  })

  it('still answers 200 when only the bucket sweep fails', async () => {
    const jobs = makeJobs()
    jobs.sweepRateLimitBuckets.mockRejectedValueOnce(new Error('db down'))
    const res = await makeApp(jobs).request(PATHS[0], {
      headers: { authorization: `Bearer ${SECRET}` },
    })
    expect(res.status).toBe(200)
  })

  it('still sweeps buckets when match-artists throws, then answers 500', async () => {
    const jobs = makeJobs()
    jobs.matchArtists.mockRejectedValueOnce(new Error('select failed'))
    const app = makeApp(jobs)
    app.onError((_err, ctx) => ctx.json({ success: false }, 500))
    const res = await app.request(PATHS[0], {
      headers: { authorization: `Bearer ${SECRET}` },
    })
    expect(res.status).toBe(500)
    expect(jobs.sweepRateLimitBuckets).toHaveBeenCalledTimes(1)
  })

  it('runs spotify-weekly with the current time and the right secret', async () => {
    const jobs = makeJobs()
    const before = Date.now()
    const res = await makeApp(jobs).request(PATHS[1], {
      headers: { authorization: `Bearer ${SECRET}` },
    })
    expect(res.status).toBe(200)
    expect(jobs.spotifyWeekly).toHaveBeenCalledTimes(1)
    const [now] = jobs.spotifyWeekly.mock.calls[0] ?? []
    expect(now).toBeInstanceOf(Date)
    expect(now?.getTime()).toBeGreaterThanOrEqual(before)
    expect(jobs.matchArtists).not.toHaveBeenCalled()
  })
})

describe('crawler-daily cron route', () => {
  const original = process.env['CRON_SECRET']
  const request = (jobs: InternalCronJobs) =>
    makeApp(jobs).request(PATHS[2], {
      headers: { authorization: `Bearer ${SECRET}` },
    })

  beforeEach(() => {
    process.env['CRON_SECRET'] = SECRET
  })

  afterEach(() => {
    if (original === undefined) delete process.env['CRON_SECRET']
    else process.env['CRON_SECRET'] = original
  })

  it('starts the daily crawl with the current time and audits it', async () => {
    const jobs = makeJobs()
    const before = Date.now()
    const res = await request(jobs)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      result: { outcome: 'dispatched' },
    })
    const [now] = jobs.startDailyCrawl.mock.calls[0] ?? []
    expect(now?.getTime()).toBeGreaterThanOrEqual(before)
    expect(jobs.auditDailyCrawl).toHaveBeenCalledWith({ outcome: 'dispatched' })
    expect(jobs.matchArtists).not.toHaveBeenCalled()
  })

  it('answers 200 and audits a skip when a run already exists today', async () => {
    const jobs = makeJobs()
    const skipped = {
      outcome: 'skipped_already_ran' as const,
      run: { id: 42, createdAt: '2026-11-02T09:01:00Z', status: 'completed' },
    }
    jobs.startDailyCrawl.mockResolvedValueOnce(skipped)
    const res = await request(jobs)
    expect(res.status).toBe(200)
    expect(jobs.auditDailyCrawl).toHaveBeenCalledWith(skipped)
  })

  it.each(['check_failed', 'dispatch_failed', 'skipped_no_token'] as const)(
    'answers 503 on %s, so the Vercel cron log shows a failure',
    async (outcome) => {
      const jobs = makeJobs()
      jobs.startDailyCrawl.mockResolvedValueOnce({ outcome })
      const res = await request(jobs)
      expect(res.status).toBe(503)
      expect(jobs.auditDailyCrawl).toHaveBeenCalledWith({ outcome })
    },
  )

  it('keeps the outcome when the audit write fails', async () => {
    const jobs = makeJobs()
    jobs.auditDailyCrawl.mockRejectedValueOnce(new Error('db down'))
    const res = await request(jobs)
    expect(res.status).toBe(200)
  })
})

describe('isAuthorizedCronRequest', () => {
  it('accepts only the exact Bearer header', () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(isAuthorizedCronRequest(`bearer ${SECRET}`, SECRET)).toBe(false)
    expect(isAuthorizedCronRequest(undefined, SECRET)).toBe(false)
    expect(isAuthorizedCronRequest('', SECRET)).toBe(false)
  })
})

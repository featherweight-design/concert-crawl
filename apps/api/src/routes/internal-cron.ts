// Scheduled-job triggers for a serverless host (Vercel Cron), which invokes a
// URL on a schedule instead of running a CLI process. On Render the same jobs
// still run as cron services executing jobs/*.ts directly; these routes are
// dormant there because CRON_SECRET is unset.
//
// Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. The header
// is compared in constant time. With CRON_SECRET unset the routes answer 404,
// exactly like an unmounted path, so a host that never configured cron exposes
// nothing — an unset secret must never mean "no auth".

import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import * as Sentry from '@sentry/hono/node'
import { runMatchArtists } from '../jobs/match-artists.js'
import { runSpotifyWeekly } from '../jobs/spotify-weekly.js'
import { apiLogger } from '../lib/logger.js'
import { describeDbError } from '../lib/pg-errors.js'
import { sweepExpiredRateLimitBuckets } from '../lib/rate-limit.js'

export interface InternalCronJobs {
  matchArtists: () => Promise<unknown>
  spotifyWeekly: (now: Date) => Promise<void>
  sweepRateLimitBuckets: () => Promise<number>
}

const defaultJobs: InternalCronJobs = {
  matchArtists: () => runMatchArtists(),
  spotifyWeekly: (now) => runSpotifyWeekly(now),
  sweepRateLimitBuckets: () => sweepExpiredRateLimitBuckets(),
}

// Hashing both sides first gives timingSafeEqual equal-length inputs, so the
// comparison leaks neither the secret's content nor its length.
const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest()

export const isAuthorizedCronRequest = (
  authorization: string | undefined,
  secret: string,
): boolean =>
  timingSafeEqual(digest(authorization ?? ''), digest(`Bearer ${secret}`))

export const createInternalCronRouter = (
  jobs: InternalCronJobs = defaultJobs,
): Hono => {
  const router = new Hono()

  router.use('*', async (ctx, next) => {
    const secret = process.env['CRON_SECRET']
    if (secret === undefined || secret.length === 0) return ctx.notFound()
    if (!isAuthorizedCronRequest(ctx.req.header('authorization'), secret)) {
      apiLogger.warn({ path: ctx.req.path }, 'internal-cron: unauthorized')
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    await next()
  })

  // Sentry events the jobs capture are delivered by the per-request flush in
  // the serverless entry (lib/sentry-flush.ts), like any other route's.
  router.get('/match-artists', async (ctx) => {
    // Mirrors the CLI entry in jobs/match-artists.ts: a failed match run is
    // remembered, the expired rate-limit bucket sweep (#528) runs either
    // way, and only then does the failure surface (here as a 500 through the
    // app error handler, there as exit code 1).
    let summary: unknown = null
    let jobError: unknown = null
    try {
      summary = await jobs.matchArtists()
      apiLogger.info({ summary }, 'match-artists: done')
    } catch (err) {
      apiLogger.error({ err }, 'match-artists: catastrophic failure')
      jobError = err
    }

    // Housekeeping never fails the run; the next night tries again.
    try {
      const swept = await jobs.sweepRateLimitBuckets()
      apiLogger.info(
        { swept },
        'match-artists: swept expired rate-limit buckets',
      )
    } catch (err) {
      const error = describeDbError(err)
      apiLogger.warn({ error }, 'match-artists: rate-limit bucket sweep failed')
      Sentry.captureMessage('rate-limit bucket sweep failed', {
        level: 'warning',
        tags: {
          job: 'match-artists',
          errorClass: error.errorClass,
          errorCode: error.code ?? 'none',
        },
      })
    }

    if (jobError !== null) throw jobError
    return ctx.json({ success: true, summary })
  })

  router.get('/spotify-weekly', async (ctx) => {
    await jobs.spotifyWeekly(new Date())
    apiLogger.info('spotify-weekly: done')
    return ctx.json({ success: true })
  })

  return router
}

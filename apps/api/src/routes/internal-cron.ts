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
import { auditLog, db } from '@concert-crawl/db'
import { runMatchArtists } from '../jobs/match-artists.js'
import { runSpotifyWeekly } from '../jobs/spotify-weekly.js'
import {
  startDailyCrawl,
  type DailyCrawlResult,
} from '../lib/crawler-dispatch.js'
import { apiLogger } from '../lib/logger.js'
import { describeDbError } from '../lib/pg-errors.js'
import { sweepExpiredRateLimitBuckets } from '../lib/rate-limit.js'

export interface InternalCronJobs {
  matchArtists: () => Promise<unknown>
  spotifyWeekly: (now: Date) => Promise<void>
  sweepRateLimitBuckets: () => Promise<number>
  startDailyCrawl: (now: Date) => Promise<DailyCrawlResult>
  auditDailyCrawl: (result: DailyCrawlResult) => Promise<void>
}

// The audit_log actor for an action no person took. Admin rows carry a Clerk
// user ID; this cannot collide with one.
const CRON_ACTOR = 'system:vercel-cron'

const auditDailyCrawl = async (result: DailyCrawlResult): Promise<void> => {
  await db.insert(auditLog).values({
    actorId: CRON_ACTOR,
    action: 'crawl.daily_cron',
    targetId:
      result.outcome === 'skipped_already_ran' ? String(result.run.id) : null,
    metadata: result,
  })
}

const defaultJobs: InternalCronJobs = {
  matchArtists: () => runMatchArtists(),
  spotifyWeekly: (now) => runSpotifyWeekly(now),
  sweepRateLimitBuckets: () => sweepExpiredRateLimitBuckets(),
  startDailyCrawl: (now) => startDailyCrawl(now),
  auditDailyCrawl,
}

// A skip is a correct outcome. A failure answers 503 so it shows as failed in
// the Vercel cron log; the GitHub schedule in crawler-daily.yml runs later
// that morning as the backup, so nothing retries here.
const DAILY_CRAWL_STATUS: Record<DailyCrawlResult['outcome'], 200 | 503> = {
  dispatched: 200,
  skipped_already_ran: 200,
  skipped_environment: 200,
  skipped_no_token: 503,
  check_failed: 503,
  dispatch_failed: 503,
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

  // Starts the daily venue crawl (crawler-daily.yml on GitHub Actions). See
  // startDailyCrawl for the double-crawl checks. Takes no input: the only
  // thing read from the request is the bearer, checked above.
  router.get('/crawler-daily', async (ctx) => {
    const result = await jobs.startDailyCrawl(new Date())
    apiLogger.info({ result }, `crawler-daily: ${result.outcome}`)

    // An audit row that fails to write never changes what the cron did.
    try {
      await jobs.auditDailyCrawl(result)
    } catch (err) {
      apiLogger.error(
        { err: describeDbError(err), result },
        'crawler-daily: audit log write failed',
      )
    }

    const status = DAILY_CRAWL_STATUS[result.outcome]
    return ctx.json({ success: status === 200, result }, status)
  })

  router.get('/spotify-weekly', async (ctx) => {
    await jobs.spotifyWeekly(new Date())
    apiLogger.info('spotify-weekly: done')
    return ctx.json({ success: true })
  })

  return router
}

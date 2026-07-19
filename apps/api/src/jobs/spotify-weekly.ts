// apps/api/src/jobs/spotify-weekly.ts
//
// The weekly Spotify job (#763 eng spec §8.1). Runs as the Render Cron Job
// `concert-crawl-spotify-weekly` (staging + prod) on `30 15 * * 1` — Monday
// 15:30 UTC (9:30 AM MDT / 8:30 AM MST), just after the daily billing job.
// Same build-artifact pattern as billing-daily: the cron builds the API via
// `turbo build` and runs `node apps/api/dist/jobs/spotify-weekly.js`.
//
// Three phases, each in its own try/catch so one failure never blocks the
// rest:
//
//   1. SYNC   — every connection with status != 'revoked' goes through
//               syncSpotifyConnection (Clerk token → followed+top pull →
//               replace-set upsert). Revoked connections are skipped: their
//               artist set is already purged and only a user Reconnect can
//               revive them.
//   2. DIGEST — every non-revoked connection with digestEnabled, gated at
//               send time by canUseFeature(planState, 'spotify-sync') (§7:
//               Premium-only). Matches = events in the next 7 Denver-local
//               days whose canonical_artist equals — or canonical_supporting
//               overlaps — the user's followed canonical names (§9.1).
//               Zero-match weeks send the LIGHT variant with up to 2 taste
//               picks; a week with no picks either sends nothing. Dedupe key
//               is `${userId}:${isoWeek}` so a cron retry can never
//               double-send.
//   3. OBSERVABILITY — one zero-dollar cost_tracking row (service='spotify',
//               metadata.job='spotify-weekly') plus a Pino summary line.
//
// SPOTIFY_SYNC_DRY_RUN=1 runs a log-only cycle: no artist-set writes (sync
// calls are skipped entirely), no emails — but eligibility + matching still
// evaluate, and the summary row is written with dryRun:true.

import { pathToFileURL } from 'node:url'
import * as Sentry from '@sentry/hono/node'
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm'
import {
  costTracking,
  db,
  events,
  userArtistFollows,
  userSpotifyConnections,
  venues,
} from '@concert-crawl/db'
import { canUseFeature } from '@concert-crawl/entitlements'
import { appUrl } from '../emails/layout.js'
import type { DigestEmailShow } from '../emails/types.js'
import { sendTransactionalEmail } from '../lib/email.js'
import { buildUnsubscribeUrl } from '../lib/email-unsubscribe.js'
import { apiLogger } from '../lib/logger.js'
import { loadPlanState } from '../lib/plan.js'
import { syncSpotifyConnection } from '../lib/spotify-sync.js'
import type { SpotifySyncOutcome } from '../lib/spotify-sync.js'

const DAY_MS = 24 * 60 * 60 * 1000
const DIGEST_WINDOW_DAYS = 7
const TASTE_PICK_COUNT = 2
const DENVER_TZ = 'America/Denver'

const isDryRun = (): boolean => process.env['SPOTIFY_SYNC_DRY_RUN'] === '1'

// ---------------------------------------------------------------------------
// Date helpers — events.date is a Denver-local calendar date (YYYY-MM-DD), so
// the window is computed on the Denver calendar, not raw UTC.
// ---------------------------------------------------------------------------

const denverDayUtcMs = (at: Date): number => {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: DENVER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
  const [year, month, day] = formatted.split('-').map(Number)
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

const toDateString = (utcMs: number): string =>
  new Date(utcMs).toISOString().slice(0, 10)

// ISO-8601 week key (e.g. '2026-W30') of the Denver-local run date — the
// per-user dedupe suffix (§8.2), stable across a same-week cron retry.
const isoWeekKey = (dayUtcMs: number): string => {
  const date = new Date(dayUtcMs)
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  // Shift to the Thursday of this ISO week; its year owns the week.
  date.setUTCDate(date.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

// '2026-07-17' → 'Fri · Jul 17' (mock format). The date string is already
// Denver-local, so it is formatted as a plain calendar date in UTC.
const dateLabel = (dateStr: string): string => {
  const parsed = Date.parse(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(parsed)) return dateStr
  const parts = DATE_LABEL_FORMAT.formatToParts(new Date(parsed))
  const part = (type: string): string =>
    parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('weekday')} · ${part('month')} ${part('day')}`
}

const priceLabel = (min: string | null): string | null => {
  if (min === null) return null
  const value = Number(min)
  if (!Number.isFinite(value) || value <= 0) return null
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Digest queries (§9.1)
// ---------------------------------------------------------------------------

interface MatchedEventRow {
  id: string
  artist: string
  date: string
  ticketPriceMin: string | null
  venueName: string
}

const eventSelection = {
  id: events.id,
  artist: events.artist,
  date: events.date,
  ticketPriceMin: events.ticketPriceMin,
  venueName: venues.name,
}

const windowFilter = (windowStart: string, windowEnd: string) =>
  and(
    gte(events.date, windowStart),
    lte(events.date, windowEnd),
    eq(events.status, 'upcoming'),
    eq(events.hiddenFromConsumer, false),
  )

// §9.1 match: headliner equality OR supporting-array overlap against the
// user's canonical follow set, one parameterized text[] both ways.
const matchedShows = async (
  canonicalNames: string[],
  windowStart: string,
  windowEnd: string,
): Promise<MatchedEventRow[]> => {
  if (canonicalNames.length === 0) return []
  const namesArray = sql`ARRAY[${sql.join(
    canonicalNames.map((name) => sql`${name}`),
    sql`, `,
  )}]::text[]`
  return db
    .select(eventSelection)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        windowFilter(windowStart, windowEnd),
        sql`(${events.canonicalArtist} = ANY(${namesArray}) OR ${events.canonicalSupporting} && ${namesArray})`,
      ),
    )
    .orderBy(events.date, events.artist)
}

// Zero-week fallback (design lock): the 2 soonest visible shows in the same
// window, so the light variant still earns its open.
const tastePicks = async (
  windowStart: string,
  windowEnd: string,
): Promise<MatchedEventRow[]> =>
  db
    .select(eventSelection)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(windowFilter(windowStart, windowEnd))
    .orderBy(events.date, events.artist)
    .limit(TASTE_PICK_COUNT)

// tourName stays null — events carry no tour metadata yet; the template
// collapses the line when absent.
const toDigestShow = (row: MatchedEventRow): DigestEmailShow => ({
  artist: row.artist,
  tourName: null,
  venue: row.venueName,
  dateLabel: dateLabel(row.date),
  priceLabel: priceLabel(row.ticketPriceMin),
  url: `${appUrl()}/events/${row.id}`,
})

// ---------------------------------------------------------------------------
// Run summary (phase 3 observability payload)
// ---------------------------------------------------------------------------

interface WeeklySummary {
  job: 'spotify-weekly'
  dryRun: boolean
  isoWeek: string
  windowStart: string
  windowEnd: string
  syncCandidates: number
  syncOutcomes: Record<SpotifySyncOutcome, number>
  syncFailures: number
  digestCandidates: number
  digestSkippedEntitlement: number
  digestPrepared: number
  digestSent: number
  digestZeroWeek: number
  digestSkippedEmpty: number
  digestFailures: number
}

type DigestOutcome = 'sent' | 'skipped-entitlement' | 'skipped-empty'

const digestForUser = async (
  userId: string,
  clerkUsers: { getUser: (id: string) => Promise<{ publicMetadata: unknown }> },
  summary: WeeklySummary,
): Promise<DigestOutcome> => {
  // Clerk publicMetadata feeds role-comped derivation; a Clerk blip falls
  // back to metadata-free derivation (DB rows still decide paid plans).
  let publicMetadata: unknown
  try {
    publicMetadata = (await clerkUsers.getUser(userId)).publicMetadata
  } catch (err) {
    apiLogger.warn(
      { err, userId },
      'spotify-weekly: Clerk metadata fetch failed — deriving plan without it',
    )
    publicMetadata = undefined
  }
  const planState = await loadPlanState(userId, publicMetadata)
  if (!canUseFeature(planState, 'spotify-sync')) {
    return 'skipped-entitlement'
  }

  const followRows = await db
    .selectDistinct({ canonicalName: userArtistFollows.canonicalName })
    .from(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, userId),
        ne(userArtistFollows.canonicalName, ''),
      ),
    )
  const canonicalNames = followRows.map((row) => row.canonicalName)

  const matched = await matchedShows(
    canonicalNames,
    summary.windowStart,
    summary.windowEnd,
  )
  const zero = matched.length === 0
  const picks = zero
    ? await tastePicks(summary.windowStart, summary.windowEnd)
    : []
  if (zero && picks.length === 0) {
    // Nothing to say at all — better no email than an empty one.
    return 'skipped-empty'
  }

  if (zero) summary.digestZeroWeek += 1
  summary.digestPrepared += 1

  const dedupeKey = `${userId}:${summary.isoWeek}`
  if (summary.dryRun) {
    apiLogger.info(
      { userId, dedupeKey, matchedCount: matched.length, zeroWeek: zero },
      'spotify-weekly: dry run — digest prepared but not sent',
    )
    return 'sent'
  }

  await sendTransactionalEmail({
    templateKey: 'spotify_digest',
    userId,
    dedupeKey,
    vars: {
      shows: matched.map(toDigestShow),
      tastePicks: picks.map(toDigestShow),
      unsubscribeUrl: buildUnsubscribeUrl(userId, 'digest') ?? null,
    },
  })
  summary.digestSent += 1
  return 'sent'
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const runSpotifyWeekly = async (
  now: Date = new Date(),
): Promise<void> => {
  const dayUtcMs = denverDayUtcMs(now)
  const summary: WeeklySummary = {
    job: 'spotify-weekly',
    dryRun: isDryRun(),
    isoWeek: isoWeekKey(dayUtcMs),
    windowStart: toDateString(dayUtcMs),
    windowEnd: toDateString(dayUtcMs + (DIGEST_WINDOW_DAYS - 1) * DAY_MS),
    syncCandidates: 0,
    syncOutcomes: { synced: 0, error: 0, revoked: 0, 'no-connection': 0 },
    syncFailures: 0,
    digestCandidates: 0,
    digestSkippedEntitlement: 0,
    digestPrepared: 0,
    digestSent: 0,
    digestZeroWeek: 0,
    digestSkippedEmpty: 0,
    digestFailures: 0,
  }
  apiLogger.info(
    { isoWeek: summary.isoWeek, dryRun: summary.dryRun },
    'spotify-weekly: starting run',
  )

  // Phase 1 — sync every non-revoked connection.
  try {
    const connections = await db
      .select({ userId: userSpotifyConnections.userId })
      .from(userSpotifyConnections)
      .where(ne(userSpotifyConnections.status, 'revoked'))
    summary.syncCandidates = connections.length
    for (const { userId } of connections) {
      if (summary.dryRun) {
        apiLogger.info(
          { userId },
          'spotify-weekly: dry run — sync skipped (no artist-set writes)',
        )
        continue
      }
      try {
        const result = await syncSpotifyConnection(userId)
        summary.syncOutcomes[result.outcome] += 1
      } catch (err) {
        // syncSpotifyConnection maps Spotify/Clerk failures to statuses; only
        // a DB-layer failure lands here.
        summary.syncFailures += 1
        apiLogger.error({ err, userId }, 'spotify-weekly: sync threw')
        Sentry.captureException(err, {
          tags: { job: 'spotify-weekly', phase: 'sync' },
          extra: { userId },
        })
      }
    }
  } catch (err) {
    apiLogger.error({ err }, 'spotify-weekly: sync phase failed')
    Sentry.captureException(err, {
      tags: { job: 'spotify-weekly', phase: 'sync' },
    })
  }

  // Phase 2 — digests. Clerk loaded lazily so the sync phase (which has its
  // own Clerk client inside spotify-sync) never depends on this import.
  try {
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({
      secretKey: process.env['CLERK_SECRET_KEY'] ?? '',
    })
    const recipients = await db
      .select({ userId: userSpotifyConnections.userId })
      .from(userSpotifyConnections)
      .where(
        and(
          ne(userSpotifyConnections.status, 'revoked'),
          eq(userSpotifyConnections.digestEnabled, true),
        ),
      )
    summary.digestCandidates = recipients.length
    for (const { userId } of recipients) {
      try {
        const outcome = await digestForUser(userId, clerk.users, summary)
        if (outcome === 'skipped-entitlement') {
          summary.digestSkippedEntitlement += 1
        }
        if (outcome === 'skipped-empty') summary.digestSkippedEmpty += 1
      } catch (err) {
        summary.digestFailures += 1
        apiLogger.error({ err, userId }, 'spotify-weekly: digest failed')
        Sentry.captureException(err, {
          tags: { job: 'spotify-weekly', phase: 'digest' },
          extra: { userId },
        })
      }
    }
  } catch (err) {
    apiLogger.error({ err }, 'spotify-weekly: digest phase failed')
    Sentry.captureException(err, {
      tags: { job: 'spotify-weekly', phase: 'digest' },
    })
  }

  // Phase 3 — observability. Best-effort: bookkeeping never fails the run.
  try {
    await db.insert(costTracking).values({
      service: 'spotify',
      costUsd: '0',
      metadata: JSON.stringify(summary),
    })
  } catch (err) {
    apiLogger.error({ err }, 'spotify-weekly: cost_tracking insert failed')
  }
  apiLogger.info({ summary }, 'spotify-weekly: run complete')
}

// CLI entry guard — same shape as billing-daily.ts. Runs only when executed
// directly, so tests import runSpotifyWeekly without auto-running. Exits
// non-zero only on a catastrophic failure (the orchestrator itself throwing —
// per-user failures are swallowed and logged inside).
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  runSpotifyWeekly()
    .then(() => {
      apiLogger.info('spotify-weekly: done')
      process.exit(0)
    })
    .catch((err) => {
      apiLogger.error({ err }, 'spotify-weekly: catastrophic failure')
      process.exit(1)
    })
}

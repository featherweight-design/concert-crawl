// Pure derivation for GET /v1/admin/triage (#1215).
//
// The admin "Needs attention" panel is derived live: a fault row exists because
// a condition is true at request time, and leaves when it stops being true.
// There is no read state, no dismiss, and nothing is read back out of
// `notifications` — see docs/superpowers/plans/2026-07-31-1215-admin-triage-surfaces.md.
//
// Everything in this file is side-effect free. The DB reads live in
// ../triage.ts; this module takes plain rows and returns the response payload,
// so the whole classification is unit-testable without a database.
//
// The five conditions are classified by the SHARED classifiers in
// @concert-crawl/crawler-core's triage-conditions.ts — the same functions the
// crawler's alert write path calls. Re-implementing the thresholds here would
// let the panel and the alert emails disagree the first time anyone tuned
// SOFT_DROP_RATIO, which is the exact class of bug this ticket exists to close.
//
// Cooldowns (`venues.last_*_alert_at`) exist to stop a daily email re-firing
// for seven days. They are NOT consulted as a filter here: a venue inside its
// cooldown window is still broken and must still produce a row.

import {
  BASELINE_RUN_COUNT,
  CEILING_HISTORY_RUN_COUNT,
  SOFT_DROP_RATIO,
  evaluateCeilingCondition,
  evaluateCoverageCondition,
  evaluateEventCountCondition,
  type AcknowledgementKey,
} from '@concert-crawl/crawler-core/triage-conditions'
import { TRIAGE_NO_SWEEP } from '@concert-crawl/types'

export const MT_TIME_ZONE = 'America/Denver'

// How many crawl_runs rows per venue the endpoint reads. Deep enough to walk
// back through a multi-day incident and find where the current streak started,
// shallow enough that 200 venues stays one small query.
export const TRIAGE_HISTORY_RUN_COUNT = 30

// venues.consecutive_failures at which crawl.ts deactivates the venue.
// Surfaced in the evidence line so an operator can see how much runway is left.
export const FAILURE_PAUSE_AT = 3

// The nightly sweep, in Mountain Time. Mirrors the Render cron schedule.
export const NIGHTLY_SWEEP_HOUR_MT = 3

// ---------------------------------------------------------------------------
// Conditions and severity bands
// ---------------------------------------------------------------------------
//
// Three bands, not five (design §4.3). The band answers "how sure are we, and
// how much is it costing right now?", which is also the order to work in.
//
//   hard    — the crawl is not running. Zero new events, and certain.
//   loss    — the crawl reports success while quietly dropping events. This is
//             the shape that stayed invisible for weeks in #624.
//   suspect — usually a pagination ceiling, sometimes a venue that genuinely
//             has 20 shows. Needs a human look, not a fix.

export const TRIAGE_BANDS = ['hard', 'loss', 'suspect'] as const
export type TriageBand = (typeof TRIAGE_BANDS)[number]

export const TRIAGE_CONDITIONS = [
  'blocked',
  'failed',
  'wentDark',
  'coverage',
  'ceiling',
] as const
export type TriageCondition = (typeof TRIAGE_CONDITIONS)[number]

const CONDITION_BAND: Record<TriageCondition, TriageBand> = {
  blocked: 'hard',
  failed: 'hard',
  wentDark: 'loss',
  coverage: 'loss',
  ceiling: 'suspect',
}

const BAND_RANK: Record<TriageBand, number> = { hard: 0, loss: 1, suspect: 2 }

// Anything we don't recognise sorts after every known band rather than
// throwing. The design mock's orderFaults raises a TypeError on an
// unrecognised condition, and a triage panel that white-screens on an
// unfamiliar alert is precisely the failure this ticket exists to prevent.
// New alert categories get added crawler-side, often before the admin surface
// knows about them.
const UNKNOWN_BAND_RANK = Number.MAX_SAFE_INTEGER

export const isTriageCondition = (value: string): value is TriageCondition =>
  (TRIAGE_CONDITIONS as readonly string[]).includes(value)

export const bandForCondition = (condition: string): TriageBand | null =>
  isTriageCondition(condition) ? CONDITION_BAND[condition] : null

/**
 * Severity band first, then persistence descending (longest-standing first).
 * Sorted server-side so the client never re-derives an ordering the accessible
 * reading order depends on.
 *
 * Tolerates an unrecognised condition: it sorts last, and this never throws.
 */
export const orderFaults = <
  FaultLike extends { condition: string; days: number },
>(
  faults: FaultLike[],
): FaultLike[] =>
  [...faults].sort((left, right) => {
    const leftBand = bandForCondition(left.condition)
    const rightBand = bandForCondition(right.condition)
    const leftRank = leftBand === null ? UNKNOWN_BAND_RANK : BAND_RANK[leftBand]
    const rightRank =
      rightBand === null ? UNKNOWN_BAND_RANK : BAND_RANK[rightBand]
    if (leftRank !== rightRank) return leftRank - rightRank
    return right.days - left.days
  })

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface TriageRunRow {
  id: string
  venueId: string
  status: 'success' | 'failed' | 'partial' | 'skipped'
  httpStatusCode: number | null
  errorMessage: string | null
  eventsFound: number
  eventsUsable: number
  eventsInserted: number
  eventsUpdated: number
  furthestEventDate: string | null
  createdAt: Date
}

export interface TriageVenueRow {
  id: string
  name: string
  blockedAt: Date | null
  consecutiveFailures: number
  lastUrlCoverageAlertAt: Date | null
  lastUrlCoverageOkAt: Date | null
}

export interface TriageCoverageRow {
  venueId: string
  upcomingCount: number
  uncoveredCount: number
}

// ---------------------------------------------------------------------------
// Evidence payloads
// ---------------------------------------------------------------------------
//
// Inner field names match design/design_handoff_admin_triage/triage-data.jsx so
// the panel needs no adapter. The one deliberate divergence is the wrapper: the
// fixture calls it `d`, which trips the repo's id-length rule. PR 3 ports the
// panel from that fixture and adopts `evidence` with it, so no adapter appears.

export interface BlockedEvidence {
  status: number | null
  refusals: number
  lastSuccess: string | null
}

export interface FailedEvidence {
  failures: number
  errorClass: string
  pauseAt: number
}

export interface WentDarkEvidence {
  count: number
  baselineCount: number
  avg: number
  pct: number
  window: number
  threshold: number
  series: number[]
}

export interface CeilingEvidence {
  kind: 'pinned_count' | 'horizon_shrank'
  count: number
  runs: number
  was: number | null
  wasWhen: string | null
  furthest: string | null
  best: string | null
  shrankDays: number | null
  series: number[]
}

// The evidence line states the COVERED figure while detection counts the
// UNCOVERED one, and the inversion is deliberate: the panel's evidence line is
// consistently "how much is working". `matched` is upcoming − uncovered.
export interface CoverageEvidence {
  matched: number
  expected: number
  uncovered: number
  // The day coverage was last COMPLETE, from venues.lastUrlCoverageOkAt —
  // stamped only on a run where every visible upcoming event carried a link
  // (#1266). Null for a venue that has not had a fully-covered run since the
  // column landed; the copy drops the clause rather than guessing.
  wasWhen: string | null
}

export type TriageFault =
  | (TriageFaultBase & { condition: 'blocked'; evidence: BlockedEvidence })
  | (TriageFaultBase & { condition: 'failed'; evidence: FailedEvidence })
  | (TriageFaultBase & { condition: 'wentDark'; evidence: WentDarkEvidence })
  | (TriageFaultBase & { condition: 'ceiling'; evidence: CeilingEvidence })
  | (TriageFaultBase & { condition: 'coverage'; evidence: CoverageEvidence })

// The shape a call site builds before the ordering metadata is stamped on.
// Distributive so each variant keeps its own `evidence`: a plain Omit over the union
// would collapse the condition/evidence pairing that makes this type worth
// having.
type FaultDraft = TriageFault extends infer Variant
  ? Variant extends TriageFault
    ? Omit<Variant, 'id' | 'band' | 'days' | 'dur'>
    : never
  : never

interface TriageFaultBase {
  id: string
  venueId: string
  venue: string
  band: TriageBand
  /** First moment of the current unbroken streak of this condition, ISO-8601. */
  persistedSince: string
  /** Fractional days since `persistedSince` — the secondary sort key. */
  days: number
  /** Display form of `days` ("12d", "9h"). */
  dur: string
  /** The run the evidence was read from, for the row's deep link. */
  crawlRunId: string | null
}

// ---------------------------------------------------------------------------
// Acknowledgement keys
// ---------------------------------------------------------------------------

/**
 * The normalized key an acknowledgement is stored and compared against.
 *
 * Lives here rather than in crawler-core because it reads the evidence shapes,
 * which are app-layer types. crawler-core owns the comparison
 * (`matchesAcknowledgement`) and never sees a fault.
 *
 * A null `evidenceValue` means the figure was itself absent — a blocked venue
 * that never returned an HTTP status. It matches only a currently-absent
 * figure, never a present one.
 */
export const faultAcknowledgementKey = (
  fault: TriageFault,
): AcknowledgementKey => {
  switch (fault.condition) {
    case 'ceiling':
      return {
        condition: fault.condition,
        evidenceKind: fault.evidence.kind,
        evidenceValue:
          fault.evidence.kind === 'horizon_shrank'
            ? fault.evidence.furthest
            : String(fault.evidence.count),
      }
    case 'wentDark':
      return {
        condition: fault.condition,
        evidenceKind: null,
        evidenceValue: String(fault.evidence.count),
      }
    case 'coverage':
      return {
        condition: fault.condition,
        evidenceKind: null,
        evidenceValue: String(fault.evidence.uncovered),
      }
    case 'blocked':
      return {
        condition: fault.condition,
        evidenceKind: null,
        evidenceValue:
          fault.evidence.status === null ? null : String(fault.evidence.status),
      }
    case 'failed':
      return {
        condition: fault.condition,
        evidenceKind: null,
        evidenceValue: fault.evidence.errorClass,
      }
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const daysBetween = (since: Date, now: Date): number =>
  Math.max(0, (now.getTime() - since.getTime()) / MS_PER_DAY)

/** "12d" / "9h" / "8m". Rounded down, so a row never overstates its age. */
export const formatDuration = (days: number): string => {
  const totalMinutes = Math.floor(days * 24 * 60)
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** "Jul 18" in Mountain Time — the app displays MT everywhere. */
export const formatMtDate = (value: Date): string =>
  value.toLocaleDateString('en-US', {
    timeZone: MT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })

/** "3:02 AM" in Mountain Time. */
export const formatMtTime = (value: Date): string =>
  value.toLocaleTimeString('en-US', {
    timeZone: MT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  })

// Coarse class for the failing-crawl evidence line. There is no error_class
// column — crawl.ts stores a free-text errorMessage — so this buckets the
// message into something an operator can scan. Unrecognised messages read
// 'unknown' rather than leaking a raw stack line into the panel.
export const classifyCrawlError = (
  errorMessage: string | null,
  httpStatusCode: number | null,
): string => {
  if (httpStatusCode === 403 || httpStatusCode === 429) return 'bot_detection'
  if (httpStatusCode !== null && httpStatusCode >= 500) return 'server_error'
  const message = errorMessage ?? ''
  if (/timeout|timed out/i.test(message)) return 'timeout'
  if (/robots/i.test(message)) return 'robots_disallowed'
  if (/net::|ENOTFOUND|ECONNRESET|ECONNREFUSED|socket/i.test(message))
    return 'network_error'
  if (/parse|extract|schema|json/i.test(message)) return 'parse_failure'
  if (message !== '') return 'crawl_error'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Per-venue derivation
// ---------------------------------------------------------------------------

// A page-hash dedup skip writes eventsFound 0 by convention, so a skipped run
// carries no reading at all — it is passed over rather than treated as a
// datapoint. Same rule the crawler's own guards apply.
const isReading = (run: TriageRunRow): boolean => run.status !== 'skipped'

// Baseline rows for the went-dark check: successful runs that actually
// returned events (#645). Deliberately NOT widened to include 'partial' — a
// partial run is a zero-usable run, and averaging those in drags the baseline
// toward zero and masks the very regression being detected.
const isBaselineRun = (run: TriageRunRow): boolean =>
  run.status === 'success' && run.eventsUsable > 0

const isCeilingHistoryRun = (run: TriageRunRow): boolean =>
  run.status === 'success'

/**
 * Walk backwards from `startIndex` while `isTrue` holds, and return the
 * createdAt of the oldest run in that unbroken streak.
 *
 * `runs` is newest-first. Runs that carry no reading are skipped without
 * breaking the streak, matching the crawler's own history selection.
 */
const streakStart = (
  runs: TriageRunRow[],
  startIndex: number,
  isTrue: (index: number) => boolean,
): Date => {
  let oldest = runs[startIndex]!.createdAt
  for (let index = startIndex + 1; index < runs.length; index += 1) {
    if (!isReading(runs[index]!)) continue
    if (!isTrue(index)) break
    oldest = runs[index]!.createdAt
  }
  return oldest
}

/** The first run at or after `from` that carries a usable reading. */
const findSubjectIndex = (runs: TriageRunRow[]): number =>
  runs.findIndex((run) => run.status === 'success' || run.status === 'partial')

const baselineFor = (runs: TriageRunRow[], subjectIndex: number): number[] =>
  runs
    .slice(subjectIndex + 1)
    .filter(isBaselineRun)
    .slice(0, BASELINE_RUN_COUNT)
    .map((run) => run.eventsUsable)

const ceilingHistoryFor = (
  runs: TriageRunRow[],
  subjectIndex: number,
): { eventsFound: number; furthestEventDate: string | null }[] =>
  runs
    .slice(subjectIndex + 1)
    .filter(isCeilingHistoryRun)
    .slice(0, CEILING_HISTORY_RUN_COUNT)
    .map((run) => ({
      eventsFound: run.eventsFound,
      furthestEventDate: run.furthestEventDate,
    }))

const wentDarkAt = (runs: TriageRunRow[], index: number): boolean => {
  const run = runs[index]
  if (!run || !(run.status === 'success' || run.status === 'partial'))
    return false
  return evaluateEventCountCondition({
    eventsUsable: run.eventsUsable,
    baselineUsableCounts: baselineFor(runs, index),
  }).detected
}

const ceilingAt = (runs: TriageRunRow[], index: number): boolean => {
  const run = runs[index]
  if (!run || run.eventsUsable === 0) return false
  if (!(run.status === 'success' || run.status === 'partial')) return false
  return evaluateCeilingCondition({
    eventsFound: run.eventsFound,
    furthestEventDate: run.furthestEventDate,
    recent: ceilingHistoryFor(runs, index),
  }).detected
}

export interface DeriveFaultsInput {
  venues: TriageVenueRow[]
  /** All history rows, any order; grouped per venue internally. */
  runs: TriageRunRow[]
  coverage: TriageCoverageRow[]
  now: Date
}

/**
 * Every condition that is true right now, ordered for reading.
 *
 * A venue in the `hard` band emits only that row. A blocked or failing venue's
 * stale catalogue trivially trips went-dark and coverage as well, and listing
 * one incident three times buries the cause the operator actually needs.
 */
export const deriveFaults = (input: DeriveFaultsInput): TriageFault[] => {
  const runsByVenue = new Map<string, TriageRunRow[]>()
  for (const run of input.runs) {
    const bucket = runsByVenue.get(run.venueId)
    if (bucket) bucket.push(run)
    else runsByVenue.set(run.venueId, [run])
  }
  for (const bucket of runsByVenue.values()) {
    bucket.sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    )
  }

  const coverageByVenue = new Map(
    input.coverage.map((row) => [row.venueId, row]),
  )

  const faults: TriageFault[] = []

  for (const venue of input.venues) {
    const runs = runsByVenue.get(venue.id) ?? []
    // Switched rather than spread once: a single `faults.push({ ...draft })`
    // over the union widens `evidence` to every shape at once and stops
    // matching any one variant. Narrowing per condition keeps the
    // condition/evidence pairing the discriminated union exists to enforce.
    const push = (draft: FaultDraft): void => {
      const days = daysBetween(new Date(draft.persistedSince), input.now)
      const meta = {
        id: `${draft.venueId}:${draft.condition}`,
        band: CONDITION_BAND[draft.condition],
        days,
        dur: formatDuration(days),
      }
      switch (draft.condition) {
        case 'blocked':
          faults.push({ ...draft, ...meta })
          break
        case 'failed':
          faults.push({ ...draft, ...meta })
          break
        case 'wentDark':
          faults.push({ ...draft, ...meta })
          break
        case 'ceiling':
          faults.push({ ...draft, ...meta })
          break
        case 'coverage':
          faults.push({ ...draft, ...meta })
          break
      }
    }

    // ── hard band ────────────────────────────────────────────────────
    if (venue.blockedAt !== null) {
      const lastSuccess = runs.find((run) => run.status === 'success')
      const latest = runs[0] ?? null
      push({
        venueId: venue.id,
        venue: venue.name,
        condition: 'blocked',
        persistedSince: venue.blockedAt.toISOString(),
        crawlRunId: latest?.id ?? null,
        evidence: {
          status: latest?.httpStatusCode ?? null,
          refusals: venue.consecutiveFailures,
          lastSuccess: lastSuccess ? formatMtDate(lastSuccess.createdAt) : null,
        },
      })
      continue
    }

    const latest = runs[0]
    if (latest && latest.status === 'failed') {
      const since = streakStart(
        runs,
        0,
        (index) => runs[index]!.status === 'failed',
      )
      push({
        venueId: venue.id,
        venue: venue.name,
        condition: 'failed',
        persistedSince: since.toISOString(),
        crawlRunId: latest.id,
        evidence: {
          failures: venue.consecutiveFailures,
          errorClass: classifyCrawlError(
            latest.errorMessage,
            latest.httpStatusCode,
          ),
          pauseAt: FAILURE_PAUSE_AT,
        },
      })
      continue
    }

    // ── loss + suspect bands ─────────────────────────────────────────
    const subjectIndex = findSubjectIndex(runs)
    const subject = subjectIndex === -1 ? null : runs[subjectIndex]!
    if (!subject) continue

    const drop = evaluateEventCountCondition({
      eventsUsable: subject.eventsUsable,
      baselineUsableCounts: baselineFor(runs, subjectIndex),
    })
    if (drop.detected) {
      const since = streakStart(runs, subjectIndex, (index) =>
        wentDarkAt(runs, index),
      )
      push({
        venueId: venue.id,
        venue: venue.name,
        condition: 'wentDark',
        persistedSince: since.toISOString(),
        crawlRunId: subject.id,
        evidence: {
          count: drop.eventsUsable,
          baselineCount: Math.round(drop.baselineCount),
          avg: Math.round(drop.baselineCount * 10) / 10,
          pct: -Math.round(drop.dropPercent),
          window: BASELINE_RUN_COUNT,
          // Interpolated from the shipped constant rather than hardcoded: at
          // SOFT_DROP_RATIO = 0.3 the alert flags at −70%, not the −60% the
          // handoff's copy assumed.
          threshold: -Math.round((1 - SOFT_DROP_RATIO) * 100),
          series: seriesOf(runs, subjectIndex, (run) => run.eventsUsable),
        },
      })
    }

    // A run that kept nothing is a went-dark incident and event-count owns it;
    // the venue's stale catalogue would otherwise read as a coverage gap and a
    // ceiling for as long as it stayed dark, burying the real cause. Same gate
    // the two crawler-side guards apply.
    if (subject.eventsUsable === 0) continue

    const coverageRow = coverageByVenue.get(venue.id)
    if (coverageRow) {
      const coverageCondition = evaluateCoverageCondition({
        upcomingCount: coverageRow.upcomingCount,
        uncoveredCount: coverageRow.uncoveredCount,
      })
      if (coverageCondition.detected) {
        // The coverage condition is measured against stored catalogue state,
        // which has no per-run history to walk. The cooldown marker is the
        // only durable "this has been true since" signal available, and the
        // write path CLEARS it on a covered run — so a set marker does mean an
        // unbroken streak. This is reading it as a timestamp, not filtering on
        // it: a venue inside its cooldown still gets a row either way.
        const since = venue.lastUrlCoverageAlertAt ?? subject.createdAt
        push({
          venueId: venue.id,
          venue: venue.name,
          condition: 'coverage',
          persistedSince: since.toISOString(),
          crawlRunId: subject.id,
          evidence: {
            matched:
              coverageCondition.upcomingCount -
              coverageCondition.uncoveredCount,
            expected: coverageCondition.upcomingCount,
            uncovered: coverageCondition.uncoveredCount,
            wasWhen: venue.lastUrlCoverageOkAt
              ? formatMtDate(venue.lastUrlCoverageOkAt)
              : null,
          },
        })
      }
    }

    const ceiling = evaluateCeilingCondition({
      eventsFound: subject.eventsFound,
      furthestEventDate: subject.furthestEventDate,
      recent: ceilingHistoryFor(runs, subjectIndex),
    })
    if (ceiling.detected) {
      const since = streakStart(runs, subjectIndex, (index) =>
        ceilingAt(runs, index),
      )
      const previous = runs
        .slice(subjectIndex + 1)
        .filter(isCeilingHistoryRun)
        .find((run) => run.eventsFound !== subject.eventsFound)
      push({
        venueId: venue.id,
        venue: venue.name,
        condition: 'ceiling',
        persistedSince: since.toISOString(),
        crawlRunId: subject.id,
        evidence: {
          kind: ceiling.condition,
          count:
            ceiling.condition === 'pinned_count'
              ? ceiling.eventsFound
              : subject.eventsFound,
          runs: ceiling.condition === 'pinned_count' ? ceiling.runCount : 1,
          was: previous?.eventsFound ?? null,
          wasWhen: previous ? formatMtDate(previous.createdAt) : null,
          furthest:
            ceiling.condition === 'horizon_shrank'
              ? ceiling.furthestEventDate
              : null,
          best:
            ceiling.condition === 'horizon_shrank'
              ? ceiling.bestFurthestEventDate
              : null,
          shrankDays:
            ceiling.condition === 'horizon_shrank' ? ceiling.shrankDays : null,
          series: seriesOf(runs, subjectIndex, (run) => run.eventsFound),
        },
      })
    }
  }

  // Belt and braces against a condition this build doesn't know about: it is
  // omitted from the payload here, and orderFaults tolerates one if it slips
  // through from anywhere else.
  return orderFaults(
    faults.filter((fault) => isTriageCondition(fault.condition)),
  )
}

// Oldest-to-newest readings for the row's micro-chart, ending on the subject
// run. Reversed because `runs` is newest-first and a trend reads left to right.
const seriesOf = (
  runs: TriageRunRow[],
  subjectIndex: number,
  read: (run: TriageRunRow) => number,
): number[] =>
  runs
    .slice(subjectIndex, subjectIndex + BASELINE_RUN_COUNT)
    .filter(isReading)
    .map(read)
    .reverse()

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

export interface TriageSweep {
  venues: number
  at: string
  atIso: string | null
  events: number
  next: string
}

/**
 * Header/empty-state figures: how many venues we watch, when the last run
 * landed, how many events it brought in, and when the next sweep is due.
 */
export const deriveSweep = (input: {
  venueCount: number
  runs: TriageRunRow[]
  now: Date
}): TriageSweep => {
  const latest = input.runs.reduce<TriageRunRow | null>(
    (newest, run) =>
      newest === null || run.createdAt > newest.createdAt ? run : newest,
    null,
  )

  // "Events that came in" is the last 24 hours of runs rather than a single
  // run: the nightly sweep is one crawl per venue, so the figure only means
  // something aggregated across them.
  const since = new Date(input.now.getTime() - MS_PER_DAY)
  const events = input.runs
    .filter((run) => run.createdAt >= since)
    .reduce((total, run) => total + run.eventsInserted + run.eventsUpdated, 0)

  return {
    venues: input.venueCount,
    at: latest ? formatMtTime(latest.createdAt) : TRIAGE_NO_SWEEP,
    atIso: latest ? latest.createdAt.toISOString() : null,
    events,
    next: formatMtTime(nextNightlySweep(input.now)),
  }
}

const mtHourOf = (when: Date): number =>
  Number(
    when.toLocaleString('en-US', {
      timeZone: MT_TIME_ZONE,
      hour: 'numeric',
      hour12: false,
    }),
  )

// Next 3 AM Mountain.
//
// Scans forward an hour at a time and re-asks Intl what the Denver clock reads,
// rather than computing a delta from the current Mountain hour. A delta assumes
// the offset holds for the whole span, which is false across a DST boundary:
// on fall-back night the extra hour makes "5 hours ahead" land at 2 AM MT.
export const nextNightlySweep = (now: Date): Date => {
  // Start at the top of the next hour so the result is always strictly future,
  // including when `now` is already inside the 3 AM hour.
  const candidate = new Date(now.getTime())
  candidate.setUTCMinutes(0, 0, 0)
  candidate.setUTCHours(candidate.getUTCHours() + 1)

  // 48 steps covers a full day plus either DST direction.
  for (let step = 0; step < 48; step += 1) {
    if (mtHourOf(candidate) === NIGHTLY_SWEEP_HOUR_MT) return candidate
    candidate.setUTCHours(candidate.getUTCHours() + 1)
  }
  return candidate
}

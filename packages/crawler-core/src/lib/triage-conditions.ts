// Pure, side-effect-free fault classifiers shared by the crawler's alerting
// write path and the admin triage read path (#1215).
//
// Every threshold and every "is this venue broken" decision lives here and
// nowhere else. The three `runCheck` functions in event-count-alert.ts,
// event-ceiling-alert.ts and url-coverage-alert.ts wrap these with their side
// effects — a notifications row, an email, a cooldown stamp. The admin triage
// endpoint calls the same functions with none of that.
//
// The reason for the split: if the read path re-implemented the thresholds in
// a query, the "Needs attention" panel and the alert emails would disagree the
// first time anyone tuned SOFT_DROP_RATIO, and a venue would read as broken in
// one place and healthy in the other. Nothing in this file may touch the
// database, send mail, or read the clock.
//
// Cooldowns are deliberately absent. `venues.last_*_alert_at` exists to stop a
// daily email re-firing for seven days; a venue inside its cooldown window is
// still broken and must still show a triage row.

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

// How many recent successful runs to average for the went-dark baseline. 7
// days of daily crawls' worth — long enough to ride out a slow Tuesday but
// short enough that the baseline tracks recent venue programming.
export const BASELINE_RUN_COUNT = 7

// Below this number of successful historical runs, we don't have enough signal
// to call a "drop". New venues get a grace period.
export const COLD_START_MIN_RUNS = 3

// Soft alert threshold — if the current run kept fewer than baseline * 0.3
// usable events, that's a meaningful drop. Tuned generously to avoid noise
// during initial rollout; can be tightened per-venue later.
export const SOFT_DROP_RATIO = 0.3

// How many prior runs to read for both ceiling detections. Long enough that a
// single odd night can't trip either fingerprint, short enough to stay inside
// a venue's current programming rhythm.
export const CEILING_HISTORY_RUN_COUNT = 7

// Minimum prior readings before either ceiling detection will classify. Both
// need a sense of "normal" first, and migration 0061 deliberately leaves
// furthest_event_date NULL on historical rows, so the horizon check arms itself
// a few nightly crawls after deploy rather than firing on empty history.
export const CEILING_COLD_START_MIN_RUNS = 3

// How far the horizon must fall below its recent best to count. Generous on
// purpose: a single far-out show being cancelled or rescheduled moves the
// horizon legitimately. A truncation bites off months.
export const HORIZON_SHRINK_DAYS = 30

// Consecutive *successful* runs (the current one included) that must report an
// identical eventsFound before it reads as pinned.
export const PINNED_RUN_COUNT = 5

// Below this count, an exactly-repeating number is unremarkable — a venue with
// four shows on calendar can genuinely report four for a week. The caps worth
// catching are large enough to look healthy, which is what made #1127
// invisible.
export const PINNED_MIN_COUNT = 10

// Below this many upcoming events, a coverage ratio is noise. A venue with
// three shows on calendar and one missing URL is at 33% without anything being
// systemically wrong.
export const COVERAGE_MIN_CATALOGUE = 10

// Share of the upcoming catalogue that must lack BOTH URLs before this reads as
// systemic. Tuned to match SOFT_DROP_RATIO's rationale: the failure worth
// catching is a venue whose whole catalogue went URL-less.
export const COVERAGE_GAP_RATIO = 0.3

// ---------------------------------------------------------------------------
// Went dark / dropped sharply
// ---------------------------------------------------------------------------

export type EventCountConditionKind = 'went_dark' | 'dropped_sharply'

export type EventCountCondition =
  | {
      detected: false
      /**
       * `cold_start` — fewer than COLD_START_MIN_RUNS baseline readings.
       * `no_drop` — enough history, and this run is within tolerance.
       */
      reason: 'cold_start' | 'no_drop'
    }
  | {
      detected: true
      condition: EventCountConditionKind
      eventsUsable: number
      baselineCount: number
      dropPercent: number
    }

export interface EventCountConditionInput {
  /**
   * Rows that survived the downstream cross-venue presale filter and the empty
   * canonical artist/title guards on the run under test (#1167).
   */
  eventsUsable: number
  /**
   * `events_usable` from the baseline runs, most recent first. Callers are
   * responsible for the row selection (successful, non-zero, excluding the run
   * under test) — this function only does arithmetic.
   */
  baselineUsableCounts: number[]
}

/**
 * The raw drop classifier: does this count read as a regression against this
 * baseline? Returns null when it does not.
 *
 * Exported separately from `evaluateEventCountCondition` because the baseline
 * is sometimes already computed by the caller.
 */
export const classifyDrop = (
  eventsUsable: number,
  baselineCount: number,
): EventCountConditionKind | null => {
  if (baselineCount <= 0) return null
  if (eventsUsable === 0) return 'went_dark'
  if (eventsUsable < baselineCount * SOFT_DROP_RATIO) return 'dropped_sharply'
  return null
}

/** Mean of the baseline readings. Zero for an empty window. */
export const computeBaselineCount = (
  baselineUsableCounts: number[],
): number => {
  if (baselineUsableCounts.length === 0) return 0
  return (
    baselineUsableCounts.reduce((sumSoFar, count) => sumSoFar + count, 0) /
    baselineUsableCounts.length
  )
}

export const evaluateEventCountCondition = (
  input: EventCountConditionInput,
): EventCountCondition => {
  if (input.baselineUsableCounts.length < COLD_START_MIN_RUNS) {
    return { detected: false, reason: 'cold_start' }
  }

  const baselineCount = computeBaselineCount(input.baselineUsableCounts)
  const condition = classifyDrop(input.eventsUsable, baselineCount)
  if (!condition) return { detected: false, reason: 'no_drop' }

  return {
    detected: true,
    condition,
    eventsUsable: input.eventsUsable,
    baselineCount,
    dropPercent:
      baselineCount > 0
        ? ((baselineCount - input.eventsUsable) / baselineCount) * 100
        : 0,
  }
}

// ---------------------------------------------------------------------------
// Ceiling — two distinct fingerprints, deliberately not collapsed
// ---------------------------------------------------------------------------
//
// "stuck at 20 events" and "furthest show pulled back to Aug 12" are different
// sentences and send an operator to different places, so each variant carries
// its own evidence figures rather than a shared generic payload.

export type CeilingConditionKind = 'horizon_shrank' | 'pinned_count'

export type CeilingCondition =
  | {
      detected: false
      reason: 'cold_start' | 'no_ceiling'
    }
  | {
      detected: true
      condition: 'horizon_shrank'
      /** This run's furthest announced event date, 'YYYY-MM-DD'. */
      furthestEventDate: string
      /** The best (latest) horizon reading in the recent window. */
      bestFurthestEventDate: string
      /** How many days the horizon fell below its recent best. */
      shrankDays: number
      body: string
    }
  | {
      detected: true
      condition: 'pinned_count'
      /** The count this venue has repeated. */
      eventsFound: number
      /** Consecutive successful runs at that count, this one included. */
      runCount: number
      body: string
    }

export interface CeilingHistoryRun {
  eventsFound: number
  furthestEventDate: string | null
}

export interface CeilingConditionInput {
  /** Raw extractor output for the run under test. */
  eventsFound: number
  /** Latest date among the run's usable events, 'YYYY-MM-DD', or null. */
  furthestEventDate: string | null
  /**
   * Prior successful runs, most recent first, excluding the run under test.
   * Callers own the row selection; skipped and failed runs are passed over
   * rather than breaking a streak (see event-ceiling-alert.ts's header).
   */
  recent: CeilingHistoryRun[]
}

export const detectHorizonShrink = (
  furthestEventDate: string | null,
  recent: { furthestEventDate: string | null }[],
): Extract<CeilingCondition, { condition: 'horizon_shrank' }> | null => {
  if (!furthestEventDate) return null

  const readings = recent
    .map((row) => row.furthestEventDate)
    .filter((value): value is string => value !== null)

  if (readings.length < CEILING_COLD_START_MIN_RUNS) return null

  // Compare against the best recent reading rather than the previous run's, so
  // a cap that ratchets the horizon in over several nights still trips instead
  // of each night looking like a small acceptable step.
  const best = readings.reduce(
    (furthest, value) => (value > furthest ? value : furthest),
    readings[0]!,
  )
  const shrankDays = differenceInDays(best, furthestEventDate)
  if (shrankDays < HORIZON_SHRINK_DAYS) return null

  return {
    detected: true,
    condition: 'horizon_shrank',
    furthestEventDate,
    bestFurthestEventDate: best,
    shrankDays,
    body: `The furthest show announced by this venue moved ${shrankDays} days closer — now ${furthestEventDate}, against ${best} on a recent crawl. The crawl itself looks healthy, so check whether the venue's page has started truncating its calendar.`,
  }
}

export const detectPinnedCount = (
  eventsFound: number,
  recent: { eventsFound: number }[],
): Extract<CeilingCondition, { condition: 'pinned_count' }> | null => {
  if (eventsFound < PINNED_MIN_COUNT) return null

  const priorNeeded = PINNED_RUN_COUNT - 1
  if (recent.length < priorNeeded) return null

  const streak = recent.slice(0, priorNeeded)
  if (!streak.every((row) => row.eventsFound === eventsFound)) return null

  return {
    detected: true,
    condition: 'pinned_count',
    eventsFound,
    runCount: PINNED_RUN_COUNT,
    body: `This venue has reported exactly ${eventsFound} events on its last ${PINNED_RUN_COUNT} successful crawls. An unchanged page is recorded as skipped, so an exactly repeating count on changed pages is the signature of a hard item cap rather than a stable calendar.`,
  }
}

export const evaluateCeilingCondition = (
  input: CeilingConditionInput,
): CeilingCondition => {
  if (input.recent.length < CEILING_COLD_START_MIN_RUNS) {
    return { detected: false, reason: 'cold_start' }
  }

  // Horizon first: it is the more specific signal, and a truncating venue often
  // trips both.
  const detected =
    detectHorizonShrink(input.furthestEventDate, input.recent) ??
    detectPinnedCount(input.eventsFound, input.recent)

  return detected ?? { detected: false, reason: 'no_ceiling' }
}

// Both operands are 'YYYY-MM-DD' calendar dates from Postgres `date` columns,
// so parsing them as UTC midnight keeps the difference free of DST skew.
const differenceInDays = (later: string, earlier: string): number => {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) /
      msPerDay,
  )
}

// ---------------------------------------------------------------------------
// URL coverage gap
// ---------------------------------------------------------------------------

export type CoverageConditionKind = 'no_coverage' | 'partial_gap'

export type CoverageCondition =
  | {
      detected: false
      /**
       * `small_catalogue` — fewer than COVERAGE_MIN_CATALOGUE upcoming events,
       * so the ratio is noise. `covered` — enough catalogue, ratio inside
       * tolerance.
       */
      reason: 'small_catalogue' | 'covered'
      upcomingCount: number
      uncoveredCount: number
    }
  | {
      detected: true
      condition: CoverageConditionKind
      /** Upcoming, consumer-visible events counted. */
      upcomingCount: number
      /** Of those, how many have neither a ticket URL nor an event URL. */
      uncoveredCount: number
      uncoveredPercent: number
    }

export interface CoverageConditionInput {
  upcomingCount: number
  uncoveredCount: number
}

export const evaluateCoverageCondition = (
  input: CoverageConditionInput,
): CoverageCondition => {
  const { upcomingCount, uncoveredCount } = input

  if (upcomingCount < COVERAGE_MIN_CATALOGUE) {
    return {
      detected: false,
      reason: 'small_catalogue',
      upcomingCount,
      uncoveredCount,
    }
  }

  const uncoveredRatio = uncoveredCount / upcomingCount
  if (uncoveredRatio < COVERAGE_GAP_RATIO) {
    return { detected: false, reason: 'covered', upcomingCount, uncoveredCount }
  }

  // 'no_coverage' means not one upcoming event has a per-event link — the
  // Cervantes shape, and almost always an extraction regression rather than a
  // venue that genuinely stopped publishing links. 'partial_gap' is likelier to
  // be a subset of pages changing shape, so the two get different copy.
  return {
    detected: true,
    condition: uncoveredCount === upcomingCount ? 'no_coverage' : 'partial_gap',
    upcomingCount,
    uncoveredCount,
    uncoveredPercent: uncoveredRatio * 100,
  }
}

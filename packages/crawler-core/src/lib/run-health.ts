// Run-level health for the daily crawl. Every other crawl alert asks "is THIS
// venue broken?" and is gated on three strikes, so a failure shared by many
// venues on one night was silent in the app's own channels until the third
// night — by which point the three-strikes rule had already paused them
// (2026-09-28: 8 of 20 venues failed on one LLM quota error).
//
// Thresholds are sized from 91 days of prod crawl_runs: 86 clean days, 3 with
// one failure, one with the same venue failing twice, and 2026-09-28. These
// values fire on that last day only.

import { reportFailure } from '@concert-crawl/logger'
import { classifyCrawlError, type CrawlErrorKind } from './crawl-error-class.js'
import { sendRunDegradedEmail } from './email.js'

/** The failure rate alone never fires below this many failed venues. */
export const RUN_FAILURE_MIN_VENUES = 3
export const RUN_FAILURE_RATE = 0.25
/** Distinct venues sharing one error key before it counts as a shared cause. */
export const SHARED_CAUSE_MIN_VENUES = 2

export interface VenueRunOutcome {
  venueId: string
  venueName: string
  /** null when the venue crawled successfully. */
  errorMessage: string | null
}

export type RunDegradation =
  | { kind: 'failure_rate'; failed: number; total: number }
  | {
      kind: 'shared_cause'
      errorKey: string
      errorKind: CrawlErrorKind
      venueNames: string[]
    }

type FailedOutcome = VenueRunOutcome & { errorMessage: string }

const isFailed = (outcome: VenueRunOutcome): outcome is FailedOutcome =>
  outcome.errorMessage !== null

export function evaluateRunHealth(
  outcomes: readonly VenueRunOutcome[],
): RunDegradation[] {
  const failures = outcomes.filter(isFailed)
  const total = outcomes.length
  const degradations: RunDegradation[] = []

  if (
    failures.length >= RUN_FAILURE_MIN_VENUES &&
    failures.length / total >= RUN_FAILURE_RATE
  ) {
    degradations.push({ kind: 'failure_rate', failed: failures.length, total })
  }

  // Keyed by venue id, defensively: the daily loop never crawls a venue twice,
  // but one venue must never masquerade as a shared cause if a caller ever
  // merges outcomes from more than one run.
  const byKey = new Map<
    string,
    { errorKind: CrawlErrorKind; venues: Map<string, string> }
  >()
  for (const failure of failures) {
    const { kind, key } = classifyCrawlError(failure.errorMessage)
    const group = byKey.get(key) ?? {
      errorKind: kind,
      venues: new Map<string, string>(),
    }
    group.venues.set(failure.venueId, failure.venueName)
    byKey.set(key, group)
  }
  for (const [errorKey, group] of byKey) {
    if (group.venues.size >= SHARED_CAUSE_MIN_VENUES) {
      degradations.push({
        kind: 'shared_cause',
        errorKey,
        errorKind: group.errorKind,
        venueNames: [...group.venues.values()].sort(),
      })
    }
  }
  return degradations
}

export function describeDegradation(degradation: RunDegradation): string {
  if (degradation.kind === 'failure_rate') {
    return `${degradation.failed} of ${degradation.total} venues failed this run.`
  }
  const names = degradation.venueNames.join(', ')
  const count = degradation.venueNames.length
  if (degradation.errorKind === 'llm_quota') {
    return `${count} venues failed on the LLM account's usage limit. This is account-wide, not a venue problem: ${names}.`
  }
  return `${count} venues failed with the same error ("${degradation.errorKey}"): ${names}.`
}

/**
 * One Sentry issue per shared cause. Without this every degraded night lands in
 * a single `crawl.run_degraded` issue that stays open, and the issue-alert rule
 * (which fires on transitions only) never pages for a new cause again.
 */
export function runHealthFingerprint(
  degradations: readonly RunDegradation[],
): string[] {
  const causes = degradations
    .flatMap((degradation) =>
      degradation.kind === 'shared_cause' ? [degradation.errorKey] : [],
    )
    .sort()
  return [
    'crawl.run_degraded',
    ...(causes.length > 0 ? causes : ['failure_rate']),
  ]
}

export async function reportRunHealth(
  degradations: readonly RunDegradation[],
  summary: { failed: number; total: number },
): Promise<void> {
  if (degradations.length === 0) return

  const title = `Daily crawl degraded: ${summary.failed} of ${summary.total} venues failed`
  const lines = degradations.map(describeDegradation)

  // Sentry first: reportFailure never throws, so a failed email cannot cost
  // the loud channel. No in-app row: no admin screen lists run-level alerts
  // (admin/crawl.ts reads four categories pinned to a crawl-run row), so one
  // would reach nobody.
  reportFailure({
    event: 'crawl.run_degraded',
    severity: 'error',
    fingerprint: runHealthFingerprint(degradations),
    failed: summary.failed,
    total: summary.total,
    causes: lines.join(' | '),
  })

  try {
    await sendRunDegradedEmail({ title, lines })
  } catch (emailErr) {
    reportFailure({
      event: 'crawl.email_error',
      severity: 'error',
      error: String(emailErr),
    })
  }
}

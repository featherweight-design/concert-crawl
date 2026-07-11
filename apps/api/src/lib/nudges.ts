// apps/api/src/lib/nudges.ts
//
// Pure server-side evaluation of the lifecycle nudge flags returned by
// GET /v1/users/me (eng infra spec Part 2 §6; execution plan PR 4.2).
// All predicates are evaluated against the caller-supplied `now` so the
// boundary behavior is deterministic and unit-testable.

import type { SubscriptionStatus } from '@concert-crawl/types'

const HOUR_MS = 60 * 60 * 1000
const DAY_13_WINDOW_START_MS = 48 * HOUR_MS // trialEndsAt − 48h (inclusive)
const DAY_13_WINDOW_END_MS = 24 * HOUR_MS // trialEndsAt − 24h (exclusive)

export interface NudgeEvaluationInput {
  trialEndsAt: Date | null
  lastTrialEndedShownAt: Date | null
  dayThirteenBannerDismissedAt: Date | null
  pastDueBannerDismissedAt: Date | null
  subscriptionStatus: SubscriptionStatus | null
  sessionStartedAt: Date | null
  now: Date
}

export interface NudgeFlags {
  showTrialEndedTakeover: boolean
  showDayThirteenBanner: boolean
  showPastDueBanner: boolean
}

// Trial-ended takeover: single-fire per trial expiry — a shownAt stamped
// before a NEW trialEndsAt re-arms the takeover (#780 §2).
const evaluateTrialEndedTakeover = (input: NudgeEvaluationInput): boolean => {
  if (input.trialEndsAt === null) return false
  if (input.trialEndsAt.getTime() >= input.now.getTime()) return false
  return (
    input.lastTrialEndedShownAt === null ||
    input.lastTrialEndedShownAt.getTime() < input.trialEndsAt.getTime()
  )
}

// Day-13 banner: [trialEndsAt − 48h, trialEndsAt − 24h) window; a dismissal
// stamped before the window opened belongs to a prior trial and re-shows
// (#780 §6).
const evaluateDayThirteenBanner = (input: NudgeEvaluationInput): boolean => {
  if (input.trialEndsAt === null) return false
  const windowStart = input.trialEndsAt.getTime() - DAY_13_WINDOW_START_MS
  const windowEnd = input.trialEndsAt.getTime() - DAY_13_WINDOW_END_MS
  const nowMs = input.now.getTime()
  if (nowMs < windowStart || nowMs >= windowEnd) return false
  return (
    input.dayThirteenBannerDismissedAt === null ||
    input.dayThirteenBannerDismissedAt.getTime() < windowStart
  )
}

// Past-due banner: per-session — a dismissal only suppresses the banner for
// the session it happened in (#782 §1). Without a sessionStartedAt from the
// client, any dismissal suppresses.
const evaluatePastDueBanner = (input: NudgeEvaluationInput): boolean => {
  if (input.subscriptionStatus !== 'past_due') return false
  if (input.pastDueBannerDismissedAt === null) return true
  if (input.sessionStartedAt === null) return false
  return (
    input.pastDueBannerDismissedAt.getTime() < input.sessionStartedAt.getTime()
  )
}

export const evaluateNudgeFlags = (
  input: NudgeEvaluationInput,
): NudgeFlags => ({
  showTrialEndedTakeover: evaluateTrialEndedTakeover(input),
  showDayThirteenBanner: evaluateDayThirteenBanner(input),
  showPastDueBanner: evaluatePastDueBanner(input),
})

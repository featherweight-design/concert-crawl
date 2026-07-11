// Unit tests for evaluateNudgeFlags (eng infra spec Part 2 §6; execution
// plan PR 4.2) — boundary timestamps per the spec's testing strategy.

import { describe, it, expect } from 'vitest'
import { evaluateNudgeFlags, type NudgeEvaluationInput } from './nudges.js'

const HOUR_MS = 60 * 60 * 1000

const NOW = new Date('2026-07-11T12:00:00.000Z')

const baseInput = (
  overrides: Partial<NudgeEvaluationInput> = {},
): NudgeEvaluationInput => ({
  trialEndsAt: null,
  lastTrialEndedShownAt: null,
  dayThirteenBannerDismissedAt: null,
  pastDueBannerDismissedAt: null,
  subscriptionStatus: null,
  sessionStartedAt: null,
  now: NOW,
  ...overrides,
})

const hoursFromNow = (hours: number): Date =>
  new Date(NOW.getTime() + hours * HOUR_MS)

describe('showTrialEndedTakeover', () => {
  it('is false when trialEndsAt is null', () => {
    const flags = evaluateNudgeFlags(baseInput())
    expect(flags.showTrialEndedTakeover).toBe(false)
  })

  it('is true when the trial expired and the takeover was never shown', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(-1) }),
    )
    expect(flags.showTrialEndedTakeover).toBe(true)
  })

  it('is false exactly at trialEndsAt (strict trialEndsAt < now)', () => {
    const flags = evaluateNudgeFlags(baseInput({ trialEndsAt: NOW }))
    expect(flags.showTrialEndedTakeover).toBe(false)
  })

  it('is false while the trial is still live', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(1) }),
    )
    expect(flags.showTrialEndedTakeover).toBe(false)
  })

  it('is false when already shown after this trial expired', () => {
    const trialEndsAt = hoursFromNow(-24)
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt, lastTrialEndedShownAt: hoursFromNow(-23) }),
    )
    expect(flags.showTrialEndedTakeover).toBe(false)
  })

  it('is false when shown exactly at trialEndsAt (strict shownAt < trialEndsAt)', () => {
    const trialEndsAt = hoursFromNow(-24)
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt, lastTrialEndedShownAt: trialEndsAt }),
    )
    expect(flags.showTrialEndedTakeover).toBe(false)
  })

  it('re-fires after a NEW trial: shownAt stamped before the new trialEndsAt', () => {
    const flags = evaluateNudgeFlags(
      baseInput({
        trialEndsAt: hoursFromNow(-1),
        lastTrialEndedShownAt: hoursFromNow(-24 * 30),
      }),
    )
    expect(flags.showTrialEndedTakeover).toBe(true)
  })

  it.each(['active', 'past_due', 'trialing'] as const)(
    'is suppressed by a live subscription (status=%s) even after trial expiry',
    (status) => {
      const flags = evaluateNudgeFlags(
        baseInput({
          trialEndsAt: hoursFromNow(-1),
          subscriptionStatus: status,
        }),
      )
      expect(flags.showTrialEndedTakeover).toBe(false)
    },
  )

  it.each(['cancelled', 'incomplete'] as const)(
    'is NOT suppressed by a non-live subscription (status=%s)',
    (status) => {
      const flags = evaluateNudgeFlags(
        baseInput({
          trialEndsAt: hoursFromNow(-1),
          subscriptionStatus: status,
        }),
      )
      expect(flags.showTrialEndedTakeover).toBe(true)
    },
  )
})

describe('showDayThirteenBanner', () => {
  it('is false when trialEndsAt is null', () => {
    const flags = evaluateNudgeFlags(baseInput())
    expect(flags.showDayThirteenBanner).toBe(false)
  })

  it('is true inside the window (trialEndsAt − 36h)', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(36) }),
    )
    expect(flags.showDayThirteenBanner).toBe(true)
  })

  it('is true exactly at trialEndsAt − 48h (inclusive lower bound)', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(48) }),
    )
    expect(flags.showDayThirteenBanner).toBe(true)
  })

  it('is false exactly at trialEndsAt − 24h (exclusive upper bound)', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(24) }),
    )
    expect(flags.showDayThirteenBanner).toBe(false)
  })

  it('is false before the window opens', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt: hoursFromNow(49) }),
    )
    expect(flags.showDayThirteenBanner).toBe(false)
  })

  it('is false when dismissed inside this trial window', () => {
    const trialEndsAt = hoursFromNow(36)
    const flags = evaluateNudgeFlags(
      baseInput({
        trialEndsAt,
        dayThirteenBannerDismissedAt: hoursFromNow(-1),
      }),
    )
    expect(flags.showDayThirteenBanner).toBe(false)
  })

  it('is false when dismissed exactly at the window start (strict < windowStart)', () => {
    const trialEndsAt = hoursFromNow(36)
    const windowStart = new Date(trialEndsAt.getTime() - 48 * HOUR_MS)
    const flags = evaluateNudgeFlags(
      baseInput({ trialEndsAt, dayThirteenBannerDismissedAt: windowStart }),
    )
    expect(flags.showDayThirteenBanner).toBe(false)
  })

  it('re-shows after a NEW trial: dismissal stamped before the new window', () => {
    const trialEndsAt = hoursFromNow(36)
    const flags = evaluateNudgeFlags(
      baseInput({
        trialEndsAt,
        dayThirteenBannerDismissedAt: hoursFromNow(-24 * 30),
      }),
    )
    expect(flags.showDayThirteenBanner).toBe(true)
  })

  it.each(['active', 'past_due', 'trialing'] as const)(
    'is suppressed by a live subscription (status=%s) even inside the window',
    (status) => {
      const flags = evaluateNudgeFlags(
        baseInput({
          trialEndsAt: hoursFromNow(36),
          subscriptionStatus: status,
        }),
      )
      expect(flags.showDayThirteenBanner).toBe(false)
    },
  )

  it.each(['cancelled', 'incomplete'] as const)(
    'is NOT suppressed by a non-live subscription (status=%s)',
    (status) => {
      const flags = evaluateNudgeFlags(
        baseInput({
          trialEndsAt: hoursFromNow(36),
          subscriptionStatus: status,
        }),
      )
      expect(flags.showDayThirteenBanner).toBe(true)
    },
  )
})

describe('showPastDueBanner', () => {
  it('is false when there is no subscription status', () => {
    const flags = evaluateNudgeFlags(baseInput())
    expect(flags.showPastDueBanner).toBe(false)
  })

  it('is false for non-past_due statuses', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ subscriptionStatus: 'active' }),
    )
    expect(flags.showPastDueBanner).toBe(false)
  })

  it('is true when past_due with no dismissal and no sessionStartedAt', () => {
    const flags = evaluateNudgeFlags(
      baseInput({ subscriptionStatus: 'past_due' }),
    )
    expect(flags.showPastDueBanner).toBe(true)
  })

  it('is false when past_due with a dismissal but no sessionStartedAt', () => {
    const flags = evaluateNudgeFlags(
      baseInput({
        subscriptionStatus: 'past_due',
        pastDueBannerDismissedAt: hoursFromNow(-1),
      }),
    )
    expect(flags.showPastDueBanner).toBe(false)
  })

  it('is true when the dismissal predates the current session', () => {
    const flags = evaluateNudgeFlags(
      baseInput({
        subscriptionStatus: 'past_due',
        pastDueBannerDismissedAt: hoursFromNow(-2),
        sessionStartedAt: hoursFromNow(-1),
      }),
    )
    expect(flags.showPastDueBanner).toBe(true)
  })

  it('is false when dismissed during the current session', () => {
    const flags = evaluateNudgeFlags(
      baseInput({
        subscriptionStatus: 'past_due',
        pastDueBannerDismissedAt: hoursFromNow(-1),
        sessionStartedAt: hoursFromNow(-2),
      }),
    )
    expect(flags.showPastDueBanner).toBe(false)
  })

  it('is false when dismissed exactly at sessionStartedAt (strict <)', () => {
    const sessionStartedAt = hoursFromNow(-1)
    const flags = evaluateNudgeFlags(
      baseInput({
        subscriptionStatus: 'past_due',
        pastDueBannerDismissedAt: sessionStartedAt,
        sessionStartedAt,
      }),
    )
    expect(flags.showPastDueBanner).toBe(false)
  })

  it('is true when past_due with no dismissal and a sessionStartedAt', () => {
    const flags = evaluateNudgeFlags(
      baseInput({
        subscriptionStatus: 'past_due',
        sessionStartedAt: hoursFromNow(-1),
      }),
    )
    expect(flags.showPastDueBanner).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { TRIAL_DAYS, resolveTrialEndsAt } from './trial.js'

describe('resolveTrialEndsAt', () => {
  const liveAt = new Date('2026-09-01T00:00:00.000Z')

  it('grants 14 days from account creation', () => {
    const createdAt = new Date('2026-09-10T12:00:00.000Z')
    const endsAt = resolveTrialEndsAt(createdAt, liveAt)
    expect(endsAt).toEqual(new Date('2026-09-24T12:00:00.000Z'))
    expect(
      (endsAt!.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000),
    ).toBe(TRIAL_DAYS)
  })

  it('includes an account created exactly at the cutover', () => {
    expect(resolveTrialEndsAt(liveAt, liveAt)).not.toBeNull()
  })

  it('excludes the pre-monetization beta cohort', () => {
    const betaUser = new Date('2026-08-31T23:59:59.999Z')
    expect(resolveTrialEndsAt(betaUser, liveAt)).toBeNull()
  })

  it('grants nothing while monetization has not launched', () => {
    expect(
      resolveTrialEndsAt(new Date('2026-09-10T00:00:00.000Z'), null),
    ).toBeNull()
  })
})

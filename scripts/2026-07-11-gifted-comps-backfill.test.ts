import { describe, it, expect } from 'vitest'
import {
  hasGiftedPlanMetadata,
  redactEmail,
  resolveGrantedBy,
} from './2026-07-11-gifted-comps-backfill-helpers.js'

describe('hasGiftedPlanMetadata', () => {
  it('returns true for plan = premium_gifted', () => {
    expect(hasGiftedPlanMetadata({ plan: 'premium_gifted' })).toBe(true)
  })

  it('returns true when other metadata keys ride along', () => {
    expect(
      hasGiftedPlanMetadata({ role: 'beta', plan: 'premium_gifted' }),
    ).toBe(true)
  })

  it('returns false for other plan values', () => {
    expect(hasGiftedPlanMetadata({ plan: 'premium' })).toBe(false)
    expect(hasGiftedPlanMetadata({ plan: 'free' })).toBe(false)
    expect(hasGiftedPlanMetadata({ plan: '' })).toBe(false)
  })

  it('returns false when plan key is missing', () => {
    expect(hasGiftedPlanMetadata({ role: 'admin' })).toBe(false)
    expect(hasGiftedPlanMetadata({})).toBe(false)
  })

  it('returns false for non-object metadata', () => {
    expect(hasGiftedPlanMetadata(null)).toBe(false)
    expect(hasGiftedPlanMetadata(undefined)).toBe(false)
    expect(hasGiftedPlanMetadata('premium_gifted')).toBe(false)
    expect(hasGiftedPlanMetadata(42)).toBe(false)
  })
})

describe('redactEmail', () => {
  it('keeps the first character and domain only', () => {
    expect(redactEmail('hugh@featherweight.design')).toBe(
      'h***@featherweight.design',
    )
  })

  it('handles single-character local parts', () => {
    expect(redactEmail('a@example.com')).toBe('a***@example.com')
  })

  it('returns the sentinel for non-address inputs', () => {
    expect(redactEmail('(no email)')).toBe('(no email)')
    expect(redactEmail('@example.com')).toBe('(no email)')
    expect(redactEmail('')).toBe('(no email)')
  })
})

describe('resolveGrantedBy', () => {
  it('extracts the --granted-by value', () => {
    expect(resolveGrantedBy(['--granted-by=user_abc123'])).toBe('user_abc123')
  })

  it('finds the flag among other args', () => {
    expect(
      resolveGrantedBy([
        'node',
        'script.ts',
        '--commit',
        '--granted-by=user_x',
      ]),
    ).toBe('user_x')
  })

  it('falls back to "backfill" when absent', () => {
    expect(resolveGrantedBy(['--commit'])).toBe('backfill')
    expect(resolveGrantedBy([])).toBe('backfill')
  })

  it('falls back to "backfill" when the value is empty', () => {
    expect(resolveGrantedBy(['--granted-by='])).toBe('backfill')
    expect(resolveGrantedBy(['--granted-by=  '])).toBe('backfill')
  })
})

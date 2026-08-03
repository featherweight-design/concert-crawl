import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isPassportRatio,
  passportYear,
  resolvePassportTheme,
} from '../passport-request'

describe('isPassportRatio', () => {
  it('accepts the one ratio the passport is drawn at', () => {
    expect(isPassportRatio('square')).toBe(true)
  })

  // A silent fall back to square would hand the caller a card at dimensions it
  // never asked for, so anything else is a hard reject.
  it('rejects ratios the card has no artboard for', () => {
    expect(isPassportRatio('story')).toBe(false)
    expect(isPassportRatio('')).toBe(false)
    expect(isPassportRatio('SQUARE')).toBe(false)
  })
})

describe('passportYear', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // The route renders on a UTC server. Between 5pm MT on New Year's Eve and
  // midnight UTC, `new Date().getFullYear()` already reads the next year while
  // Denver is still in the old one — seven hours of passports stamped with a
  // year that hasn't happened yet.
  it('stays in the old year while Denver still is, after UTC has rolled over', () => {
    vi.setSystemTime(new Date('2027-01-01T03:00:00Z'))
    expect(new Date().getUTCFullYear()).toBe(2027)
    expect(passportYear()).toBe(2026)
  })

  it('rolls over once Denver reaches midnight', () => {
    vi.setSystemTime(new Date('2027-01-01T07:00:00Z'))
    expect(passportYear()).toBe(2027)
  })

  it('reads an ordinary mid-year instant the obvious way', () => {
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'))
    expect(passportYear()).toBe(2026)
  })
})

describe('resolvePassportTheme', () => {
  it('prefers a valid override over the stored profile theme', () => {
    expect(
      resolvePassportTheme({ theme: 'jade', profileTheme: 'electric' }),
    ).toHaveProperty('theme', 'jade')
  })

  // Falling through to `theme ?? profileTheme` would hand the resolver a bogus
  // string and silently demote a Jade user to the default on a typo.
  it('falls back to the profile theme on an unknown override, not to the default', () => {
    expect(
      resolvePassportTheme({ theme: '__proto__', profileTheme: 'jade' }),
    ).toHaveProperty('theme', 'jade')
  })

  it('resolves a theme even when neither is usable', () => {
    const resolved = resolvePassportTheme({})
    expect(typeof resolved.theme).toBe('string')
    expect(Object.keys(resolved.tokens).length).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { shouldSkipUnchangedPage, MAX_SKIP_STREAK_DAYS } from './skip-guard.js'

const NOW = new Date('2026-08-15T09:00:00Z')
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

describe('shouldSkipUnchangedPage', () => {
  it('skips when the hash matches a recent success', () => {
    expect(
      shouldSkipUnchangedPage({
        hashMatches: true,
        lastSuccessAt: daysAgo(1),
        now: NOW,
      }),
    ).toBe(true)
  })

  it('does not skip when the hash differs', () => {
    expect(
      shouldSkipUnchangedPage({
        hashMatches: false,
        lastSuccessAt: daysAgo(1),
        now: NOW,
      }),
    ).toBe(false)
  })

  it('does not skip when there is no prior success to compare against', () => {
    expect(
      shouldSkipUnchangedPage({
        hashMatches: true,
        lastSuccessAt: null,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('re-extracts once the last success ages past the streak ceiling', () => {
    // Meow Wolf Denver skipped 13 days straight on a hash that could not see
    // its listing. Whatever blinds the hash, a venue must not coast on a
    // stale extraction indefinitely.
    expect(
      shouldSkipUnchangedPage({
        hashMatches: true,
        lastSuccessAt: daysAgo(MAX_SKIP_STREAK_DAYS + 1),
        now: NOW,
      }),
    ).toBe(false)
  })

  it('re-extracts exactly on the ceiling day', () => {
    expect(
      shouldSkipUnchangedPage({
        hashMatches: true,
        lastSuccessAt: daysAgo(MAX_SKIP_STREAK_DAYS),
        now: NOW,
      }),
    ).toBe(false)
  })

  it('still skips on the last day inside the ceiling', () => {
    expect(
      shouldSkipUnchangedPage({
        hashMatches: true,
        lastSuccessAt: daysAgo(MAX_SKIP_STREAK_DAYS - 1),
        now: NOW,
      }),
    ).toBe(true)
  })
})

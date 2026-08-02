import { describe, expect, it } from 'vitest'
import { fitTitleSize } from '@/lib/share/poster-title'

// The story ratio's real numbers: 1080 wide, 72px padding a side.
const STORY_WIDTH = 1080 - 72 * 2
const STORY_TITLE = 180

describe('fitTitleSize', () => {
  it('leaves a short name at the locked size', () => {
    expect(fitTitleSize('IDLES', STORY_TITLE, STORY_WIDTH)).toBe(STORY_TITLE)
  })

  it('shrinks the name that actually clipped in production', () => {
    // "Wunderhorse" rendered as "WUNDERHO" before this existed.
    const size = fitTitleSize('Wunderhorse', STORY_TITLE, STORY_WIDTH)
    expect(size).toBeLessThan(STORY_TITLE)
    expect(size * 11 * 0.66).toBeLessThanOrEqual(STORY_WIDTH)
  })

  it('measures the longest word, not the whole string', () => {
    // The block wraps, so two short words may both stay at full size even
    // though their combined length is far wider than the card.
    expect(fitTitleSize('King Gizzard', STORY_TITLE, STORY_WIDTH)).toBe(
      STORY_TITLE,
    )
  })

  it('never shrinks past the display-type floor', () => {
    const size = fitTitleSize('A'.repeat(200), STORY_TITLE, STORY_WIDTH)
    expect(size).toBe(Math.round(STORY_TITLE * 0.45))
  })

  it('returns the base size for an empty title rather than dividing by zero', () => {
    expect(fitTitleSize('', STORY_TITLE, STORY_WIDTH)).toBe(STORY_TITLE)
    expect(fitTitleSize('   ', STORY_TITLE, STORY_WIDTH)).toBe(STORY_TITLE)
  })

  it('is monotonic in the space available', () => {
    const narrow = fitTitleSize('Wunderhorse', STORY_TITLE, 400)
    const wide = fitTitleSize('Wunderhorse', STORY_TITLE, 900)
    expect(narrow).toBeLessThan(wide)
  })
})

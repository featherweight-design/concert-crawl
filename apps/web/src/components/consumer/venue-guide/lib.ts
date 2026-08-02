import {
  GUIDE_CHIP_ORDER,
  type GuideChipKey,
  type VenueGuideChip,
} from '@concert-crawl/types'

/**
 * Length past which a multi-word venue name is shortened to its first token.
 * "Ogden Theatre" (13) reads fine inline; "Mission Ballroom Denver" (23) does
 * not, so it becomes "Mission".
 */
const SHORT_NAME_MAX_LENGTH = 18

/**
 * Conversational short form of a venue name, for inline copy like
 * "First time at Roxy?". Strips a leading "The ", then falls back to the first
 * token only when the remaining name is long enough that the full string would
 * crowd the line.
 */
export const venueShortName = (name: string): string => {
  const trimmed = name.trim()
  const withoutArticle = trimmed.replace(/^the\s+/i, '')
  if (withoutArticle.length === 0) return trimmed

  const tokens = withoutArticle.split(/\s+/)
  if (tokens.length > 1 && withoutArticle.length > SHORT_NAME_MAX_LENGTH) {
    return tokens[0] ?? withoutArticle
  }
  return withoutArticle
}

/**
 * The chip keys a published guide has no authored (or honestly placeheld) row
 * for, excluding accessibility — accessibility is the publish gate and always
 * renders, so it can never be "still gathering".
 */
export const unauthoredChipKeys = (chips: VenueGuideChip[]): GuideChipKey[] => {
  const present = new Set(chips.map((chip) => chip.chipType))
  return GUIDE_CHIP_ORDER.filter(
    (key) => key !== 'accessibility' && !present.has(key),
  )
}

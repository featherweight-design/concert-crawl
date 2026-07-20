import { type MissingClassification } from '@concert-crawl/types'

export interface MissingClassificationInput {
  /** Event date, YYYY-MM-DD. */
  date: string
  /** Max date among the venue's currently-seen future events, YYYY-MM-DD, or null if none. */
  venueHorizon: string | null
  /** True when a live sibling row for the same show is still being crawled. */
  hasLiveSibling: boolean
}

export const classifyMissing = ({
  date,
  venueHorizon,
  hasLiveSibling,
}: MissingClassificationInput): MissingClassification => {
  if (hasLiveSibling) return 'duplicate'
  if (venueHorizon === null || date > venueHorizon) return 'crawl_gap'
  return 'removed'
}

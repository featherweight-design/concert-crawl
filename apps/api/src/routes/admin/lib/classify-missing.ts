import { type MissingClassification } from '@concert-crawl/types'

export interface MissingClassificationInput {
  /** Event date, YYYY-MM-DD. */
  date: string
  /** Max date among the venue's currently-seen future events, YYYY-MM-DD, or null if none. */
  venueHorizon: string | null
  /** True when a live sibling row for the same show is still being crawled. */
  hasLiveSibling: boolean
  /**
   * Id of a newly-created row that looks like this same show rescheduled or
   * relocated, or null when the matcher found nothing. See ./moved-candidate.
   */
  movedCandidateId: string | null
}

/**
 * Precedence is duplicate > moved > crawl_gap > removed.
 *
 * `duplicate` stays on top because its rule (same venue, same date, title
 * containment) is the tightest of the three and is the one the runtime
 * self-heal already auto-applies — a row it claims is not a relocation.
 *
 * `moved` outranks `crawl_gap` because a matched candidate row is concrete
 * evidence, where the horizon is only a heuristic about how deep the crawl
 * reached. An event past the horizon that also has a relocation candidate is
 * far more likely moved than merely un-crawled.
 */
export const classifyMissing = ({
  date,
  venueHorizon,
  hasLiveSibling,
  movedCandidateId,
}: MissingClassificationInput): MissingClassification => {
  if (hasLiveSibling) return 'duplicate'
  if (movedCandidateId !== null) return 'moved'
  if (venueHorizon === null || date > venueHorizon) return 'crawl_gap'
  return 'removed'
}

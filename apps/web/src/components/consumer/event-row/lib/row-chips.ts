import { EVENT_ROW_COPY as copy } from '../definitions/copy'
import { SURFACES, type RowSurface } from '../definitions/surfaces'
import type { ChipTone } from '../RowMetaChip'
import type { EventRowShow } from './row-model'
import { orderGenres } from './order-genres'
import { isPriceStale, relTimeAgo } from '@/components/consumer/lib/staleness'

export interface ChipSpec {
  key: string
  label: string
  tone: ChipTone
  srLabel?: string
  /** Named rather than a node so this stays a pure data module. */
  mark?: 'spotify'
  /**
   * The second half of a paired chip, rendered after a separator. `MetaRow` may
   * drop it under width pressure, which is the one place the system degrades
   * within a unit instead of dropping the unit whole.
   */
  secondaryLabel?: string
}

const PROVENANCE_TONE: Record<
  keyof typeof copy.provenance,
  { tone: ChipTone }
> = {
  boxoffice: { tone: 'strong' },
  standard: { tone: 'signal' },
  resale: { tone: 'warn' },
}

/**
 * The chips this row has a claim to, in the surface's priority order. This is
 * the whole candidate set — the measure pass decides how many survive, and the
 * budget caps it before that.
 *
 * A feature cannot buy space on the row by arriving with its own pill: to get
 * a chip it has to win a slot in a surface's `chipPriority`.
 */
export function rowChips(
  show: EventRowShow,
  surface: RowSurface,
  bucketMembers: readonly string[] | null = null,
): ChipSpec[] {
  const chips: ChipSpec[] = []

  for (const kind of SURFACES[surface].chipPriority) {
    // First in the crew surfaces' order, which is the whole displacement rule:
    // a row with crew presence spends the first chip slot here and `genre`,
    // last in the priority, falls off the two-chip budget on its own. No
    // removal logic exists, so a row without crew presence gets `genre` back
    // for free.
    if (
      kind === 'crew' &&
      show.crewGoing !== null &&
      show.crewGoing.count > 0
    ) {
      chips.push({
        key: 'crew',
        label: copy.meta.crewGoing(show.crewGoing.count),
        tone: 'signal',
        // The visible chip is a count; the accessible one names who, because a
        // screen reader has no cluster of faces beside it to read.
        srLabel: copy.a11y.crewGoing(
          show.crewGoing.names,
          show.crewGoing.count,
        ),
      })
    }

    if (kind === 'following' && show.isFollowed) {
      chips.push({
        key: 'following',
        label: copy.meta.following,
        // Following is the neutral, Spotify-marked chip. --signal is reserved
        // for CTAs and status, and --accent means watching; borrowing either
        // makes a follow read as an action or as a watch.
        tone: 'strong',
        srLabel: copy.a11y.following,
        mark: 'spotify',
      })
    }

    if (kind === 'genre') {
      // One chip carrying up to two genres, never two chips: a second neutral
      // chip would spend the whole Rule 2 budget on one fact, and two adjacent
      // neutral pills is the tag soup Rule 2 exists to stop.
      const [lead, second] = orderGenres(show.genres, bucketMembers)
      if (lead)
        chips.push({
          key: `genre-${lead}`,
          label: lead,
          tone: 'neutral',
          ...(second ? { secondaryLabel: second } : {}),
        })
    }

    if (kind === 'freshness' && isPriceStale(show.price?.observedAt)) {
      // observedAt is non-null here — isPriceStale is false without one.
      const relTime = relTimeAgo(show.price?.observedAt ?? '')
      chips.push({
        key: 'freshness',
        label: `${copy.freshness.stalePrefix} ${copy.glyphs.separator} ${relTime}`,
        tone: 'warn',
        srLabel: copy.a11y.stalePrice(relTime),
      })
    }

    if (kind === 'provenance' && show.price?.source) {
      const label = copy.provenance[show.price.source]
      chips.push({
        key: 'provenance',
        label,
        tone: PROVENANCE_TONE[show.price.source].tone,
        srLabel: copy.a11y.priceProvenance(label),
      })
    }
  }

  return chips
}

/**
 * Rule 2's budget. Two chips, dropping to one when a support-billing line is
 * already using the row's spare vertical space.
 */
export function chipBudget(hasSupportLine: boolean): number {
  return hasSupportLine ? 1 : 2
}

import { EVENT_ROW_COPY as copy } from '../definitions/copy'
import { SURFACES, type RowSurface } from '../definitions/surfaces'
import type { ChipTone } from '../RowMetaChip'
import type { EventRowShow } from './row-model'
import { isPriceStale, relTimeAgo } from '@/components/consumer/lib/staleness'

export interface ChipSpec {
  key: string
  label: string
  tone: ChipTone
  srLabel?: string
}

const PROVENANCE_TONE: Record<
  keyof typeof copy.provenance,
  { tone: ChipTone }
> = {
  boxoffice: { tone: 'strong' },
  standard: { tone: 'neutral' },
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
export function rowChips(show: EventRowShow, surface: RowSurface): ChipSpec[] {
  const chips: ChipSpec[] = []

  for (const kind of SURFACES[surface].chipPriority) {
    if (kind === 'following' && show.isFollowed) {
      chips.push({
        key: 'following',
        label: copy.meta.following,
        tone: 'signal',
        srLabel: copy.a11y.following,
      })
    }

    if (kind === 'genre') {
      const genre = show.genres[0]
      if (genre)
        chips.push({ key: `genre-${genre}`, label: genre, tone: 'neutral' })
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

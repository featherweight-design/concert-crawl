import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

export type PosterState = 'going' | 'soldout' | 'drop'

export const POSTER_STATES = ['going', 'soldout', 'drop'] as const

export const DEFAULT_POSTER_STATE: PosterState = 'going'

/** Closed-set guard — no Zod in `apps/web`, and three members is a full set. */
export const isPosterState = (candidate: string): candidate is PosterState =>
  POSTER_STATES.some((state) => state === candidate)

// Widened views so a runtime miss falls back instead of yielding undefined.
// The copy object is `as const`, so a direct index would be total to the type
// checker and hide the fallback from it.
const TAGLINES: Record<string, string | undefined> =
  CONSUMER_COPY.share.taglines
const STATE_LABELS: Record<string, string | undefined> =
  CONSUMER_COPY.share.stateLabels

/**
 * Total function over `PosterState`, falling back to `going`. The tagline bank
 * lives in `CONSUMER_COPY.share.taglines`; this is the only sanctioned reader.
 */
export const posterTagline = (state: PosterState): string =>
  TAGLINES[state] ?? CONSUMER_COPY.share.taglines.going

/** Badge label for the poster's state chip. Same total-function contract. */
export const posterStateLabel = (state: PosterState): string =>
  STATE_LABELS[state] ?? CONSUMER_COPY.share.stateLabels.going

/**
 * Narrow an untrusted `?state=` value to a `PosterState`, falling back to
 * `going`. Guard-based, so nothing outside the union ever reaches a lookup.
 */
export const resolvePosterState = (raw: string | undefined): PosterState =>
  raw !== undefined && isPosterState(raw) ? raw : DEFAULT_POSTER_STATE

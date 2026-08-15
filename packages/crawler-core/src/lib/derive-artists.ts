import { reportFailure } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../types.js'

export interface DerivedArtists {
  headliners: string[]
  supportingArtists: string[]
  isConcert: boolean
  /** True when an LLM call was made — the caller records cost against this. */
  adjudicated: boolean
}

export type Adjudicator = (input: {
  title: string
  description: string | undefined
}) => Promise<{
  isConcert: boolean
  headliners: string[]
  supportingArtists: string[]
}>

// Words that mark a title as describing the EVENT rather than naming an act.
// Deliberately conservative: a false positive costs one LLM call, but a false
// negative leaves a title in the artists projection.
const EVENT_WORDS = [
  'presents',
  'benefit',
  'festival',
  'bash',
  'party',
  'night',
  'showcase',
  'tribute',
  'karaoke',
  'bingo',
  'trivia',
  'open mic',
  'dj set',
  'brunch',
  'market',
]

export function isSuspiciousObservation(
  observed: string,
  title: string,
): boolean {
  // A performer field that merely echoes the title carries no information — it
  // is the shape every title-as-artist bug takes. Anything else is the venue
  // stating a name it did not simply copy from its own headline, so it is
  // trusted even when it happens to contain an event word ("Halloween Party
  // Orchestra" is a band).
  if (observed.trim().toLowerCase() !== title.trim().toLowerCase()) return false

  const lowered = observed.toLowerCase()
  if (observed.includes(':')) return true
  return EVENT_WORDS.some((word) => lowered.includes(word))
}

export async function deriveArtists(
  event: Pick<
    NormalizedEvent,
    'title' | 'rawTitle' | 'description' | 'observedPerformers'
  >,
  adjudicate: Adjudicator,
): Promise<DerivedArtists> {
  const observed = event.observedPerformers.filter(
    (name) => name.trim().length > 0,
  )
  const headliner = observed[0]

  // Step 1 — the source named somebody, and it does not merely echo the title.
  // This is the venue's own structured field; an LLM re-reading the page title
  // is strictly downstream of it, and re-deriving here would make each event's
  // artist nondeterministic across nightly crawls.
  if (
    headliner !== undefined &&
    !isSuspiciousObservation(headliner, event.title)
  ) {
    return {
      headliners: [headliner],
      supportingArtists: observed.slice(1),
      isConcert: true,
      adjudicated: false,
    }
  }

  // Step 2 — no signal, or the signal is the title wearing a performer's hat.
  try {
    const verdict = await adjudicate({
      title: event.title,
      description: event.description,
    })
    return {
      headliners: verdict.headliners,
      supportingArtists: verdict.supportingArtists,
      isConcert: verdict.isConcert,
      adjudicated: true,
    }
  } catch (err) {
    // Step 3 — an adjudicator outage must not become a wrong answer. Leave the
    // headliners empty (the backfill simply does not project this event) and
    // leave `isConcert` true so a transient Haiku failure never hides a real
    // show from the calendar. The next crawl retries.
    reportFailure({
      event: 'derive-artists.adjudicator_failed',
      severity: 'warn',
      title: event.title,
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      headliners: [],
      supportingArtists: [],
      isConcert: true,
      adjudicated: false,
    }
  }
}

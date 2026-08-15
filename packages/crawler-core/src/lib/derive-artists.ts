import { reportFailure } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../types.js'

export interface DerivedArtists {
  /**
   * NULL is the ladder reaching NO verdict — only the adjudicator-outage path
   * produces it, and the upsert reads it as "keep what is stored". An empty
   * array is the opposite: a verdict that nobody is billed.
   */
  headliners: string[] | null
  supportingArtists: string[] | null
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

/**
 * True when the ladder would fall through to the adjudicator — no usable
 * observation, so only the LLM can answer. Callers cache verdicts on this:
 * reusing one when the extraction DOES name somebody would ignore a source
 * that newly started emitting a performer field, and keep projecting the older
 * LLM answer forever. Exported so the reuse gate cannot drift from step 1.
 */
export function wouldAdjudicate(event: {
  title: string
  observedPerformers?: string[]
  isConcert?: boolean
}): boolean {
  if (event.isConcert === false) return false
  const headliner = (event.observedPerformers ?? []).filter(
    (name) => name.trim().length > 0,
  )[0]
  if (headliner === undefined) return true
  return isSuspiciousObservation(headliner, event.title)
}

export async function deriveArtists(
  event: Pick<NormalizedEvent, 'title' | 'description'> & {
    // Typed optional even though `NormalizedEvent` declares it required: the
    // same hazard `rawTitle` has in crawl.ts. A path that forgets to report
    // observations must escalate, not throw and take the whole run to
    // `failed`.
    observedPerformers?: string[]
    observedSupportingArtists?: string[]
    // Only the LLM path and Ticketure emit this. `undefined` means "nobody
    // ruled", which is most of the catalogue and must not read as a negative.
    isConcert?: boolean
  },
  adjudicate: Adjudicator,
): Promise<DerivedArtists> {
  // Step 0 — an extractor that already read the page and said "not a concert"
  // outranks every step below it. Re-adjudicating would spend a call to
  // second-guess a verdict made with more context than a title, and echoing
  // the observed performer would put a bingo night in the artists projection.
  if (event.isConcert === false) {
    return {
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: false,
    }
  }

  const nonEmpty = (names: string[] | undefined): string[] =>
    (names ?? []).filter((name) => name.trim().length > 0)

  const observed = nonEmpty(event.observedPerformers)
  const headliner = observed[0]

  // Step 1 — the source named somebody, and it does not merely echo the title.
  // This is the venue's own structured field; an LLM re-reading the page title
  // is strictly downstream of it, and re-deriving here would make each event's
  // artist nondeterministic across nightly crawls.
  if (
    headliner !== undefined &&
    !isSuspiciousObservation(headliner, event.title)
  ) {
    // The whole observed headline bill, not just its first element — a
    // co-headline set (#1203) is a real reading of the page and demoting its
    // second act to an opener would lose it.
    return {
      headliners: observed,
      supportingArtists: nonEmpty(event.observedSupportingArtists),
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
    // Observed openers survive adjudication rather than being replaced by it.
    // The adjudicator only ever reads title + description, so an extractor that
    // found openers in a field it does NOT read (Ticketure's `supportingActs`,
    // which sits outside the description it never populates) holds the only
    // record of them. Taking the verdict wholesale here would delete that.
    //
    // The verdict leads: it is the answer to the question actually asked. An
    // observed name that the adjudicator promoted to the headline bill is
    // dropped rather than listed twice under two different roles.
    const headlinerKeys = new Set(
      verdict.headliners.map((name) => name.trim().toLowerCase()),
    )
    const supportingArtists: string[] = []
    const seen = new Set<string>()
    for (const name of [
      ...verdict.supportingArtists,
      ...nonEmpty(event.observedSupportingArtists),
    ]) {
      const key = name.trim().toLowerCase()
      if (key === '' || headlinerKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      supportingArtists.push(name.trim())
    }
    return {
      headliners: verdict.headliners,
      supportingArtists,
      isConcert: verdict.isConcert,
      adjudicated: true,
    }
  } catch (err) {
    // Step 3 — an adjudicator outage must not become a wrong answer, and must
    // not become a WRITE either. Returning an empty set here would read as a
    // verdict of "nobody is billed" and overwrite a correct stored bill,
    // de-projecting its artists until a later crawl happened to succeed. NULL
    // is the no-verdict signal the upsert preserves the stored columns on.
    // `isConcert` stays true so a transient Haiku failure never hides a real
    // show from the calendar. The next crawl retries.
    reportFailure({
      event: 'derive-artists.adjudicator_failed',
      severity: 'warn',
      title: event.title,
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      headliners: null,
      supportingArtists: null,
      isConcert: true,
      adjudicated: false,
    }
  }
}

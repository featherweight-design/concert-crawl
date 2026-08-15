export interface NormalizedEvent {
  title: string
  /**
   * EXACT verbatim copy of the source listing's headline string, byte-for-byte
   * unmodified. The LLM extractor in particular tends to strip listing
   * decoration ("AEG Presents", "AT MISSION BALLROOM") when populating
   * `title`; those decorations are exactly what the cross-venue presale
   * filter (`detectCrossVenuePresale`, issue #605) needs to detect that the
   * listing names a different host venue. Set `rawTitle = title` from
   * structured-data and platform-JSON extractors — they never decorate.
   * See issue #826.
   */
  rawTitle: string
  /**
   * The event's DISPLAY string, and nothing more. It is what the calendar row
   * reads and it feeds `canonical_artist`, the live dedup key, so it is always
   * a non-empty string even for a bingo night. It is NOT a claim that a
   * performer was identified — read `observedPerformers` for that.
   */
  artist: string
  /**
   * Performer names the SOURCE actually stated as headlining, verbatim and in
   * billing order, before any derivation. Empty means the listing named
   * nobody, which is a real and common answer: a bingo night names no
   * performer, and so does a page that only carries a title.
   *
   * Extractors populate this from their own structured performer field
   * (`performer[]`, `announceArtists`, `headlinersText`, `artistNames`) and
   * NEVER from the title. Copying the title in here is the exact bug this
   * field exists to end — it produced 222 junk artist rows. Deciding what the
   * headline bill IS from these observations is `deriveArtists()`'s job, not
   * an extractor's.
   *
   * Most sources expose one headliner and cannot tell a co-headline bill from
   * a support slot, so they report a single element here and put the rest in
   * `observedSupportingArtists`. Only the LLM extractor reads billing
   * emphasis well enough to report more than one — which is where #1203's
   * co-headliner sets come from, and why the split is carried on the
   * observation rather than flattened into one list.
   */
  observedPerformers: string[]
  /**
   * Opening / supporting acts the SOURCE stated, in billing order, excluding
   * everything in `observedPerformers`. Same rules: verbatim, never the title.
   */
  observedSupportingArtists: string[]
  /**
   * Every act headlining the bill, in billing order. Populated by
   * `deriveArtists()` from `observedPerformers`, and empty when the event
   * names no performer at all.
   *
   * ⚠️ The old `headliners[0] === artist` invariant (#1203) NO LONGER HOLDS.
   * It assumed `artist` was always a derived performer; `artist` is now purely
   * a display string, so a bingo night has a populated `artist` and an empty
   * `headliners`. Anything reading this to mean "the artist" must handle the
   * empty case rather than indexing [0].
   *
   * Multiple headliners are never derived by splitting a string on
   * punctuation — band names legitimately contain '&', 'and' and '+'.
   */
  headliners?: string[]
  supportingArtists?: string[]
  tourName?: string | null
  date: string
  doorsTime?: string
  showTime?: string
  ticketUrl?: string
  /**
   * The per-event detail page URL on the source venue site (e.g.
   * `https://www.redrocksonline.com/events/griz-1489047/`). Distinct from
   * `ticketUrl` (the purchase link) and `sourceUrl` (the crawled index page).
   * Used as the "Get tickets" fallback when a listing has no direct ticket
   * link, so users land on the specific event rather than the venue's
   * generic events index (#1152). Deriving the deeper AXS purchase URL from
   * this slug is a follow-up (#1153).
   */
  eventUrl?: string
  description?: string
  imageUrl?: string
  sourceUrl: string
  confidence: number
  isConcert?: boolean
  reviewNeeded?: boolean
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export interface LLMResult {
  events: NormalizedEvent[]
  usage: TokenUsage
}

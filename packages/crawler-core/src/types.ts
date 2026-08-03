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
  artist: string
  /**
   * Every act headlining the bill, in billing order, INCLUDING the primary
   * act in `artist` — the invariant is `headliners[0] === artist` (#1203).
   * Only the LLM extractor decides what constitutes a headliner; the crawler
   * falls back to `[artist]` when this is absent or empty and NEVER derives
   * multiple headliners by splitting a string on punctuation (band names
   * legitimately contain '&', 'and' and '+').
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

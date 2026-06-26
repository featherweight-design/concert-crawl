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
  date: string
  doorsTime?: string
  showTime?: string
  ticketUrl?: string
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

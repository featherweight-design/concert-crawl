export interface NormalizedEvent {
  title: string
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

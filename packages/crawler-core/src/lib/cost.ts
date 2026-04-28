import type { TokenUsage } from '../types.js'

// Haiku pricing sourced from Anthropic pricing page at time of implementation.
// If pricing changes, update these constants manually — historical cost_tracking
// rows are not retroactively updated.
const INPUT_COST_PER_TOKEN = 0.8 / 1_000_000
const OUTPUT_COST_PER_TOKEN = 4.0 / 1_000_000
const CACHE_READ_COST_PER_TOKEN = 0.08 / 1_000_000
const CACHE_WRITE_COST_PER_TOKEN = 1.0 / 1_000_000

export function calculateCost(usage: TokenUsage): number {
  return (
    usage.inputTokens * INPUT_COST_PER_TOKEN +
    usage.outputTokens * OUTPUT_COST_PER_TOKEN +
    usage.cacheReadTokens * CACHE_READ_COST_PER_TOKEN +
    usage.cacheWriteTokens * CACHE_WRITE_COST_PER_TOKEN
  )
}

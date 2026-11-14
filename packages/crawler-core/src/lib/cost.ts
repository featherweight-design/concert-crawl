import type { TokenUsage } from '../types.js';

// Per-token rates for every Claude model id this repo calls, keyed by the exact
// id the call sends. Source: the claude-api skill's pricing (2026-11-03 cache):
// Claude Haiku 4.5 is $1 input / $5 output per million tokens; cache reads are
// 0.1x input and 5-minute cache writes 1.25x input. Every call here caches with
// `cache_control: { type: 'ephemeral' }`, the 5-minute TTL, so the 1.25x write
// rate applies (a 1-hour TTL would be 2x and need its own entry).
//
// Rows written before this table existed were priced at fixed Haiku 3.5 rates
// ($0.80 in, $4 out, $0.08 cache read, $1.00 cache write per million) even
// though the calls were Haiku 4.5, so those cost_tracking rows and
// crawl_runs.llm_cost_usd values understate spend. They are not rewritten.
// When a rate changes, update it here; history stays at the rate it was
// written with.
const perMillion = (usd: number): number => usd / 1_000_000;

interface ModelRates {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const HAIKU_4_5_RATES: ModelRates = {
  input: perMillion(1),
  output: perMillion(5),
  cacheRead: perMillion(0.1),
  cacheWrite: perMillion(1.25),
};

export const MODEL_RATES = {
  // The alias (the admin generate-about route) and the dated snapshot it
  // points to (the crawler's extractor, adjudicator and genre tagger).
  'claude-haiku-4-5': HAIKU_4_5_RATES,
  'claude-haiku-4-5-20251001': HAIKU_4_5_RATES,
} as const satisfies Record<string, ModelRates>;

export type PricedModelId = keyof typeof MODEL_RATES;

/**
 * The dollar cost of one call's usage at `model`'s rates.
 *
 * `model` is typed to the priced ids, so an unpriced model is a compile error
 * rather than a cost of zero or another model's rate. Every caller passes the
 * constant its call sends (llm-models.ts), never an untyped string.
 */
export function calculateCost(usage: TokenUsage, model: PricedModelId): number {
  const rates = MODEL_RATES[model];
  return (
    usage.inputTokens * rates.input +
    usage.outputTokens * rates.output +
    usage.cacheReadTokens * rates.cacheRead +
    usage.cacheWriteTokens * rates.cacheWrite
  );
}

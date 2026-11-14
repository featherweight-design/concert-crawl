// The one way an LLM caller records its spend to cost_tracking.
//
// The monthly LLM budget (llm-budget.ts) sums cost_tracking only for the
// services named in LLM_SERVICES, an allow-list rather than an exclude list:
// cost_tracking is a general cost ledger (its schema names 'render' as an
// intended service), and a non-LLM row counted as LLM spend could trip "If it
// runs out" and cut LLM extraction for venues that need it. A new LLM caller
// adds its service here and writes through recordLlmCost, so its cost is
// priced at the model's rates and counted in the budget from its first row.
// A guard test fails on any other direct insert into cost_tracking.
//
// The crawl's extraction call is deliberately NOT here. crawl.ts writes a
// 'claude' cost_tracking row, but the same dollars are already in
// crawl_runs.llm_cost_usd, which the budget sums on its own; listing 'claude'
// would count every extraction twice.

import { costTracking, db } from '@concert-crawl/db';
import type { TokenUsage } from '../types.js';
import { calculateCost, type PricedModelId } from './cost.js';

/** Every cost_tracking service that records LLM spend. */
export const LLM_SERVICES = [
  // The crawler's genre tagger.
  'genre-tagger',
  // The admin's generate-about route (venue About drafts).
  'venue-about',
  // The crawler's artist adjudicator. Reserved: nothing writes it yet
  // (adjudicateEvent drops its usage); the adjudication-cost PR wires it.
  'artist-adjudication',
] as const;

export type LlmService = (typeof LLM_SERVICES)[number];

export interface RecordLlmCostInput {
  service: LlmService;
  usage: TokenUsage;
  /** The model id the call sent, so the cost uses that model's rates. */
  model: PricedModelId;
  /** Caller context stored with the row; the token counts are merged in. */
  metadata?: Record<string, unknown>;
}

/**
 * Prices one LLM call's usage at its model's rates, writes the cost_tracking
 * row, and returns the dollar cost.
 */
export async function recordLlmCost({
  service,
  usage,
  model,
  metadata = {},
}: RecordLlmCostInput): Promise<number> {
  const costUsd = calculateCost(usage, model);
  await db.insert(costTracking).values({
    service,
    costUsd: costUsd.toFixed(6),
    tokensUsed: String(usage.inputTokens + usage.outputTokens),
    metadata: JSON.stringify({ ...metadata, ...usage }),
  });
  return costUsd;
}

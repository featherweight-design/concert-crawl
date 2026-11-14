import type { TokenUsage } from '../types.js';
import type { Adjudicator } from './derive-artists.js';
import { calculateCost } from './cost.js';
import {
  AdjudicationResponseError,
  adjudicateEventWithUsage,
} from './extractors/llm.js';
import { LLM_EXTRACTION_MODEL } from './llm-models.js';
import { recordLlmCost } from './record-llm-cost.js';

// Artist adjudication's LLM spend, summed over a batch of calls and written as
// one 'artist-adjudication' cost_tracking row.
//
// One row per batch, not per call: a crawl escalates per event, so a venue
// with a churned listing could write dozens of rows a night for what is one
// line of spend. The crawl makes one tracker per venue crawl and records it
// once, in crawlVenue's `finally`, so the row carries that run's crawlRunId and
// is written whether the crawl succeeds or fails after adjudicating. The
// rederive script makes one per pass.
//
// These dollars go ONLY to this row. They are never added to
// crawl_runs.llm_cost_usd or to crawl.ts's 'claude' row (both extraction
// only), so the monthly budget, which sums crawl_runs plus LLM_SERVICES rows,
// counts each adjudication dollar exactly once.

export interface AdjudicationCost {
  /**
   * An Adjudicator that adds each billed call's usage to the batch, including
   * a call whose answer was malformed (AdjudicationResponseError), which it
   * then rethrows.
   */
  adjudicate: Adjudicator;
  /** Calls whose usage was added so far. */
  readonly calls: number;
  /** The batch's dollar cost so far, at the adjudicator model's rates. */
  readonly costUsd: number;
  /**
   * Writes the batch's row and returns its dollar cost, or null when there
   * was nothing to write or the write failed. Never throws: losing a ledger
   * line must not fail the crawl or the pass that spent it. Writes at most
   * once.
   */
  record: (metadata: Record<string, unknown>) => Promise<number | null>;
}

export function createAdjudicationCost(): AdjudicationCost {
  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  let calls = 0;
  let recorded = false;

  const add = (callUsage: TokenUsage): void => {
    usage.inputTokens += callUsage.inputTokens;
    usage.outputTokens += callUsage.outputTokens;
    usage.cacheReadTokens += callUsage.cacheReadTokens;
    usage.cacheWriteTokens += callUsage.cacheWriteTokens;
    calls += 1;
  };

  return {
    adjudicate: async (input) => {
      try {
        const { verdict, usage: callUsage } =
          await adjudicateEventWithUsage(input);
        add(callUsage);
        return verdict;
      } catch (err) {
        if (err instanceof AdjudicationResponseError) add(err.usage);
        throw err;
      }
    },
    get calls() {
      return calls;
    },
    get costUsd() {
      // The adjudicator sends the extractor's model (extractors/llm.ts).
      return calculateCost(usage, LLM_EXTRACTION_MODEL);
    },
    record: async (metadata) => {
      if (recorded || calls === 0) return null;
      recorded = true;
      try {
        return await recordLlmCost({
          service: 'artist-adjudication',
          usage: { ...usage },
          // The adjudicator sends the extractor's model (extractors/llm.ts).
          model: LLM_EXTRACTION_MODEL,
          metadata: { ...metadata, calls },
        });
      } catch (err) {
        console.warn(
          // The usage and dollars go in the line so a lost row can be
          // re-entered by hand from the log.
          JSON.stringify({
            event: 'crawler.adjudication_cost_record_failed',
            ...metadata,
            calls,
            usage,
            costUsd: calculateCost(usage, LLM_EXTRACTION_MODEL),
            error: String(err),
          }),
        );
        return null;
      }
    },
  };
}

// The admin's monthly LLM budget, as the crawler acts on it (admin redesign
// 1c, gap G8b). Read once per crawl run, never per venue.
//
// "If it runs out" (admin_settings.llm_budget_fallback_to_structured):
// - off (the default, Hugh 2026-11-12): keep extracting with Haiku past the
//   budget, and warn.
// - on: skip the Haiku step of the cascade. A venue with no structured data
//   then fails as an account-wide condition (classed llm_quota), which never
//   counts toward its three strikes.
//
// Month-to-date spend is the same source the admin cost tile sums
// (crawl_runs.llm_cost_usd), bucketed by the Mountain Time calendar, from the
// first of the current MT month.

import { sql } from 'drizzle-orm';
import { adminSettings, crawlRuns, db } from '@concert-crawl/db';

export interface LlmBudgetStatus {
  /** null when no budget is set: the crawl never stops for it. */
  budgetUsd: number | null;
  /** LLM spend this Mountain Time month, from crawl_runs. */
  spentUsd: number;
  /** "If it runs out" switched on: skip the LLM once the budget is spent. */
  stopWhenSpent: boolean;
}

/** What the cascade does at its LLM step under this budget. */
export type LlmBudgetVerdict = 'under' | 'over_continue' | 'over_stop';

export function llmBudgetVerdict(
  status: LlmBudgetStatus | null,
): LlmBudgetVerdict {
  if (status === null || status.budgetUsd === null) return 'under';
  // Spending exactly the budget is running out of it.
  if (status.spentUsd < status.budgetUsd) return 'under';
  return status.stopWhenSpent ? 'over_stop' : 'over_continue';
}

const formatUsd = (value: number): string => `$${value.toFixed(2)}`;

/**
 * Thrown at the cascade's LLM step when the budget is spent and "If it runs
 * out" is on. Its message matches the llm_quota class, so crawl.ts records it
 * as account-wide (reason llm_account) and never as a venue strike.
 */
export class LlmBudgetSpentError extends Error {
  constructor(status: LlmBudgetStatus, finalUrl: string) {
    super(
      `No structured data at ${finalUrl}, and the monthly LLM budget is spent ` +
        `(${formatUsd(status.spentUsd)} of ${formatUsd(status.budgetUsd ?? 0)}), ` +
        'so LLM extraction was skipped',
    );
    this.name = 'LlmBudgetSpentError';
  }
}

/** The settings row and this month's spend. One read per crawl run. */
export async function readLlmBudgetStatus(): Promise<LlmBudgetStatus> {
  const [settings] = await db
    .select({
      budgetUsd: adminSettings.llmMonthlyBudgetUsd,
      stopWhenSpent: adminSettings.llmBudgetFallbackToStructured,
    })
    .from(adminSettings)
    .limit(1);
  // No row means every setting is at its default: no budget, switch off.
  const budgetUsd =
    settings?.budgetUsd == null ? null : Number(settings.budgetUsd);
  const stopWhenSpent = settings?.stopWhenSpent ?? false;
  if (budgetUsd === null) {
    return { budgetUsd, spentUsd: 0, stopWhenSpent };
  }

  // The start of the current Mountain Time month as an instant, so the filter
  // is a plain range on created_at.
  const [spend] = await db
    .select({
      spentUsd: sql<number>`coalesce(sum(${crawlRuns.llmCostUsd}), 0)`,
    })
    .from(crawlRuns)
    .where(
      sql`${crawlRuns.createdAt} >= (date_trunc('month', now() AT TIME ZONE 'America/Denver') AT TIME ZONE 'America/Denver')`,
    );
  return { budgetUsd, spentUsd: Number(spend?.spentUsd ?? 0), stopWhenSpent };
}

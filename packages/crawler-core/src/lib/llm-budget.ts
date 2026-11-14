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
// Month-to-date spend is extraction cost (crawl_runs.llm_cost_usd, what the
// admin cost tile sums) plus the cost_tracking rows of the services in
// LLM_SERVICES (artist adjudication, genre tagging, venue About drafts), from
// the first of the current Mountain Time month. On, the
// switch also skips adjudication and genre tagging, so no Haiku call is made
// at all.
//
// Only LLM_SERVICES count: cost_tracking also holds non-LLM costs (Spotify's
// zero-dollar rows, and 'render' by its schema), and any of those counted as
// LLM spend could trip the switch and cut extraction. A new LLM caller writes
// through recordLlmCost with a service in LLM_SERVICES, which is what makes it
// count here (record-llm-cost.ts).

import { and, inArray, sql } from 'drizzle-orm';
import { adminSettings, costTracking, crawlRuns, db } from '@concert-crawl/db';
import { LLM_SERVICES } from './record-llm-cost.js';

export interface LlmBudgetStatus {
  /** null when no budget is set: the crawl never stops for it. */
  budgetUsd: number | null;
  /** LLM spend this Mountain Time month, from crawl_runs and cost_tracking. */
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

  // The start of the current Mountain Time month as an instant, so each filter
  // is a plain range on its timestamp.
  const monthStart = sql`(date_trunc('month', now() AT TIME ZONE 'America/Denver') AT TIME ZONE 'America/Denver')`;
  const [extraction] = await db
    .select({
      spentUsd: sql<number>`coalesce(sum(${crawlRuns.llmCostUsd}), 0)`,
    })
    .from(crawlRuns)
    .where(sql`${crawlRuns.createdAt} >= ${monthStart}`);
  // LLM callers other than extraction record to cost_tracking through
  // recordLlmCost rather than to a run. The extraction call's own 'claude' row
  // is left out: its dollars are already in crawl_runs, summed above.
  const [otherLlm] = await db
    .select({
      spentUsd: sql<number>`coalesce(sum(${costTracking.costUsd}), 0)`,
    })
    .from(costTracking)
    .where(
      and(
        inArray(costTracking.service, [...LLM_SERVICES]),
        sql`${costTracking.recordedAt} >= ${monthStart}`,
      ),
    );
  const spentUsd =
    Number(extraction?.spentUsd ?? 0) + Number(otherLlm?.spentUsd ?? 0);
  return { budgetUsd, spentUsd, stopWhenSpent };
}

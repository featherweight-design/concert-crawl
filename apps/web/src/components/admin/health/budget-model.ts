import type { AdminSettings } from '@concert-crawl/types';

/**
 * The most the API accepts for a monthly budget
 * (`MAX_LLM_MONTHLY_BUDGET_USD` in the settings route). Checked here only so
 * the field can say so before the request; the API still decides.
 */
export const MAX_BUDGET_USD = 1000;

/** The three settings the budget panel owns. */
export type BudgetDraft = Pick<
  AdminSettings,
  | 'llmMonthlyBudgetUsd'
  | 'llmBudgetWarnAtPercent'
  | 'llmBudgetFallbackToStructured'
>;

export type ParsedBudget = { ok: true; value: number | null } | { ok: false };

/**
 * The budget field's text as the PATCH wants it: "$25", "25" or "25.50" are
 * dollars, empty means no budget (null), anything else (zero, negative, over
 * the cap, more than cents, text) is refused.
 */
export const parseBudget = (raw: string): ParsedBudget => {
  const text = raw.trim().replace(/^\$/, '').replace(/,/g, '').trim();
  if (text === '') return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false };
  const value = Number(text);
  return value > 0 && value <= MAX_BUDGET_USD
    ? { ok: true, value }
    : { ok: false };
};

/** The keys that changed, so the PATCH carries only what the admin touched. */
export const budgetPatch = (
  saved: BudgetDraft,
  next: BudgetDraft,
): Partial<BudgetDraft> => ({
  ...(saved.llmMonthlyBudgetUsd !== next.llmMonthlyBudgetUsd && {
    llmMonthlyBudgetUsd: next.llmMonthlyBudgetUsd,
  }),
  ...(saved.llmBudgetWarnAtPercent !== next.llmBudgetWarnAtPercent && {
    llmBudgetWarnAtPercent: next.llmBudgetWarnAtPercent,
  }),
  ...(saved.llmBudgetFallbackToStructured !==
    next.llmBudgetFallbackToStructured && {
    llmBudgetFallbackToStructured: next.llmBudgetFallbackToStructured,
  }),
});

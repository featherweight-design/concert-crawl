import { describe, it, expect } from 'vitest';
import {
  LlmBudgetSpentError,
  llmBudgetVerdict,
  type LlmBudgetStatus,
} from './llm-budget.js';
import { classifyCrawlError, isAccountWideKind } from './crawl-error-class.js';

const status = (overrides: Partial<LlmBudgetStatus>): LlmBudgetStatus => ({
  budgetUsd: 20,
  spentUsd: 5,
  stopWhenSpent: false,
  ...overrides,
});

describe('llmBudgetVerdict', () => {
  it('is under when the budget was never read', () => {
    expect(llmBudgetVerdict(null)).toBe('under');
  });

  it('is under when no budget is set, however much was spent', () => {
    expect(
      llmBudgetVerdict(
        status({ budgetUsd: null, spentUsd: 999, stopWhenSpent: true }),
      ),
    ).toBe('under');
  });

  it('is under below the budget', () => {
    expect(
      llmBudgetVerdict(status({ spentUsd: 19.99, stopWhenSpent: true })),
    ).toBe('under');
  });

  it('keeps going past the budget with "If it runs out" off', () => {
    expect(llmBudgetVerdict(status({ spentUsd: 25 }))).toBe('over_continue');
  });

  it('stops at exactly the budget with "If it runs out" on', () => {
    expect(
      llmBudgetVerdict(status({ spentUsd: 20, stopWhenSpent: true })),
    ).toBe('over_stop');
  });
});

describe('LlmBudgetSpentError', () => {
  it('classes as an account-wide quota failure, never a venue strike', () => {
    const err = new LlmBudgetSpentError(
      status({ spentUsd: 21.5, stopWhenSpent: true }),
      'https://venue.example.com/events',
    );
    const { kind, key } = classifyCrawlError(String(err));
    expect(kind).toBe('llm_quota');
    // One key across venues, so the run-level alert groups them.
    expect(key).toBe('llm_quota');
    expect(isAccountWideKind(kind)).toBe(true);
    expect(err.message).toContain('$21.50 of $20.00');
  });
});

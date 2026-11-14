import { describe, it, expect } from 'vitest';
import { areaOfAction, areaOfAuditRow } from './audit-area.js';

const SETTINGS: {
  llmMonthlyBudgetUsd: number | null;
  llmBudgetWarnAtPercent: number;
  llmBudgetFallbackToStructured: boolean;
  approvePricesMyself: boolean;
} = {
  llmMonthlyBudgetUsd: 20,
  llmBudgetWarnAtPercent: 80,
  llmBudgetFallbackToStructured: false,
  approvePricesMyself: false,
};

const save = (changes: Partial<typeof SETTINGS>) => ({
  action: 'settings.update',
  metadata: { before: SETTINGS, after: { ...SETTINGS, ...changes } },
});

describe('areaOfAuditRow', () => {
  it('files a save that only flipped the Prices toggle under Prices', () => {
    expect(areaOfAuditRow(save({ approvePricesMyself: true }))).toBe('prices');
  });

  it('files an LLM budget save under Health', () => {
    expect(areaOfAuditRow(save({ llmMonthlyBudgetUsd: 50 }))).toBe('health');
    expect(areaOfAuditRow(save({ llmMonthlyBudgetUsd: null }))).toBe('health');
    expect(areaOfAuditRow(save({ llmBudgetWarnAtPercent: 90 }))).toBe('health');
    expect(areaOfAuditRow(save({ llmBudgetFallbackToStructured: true }))).toBe(
      'health',
    );
  });

  it('files a save that changed both under Health', () => {
    expect(
      areaOfAuditRow(
        save({ approvePricesMyself: true, llmMonthlyBudgetUsd: 50 }),
      ),
    ).toBe('health');
  });

  it('files a save that changed nothing under Health', () => {
    expect(areaOfAuditRow(save({}))).toBe('health');
  });

  it.each([
    ['null', null],
    ['a string', 'approvePricesMyself'],
    ['an array', [{ approvePricesMyself: true }]],
    ['no before', { after: { approvePricesMyself: true } }],
    ['no after', { before: { approvePricesMyself: false } }],
    [
      'a non-object before',
      { before: null, after: { approvePricesMyself: true } },
    ],
    [
      'an array after',
      { before: { approvePricesMyself: false }, after: [true] },
    ],
  ])('files a save with %s metadata under Health', (_label, metadata) => {
    expect(areaOfAuditRow({ action: 'settings.update', metadata })).toBe(
      'health',
    );
  });

  it('reads every other action by its prefix, metadata or not', () => {
    const toggled = save({ approvePricesMyself: true }).metadata;
    expect(areaOfAuditRow({ action: 'venue.update', metadata: toggled })).toBe(
      'venues',
    );
    expect(areaOfAuditRow({ action: 'price.promoted', metadata: null })).toBe(
      'prices',
    );
    expect(areaOfAuditRow({ action: 'mystery', metadata: null })).toBeNull();
    expect(areaOfAction('settings.update')).toBe('health');
  });
});

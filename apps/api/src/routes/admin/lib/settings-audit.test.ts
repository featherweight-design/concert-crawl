import { describe, it, expect } from 'vitest';
import {
  PRICE_SETTINGS_UPDATE_ACTION,
  SETTINGS_UPDATE_ACTION,
  settingsSaveAction,
} from './settings-audit.js';

describe('settingsSaveAction', () => {
  it('audits a patch of Prices settings only as a Prices save', () => {
    expect(settingsSaveAction(['approvePricesMyself'])).toBe(
      PRICE_SETTINGS_UPDATE_ACTION,
    );
  });

  it('audits a budget patch as a Health save', () => {
    expect(settingsSaveAction(['llmMonthlyBudgetUsd'])).toBe(
      SETTINGS_UPDATE_ACTION,
    );
    expect(
      settingsSaveAction([
        'llmBudgetWarnAtPercent',
        'llmBudgetFallbackToStructured',
      ]),
    ).toBe(SETTINGS_UPDATE_ACTION);
  });

  it('audits a mixed patch as a Health save', () => {
    expect(
      settingsSaveAction(['approvePricesMyself', 'llmMonthlyBudgetUsd']),
    ).toBe(SETTINGS_UPDATE_ACTION);
  });

  it('audits an empty or unknown patch as a Health save', () => {
    expect(settingsSaveAction([])).toBe(SETTINGS_UPDATE_ACTION);
    expect(settingsSaveAction(['somethingElse'])).toBe(SETTINGS_UPDATE_ACTION);
    expect(settingsSaveAction(['toString'])).toBe(SETTINGS_UPDATE_ACTION);
  });
});

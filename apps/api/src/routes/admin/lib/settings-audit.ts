import type { AdminSettings } from '@concert-crawl/types';

// What a settings save writes to the audit log, kept free of the database so
// the Activity log's area rules can read it.

/** The audit action every admin settings save writes. */
export const SETTINGS_UPDATE_ACTION = 'settings.update';

/**
 * What the settings.update audit row records: every setting toSettings
 * returns, minus the row's own bookkeeping. Built by subtraction, so a new
 * setting joins the audit without anyone remembering to add it.
 */
export type AuditedSettings = Omit<AdminSettings, 'updatedAt' | 'updatedBy'>;

/**
 * The admin page each setting is edited on. Keyed by the settings type, so a
 * new setting fails to compile until it is given a page.
 */
export const SETTING_PAGE: Readonly<
  Record<keyof AuditedSettings, 'prices' | 'health'>
> = {
  llmMonthlyBudgetUsd: 'health',
  llmBudgetWarnAtPercent: 'health',
  llmBudgetFallbackToStructured: 'health',
  approvePricesMyself: 'prices',
};

const settingKeys = (page: 'prices' | 'health'): string[] =>
  Object.entries(SETTING_PAGE)
    .filter(([, owner]) => owner === page)
    .map(([key]) => key);

export const PRICES_SETTING_KEYS: readonly string[] = settingKeys('prices');
export const HEALTH_SETTING_KEYS: readonly string[] = settingKeys('health');

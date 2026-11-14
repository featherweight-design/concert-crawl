import type { AdminSettings, AuditArea } from '@concert-crawl/types';

// What a settings save writes to the audit log, kept free of the database so
// it can be unit tested. The page a save belongs to is decided here, when it
// is written, from the settings the patch sent: the Activity log then files
// it by its action key like any other row.

/** The audit action of a settings save made on Health (the LLM budget). */
export const SETTINGS_UPDATE_ACTION = 'settings.update';

/** The audit action of a settings save made on Prices. `price.*` is Prices. */
export const PRICE_SETTINGS_UPDATE_ACTION = 'price.settings.update';

/**
 * What a settings save's audit row records: every setting toSettings
 * returns, minus the row's own bookkeeping. Built by subtraction, so a new
 * setting joins the audit without anyone remembering to add it.
 */
export type AuditedSettings = Omit<AdminSettings, 'updatedAt' | 'updatedBy'>;

/**
 * The admin page each setting is edited on. Keyed by the settings type, so a
 * new setting fails to compile until it is given a page.
 */
export const SETTING_PAGE: Readonly<Record<keyof AuditedSettings, AuditArea>> =
  {
    llmMonthlyBudgetUsd: 'health',
    llmBudgetWarnAtPercent: 'health',
    llmBudgetFallbackToStructured: 'health',
    approvePricesMyself: 'prices',
  };

const isAuditedSetting = (key: string): key is keyof AuditedSettings =>
  Object.hasOwn(SETTING_PAGE, key);

/**
 * The audit action for a patch that sent `sentKeys`: Prices when every key it
 * sent is a Prices setting, whatever their values were, and Health otherwise
 * (the budget, a mix of both, or nothing).
 */
export const settingsSaveAction = (sentKeys: readonly string[]): string =>
  sentKeys.length > 0 &&
  sentKeys.every(
    (key) => isAuditedSetting(key) && SETTING_PAGE[key] === 'prices',
  )
    ? PRICE_SETTINGS_UPDATE_ACTION
    : SETTINGS_UPDATE_ACTION;

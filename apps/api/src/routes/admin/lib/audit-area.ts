import { AUDIT_AREAS, type AuditArea } from '@concert-crawl/types';

// The Activity log's WHERE column. Mostly read off the action key, so the
// audit writers stay as they are: `venue.update` is the Venues page. Kept free
// of the database so it stays a pure function of the audit row.

/** Action key prefix (the text before the first ".") → its admin page. */
export const AUDIT_AREA_PREFIXES: Readonly<
  Record<AuditArea, readonly string[]>
> = {
  'needs-you': ['needs_you'],
  // A settings save is Health's LLM budget, unless all it changed is a Prices
  // toggle: see areaOfAuditRow. The prefix filter still files it under Health.
  health: ['settings'],
  venues: ['venue'],
  events: ['event'],
  artists: ['artist'],
  // A Price check (`contest.*`) is a tab of Prices.
  prices: ['price', 'contest'],
  // Invite codes are a tab of People.
  people: ['user', 'invite_code'],
  'feature-flags': ['feature_flag'],
  'crawl-runs': ['crawl'],
  // Feedback and the emails we send are tabs of Operations.
  operations: ['feedback', 'notification'],
};

const AREA_BY_PREFIX = new Map<string, AuditArea>(
  AUDIT_AREAS.flatMap((area) =>
    AUDIT_AREA_PREFIXES[area].map((prefix): [string, AuditArea] => [
      prefix,
      area,
    ]),
  ),
);

export const actionPrefix = (action: string): string =>
  action.split('.', 1)[0] ?? '';

export const areaOfAction = (action: string): AuditArea | null =>
  AREA_BY_PREFIX.get(actionPrefix(action)) ?? null;

export const prefixesOfAreas = (areas: readonly AuditArea[]): string[] =>
  areas.flatMap((area) => AUDIT_AREA_PREFIXES[area]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The admin settings edited on Prices rather than Health's LLM budget.
const PRICES_SETTINGS: ReadonlySet<string> = new Set(['approvePricesMyself']);

/** The settings keys whose value differs between `before` and `after`. */
const changedSettings = (metadata: unknown): string[] => {
  if (!isRecord(metadata)) return [];
  const { before, after } = metadata;
  if (!isRecord(before) || !isRecord(after)) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !Object.is(before[key], after[key]));
};

/**
 * The page an audit row belongs to. `settings.update` saves every admin
 * setting at once, so it is filed by what changed: a save that changed only
 * Prices settings is Prices, and anything else (the budget, a mix, no change,
 * or metadata it can't read) stays Health.
 */
export const areaOfAuditRow = (row: {
  action: string;
  metadata: unknown;
}): AuditArea | null => {
  if (row.action === 'settings.update') {
    const changed = changedSettings(row.metadata);
    if (changed.length > 0 && changed.every((key) => PRICES_SETTINGS.has(key)))
      return 'prices';
  }
  return areaOfAction(row.action);
};

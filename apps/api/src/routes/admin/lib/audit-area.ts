import {
  and,
  inArray,
  not,
  notInArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { AUDIT_AREAS, type AuditArea } from '@concert-crawl/types';
import {
  HEALTH_SETTING_KEYS,
  PRICES_SETTING_KEYS,
  SETTINGS_UPDATE_ACTION,
} from './settings-audit.js';

// The Activity log's WHERE column, and the `?area=` filter that must agree
// with it. Mostly read off the action key, so the audit writers stay as they
// are: `venue.update` is the Venues page. Kept free of the database client so
// the column stays a pure function of the audit row.

/** Action key prefix (the text before the first ".") → its admin page. */
export const AUDIT_AREA_PREFIXES: Readonly<
  Record<AuditArea, readonly string[]>
> = {
  'needs-you': ['needs_you'],
  // A settings save is Health's LLM budget, unless all it changed is a
  // Prices setting: see isPricesSettingsSave.
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

/** Exact action keys filed somewhere other than their prefix says. */
export const ACTION_AREA_OVERRIDES: Readonly<Record<string, AuditArea>> = {
  // One venue's crawl is only ever queued from Venues: the venue page's
  // Re-crawl (useRecrawl), the Venues bulk re-crawl and the add-venue flow
  // (lib/actions/venues.ts). `crawl.trigger_all` stays a Crawl runs action.
  'crawl.trigger': 'venues',
};

// A Map, so an action key like `toString` never reads the prototype.
const AREA_BY_ACTION = new Map<string, AuditArea>(
  Object.entries(ACTION_AREA_OVERRIDES),
);

const overriddenActions = (keep: (area: AuditArea) => boolean): string[] =>
  [...AREA_BY_ACTION]
    .filter(([, area]) => keep(area))
    .map(([action]) => action);

export const areaOfAction = (action: string): AuditArea | null =>
  AREA_BY_ACTION.get(action) ??
  AREA_BY_PREFIX.get(actionPrefix(action)) ??
  null;

export const prefixesOfAreas = (areas: readonly AuditArea[]): string[] =>
  areas.flatMap((area) => AUDIT_AREA_PREFIXES[area]);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A settings save that changed a Prices setting and left every Health
 * setting as it was. Anything else (the budget, a mix, no change, or metadata
 * it can't read) is Health's. Mirrored in SQL by pricesSettingsSaveSql.
 */
const isPricesSettingsSave = (action: string, metadata: unknown): boolean => {
  if (action !== SETTINGS_UPDATE_ACTION || !isRecord(metadata)) return false;
  const { before, after } = metadata;
  if (!isRecord(before) || !isRecord(after)) return false;
  const same = (key: string): boolean => Object.is(before[key], after[key]);
  return (
    PRICES_SETTING_KEYS.some((key) => !same(key)) &&
    HEALTH_SETTING_KEYS.every(same)
  );
};

/** The page an audit row belongs to: the Activity log's WHERE column. */
export const areaOfAuditRow = (row: {
  action: string;
  metadata: unknown;
}): AuditArea | null =>
  isPricesSettingsSave(row.action, row.metadata)
    ? 'prices'
    : areaOfAction(row.action);

interface AuditColumns {
  action: SQLWrapper;
  metadata: SQLWrapper;
}

// isPricesSettingsSave in SQL. A missing key reads as SQL NULL and a JSON
// null as 'null', so `IS DISTINCT FROM` tells them apart as Object.is does.
// Never NULL itself, so NOT of it is safe.
const pricesSettingsSaveSql = ({ action, metadata }: AuditColumns): SQL => {
  const before = sql`(${metadata} -> 'before')`;
  const after = sql`(${metadata} -> 'after')`;
  const differs = (key: string): SQL =>
    sql`${before} -> ${key}::text IS DISTINCT FROM ${after} -> ${key}::text`;
  const same = (key: string): SQL =>
    sql`${before} -> ${key}::text IS NOT DISTINCT FROM ${after} -> ${key}::text`;
  return sql`coalesce(${sql.join(
    [
      sql`${action} = ${SETTINGS_UPDATE_ACTION}`,
      sql`jsonb_typeof(${before}) = 'object'`,
      sql`jsonb_typeof(${after}) = 'object'`,
      sql`(${sql.join(PRICES_SETTING_KEYS.map(differs), sql` OR `)})`,
      ...HEALTH_SETTING_KEYS.map(same),
    ],
    sql` AND `,
  )}, false)`;
};

/** The `?area=` filter: rows whose areaOfAuditRow is one of `areas`. */
export const auditAreaFilter = (
  areas: readonly AuditArea[],
  columns: AuditColumns,
): SQL | undefined => {
  const pricesSave = pricesSettingsSaveSql(columns);
  // Overridden actions join their own area and leave their prefix's.
  const overriddenIn = overriddenActions((area) => areas.includes(area));
  const overriddenOut = overriddenActions((area) => !areas.includes(area));
  return or(
    areas.includes('prices') ? pricesSave : undefined,
    overriddenIn.length > 0 ? inArray(columns.action, overriddenIn) : undefined,
    and(
      not(pricesSave),
      overriddenOut.length > 0
        ? notInArray(columns.action, overriddenOut)
        : undefined,
      inArray(
        sql`split_part(${columns.action}, '.', 1)`,
        prefixesOfAreas(areas),
      ),
    ),
  );
};

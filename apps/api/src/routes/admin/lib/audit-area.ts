import {
  and,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { AUDIT_AREAS, type AuditArea } from '@concert-crawl/types';

// The Activity log's WHERE column, and the `?area=` filter that must agree
// with it. Read off the action key alone: `venue.update` is the Venues page.
// Kept free of the database client so it can be unit tested.

/** Action key prefix (the text before the first ".") → its admin page. */
export const AUDIT_AREA_PREFIXES: Readonly<
  Record<AuditArea, readonly string[]>
> = {
  'needs-you': ['needs_you'],
  // A settings save made on Health (the LLM budget). One made on Prices is
  // written as `price.settings.update`: see settings-audit.ts.
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
  // A test re-crawl is queued from the paused venue's page.
  'crawl.trigger_trial': 'venues',
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

const prefixesOfAreas = (areas: readonly AuditArea[]): string[] =>
  areas.flatMap((area) => AUDIT_AREA_PREFIXES[area]);

/** The `?area=` filter: rows whose areaOfAction is one of `areas`. */
export const auditAreaFilter = (
  areas: readonly AuditArea[],
  action: SQLWrapper,
): SQL | undefined => {
  // Overridden actions join their own area and leave their prefix's.
  const overriddenIn = overriddenActions((area) => areas.includes(area));
  const overriddenOut = overriddenActions((area) => !areas.includes(area));
  return or(
    overriddenIn.length > 0 ? inArray(action, overriddenIn) : undefined,
    and(
      overriddenOut.length > 0 ? notInArray(action, overriddenOut) : undefined,
      inArray(sql`split_part(${action}, '.', 1)`, prefixesOfAreas(areas)),
    ),
  );
};

import { eq, inArray } from 'drizzle-orm';
import {
  artists,
  db,
  eventReports,
  events,
  inviteCodes,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db';
import { FEATURE_FLAGS, isFeatureFlagKey } from '@concert-crawl/entitlements';
import { createLogger } from '@concert-crawl/logger';
import { type AuditTarget, type AuditTargetKind } from '@concert-crawl/types';
import { actionPrefix } from './audit-area.js';
import { PRICE_SETTINGS_UPDATE_ACTION } from './settings-audit.js';

// The Activity log's target links, read off the action key so the audit
// writers stay as they are: `venue.update` targets a venue id. The WHERE
// column is audit-area.ts.

// How a row's target_id is read. Mostly the prefix decides; these keys store
// a different kind of id than their prefix suggests.
type Lookup =
  | 'event'
  | 'event-report'
  | 'venue'
  | 'artist'
  | 'person'
  | 'invite-code'
  | 'feature-flag'
  | 'submission'
  | 'contest'
  | 'price-event';

interface TargetRef {
  kind: AuditTargetKind;
  lookup: Lookup;
  id: string;
}

// null: the action names no target, whatever its prefix suggests.
const LOOKUP_BY_ACTION: Readonly<Record<string, Lookup | null>> = {
  // A settings save made on Prices targets the settings row, not a price,
  // so it names no target, as `settings.update` doesn't.
  [PRICE_SETTINGS_UPDATE_ACTION]: null,
  // The crawler records a venue's merged duplicates against the venue.
  'event.drift_duplicates_merged': 'venue',
  'event.report.resolve': 'event-report',
  'crawl.trigger': 'venue',
  // Adding a price and running the pipeline are keyed by the show.
  'price.submission.admin_add': 'price-event',
  'price.pipeline.run': 'price-event',
};

const LOOKUP_BY_PREFIX: Readonly<Record<string, Lookup>> = {
  venue: 'venue',
  event: 'event',
  artist: 'artist',
  user: 'person',
  invite_code: 'invite-code',
  feature_flag: 'feature-flag',
  price: 'submission',
  // A Price check's id is its parent submission's id.
  contest: 'contest',
};

const KIND_BY_LOOKUP: Readonly<Record<Lookup, AuditTargetKind>> = {
  event: 'event',
  'event-report': 'event',
  venue: 'venue',
  artist: 'artist',
  person: 'person',
  'invite-code': 'invite-code',
  'feature-flag': 'feature-flag',
  submission: 'price',
  contest: 'price',
  'price-event': 'price',
};

const FEATURE_FLAG_TARGET_PREFIX = 'feature_flag:';

const targetRefOf = (
  action: string,
  targetId: string | null,
): TargetRef | null => {
  if (targetId === null || targetId === '') return null;
  // An action listed here wins outright, even when it maps to no lookup.
  const lookup = Object.hasOwn(LOOKUP_BY_ACTION, action)
    ? LOOKUP_BY_ACTION[action]
    : LOOKUP_BY_PREFIX[actionPrefix(action)];
  if (lookup === undefined || lookup === null) return null;
  const id =
    lookup === 'feature-flag' && targetId.startsWith(FEATURE_FLAG_TARGET_PREFIX)
      ? targetId.slice(FEATURE_FLAG_TARGET_PREFIX.length)
      : targetId;
  return { kind: KIND_BY_LOOKUP[lookup], lookup, id };
};

// Some writers store a non-uuid in target_id (and old test rows do too); a
// uuid column compared with one errors, so those ids are never queried.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Named {
  name: string | null;
  href: string;
}

const editEventHref = (eventId: string): string =>
  `/admin/events/${encodeURIComponent(eventId)}/edit`;

const PRICES_SUBMITTED_HREF = '/admin/prices?tab=submitted';
const PRICES_CHECKS_HREF = '/admin/prices?tab=checks';
const PRICES_HREF = '/admin/prices';
const ARTISTS_HREF = '/admin/artists';
const INVITE_CODES_HREF = '/admin/people/invite-codes';
const FEATURE_FLAGS_HREF = '/admin/feature-flags';

const uuidsFor = (refs: readonly TargetRef[], lookups: Lookup[]): string[] => [
  ...new Set(
    refs
      .filter((ref) => lookups.includes(ref.lookup) && UUID_RE.test(ref.id))
      .map((ref) => ref.id),
  ),
];

const logger = createLogger('admin:audit-log');

type AuditTargetRow = { action: string; targetId: string | null };

/**
 * Names and links each row's target, one query per kind of thing (never one
 * per row). Only what the admin pages already show is read: titles, names, a
 * code, a person's handle. A target whose row is gone resolves to null name
 * and href with its kind kept.
 *
 * Naming a target never fails the list: a lookup that errors is logged and
 * its rows get `target: null` (unknown, not gone), and any other failure in
 * here nulls every target.
 */
export async function resolveAuditTargets(
  rows: readonly AuditTargetRow[],
): Promise<(AuditTarget | null)[]> {
  try {
    return await resolveTargets(rows);
  } catch (err) {
    logger.warn({ err }, 'audit-log target resolution failed');
    return rows.map(() => null);
  }
}

async function resolveTargets(
  rows: readonly AuditTargetRow[],
): Promise<(AuditTarget | null)[]> {
  const refs = rows.map((row) => targetRefOf(row.action, row.targetId));
  const present = refs.filter((ref): ref is TargetRef => ref !== null);

  // Lookups whose query errored: their rows degrade to `target: null`.
  const failed = new Set<Lookup>();
  const guarded = async <Row>(
    lookups: readonly Lookup[],
    ids: readonly string[],
    run: () => Promise<Row[]>,
  ): Promise<Row[]> => {
    if (ids.length === 0) return [];
    try {
      return await run();
    } catch (err) {
      for (const lookup of lookups) failed.add(lookup);
      logger.warn({ err, lookups }, 'audit-log target lookup failed');
      return [];
    }
  };

  const eventIds = uuidsFor(present, ['event', 'price-event']);
  const reportIds = uuidsFor(present, ['event-report']);
  const venueIds = uuidsFor(present, ['venue']);
  const artistIds = uuidsFor(present, ['artist']);
  const codeIds = uuidsFor(present, ['invite-code']);
  const submissionIds = uuidsFor(present, ['submission', 'contest']);
  const personIds = [
    ...new Set(
      present.filter((ref) => ref.lookup === 'person').map((ref) => ref.id),
    ),
  ];

  const [
    eventRows,
    reportRows,
    venueRows,
    artistRows,
    codeRows,
    submissionRows,
    personRows,
  ] = await Promise.all([
    guarded(['event', 'price-event'], eventIds, () =>
      db
        .select({ id: events.id, title: events.title })
        .from(events)
        .where(inArray(events.id, eventIds)),
    ),
    guarded(['event-report'], reportIds, () =>
      db
        .select({
          id: eventReports.id,
          eventId: events.id,
          title: events.title,
        })
        .from(eventReports)
        .innerJoin(events, eq(events.id, eventReports.eventId))
        .where(inArray(eventReports.id, reportIds)),
    ),
    guarded(['venue'], venueIds, () =>
      db
        .select({ id: venues.id, name: venues.name })
        .from(venues)
        .where(inArray(venues.id, venueIds)),
    ),
    guarded(['artist'], artistIds, () =>
      db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(inArray(artists.id, artistIds)),
    ),
    guarded(['invite-code'], codeIds, () =>
      db
        .select({ id: inviteCodes.id, code: inviteCodes.code })
        .from(inviteCodes)
        .where(inArray(inviteCodes.id, codeIds)),
    ),
    guarded(['submission', 'contest'], submissionIds, () =>
      db
        .select({ id: priceSubmissions.id, title: events.title })
        .from(priceSubmissions)
        .innerJoin(events, eq(events.id, priceSubmissions.eventId))
        .where(inArray(priceSubmissions.id, submissionIds)),
    ),
    guarded(['person'], personIds, () =>
      db
        .select({ userId: userProfiles.userId, handle: userProfiles.handle })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, personIds)),
    ),
  ]);

  const eventTitles = new Map(eventRows.map((row) => [row.id, row.title]));
  const reports = new Map(reportRows.map((row) => [row.id, row]));
  const venueNames = new Map(venueRows.map((row) => [row.id, row.name]));
  const artistNames = new Map(artistRows.map((row) => [row.id, row.name]));
  const codes = new Map(codeRows.map((row) => [row.id, row.code]));
  const submissionTitles = new Map(
    submissionRows.map((row) => [row.id, row.title]),
  );
  const handles = new Map(personRows.map((row) => [row.userId, row.handle]));

  const named = (ref: TargetRef): Named | null => {
    switch (ref.lookup) {
      case 'event': {
        const title = eventTitles.get(ref.id);
        return title === undefined
          ? null
          : { name: title, href: editEventHref(ref.id) };
      }
      case 'event-report': {
        const report = reports.get(ref.id);
        return report === undefined
          ? null
          : { name: report.title, href: editEventHref(report.eventId) };
      }
      case 'venue': {
        const name = venueNames.get(ref.id);
        return name === undefined
          ? null
          : { name, href: `/admin/venues/${encodeURIComponent(ref.id)}` };
      }
      case 'artist': {
        // The Artists page has no per-artist route to deep-link.
        const name = artistNames.get(ref.id);
        return name === undefined ? null : { name, href: ARTISTS_HREF };
      }
      case 'person': {
        // Handle only: a person's email is never part of a target. A profile
        // with no handle yet still links, unnamed.
        if (!handles.has(ref.id)) return null;
        const handle = handles.get(ref.id) ?? null;
        return {
          name: handle === null ? null : `@${handle}`,
          href: `/admin/people/${encodeURIComponent(ref.id)}`,
        };
      }
      case 'invite-code': {
        const code = codes.get(ref.id);
        return code === undefined
          ? null
          : { name: code, href: INVITE_CODES_HREF };
      }
      case 'feature-flag':
        // Named from the registry /admin/feature-flags lists, never from
        // storage: a retired key the page no longer shows stays unnamed.
        return isFeatureFlagKey(ref.id)
          ? { name: FEATURE_FLAGS[ref.id].label, href: FEATURE_FLAGS_HREF }
          : null;
      case 'submission': {
        const title = submissionTitles.get(ref.id);
        return title === undefined
          ? null
          : { name: title, href: PRICES_SUBMITTED_HREF };
      }
      case 'contest': {
        const title = submissionTitles.get(ref.id);
        return title === undefined
          ? null
          : { name: title, href: PRICES_CHECKS_HREF };
      }
      case 'price-event': {
        const title = eventTitles.get(ref.id);
        return title === undefined ? null : { name: title, href: PRICES_HREF };
      }
    }
  };

  return refs.map((ref) => {
    if (ref === null || failed.has(ref.lookup)) return null;
    const found = named(ref);
    return found === null
      ? { kind: ref.kind, name: null, href: null }
      : { kind: ref.kind, name: found.name, href: found.href };
  });
}

/**
 * One-off cleanup of events stored twice for one night (a venue listing plus a
 * ticketing listing, one of them untimed, "Rossi" and "Rossi.").
 *
 * The crawler now folds a second listing into the row that exists
 * (`alignToNights`), but rows stored before that stay doubled. This finds them
 * with the SAME rule (one venue and date, artist keys equal with edge
 * punctuation trimmed, times that do not disagree), keeps one row per night, and
 * folds the others into it with `mergeEventRows`, the admin merge's own core:
 * watches, going marks and attendance stamps, reports, price submissions and logs
 * all move to the survivor, and a redirect keeps the old id working.
 *
 * Dry by default. The survivor is the row people already point at (most user
 * references), then a timed one, then the lowest id. Whatever the survivor
 * lacks (a time, links, an image, a description, prices, a bill) is filled from
 * the rows folded into it, after they are gone, in coherent groups taken from
 * one row each (a price range and its source never come from two listings).
 *
 * Each folded row is its own transaction (the merge core's), and the fill is a
 * separate step after them, so a night can be partly applied: the plan is
 * re-checked against the live rows just before it runs, a fill that fails is
 * reported with the values it could not write, and nothing is retried silently.
 *
 * An artist merge is NOT done here: where the doubled rows name two artists
 * ("Rossi" and "Rossi.") the pair is listed for the admin artists queue.
 */

import { eq, inArray, sql } from 'drizzle-orm';
import {
  artists,
  auditLog,
  db,
  eventReports,
  events,
  mergeEventRows,
  priceSubmissions,
  userEvents,
} from '@concert-crawl/db';
import { sameNight, showTimeKey } from '@concert-crawl/types';
import { alignToNights } from './lib/align-nights.js';

export const CLEANUP_ACTOR = 'system:duplicate-night-cleanup';

/**
 * Columns the survivor takes from a folded row when it has none of its own. A
 * group is taken from ONE row (the first that holds the group's first column),
 * so related values stay a pair: a price range and its source, a ticket link and
 * its typed links, the bill and its canonical forms.
 */
const FILL_GROUPS = [
  ['showTime', 'doorsTime'],
  ['ticketUrl', 'ticketLinks'],
  ['eventUrl'],
  ['imageUrl'],
  ['description'],
  ['tourName'],
  ['genre'],
  ['ticketPriceMin', 'ticketPriceMax', 'priceSource'],
  [
    'headliners',
    'canonicalHeadliners',
    'supportingArtists',
    'canonicalSupporting',
  ],
] as const satisfies readonly (readonly (keyof typeof events.$inferSelect)[])[];
type FillField = (typeof FILL_GROUPS)[number][number];

export interface NightRow {
  id: string;
  title: string;
  artist: string;
  canonicalArtist: string;
  date: string;
  showTime: string | null;
  /** User-side references: watches, going marks, reports, price submissions. */
  refs: number;
}

export interface NightGroupPlan {
  venueId: string;
  date: string;
  survivor: NightRow;
  losers: NightRow[];
  /** The first column of each group the survivor will take from a folded row. */
  fills: FillField[];
  /** Filled in by an apply run. */
  outcome?: 'merged' | 'failed' | 'skipped';
  error?: string;
  /** A fill that failed after the merge, with the values it could not write. */
  fillError?: string;
}

export interface ArtistReview {
  date: string;
  canonicalArtists: string[];
  /** Our artists rows for those keys, so an admin can open them. */
  artistRows: { id: string; name: string; canonicalName: string }[];
}

export interface MergeDuplicateNightsResult {
  scanned: number;
  groups: NightGroupPlan[];
  merged: number;
  failed: number;
  skipped: number;
  artistReviews: ArtistReview[];
}

export interface MergeDuplicateNightsOptions {
  dryRun: boolean;
  /** Cap on groups merged in one run (a first sample). Unset means all. */
  maxGroups?: number | undefined;
}

const CHUNK = 500;

/** The survivor: most references, then a timed row, then the lowest id. */
export const chooseSurvivor = (rows: readonly NightRow[]): NightRow => {
  const sorted = [...rows].sort(
    (left, right) =>
      right.refs - left.refs ||
      Number(showTimeKey(right.showTime) !== '') -
        Number(showTimeKey(left.showTime) !== '') ||
      left.id.localeCompare(right.id),
  );
  return sorted[0] as NightRow;
};

/** Groups the rows of one venue and date into nights, using the crawl's rule. */
export const groupNights = (rows: readonly NightRow[]): NightRow[][] => {
  const { aligned } = alignToNights(rows, []);
  const groups = new Map<string, NightRow[]>();
  aligned.forEach((alignedRow, index) => {
    const key = `${alignedRow.canonicalArtist}|${showTimeKey(alignedRow.showTime)}`;
    groups.set(key, [...(groups.get(key) ?? []), rows[index] as NightRow]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
};

const countBy = async (
  table: typeof userEvents | typeof eventReports | typeof priceSubmissions,
  ids: readonly string[],
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  for (let start = 0; start < ids.length; start += CHUNK) {
    const rows = await db
      .select({ eventId: table.eventId, total: sql<number>`count(*)::int` })
      .from(table)
      .where(inArray(table.eventId, ids.slice(start, start + CHUNK)))
      .groupBy(table.eventId);
    for (const row of rows) result.set(row.eventId, row.total);
  }
  return result;
};

type EventRow = typeof events.$inferSelect;

/** The groups the survivor can still fill: every empty column, from one donor. */
const fillsFrom = (
  survivor: EventRow,
  donors: readonly EventRow[],
): { fields: FillField[]; values: Partial<EventRow> } => {
  const fields: FillField[] = [];
  const values: Partial<EventRow> = {};
  for (const group of FILL_GROUPS) {
    const anchor = group[0];
    if (survivor[anchor] !== null) continue;
    const donor = donors.find((row) => row[anchor] != null);
    if (!donor) continue;
    fields.push(anchor);
    for (const field of group) {
      if (survivor[field] === null && donor[field] != null) {
        Object.assign(values, { [field]: donor[field] });
      }
    }
  }
  return { fields, values };
};

export async function mergeDuplicateNights(
  options: MergeDuplicateNightsOptions,
): Promise<MergeDuplicateNightsResult> {
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      canonicalArtist: events.canonicalArtist,
      date: events.date,
      showTime: events.showTime,
    })
    .from(events)
    .where(eq(events.status, 'upcoming'));

  // Only the venue and date buckets that hold more than one row can contain a
  // duplicate, so references are counted for those alone.
  const buckets = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.venueId === null) continue;
    const key = `${row.venueId}|${row.date}`;
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  }
  const candidates = [...buckets.values()].filter(
    (bucket) => bucket.length > 1,
  );
  const candidateIds = candidates.flat().map((row) => row.id);
  const [watches, reports, submissions] = await Promise.all([
    countBy(userEvents, candidateIds),
    countBy(eventReports, candidateIds),
    countBy(priceSubmissions, candidateIds),
  ]);
  const refsOf = (id: string): number =>
    (watches.get(id) ?? 0) +
    (reports.get(id) ?? 0) +
    (submissions.get(id) ?? 0);

  const plans: NightGroupPlan[] = [];
  for (const bucket of candidates) {
    const venueId = bucket[0]?.venueId;
    if (venueId === null || venueId === undefined) continue;
    const nightRows: NightRow[] = bucket.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      canonicalArtist: row.canonicalArtist,
      date: row.date,
      showTime: row.showTime,
      refs: refsOf(row.id),
    }));
    for (const group of groupNights(nightRows)) {
      const survivor = chooseSurvivor(group);
      plans.push({
        venueId,
        date: survivor.date,
        survivor,
        losers: group.filter((row) => row.id !== survivor.id),
        fills: [],
      });
    }
  }
  plans.sort((left, right) =>
    `${left.date}|${left.survivor.id}`.localeCompare(
      `${right.date}|${right.survivor.id}`,
    ),
  );

  const loadRows = async (
    ids: readonly string[],
  ): Promise<Map<string, EventRow>> => {
    const found = new Map<string, EventRow>();
    for (let start = 0; start < ids.length; start += CHUNK) {
      for (const row of await db
        .select()
        .from(events)
        .where(inArray(events.id, ids.slice(start, start + CHUNK)))) {
        found.set(row.id, row);
      }
    }
    return found;
  };

  // What each survivor would take from the rows folded into it.
  const fullRows = await loadRows(
    plans.flatMap((plan) => [
      plan.survivor.id,
      ...plan.losers.map((loser) => loser.id),
    ]),
  );
  for (const plan of plans) {
    const survivor = fullRows.get(plan.survivor.id);
    const donors = plan.losers
      .map((loser) => fullRows.get(loser.id))
      .filter((row): row is EventRow => row !== undefined);
    plan.fills = survivor ? fillsFrom(survivor, donors).fields : [];
  }

  // Doubled rows that name two artists: listed for the admin artists queue.
  const artistReviews: ArtistReview[] = [];
  for (const plan of plans) {
    const keys = [
      ...new Set(
        [plan.survivor, ...plan.losers].map((row) => row.canonicalArtist),
      ),
    ];
    if (keys.length < 2) continue;
    const artistRows = await db
      .select({
        id: artists.id,
        name: artists.name,
        canonicalName: artists.canonicalName,
      })
      .from(artists)
      .where(inArray(artists.canonicalName, keys));
    artistReviews.push({ date: plan.date, canonicalArtists: keys, artistRows });
  }

  const result: MergeDuplicateNightsResult = {
    scanned: rows.length,
    groups: plans,
    merged: 0,
    failed: 0,
    skipped: 0,
    artistReviews,
  };
  if (options.dryRun) return result;

  for (const plan of plans.slice(0, options.maxGroups ?? plans.length)) {
    try {
      // The plan is read from a snapshot that can be hours old: re-read the
      // live rows and fold in only those that are still this night.
      const live = await loadRows([
        plan.survivor.id,
        ...plan.losers.map((loser) => loser.id),
      ]);
      const survivor = live.get(plan.survivor.id);
      const losers = plan.losers
        .map((loser) => live.get(loser.id))
        .filter(
          (row): row is EventRow =>
            row !== undefined &&
            survivor !== undefined &&
            row.status === 'upcoming' &&
            sameNight(row, survivor),
        );
      if (!survivor || survivor.status !== 'upcoming' || losers.length === 0) {
        plan.outcome = 'skipped';
        plan.error = 'changed since it was planned';
        result.skipped += 1;
        continue;
      }

      for (const loser of losers) {
        await mergeEventRows({
          sourceId: loser.id,
          targetId: survivor.id,
          actorId: CLEANUP_ACTOR,
          suggestion: null,
          notifyWatchers: false,
        });
      }
      plan.outcome = 'merged';
      result.merged += 1;

      // The folded rows are gone, so a time taken from one cannot collide with
      // it on the unique index. Re-read the survivor: only a field still empty
      // is filled. A failure here is reported with the values it could not
      // write, since the donors no longer exist.
      let unwritten: Partial<EventRow> = {};
      try {
        const [current] = await db
          .select()
          .from(events)
          .where(eq(events.id, survivor.id));
        const { fields, values } = current
          ? fillsFrom(current, losers)
          : { fields: [], values: {} };
        unwritten = values;
        if (fields.length > 0) {
          await db
            .update(events)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(events.id, survivor.id));
          await db.insert(auditLog).values({
            actorId: CLEANUP_ACTOR,
            action: 'event.fill_from_merge',
            targetId: survivor.id,
            metadata: {
              fromIds: losers.map((loser) => loser.id),
              fields: Object.keys(values),
            },
          });
        }
      } catch (err) {
        plan.fillError = `${err instanceof Error ? err.message : String(err)}; unwritten values: ${JSON.stringify(unwritten)}`;
      }
    } catch (err) {
      // A fold that failed part-way leaves the rows folded before it merged.
      plan.outcome = 'failed';
      plan.error = err instanceof Error ? err.message : String(err);
      result.failed += 1;
    }
  }
  return result;
}

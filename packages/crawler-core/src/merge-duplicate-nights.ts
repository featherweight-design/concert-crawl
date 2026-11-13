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
 * lacks (a time, links, an image, a description, prices) is filled from the
 * rows folded into it, after they are gone.
 *
 * An artist merge is NOT done here: where the doubled rows name two artists
 * ("Rossi" and "Rossi.") the pair is listed for the admin artists queue.
 */

import { eq, inArray, sql } from 'drizzle-orm';
import {
  artists,
  db,
  eventReports,
  events,
  mergeEventRows,
  priceSubmissions,
  userEvents,
} from '@concert-crawl/db';
import { showTimeKey } from '@concert-crawl/types';
import { alignToNights } from './lib/align-nights.js';

export const CLEANUP_ACTOR = 'system:duplicate-night-cleanup';

/** Columns the survivor takes from a folded row when it has none of its own. */
const FILL_FIELDS = [
  'showTime',
  'doorsTime',
  'ticketUrl',
  'ticketLinks',
  'eventUrl',
  'imageUrl',
  'description',
  'tourName',
  'ticketPriceMin',
  'ticketPriceMax',
  'priceSource',
] as const;
type FillField = (typeof FILL_FIELDS)[number];

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
  /** Columns the survivor will take from a folded row. */
  fills: FillField[];
  /** Filled in by an apply run. */
  outcome?: 'merged' | 'failed';
  error?: string;
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
  artistReviews: ArtistReview[];
}

export interface MergeDuplicateNightsOptions {
  dryRun: boolean;
  /** Cap on groups merged in one run (a first sample). Unset means all. */
  maxGroups?: number | undefined;
}

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
  if (ids.length === 0) return result;
  const rows = await db
    .select({ eventId: table.eventId, total: sql<number>`count(*)::int` })
    .from(table)
    .where(inArray(table.eventId, [...ids]))
    .groupBy(table.eventId);
  for (const row of rows) result.set(row.eventId, row.total);
  return result;
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

  // What each survivor would take from the rows folded into it.
  const fullRows = new Map<string, typeof events.$inferSelect>();
  const planIds = plans.flatMap((plan) => [
    plan.survivor.id,
    ...plan.losers.map((loser) => loser.id),
  ]);
  for (let start = 0; start < planIds.length; start += 500) {
    const chunk = planIds.slice(start, start + 500);
    for (const row of await db
      .select()
      .from(events)
      .where(inArray(events.id, chunk))) {
      fullRows.set(row.id, row);
    }
  }
  for (const plan of plans) {
    const survivor = fullRows.get(plan.survivor.id);
    plan.fills = survivor
      ? FILL_FIELDS.filter(
          (field) =>
            survivor[field] === null &&
            plan.losers.some(
              (loser) => fullRows.get(loser.id)?.[field] != null,
            ),
        )
      : [];
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
    artistReviews,
  };
  if (options.dryRun) return result;

  for (const plan of plans.slice(0, options.maxGroups ?? plans.length)) {
    try {
      // What the survivor may take, read BEFORE the folded rows are deleted.
      const donors = plan.losers
        .map((loser) => fullRows.get(loser.id))
        .filter((row): row is typeof events.$inferSelect => row !== undefined);
      for (const loser of plan.losers) {
        await mergeEventRows({
          sourceId: loser.id,
          targetId: plan.survivor.id,
          actorId: CLEANUP_ACTOR,
          suggestion: null,
          notifyWatchers: false,
        });
      }
      // The folded rows are gone, so a time taken from one cannot collide with
      // it on the unique index. Re-read: only a field still empty is filled.
      const [current] = await db
        .select()
        .from(events)
        .where(eq(events.id, plan.survivor.id));
      const take: Partial<typeof events.$inferInsert> = {};
      for (const field of plan.fills) {
        const donor = donors.find((row) => row[field] != null);
        if (current && current[field] === null && donor) {
          Object.assign(take, { [field]: donor[field] });
        }
      }
      if (Object.keys(take).length > 0) {
        await db
          .update(events)
          .set({ ...take, updatedAt: new Date() })
          .where(eq(events.id, plan.survivor.id));
      }
      plan.outcome = 'merged';
      result.merged += 1;
    } catch (err) {
      plan.outcome = 'failed';
      plan.error = err instanceof Error ? err.message : String(err);
      result.failed += 1;
    }
  }
  return result;
}

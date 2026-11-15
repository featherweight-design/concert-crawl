// The admin merge's two reads (admin 4b E4, plan 4b :91-92, rulings 4b#15-17
// and A3): the pick list of likely duplicates, and the compare step's preview
// of what one merge would do. Both read only. The write is POST /:id/merge
// (lib/event-merge.ts and `mergeEventRows`), which applies the same fill rule
// (`adminMergeFill`) and the same past rule, under row locks.

import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  db,
  eventReports,
  events,
  adminMergeFill,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db';
import type { MergeFillField } from '@concert-crawl/db/event-merge-fill';
import {
  isTwelveHourMisread,
  sameNight,
  showTimeKey,
  type TierPriceBlock,
} from '@concert-crawl/types';
import { z } from 'zod';
import { idSchema } from '../../../lib/id-schema.js';
import {
  loadPriceByTierByEventId,
  lowestHeadline,
  resolveDisplayPrice,
} from '../../../lib/price-aggregation/index.js';
import { readLineup } from './event-create.js';
import { submittedPriceWhere, watchingCountOf } from './event-counts.js';

/**
 * `source` is the row merged away (`:id` is the one kept, the reverse of the
 * POST, whose `:id` is the source). `move` previews a relocation.
 */
export const mergePreviewQuerySchema = z.object({
  source: idSchema,
  move: z.stringbool().optional().default(false),
});

type EventRow = typeof events.$inferSelect;

/** Where a listing came from: added by an admin, or by the crawl. */
const sourceOf = (manual: boolean) =>
  manual ? ('manual' as const) : ('crawled' as const);

/** The two rows are one show by the crawl's night rule (or a 12-hour misread). */
const oneNight = (
  left: Pick<EventRow, 'canonicalArtist' | 'date' | 'showTime'>,
  right: Pick<EventRow, 'canonicalArtist' | 'date' | 'showTime'>,
) => sameNight(left, right) || isTwelveHourMisread(left, right);

/**
 * GET /:id/merge-candidates: the other listings at the same venue on the same
 * date, likeliest first. Likely means one night by the crawl's own rule
 * (`sameNight`, or the twelve-hour misread), then most Watchers, then time
 * and id. Cancelled rows (the stale sweep's delisted ones included) are left
 * out: there is nothing live on them to keep. Hidden and manual rows stay in.
 * The date is shared, so a past row only ever lists past rows. Null when the
 * event does not exist.
 */
export const loadMergeCandidates = async (id: string) => {
  const [self] = await db
    .select({
      venueId: events.venueId,
      date: events.date,
      canonicalArtist: events.canonicalArtist,
      showTime: events.showTime,
    })
    .from(events)
    .where(eq(events.id, id));
  if (!self) return null;
  if (self.venueId === null) return [];

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      showTime: events.showTime,
      manual: events.manual,
      hidden: events.hiddenFromConsumer,
      canonicalArtist: events.canonicalArtist,
      watchers: watchingCountOf(),
    })
    .from(events)
    .where(
      and(
        eq(events.venueId, self.venueId),
        eq(events.date, self.date),
        ne(events.id, id),
        ne(events.status, 'cancelled'),
        isNull(events.delistedAt),
      ),
    )
    .orderBy(asc(events.id));

  return rows
    .map(({ canonicalArtist, ...row }) => ({
      ...row,
      source: sourceOf(row.manual),
      likely: oneNight(self, { ...row, canonicalArtist }),
    }))
    .sort(
      (left, right) =>
        Number(right.likely) - Number(left.likely) ||
        right.watchers - left.watchers ||
        showTimeKey(left.showTime).localeCompare(showTimeKey(right.showTime)) ||
        left.id.localeCompare(right.id),
    );
};

/** The price a listing shows: the cheapest tier, else the crawled scalar. */
const displayPriceOf = (
  blocks: TierPriceBlock[],
  scalarMin: string | null,
  scalarMax: string | null,
) => {
  const headline = lowestHeadline(blocks);
  return {
    min: resolveDisplayPrice(blocks, scalarMin),
    max: headline === null ? scalarMax : headline.priceMax,
  };
};

/** One grouped count per event id. */
const byEvent = (rows: { eventId: string; total: number }[]) =>
  new Map(rows.map((row) => [row.eventId, row.total]));

export type MergePreviewResult =
  | { ok: 'not_found'; which: 'event' | 'source' }
  | { ok: 'not_mergeable'; reason: 'same_id' | 'past_mismatch' }
  | { ok: 'preview'; data: Awaited<ReturnType<typeof buildPreview>> };

/**
 * GET /:id/merge-preview?source=: what keeping `:id` and merging `source`
 * into it would do. Same venue and night are reported (`sameVenue`,
 * `sameDay`, `sameNight`), not required: A3 merges across venue or day, and
 * the POST serves the relocations too. Refused only where the POST refuses:
 * the same id twice, or one past row with one that is not. `move` previews a
 * relocation (`relocation: true` on the POST): no past rule, nothing filled.
 */
export const loadMergePreview = async ({
  keptId,
  sourceId,
  today,
  move,
}: {
  keptId: string;
  sourceId: string;
  today: string;
  move: boolean;
}): Promise<MergePreviewResult> => {
  if (keptId === sourceId) return { ok: 'not_mergeable', reason: 'same_id' };
  const rows = await db
    .select()
    .from(events)
    .where(inArray(events.id, [keptId, sourceId]));
  const kept = rows.find((row) => row.id === keptId);
  const other = rows.find((row) => row.id === sourceId);
  if (!kept) return { ok: 'not_found', which: 'event' };
  if (!other) return { ok: 'not_found', which: 'source' };
  if (!move && kept.date < today !== other.date < today) {
    return { ok: 'not_mergeable', reason: 'past_mismatch' };
  }
  return { ok: 'preview', data: await buildPreview(kept, other, move) };
};

const buildPreview = async (kept: EventRow, other: EventRow, move: boolean) => {
  const ids = [kept.id, other.id];
  const sameVenue = kept.venueId !== null && kept.venueId === other.venueId;

  const venueIds = [kept.venueId, other.venueId].filter(
    (venueId): venueId is string => venueId !== null,
  );
  const venueNames = new Map(
    venueIds.length === 0
      ? []
      : (
          await db
            .select({ id: venues.id, name: venues.name })
            .from(venues)
            .where(inArray(venues.id, venueIds))
        ).map((venue) => [venue.id, venue.name]),
  );
  const watchers = byEvent(
    await db
      .select({ eventId: userEvents.eventId, total: count() })
      .from(userEvents)
      .where(
        and(
          inArray(userEvents.eventId, ids),
          eq(userEvents.status, 'watching'),
        ),
      )
      .groupBy(userEvents.eventId),
  );
  // Concerts as the delete guard counts them (lib/event-delete.ts).
  const concerts = byEvent(
    await db
      .select({ eventId: userEvents.eventId, total: count() })
      .from(userEvents)
      .where(
        and(
          inArray(userEvents.eventId, ids),
          or(eq(userEvents.status, 'going'), isNotNull(userEvents.attendingAt)),
        ),
      )
      .groupBy(userEvents.eventId),
  );
  const submittedPrices = byEvent(
    await db
      .select({ eventId: priceSubmissions.eventId, total: count() })
      .from(priceSubmissions)
      .where(and(inArray(priceSubmissions.eventId, ids), submittedPriceWhere()))
      .groupBy(priceSubmissions.eventId),
  );
  // 4b#16: open event reports, by kind. Artist reports are artist-keyed and
  // never move, so they are not counted.
  const reportRows = await db
    .select({
      eventId: eventReports.eventId,
      kind: eventReports.status,
      total: count(),
    })
    .from(eventReports)
    .where(
      and(inArray(eventReports.eventId, ids), isNull(eventReports.resolvedAt)),
    )
    .groupBy(eventReports.eventId, eventReports.status);

  // 4b#17: Watchers after the merge, each person once. The merge keeps the
  // kept row's own row for a person on both (target wins), so a person
  // Watching only the other row counts only if the kept row has no row for
  // them at all.
  const keptSide = alias(userEvents, 'kept_side');
  const [after] = await db
    .select({ total: countDistinct(userEvents.userId) })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.status, 'watching'),
        or(
          eq(userEvents.eventId, kept.id),
          and(
            eq(userEvents.eventId, other.id),
            notExists(
              db
                .select({ one: sql`1` })
                .from(keptSide)
                .where(
                  and(
                    eq(keptSide.eventId, kept.id),
                    eq(keptSide.userId, userEvents.userId),
                  ),
                ),
            ),
          ),
        ),
      ),
    );

  const prices = await loadPriceByTierByEventId(ids);
  const pricesAfter = await loadPriceByTierByEventId(ids, {
    mergeInto: kept.id,
  });
  // The merge's own fill (`adminMergeFill`, read here without the locks).
  // A move fills nothing: a relocation skips the admin rules.
  const fill = move
    ? { fields: [], values: {}, skipped: [] }
    : await adminMergeFill(db, kept, other);
  const fills: MergeFillField[] = fill.fields;

  const listing = async (row: EventRow) => {
    const reports = reportRows.filter((report) => report.eventId === row.id);
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      showTime: row.showTime,
      venueId: row.venueId,
      venueName:
        row.venueId === null ? null : (venueNames.get(row.venueId) ?? null),
      source: sourceOf(row.manual),
      manual: row.manual,
      createdBy: row.createdBy,
      hidden: row.hiddenFromConsumer,
      status: row.status,
      lineup: await readLineup(db, row),
      price: displayPriceOf(
        prices.get(row.id) ?? [],
        row.ticketPriceMin,
        row.ticketPriceMax,
      ),
      watchers: watchers.get(row.id) ?? 0,
      concerts: concerts.get(row.id) ?? 0,
      submittedPrices: submittedPrices.get(row.id) ?? 0,
      reports: {
        total: reports.reduce((sum, report) => sum + report.total, 0),
        byKind: Object.fromEntries(
          reports.map((report) => [report.kind, report.total]),
        ),
      },
    };
  };

  // The scalar the kept row has after the fill: its own, else the other's.
  const scalarAfter = fills.includes('ticketPriceMin')
    ? {
        min: fill.values.ticketPriceMin ?? null,
        max: fill.values.ticketPriceMax ?? kept.ticketPriceMax,
      }
    : { min: kept.ticketPriceMin, max: kept.ticketPriceMax };

  return {
    // The direction, echoed: `kept` stays, `other` is merged into it.
    keptId: kept.id,
    sourceId: other.id,
    move,
    kept: await listing(kept),
    other: await listing(other),
    sameVenue,
    sameDay: kept.date === other.date,
    sameNight: sameVenue && oneNight(kept, other),
    after: {
      watchers: after?.total ?? 0,
      price: displayPriceOf(
        pricesAfter.get(kept.id) ?? [],
        scalarAfter.min,
        scalarAfter.max,
      ),
    },
    fills,
    /**
     * Blank fields the merge leaves blank: the show time when another
     * upcoming row holds that night, the other venue's links.
     */
    skipped: fill.skipped,
  };
};

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { z } from 'zod';
import { db, events, venues } from '@concert-crawl/db';
import { idSchema } from '../../../lib/id-schema.js';
import { containsPattern } from '../../../lib/escape-like.js';
import { isSoldOutSql } from '../../../lib/sold-out.js';
import { watchingCountOf, wentCountOf } from './event-counts.js';

/**
 * The admin Events list (admin 4b-1, `GET /v1/admin/events/list`). One status
 * per show, in the words fans see: Tickets available, Sold out, Postponed,
 * Cancelled, No longer listed, and Played for a past show that went ahead.
 * Hidden is separate (a flag with its reason), never a status.
 */
export const EVENT_LIST_STATUSES = [
  'available',
  'soldout',
  'postponed',
  'cancelled',
  'delisted',
  'played',
] as const;
export type EventListStatus = (typeof EVENT_LIST_STATUSES)[number];

/** A comma-separated list, empty when the parameter is absent. */
const csvParts = z
  .string()
  .optional()
  .transform((raw) =>
    raw === undefined || raw.trim() === ''
      ? []
      : raw
          .split(',')
          .map((part) => part.trim())
          // A trailing or doubled comma is not a value.
          .filter((part) => part !== ''),
  );

const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((val) => val === 'true');

export const eventListQuerySchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  when: z.enum(['upcoming', 'past']).default('upcoming'),
  venueIds: csvParts.pipe(z.array(idSchema).max(50)),
  statuses: csvParts.pipe(z.array(z.enum(EVENT_LIST_STATUSES)).max(10)),
  noPrice: flag,
  hidden: flag,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

/**
 * The fan-facing status of the row in scope, as SQL so the list can filter,
 * count and return the same value. Sold out is a promoted sold-out report
 * (`isSoldOutSql`), as on the fan side; No longer listed is a cancelled row
 * the stale sweep delisted (B+ A5).
 */
export const eventListStatusSql = (today: string): SQL<EventListStatus> =>
  sql<EventListStatus>`CASE
    WHEN ${events.status} = 'cancelled' AND ${events.delistedAt} IS NOT NULL THEN 'delisted'
    WHEN ${events.status} = 'cancelled' THEN 'cancelled'
    WHEN ${events.status} = 'postponed' THEN 'postponed'
    WHEN ${events.date} < ${today} THEN 'played'
    WHEN ${isSoldOutSql()} THEN 'soldout'
    ELSE 'available'
  END`;

/** Why a hidden show is hidden: the classifier was unsure, or an admin hid it. */
export const hiddenReasonSql = () =>
  sql<
    'unsure' | 'admin' | null
  >`CASE WHEN NOT ${events.hiddenFromConsumer} THEN NULL WHEN ${events.isConcertReviewNeeded} THEN 'unsure' ELSE 'admin' END`;

/** The scope every count shares: the Upcoming or Past side, and the search. */
const scopeWhere = (query: EventListQuery, today: string) => {
  const like = query.query ? containsPattern(query.query) : null;
  return and(
    query.when === 'past' ? lt(events.date, today) : gte(events.date, today),
    like
      ? or(
          ilike(events.title, like),
          ilike(events.artist, like),
          ilike(venues.name, like),
        )
      : undefined,
  );
};

/** The filters a count can leave out: each picker or toggle on the list. */
const FACETS = ['venue', 'status', 'noPrice', 'hidden'] as const;
type Facet = (typeof FACETS)[number];

/**
 * What the filter clauses read: the events table for the page of rows, the
 * base subquery's columns for the counts. `priceless` is a boolean condition.
 */
interface FacetColumns {
  venueId: SQLWrapper;
  status: SQLWrapper;
  priceless: SQLWrapper;
  hidden: SQLWrapper;
}

/** Each filter's clause, built once; `undefined` when that filter is off. */
const facetClauses = (
  query: EventListQuery,
  cols: FacetColumns,
): Record<Facet, SQL | undefined> => ({
  venue:
    query.venueIds.length > 0
      ? inArray(cols.venueId, query.venueIds)
      : undefined,
  status:
    query.statuses.length > 0
      ? inArray(cols.status, query.statuses)
      : undefined,
  noPrice: query.noPrice ? sql`${cols.priceless}` : undefined,
  hidden: query.hidden ? eq(cols.hidden, true) : undefined,
});

/** Every clause of `clauses` except the facet named (all of them when none is). */
const facetsExcept = (
  clauses: Record<Facet, SQL | undefined>,
  skip?: Facet,
): (SQL | undefined)[] =>
  FACETS.filter((facet) => facet !== skip).map((facet) => clauses[facet]);

/** `count(*)` over the rows meeting every condition given (all rows when none is on). */
const countWhere = (...conditions: (SQL | undefined)[]) => {
  const condition = and(...conditions);
  return (
    condition ? sql`count(*) FILTER (WHERE ${condition})` : sql`count(*)`
  ).mapWith(Number);
};

/**
 * The list, its total, and faceted counts. Every count shares the scope (the
 * side and the search), and each facet's count applies every other filter but
 * its own, so a picker's "Show N" is exactly the rows Apply will return:
 *
 * - `byVenue`: every venue with a show in the scope, counted under every
 *   filter except the venue filter, so a ticked venue stays listed at 0.
 *   Venues are disjoint, so the sum over the ticked venues is `total`.
 * - `byStatus`: every status key, counted under every filter except the
 *   status filter (0 when none match).
 * - `noPrice`: every filter except the No price toggle, plus no price.
 * - `hidden`: every filter except the Hidden toggle, plus hidden.
 * - `all`: the scope alone (the side, Upcoming or Past, and the search), for
 *   the header line.
 * - `total`: the rows matching every filter.
 *
 * The page and every count read one repeatable-read snapshot, so `total` and
 * the facet sums always agree.
 */
export const listAdminEvents = async (query: EventListQuery, today: string) => {
  const status = eventListStatusSql(today);
  const scope = scopeWhere(query, today);
  const where = and(
    scope,
    ...facetsExcept(
      facetClauses(query, {
        venueId: events.venueId,
        status,
        priceless: isNull(events.ticketPriceMin),
        hidden: events.hiddenFromConsumer,
      }),
    ),
  );
  const order =
    query.when === 'past'
      ? // Untimed shows last on a date, as on the Upcoming side.
        [
          desc(events.date),
          sql`${events.showTime} DESC NULLS LAST`,
          asc(events.id),
        ]
      : [asc(events.date), asc(events.showTime), asc(events.id)];

  return db.transaction(
    async (tx) => {
      const rowsQuery = tx
        .select({
          id: events.id,
          title: events.title,
          date: events.date,
          doorsTime: events.doorsTime,
          showTime: events.showTime,
          venueId: events.venueId,
          venueName: venues.name,
          venueSlug: venues.slug,
          status,
          hidden: events.hiddenFromConsumer,
          hiddenReason: hiddenReasonSql(),
          priceMin: events.ticketPriceMin,
          priceMax: events.ticketPriceMax,
          watchingCount: watchingCountOf(),
          wentCount: query.when === 'past' ? wentCountOf() : sql<null>`NULL`,
        })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(where)
        .orderBy(...order)
        .limit(query.limit)
        .offset(query.offset);

      // Every count reads one base of the scope, with the status computed once.
      // The status carries a bound parameter (today), and Postgres would not
      // match a second copy of it in GROUP BY, so the counts group on its
      // column. Aliased columns render bare, hence names no join can share.
      const base = tx
        .select({
          id: events.id,
          venueId: events.venueId,
          status: status.as('list_status'),
          priceless: isNull(events.ticketPriceMin).as('is_priceless'),
          hidden: events.hiddenFromConsumer,
        })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(scope)
        .as('base');
      const clauses = facetClauses(query, {
        venueId: base.venueId,
        status: base.status,
        priceless: base.priceless,
        hidden: base.hidden,
      });

      const chipsQuery = tx
        .select({
          all: countWhere(),
          total: countWhere(...facetsExcept(clauses)),
          noPrice: countWhere(
            ...facetsExcept(clauses, 'noPrice'),
            sql`${base.priceless}`,
          ),
          hidden: countWhere(
            ...facetsExcept(clauses, 'hidden'),
            eq(base.hidden, true),
          ),
        })
        .from(base);

      const byStatusQuery = tx
        .select({
          status: base.status,
          total: countWhere(...facetsExcept(clauses, 'status')),
        })
        .from(base)
        .groupBy(base.status);

      // A show whose venue is gone has no venue row, so it is in no venue's
      // count and no venue filter reaches it. Rare (a deleted venue).
      const venueTotal = countWhere(...facetsExcept(clauses, 'venue'));
      const byVenueQuery = tx
        .select({
          venueId: venues.id,
          name: venues.name,
          slug: venues.slug,
          total: venueTotal,
        })
        .from(base)
        .innerJoin(venues, eq(base.venueId, venues.id))
        .groupBy(venues.id, venues.name, venues.slug)
        .orderBy(desc(venueTotal), asc(venues.name));

      const [rows, [chips], byStatus, byVenue] = await Promise.all([
        rowsQuery,
        chipsQuery,
        byStatusQuery,
        byVenueQuery,
      ]);
      const statusTotals = new Map(
        byStatus.map((row) => [row.status, row.total]),
      );

      return {
        rows,
        total: chips?.total ?? 0,
        counts: {
          all: chips?.all ?? 0,
          noPrice: chips?.noPrice ?? 0,
          hidden: chips?.hidden ?? 0,
          byStatus: Object.fromEntries(
            EVENT_LIST_STATUSES.map((key) => [key, statusTotals.get(key) ?? 0]),
          ),
          byVenue,
        },
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
};

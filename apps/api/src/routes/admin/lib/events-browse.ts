import {
  and,
  asc,
  count,
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

export const listAdminEvents = async (query: EventListQuery, today: string) => {
  const status = eventListStatusSql(today);
  const scope = scopeWhere(query, today);
  const where = and(
    scope,
    query.venueIds.length > 0
      ? inArray(events.venueId, query.venueIds)
      : undefined,
    query.statuses.length > 0
      ? sql`${status} IN (${sql.join(
          query.statuses.map((value) => sql`${value}`),
          sql`, `,
        )})`
      : undefined,
    query.noPrice ? isNull(events.ticketPriceMin) : undefined,
    query.hidden ? eq(events.hiddenFromConsumer, true) : undefined,
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

  const rowsQuery = db
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

  const totalQuery = db
    .select({ total: count() })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(where);

  // Chip and popover counts share the side and the search only, so each
  // chip keeps its own total while another filter is on.
  const chipsQuery = db
    .select({
      all: count(),
      noPrice:
        sql<number>`count(*) FILTER (WHERE ${events.ticketPriceMin} IS NULL)`.mapWith(
          Number,
        ),
      hidden:
        sql<number>`count(*) FILTER (WHERE ${events.hiddenFromConsumer})`.mapWith(
          Number,
        ),
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(scope);

  // The status expression carries a bound parameter (today), and Postgres
  // would not match a second copy of it in GROUP BY, so it is computed once
  // in a subquery and grouped by its column.
  const statuses = db
    .select({ status: status.as('status') })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(scope)
    .as('statuses');
  const byStatusQuery = db
    .select({ status: statuses.status, total: count() })
    .from(statuses)
    .groupBy(statuses.status);

  const byVenueQuery = db
    .select({
      venueId: venues.id,
      name: venues.name,
      slug: venues.slug,
      total: count(),
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(scope)
    .groupBy(venues.id, venues.name, venues.slug)
    .orderBy(desc(count()), asc(venues.name));

  const [rows, [totalRow], [chips], byStatus, byVenue] = await Promise.all([
    rowsQuery,
    totalQuery,
    chipsQuery,
    byStatusQuery,
    byVenueQuery,
  ]);

  return {
    rows,
    total: totalRow?.total ?? 0,
    counts: {
      all: chips?.all ?? 0,
      noPrice: chips?.noPrice ?? 0,
      hidden: chips?.hidden ?? 0,
      byStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row.total]),
      ),
      byVenue,
    },
  };
};

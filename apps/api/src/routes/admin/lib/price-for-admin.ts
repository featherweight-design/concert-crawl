import { and, gte, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { events, priceSubmissions } from '@concert-crawl/db';
import { addDays } from './needs-you/keys.js';

// The price-batch window and bar: product calls from the Needs you brief.
export const PRICE_BATCH_MIN_DAYS = 2;
export const PRICE_BATCH_MAX_DAYS = 30;
export const PRICE_BATCH_MIN_CORROBORATIONS = 2;

/**
 * A pending price that is the admin's to decide: held for them (the "approve
 * prices myself" setting stamps `held_for_admin_at`), or backed by enough fans
 * on a show inside the batch window. The one test behind both the Needs you
 * price batch and Submitted prices' Waiting for you chip, so a price the batch
 * offers is always under that chip. Reads the event by id, so it needs no join.
 * `today` is the Mountain Time day (`YYYY-MM-DD`).
 */
export const forAdminClause = (today: string): SQL | undefined =>
  or(
    isNotNull(priceSubmissions.heldForAdminAt),
    and(
      gte(priceSubmissions.corroborationCount, PRICE_BATCH_MIN_CORROBORATIONS),
      sql`EXISTS (SELECT 1 FROM ${events} AS for_admin_event WHERE for_admin_event.id = ${priceSubmissions.eventId} AND for_admin_event.date BETWEEN ${addDays(today, PRICE_BATCH_MIN_DAYS)} AND ${addDays(today, PRICE_BATCH_MAX_DAYS)})`,
    ),
  );

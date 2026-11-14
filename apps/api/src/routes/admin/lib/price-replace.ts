import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db, events, priceSubmissions } from '@concert-crawl/db';
import { REPLACED_BY_ADMIN_REASON } from '@concert-crawl/types';

export type ReplacePriceResult =
  | {
      ok: true;
      submissionId: string;
      before: { priceMin: string | null; priceMax: string | null };
      /** The corroborated prices this replaced, archived as history. */
      replacedIds: string[];
    }
  | { ok: false }
  | { ok: 'contest_lockout' };

/** The tier an admin's own price is entered in, as on the Add a price path. */
const ADMIN_TIER = 'GA';

/**
 * Replace a show's listed price with the admin's own (the event editor's Edit
 * price on a show that already has a fan price; Hugh, 2026-11-14, board
 * 06/edit-price-desktop).
 *
 * The listed price is the single source's tier headline (resolveDisplayPrice),
 * which prefers the cheaper of two prices on the same trust, so a replacement
 * has to retire the prices it replaces. In one transaction:
 * - an open Price check on the show refuses it ('contest_lockout'), as every
 *   price writer does;
 * - every corroborated price in the admin's tier is archived with
 *   REPLACED_BY_ADMIN_REASON. The rows are kept as history, and a fan's own
 *   list still reads them as corroborated (fanStoredStatus), so nobody is
 *   told;
 * - the admin's price goes in corroborated, carrying the source of the
 *   price it replaces, so its trust rank is unchanged;
 * - `events.ticket_price_*` follow for legacy readers only; fan surfaces
 *   read the single source.
 *
 * No price-drop fan-out: the admin is correcting the listing, not reporting
 * a drop. Lock order, as in every price writer: submission rows, then event.
 */
export const replaceListedPrice = async (
  eventId: string,
  adminUserId: string,
  priceMin: string,
  priceMax: string | null,
): Promise<ReplacePriceResult> =>
  db.transaction(async (tx) => {
    const [lockout] = await tx
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          or(
            eq(priceSubmissions.status, 'disputed'),
            and(
              eq(priceSubmissions.status, 'pending'),
              isNotNull(priceSubmissions.disputedSubmissionId),
            ),
          ),
        ),
      )
      .limit(1);
    if (lockout) return { ok: 'contest_lockout' as const };

    const replaced = await tx
      .select({
        id: priceSubmissions.id,
        vendor: priceSubmissions.vendor,
        howFound: priceSubmissions.howFound,
        sourceCategory: priceSubmissions.sourceCategory,
      })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.tier, ADMIN_TIER),
          eq(priceSubmissions.status, 'corroborated'),
        ),
      )
      .orderBy(sql`${priceSubmissions.updatedAt} DESC`)
      .for('update');

    const [event] = await tx
      .select({
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .for('no key update')
      .limit(1);
    if (!event) return { ok: false as const };

    const replacedIds = replaced.map((row) => row.id);
    if (replacedIds.length > 0) {
      await tx
        .update(priceSubmissions)
        .set({
          status: 'archived',
          archivedReason: REPLACED_BY_ADMIN_REASON,
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(inArray(priceSubmissions.id, replacedIds));
    }

    // The newest price it replaces names the source; with none (a crawled
    // price), the admin's own listing check.
    const source = replaced[0];
    const [inserted] = await tx
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: adminUserId,
        tier: ADMIN_TIER,
        vendor: source?.vendor ?? 'Other',
        howFound: source?.howFound ?? 'saw_listing',
        sourceCategory: source?.sourceCategory ?? 'standard',
        priceMin,
        priceMax,
        status: 'corroborated',
      })
      .returning({ id: priceSubmissions.id });
    if (!inserted) return { ok: false as const };

    await tx
      .update(events)
      .set({
        ticketPriceMin: priceMin,
        ticketPriceMax: priceMax,
        priceSource: 'community',
      })
      .where(eq(events.id, eventId));

    return {
      ok: true as const,
      submissionId: inserted.id,
      before: {
        priceMin: event.ticketPriceMin,
        priceMax: event.ticketPriceMax,
      },
      replacedIds,
    };
  });

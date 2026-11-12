// The price hold: while admin_settings.approve_prices_myself is on, a confirm
// that would promote a community price stamps it held_for_admin_at and leaves
// it pending instead. The Needs you price batch (or the admin approve button,
// through setSubmissionStatus) promotes it and clears the stamp.
//
// An update filed on a price under check (a counter, disputedSubmissionId set)
// is never held: it resolves through the price-check flow, which the hold has
// no way to release.

import { eq, sql } from 'drizzle-orm';
import { adminSettings, priceSubmissions } from '@concert-crawl/db';
import type { db } from '@concert-crawl/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The setting, read inside the confirm's transaction. No row, no hold. */
export const readApprovePricesMyself = async (tx: Tx): Promise<boolean> => {
  const [setting] = await tx
    .select({ hold: adminSettings.approvePricesMyself })
    .from(adminSettings)
    .where(eq(adminSettings.id, 1))
    .limit(1);
  return setting?.hold ?? false;
};

/**
 * The status and hold-stamp columns a confirm writes. `hold` is the setting
 * already narrowed to rows that can be held (not a counter). Both columns use
 * the one threshold test, evaluated against the pre-update count.
 */
export const confirmPromotionColumns = (
  hold: boolean,
  confirmsRequired: number,
) => {
  const reaches = sql`${priceSubmissions.corroborationCount} + 1 >= ${confirmsRequired}`;
  return hold
    ? {
        status: sql`${priceSubmissions.status}`,
        heldForAdminAt: sql`CASE
          WHEN ${priceSubmissions.status} = 'pending' AND ${reaches}
            THEN COALESCE(${priceSubmissions.heldForAdminAt}, now())
          ELSE ${priceSubmissions.heldForAdminAt}
        END`,
      }
    : {
        status: sql`CASE
          WHEN ${reaches} THEN 'corroborated'::price_submission_status
          ELSE ${priceSubmissions.status}
        END`,
        // A row held earlier promotes on this confirm or stays pending: either
        // way it no longer waits on an admin.
        heldForAdminAt: null,
      };
};

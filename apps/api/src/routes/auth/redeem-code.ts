import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, giftedComps, inviteCodes } from '@concert-crawl/db'
import { isGiftLive } from '@concert-crawl/entitlements'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { apiLogger } from '../../lib/logger.js'
import { clerkAuth, requireAuth, getAuthUser } from '../../middleware/auth.js'

const redeemSchema = z.object({
  code: z.string().regex(/^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
})

// `gifted_comps.grantedBy` is an admin Clerk ID everywhere else — an audit
// trail for who gave what. A code redemption has no admin behind it, so it
// records the funnel instead. Nothing surfaces this to a reader: the gift
// emails deliberately do not name a granter (billing-daily.ts, #910).
const BETA_GRANTED_BY = 'system:invite-code'

/**
 * Premium for the beta cohort, granted when the code is claimed.
 *
 * Without it a new tester derives `free`: the card-less trial is seeded only
 * for accounts created AFTER `founder_window.opensAt`, which is NULL until
 * launch day, so nobody redeeming a code today is trial-eligible. That left
 * every invited tester locked out of the four Premium features they were
 * invited to test — following, alerts, price-drop alerts and Spotify sync —
 * and it is the shape the monetization spec already assumes, which describes
 * the pre-cutover cohort as "gifted Premium outright" (apps/api/src/lib/trial.ts).
 *
 * NULL `expiresAt` is lifetime, which is what the schema calls the beta
 * cohort's shape. The daily gift job only scans rows with a finite expiry, so
 * these are never swept into the ending-soon mail or the expiry revoke.
 *
 * `onConflictDoNothing` on the unique `user_id` index is what makes it safe to
 * call on both redemption paths, and it deliberately leaves an existing row
 * alone — including a REVOKED one. An admin revoke is a decision, and a second
 * code must not undo it.
 *
 * Returns whether the account ends up holding a LIVE comp, which is not the
 * same as whether this call inserted one: a revoked row means nothing was
 * granted, and the caller uses that to decide whether to mirror.
 */
const grantBetaComp = async (
  tx: Pick<typeof db, 'insert' | 'select'>,
  userId: string,
  now: Date,
): Promise<boolean> => {
  await tx
    .insert(giftedComps)
    .values({
      userId,
      grantedBy: BETA_GRANTED_BY,
      expiresAt: null,
      redeemedAt: now,
    })
    .onConflictDoNothing({ target: giftedComps.userId })

  // Read back rather than assume the insert landed. `onConflictDoNothing`
  // returns nothing either way, and the row already there may be REVOKED — in
  // which case nothing was granted and the caller must not go on to advertise
  // Premium in the Clerk mirror.
  const [comp] = await tx
    .select({
      revokedAt: giftedComps.revokedAt,
      expiresAt: giftedComps.expiresAt,
    })
    .from(giftedComps)
    .where(eq(giftedComps.userId, userId))
    .limit(1)
  return isGiftLive(comp ?? null, now)
}

/**
 * Sets the Clerk entitlement mirror, the JWT-fast path `loadPlanContext` reads
 * alongside `gifted_comps`. The table is the source of truth and wins on
 * disagreement, so this is not what grants anything — but a comp written
 * without it makes every later `/v1/users/me` log a drift warning about a
 * gift that is perfectly correct.
 *
 * Mirrors `repairGiftMirror` in billing-daily, from the other direction, and
 * fails the same way: the grant has already committed, so a mirror that could
 * not be written logs and stands. Nothing repairs it on a READ — plan.ts logs
 * the disagreement and lets the table win — so it is corrected the next time
 * an admin gifting flow touches the account, and the warning until then is
 * noise rather than a wrong entitlement.
 */
const mirrorBetaComp = async (userId: string): Promise<void> => {
  const clerkSecretKey = process.env['CLERK_SECRET_KEY']
  if (!clerkSecretKey) {
    apiLogger.warn(
      { userId },
      'redeem-code: CLERK_SECRET_KEY not set — gift mirror skipped',
    )
    return
  }
  try {
    // Lazy import for the same reason the revoke path uses one: a redemption
    // that grants nothing new should not pay for the Clerk client.
    const { createClerkClient } = await import('@clerk/backend')
    const clerkClient = createClerkClient({ secretKey: clerkSecretKey })
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { plan: 'premium_gifted' },
    })
  } catch (err) {
    apiLogger.error(
      { err, userId },
      'redeem-code: gift mirror write failed — the comp stands; the mirror is corrected by the next admin gifting flow',
    )
  }
}

export const redeemCodeRouter = new Hono().use(clerkAuth).use(requireAuth)

redeemCodeRouter.post('/', zValidator('json', redeemSchema), async (ctx) => {
  const { userId } = getAuthUser(ctx)
  const { code } = ctx.req.valid('json')

  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))

  if (!invite) {
    return ctx.json({ success: false, error: 'notfound' }, 404)
  }

  // Idempotent: already redeemed by this user. The grant runs here too, but
  // only covers a REPEAT of the same trip — a retried POST, a double submit,
  // a reload of /auth/complete while the invite cookie is still live. It does
  // NOT reach a tester who redeemed before this shipped: this handler is only
  // called from /auth/complete, which runs on sign-up alone and only while the
  // signed `invite_verified` cookie is present, and that cookie is deleted on
  // the first successful redemption and cannot be re-minted for a code that
  // already has a `used_by`. Those accounts need the backfill in the PR body.
  if (invite.usedBy === userId) {
    const live = await grantBetaComp(db, userId, new Date())
    if (live) await mirrorBetaComp(userId)
    return ctx.json({ ok: true })
  }

  // Already used by someone else
  if (invite.usedBy) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  if (invite.revokedAt) {
    return ctx.json({ success: false, error: 'revoked' }, 410)
  }

  const now = new Date()
  if (invite.expiresAt && invite.expiresAt < now) {
    return ctx.json({ success: false, error: 'expired' }, 410)
  }

  // One transaction, because the claim and the grant are one act. Split, a
  // crash between them leaves a code marked used by an account that never got
  // the Premium it was redeemed for — and the code cannot be redeemed again to
  // try, which makes it unrepairable without an admin.
  //
  // The conditional update stays the concurrency guard and still runs FIRST:
  // a grant written ahead of it would hand Premium to the loser of a race for
  // the last code, and rolling back afterwards would not help, because the
  // winner's transaction has already committed by then.
  const claimed = await db.transaction(async (tx) => {
    const updated = await tx
      .update(inviteCodes)
      .set({ usedBy: userId, usedAt: now })
      .where(
        and(
          eq(inviteCodes.id, invite.id),
          isNull(inviteCodes.usedBy),
          isNull(inviteCodes.revokedAt),
          or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
        ),
      )
      .returning({ id: inviteCodes.id })

    if (updated.length === 0) return { claimed: false, live: false }

    const live = await grantBetaComp(tx, userId, now)
    return { claimed: true, live }
  })

  if (!claimed.claimed) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  // Outside the transaction: Clerk is a third-party write that cannot be
  // rolled back with the database, and holding a transaction open across a
  // network call to it would be the worse trade.
  //
  // Only for a LIVE comp. An admin revoke is a decision the insert already
  // respects, and mirroring unconditionally would put Clerk back to
  // `premium_gifted` over a row that derives `free` — a disagreement no later
  // read repairs, with the JWT-fast path on the wrong side of it.
  if (claimed.live) await mirrorBetaComp(userId)

  return ctx.json({ ok: true })
})

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { db, inviteCodes, seatsTaken } from '@concert-crawl/db';
import { eq } from 'drizzle-orm';
import { isInviteCodeShape, normalizeInviteCode } from '@concert-crawl/types';
import { checkRateLimit, refundRateLimit } from '../../lib/rate-limit.js';
import { clientIp, rateLimitKeyForIp } from '../../lib/client-ip.js';

/** Wrong codes one IP may try per hour. Valid codes never count. */
const MAX_MISSES = 10;
const WINDOW_MS = 60 * 60 * 1000;

const codeSchema = z.object({
  // Either shape, generated or custom. Uppercased first, because codes are
  // stored uppercase and are not case-sensitive.
  code: z
    .string()
    .transform(normalizeInviteCode)
    .refine(isInviteCodeShape, 'Invalid code format'),
});

export const validateCodeRouter = new Hono();

validateCodeRouter.post(
  '/',
  zValidator('json', codeSchema, validationHook),
  async (ctx) => {
    const limitKey = `validate-code:${rateLimitKeyForIp(clientIp(ctx))}`;
    // The brute-force guard counts misses only, because a poster code puts
    // many real people behind one IP (venue wifi, carrier NAT) and a real
    // code must never spend their budget, even once it is full or expired.
    // Every attempt is counted BEFORE the lookup, so a concurrent burst cannot
    // run more than MAX_MISSES + 1 lookups, and any code that exists refunds
    // its count afterwards. The extra slot is what lets a real code through
    // after MAX_MISSES misses; a miss in it is refused like any over-limit
    // request, so a guesser learns at most MAX_MISSES + 1 answers an hour.
    //
    // Fail closed: the lookup it protects reads the same database, so closing
    // costs almost nothing.
    const limit = await checkRateLimit(limitKey, MAX_MISSES + 1, WINDOW_MS, {
      onStoreError: 'deny',
    });
    const refuse = () => {
      // Set on every 429, store-error denials included: a client that cannot
      // see the window backs off by guessing. A miss refused in the extra slot
      // was allowed by the store, which reports no wait for it, so it gets
      // the whole window: an upper bound, never a prompt to retry at once.
      const waitMs = limit.retryAfterMs || WINDOW_MS;
      ctx.header('Retry-After', String(Math.ceil(waitMs / 1000)));
      return ctx.json({ success: false, error: 'ratelimit' }, 429);
    };
    if (!limit.allowed) return refuse();
    const overMisses = (limit.count ?? MAX_MISSES + 1) > MAX_MISSES;

    const { code } = ctx.req.valid('json');

    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));

    if (!invite || invite.revokedAt) {
      if (overMisses) return refuse();
      return ctx.json({ success: false, error: 'notfound' }, 404);
    }
    await refundRateLimit(limitKey);

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return ctx.json({ success: false, error: 'expired' }, 410);
    }
    // Full once every seat is taken: a single-use code after its one
    // redemption, a poster code after its last.
    if (seatsTaken(invite) >= invite.maxUses) {
      return ctx.json({ success: false, error: 'used' }, 409);
    }

    return ctx.json({ ok: true });
  },
);

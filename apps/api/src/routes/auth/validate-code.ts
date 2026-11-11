import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { db, inviteCodes } from '@concert-crawl/db';
import { eq } from 'drizzle-orm';
import { checkRateLimit, refundRateLimit } from '../../lib/rate-limit.js';

/** Wrong codes one IP may try per hour. Valid codes never count. */
const MAX_MISSES = 10;

const codeSchema = z.object({
  code: z
    .string()
    .regex(/^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid code format'),
});

export const validateCodeRouter = new Hono();

validateCodeRouter.post(
  '/',
  zValidator('json', codeSchema, validationHook),
  async (ctx) => {
    const ip =
      ctx.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limitKey = `validate-code:${ip}`;
    // The brute-force guard counts misses only, because a poster code puts
    // many real people behind one IP (venue wifi, carrier NAT) and a valid
    // code must never spend their budget. Every attempt is counted BEFORE the
    // lookup, so a concurrent burst cannot run more than MAX_MISSES + 1
    // lookups, and a valid code refunds its count afterwards. The extra slot
    // is what lets a real code through after MAX_MISSES misses; a miss in it
    // is refused like any over-limit request.
    //
    // Fail closed: the lookup it protects reads the same database, so closing
    // costs almost nothing.
    const limit = await checkRateLimit(
      limitKey,
      MAX_MISSES + 1,
      60 * 60 * 1000,
      { onStoreError: 'deny' },
    );
    const refuse = () => {
      // Set on every 429, store-error denials included: a client that cannot
      // see the window backs off by guessing.
      ctx.header('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
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
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return ctx.json({ success: false, error: 'expired' }, 410);
    }
    // Full once every seat is taken: a single-use code after its one
    // redemption, a poster code after its last.
    if (invite.useCount >= invite.maxUses) {
      return ctx.json({ success: false, error: 'used' }, 409);
    }

    await refundRateLimit(limitKey);
    return ctx.json({ ok: true });
  },
);

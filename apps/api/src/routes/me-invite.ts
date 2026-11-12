// apps/api/src/routes/me-invite.ts
// Share Concert Crawl by QR (PR 1): the signed-in person's own share code.
//
// GET /v1/me/invite is get-or-create: the first read makes the code, every later
// read returns it. It is the code and nothing else the sheet needs: no `mode`
// (the web decides whether the app is open) and no `url` (the web builds the
// link from its own origin). A revoked code is returned as revoked, never
// replaced, so turning it off sticks.
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  db,
  inviteCodeRedemptions,
  inviteCodes,
  userProfiles,
} from '@concert-crawl/db';
import type { MeInviteResponse } from '@concert-crawl/types';
import { requireAuth } from '../middleware/auth.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import {
  MEMBER_CODE_SEATS,
  generateInviteCode,
} from '../lib/invite-code-generation.js';

/** The newest few people who joined, for the sheet's strip. */
const FACE_LIMIT = 4;
/** A collision on `code` is astronomically rare; this only bounds the loop. */
const MAX_CODE_ATTEMPTS = 5;
const RATE_LIMIT = { limit: 30, windowMs: 5 * 60 * 1000 } as const;

// The response contract, checked before it leaves: a joiner is initial and
// colors only, so a field added to the query later cannot reach the client
// without being named here.
export const meInviteResponseSchema = z
  .object({
    code: z.string().min(1),
    revoked: z.boolean(),
    joined: z
      .object({
        count: z.number().int().min(0),
        faces: z
          .array(
            z
              .object({
                handle: z.string().nullable(),
                avatarColor: z.string().nullable(),
                avatarSecondColor: z.string().nullable(),
              })
              .strict(),
          )
          .max(FACE_LIMIT),
      })
      .strict(),
  })
  .strict();

export const meInviteRouter = new Hono();

meInviteRouter.use('*', clerkMiddleware());

const findMemberCode = async (userId: string) => {
  const [row] = await db
    .select({
      id: inviteCodes.id,
      code: inviteCodes.code,
      revokedAt: inviteCodes.revokedAt,
    })
    .from(inviteCodes)
    .where(
      and(eq(inviteCodes.createdBy, userId), eq(inviteCodes.kind, 'member')),
    )
    .limit(1);
  return row ?? null;
};

/**
 * The person's member code, made if they have none. The partial unique index on
 * (created_by) for member codes is what settles a double open: the loser's
 * insert is a no-op and it reads the winner's row. A collision on `code` itself
 * leaves no row to read, so it retries with a new code.
 */
const getOrCreateMemberCode = async (userId: string) => {
  const existing = await findMemberCode(userId);
  if (existing) return existing;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    await db
      .insert(inviteCodes)
      .values({
        code: generateInviteCode(),
        createdBy: userId,
        kind: 'member',
        maxUses: MEMBER_CODE_SEATS,
      })
      .onConflictDoNothing();
    const row = await findMemberCode(userId);
    if (row) return row;
  }
  return null;
};

// GET /v1/me/invite
meInviteRouter.get('/invite', requireAuth, async (ctx) => {
  const userId = getAuth(ctx)?.userId;
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401);

  const { allowed, retryAfterMs } = await checkRateLimit(
    `me-invite:${userId}`,
    RATE_LIMIT.limit,
    RATE_LIMIT.windowMs,
    // Authenticated and cheap, and the sheet must open during a store blip.
    { onStoreError: 'allow', userId },
  );
  if (!allowed) {
    ctx.header('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
    return ctx.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      429,
    );
  }

  const member = await getOrCreateMemberCode(userId);
  if (!member) {
    return ctx.json({ success: false, error: 'Could not make a code' }, 503);
  }

  const [[total], faces] = await Promise.all([
    db
      .select({ value: count() })
      .from(inviteCodeRedemptions)
      .where(eq(inviteCodeRedemptions.codeId, member.id)),
    db
      .select({
        handle: userProfiles.handle,
        avatarColor: userProfiles.avatarColor,
        avatarSecondColor: userProfiles.avatarSecondColor,
      })
      .from(inviteCodeRedemptions)
      .leftJoin(
        userProfiles,
        eq(userProfiles.userId, inviteCodeRedemptions.userId),
      )
      .where(eq(inviteCodeRedemptions.codeId, member.id))
      .orderBy(desc(inviteCodeRedemptions.redeemedAt))
      .limit(FACE_LIMIT),
  ]);

  const body: MeInviteResponse = {
    code: member.code,
    revoked: member.revokedAt !== null,
    joined: {
      count: total?.value ?? 0,
      faces: faces.map((face) => ({
        handle: face.handle ?? null,
        avatarColor: face.avatarColor ?? null,
        avatarSecondColor: face.avatarSecondColor ?? null,
      })),
    },
  };

  // Personal: no shared cache may hold it.
  ctx.header('Cache-Control', 'private, no-store');
  return ctx.json({
    success: true,
    data: meInviteResponseSchema.parse(body),
  });
});

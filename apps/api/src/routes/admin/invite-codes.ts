import { Hono } from 'hono';
import {
  db,
  inviteCodeRedemptions,
  inviteCodes,
  inviteSeatsTaken,
  seatsTaken,
  userProfiles,
} from '@concert-crawl/db';
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  like,
  lte,
  max,
  or,
} from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { createClerkClient } from '@clerk/backend';
import {
  CUSTOM_INVITE_CODE_MAX_LENGTH,
  CUSTOM_INVITE_CODE_MIN_LENGTH,
  RESERVED_INVITE_CODE_PREFIX,
  isCustomInviteCode,
  isRole,
  normalizeInviteCode,
  type InviteCodeRedemption,
  type InviteCodeRedemptionsResponse,
  type Role,
} from '@concert-crawl/types';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { getAuthUser } from '../../middleware/auth.js';
import { generateInviteCode } from '../../lib/invite-code-generation.js';
import type { AdminVariables } from './index.js';
import { sendInviteCodeEmail } from '../../lib/email.js';
import { apiLogger } from '../../lib/logger.js';
import { runBackgroundTask } from '../../lib/background-tasks.js';
import { isUniqueViolationOn } from '../../lib/pg-errors.js';

const clerkClient = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'] ?? '',
});

// The same ceiling the create route enforces.
const MAX_INVITE_SEATS = 500;

/** An expiry at or before `now` has ended the code. Null means never. */
const isExpired = (expiresAt: Date | null, now: Date): boolean =>
  expiresAt != null && expiresAt <= now;

// The unique constraint on `invite_codes.code` (drizzle's default name for
// `.unique()`). It is the only check that a custom code is free: the insert
// either lands or trips it, so there is no window between a check and a write.
const INVITE_CODE_UNIQUE = 'invite_codes_code_unique';

// Suffixes tried for a suggestion: up to three digits, 2 to 999.
const MAX_SUGGESTION_SUFFIX = 999;

/**
 * A free code to offer when `code` is taken: the code with the lowest free
 * number on the end ("REDROCKS2"), trimmed to fit the 20-character limit.
 * One query reads every code sharing the shortest stem a suffix could leave,
 * so a busy name ("REDROCKS2" to "REDROCKS40") still gets an answer. Null
 * only when all 998 are taken.
 */
const suggestFreeCode = async (code: string): Promise<string | null> => {
  const candidateFor = (num: number): string => {
    const suffix = String(num);
    return `${code.slice(0, CUSTOM_INVITE_CODE_MAX_LENGTH - suffix.length)}${suffix}`;
  };
  const stem = code.slice(
    0,
    CUSTOM_INVITE_CODE_MAX_LENGTH - String(MAX_SUGGESTION_SUFFIX).length,
  );
  const taken = await db
    .select({ code: inviteCodes.code })
    .from(inviteCodes)
    // Codes are letters and numbers only, so the stem has no LIKE wildcards.
    .where(like(inviteCodes.code, `${stem}%`));
  const takenSet = new Set(taken.map((row) => row.code));
  for (let num = 2; num <= MAX_SUGGESTION_SUFFIX; num += 1) {
    const candidate = candidateFor(num);
    if (!takenSet.has(candidate)) return candidate;
  }
  return null;
};

const codeTakenResponse = async (code: string) => ({
  success: false as const,
  error: 'code_taken' as const,
  code,
  suggestion: await suggestFreeCode(code),
});

const generateCodeSchema = z
  .object({
    // A custom code (admin redesign 5b): 4 to 20 letters and numbers, not
    // case-sensitive, so it is stored uppercase. Left out, a BETA- code is
    // generated as before.
    code: z
      .string()
      .transform(normalizeInviteCode)
      .refine(isCustomInviteCode, {
        message: `Use ${CUSTOM_INVITE_CODE_MIN_LENGTH} to ${CUSTOM_INVITE_CODE_MAX_LENGTH} letters and numbers, not starting with ${RESERVED_INVITE_CODE_PREFIX}`,
      })
      .optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    recipientEmail: z.string().email().optional(),
    // A poster code admits many people; a personal code (the default) admits one.
    label: z.string().trim().min(1).max(120).optional(),
    maxUses: z.number().int().min(1).max(MAX_INVITE_SEATS).optional(),
  })
  .refine(
    // An emailed invite is personal; a multi-seat code sent as one would let
    // every forward of the email in.
    (body) => !(body.recipientEmail && (body.maxUses ?? 1) > 1),
    {
      message: 'A code sent to one person admits one person',
      path: ['maxUses'],
    },
  );

export const inviteCodesAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/invite-codes — list all codes, with the maker's handle and
// when each was last used (the latest redemption, else the legacy used_at).
inviteCodesAdminRouter.get('/', async (ctx) => {
  const lastRedemption = db
    .select({
      codeId: inviteCodeRedemptions.codeId,
      lastRedeemedAt: max(inviteCodeRedemptions.redeemedAt).as(
        'last_redeemed_at',
      ),
    })
    .from(inviteCodeRedemptions)
    .groupBy(inviteCodeRedemptions.codeId)
    .as('last_redemption');

  const rows = await db
    .select({
      code: inviteCodes,
      createdByHandle: userProfiles.handle,
      lastRedeemedAt: lastRedemption.lastRedeemedAt,
    })
    .from(inviteCodes)
    .leftJoin(userProfiles, eq(userProfiles.userId, inviteCodes.createdBy))
    .leftJoin(lastRedemption, eq(lastRedemption.codeId, inviteCodes.id))
    .orderBy(inviteCodes.createdAt);

  const data = rows.map((row) => ({
    ...row.code,
    createdByHandle: row.createdByHandle ?? null,
    lastUsedAt: row.lastRedeemedAt ?? row.code.usedAt ?? null,
  }));
  return ctx.json({ success: true, data });
});

const codeIdParamSchema = z.object({ id: z.string().uuid() });

// An expiry is an ISO instant, or null for "never".
const expiresAtSchema = z.string().datetime({ offset: true }).nullable();

const editCodeSchema = z
  .object({
    label: z.string().trim().min(1).max(120).nullable().optional(),
    maxUses: z.number().int().min(1).max(MAX_INVITE_SEATS).optional(),
    expiresAt: expiresAtSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to change',
  });

// PATCH /v1/admin/invite-codes/:id — edit a live code's label, seats or expiry.
// The code itself never changes. Seats can't go below the seats already taken;
// that check runs inside the UPDATE so a redemption landing mid-edit can't
// slip under it.
inviteCodesAdminRouter.patch(
  '/:id',
  zValidator('param', codeIdParamSchema, validationHook),
  zValidator('json', editCodeSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { userId } = getAuthUser(ctx);
    const body = ctx.req.valid('json');

    const [existing] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id));
    if (!existing) {
      return ctx.json({ success: false, error: 'Invite code not found' }, 404);
    }
    const now = new Date();
    // Edit is for live codes. An ended code comes back only through
    // reactivate, so its audit says so.
    if (existing.revokedAt || isExpired(existing.expiresAt, now)) {
      return ctx.json(
        { success: false, error: 'Invite code has ended; reactivate it first' },
        409,
      );
    }

    const changes: Partial<typeof inviteCodes.$inferInsert> = {};
    if (body.label !== undefined) changes.label = body.label;
    if (body.maxUses !== undefined) changes.maxUses = body.maxUses;
    if (body.expiresAt !== undefined) {
      const nextExpiry = body.expiresAt ? new Date(body.expiresAt) : null;
      if (isExpired(nextExpiry, now)) {
        return ctx.json(
          { success: false, error: 'Pick an expiry in the future' },
          400,
        );
      }
      changes.expiresAt = nextExpiry;
    }

    const seatGuard =
      body.maxUses === undefined
        ? undefined
        : lte(inviteSeatsTaken(), body.maxUses);
    const [updated] = await db
      .update(inviteCodes)
      .set(changes)
      .where(
        and(
          eq(inviteCodes.id, id),
          isNull(inviteCodes.revokedAt),
          or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
          seatGuard,
        ),
      )
      .returning();

    if (!updated) {
      // The row changed under us: say why from its current state.
      const [current] = await db
        .select()
        .from(inviteCodes)
        .where(eq(inviteCodes.id, id));
      if (!current) {
        return ctx.json(
          { success: false, error: 'Invite code not found' },
          404,
        );
      }
      if (current.revokedAt || isExpired(current.expiresAt, now)) {
        return ctx.json(
          {
            success: false,
            error: 'Invite code has ended; reactivate it first',
          },
          409,
        );
      }
      return ctx.json(
        {
          success: false,
          error: `Seats can't go below the ${seatsTaken(current)} already used`,
        },
        409,
      );
    }

    ctx.set('auditAction', 'invite_code.edit');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', userId);
    ctx.set('auditMeta', { changes: body });

    return ctx.json({ success: true, data: updated });
  },
);

const reactivateSchema = z
  .object({ expiresAt: expiresAtSchema.optional() })
  .strict();

// POST /v1/admin/invite-codes/:id/reactivate — bring an ended code back.
// Clears the revoke, and takes a new expiry when one is given (null = never).
// Refuses a code that isn't ended, and one that would still be expired after.
inviteCodesAdminRouter.post(
  '/:id/reactivate',
  zValidator('param', codeIdParamSchema, validationHook),
  zValidator('json', reactivateSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { userId } = getAuthUser(ctx);
    const { expiresAt } = ctx.req.valid('json');
    const now = new Date();

    const [existing] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id));
    if (!existing) {
      return ctx.json({ success: false, error: 'Invite code not found' }, 404);
    }

    if (!existing.revokedAt && !isExpired(existing.expiresAt, now)) {
      return ctx.json(
        { success: false, error: 'Invite code is not ended' },
        409,
      );
    }

    const nextExpiry =
      expiresAt === undefined
        ? existing.expiresAt
        : expiresAt
          ? new Date(expiresAt)
          : null;
    if (isExpired(nextExpiry, now)) {
      return ctx.json(
        { success: false, error: 'Pick an expiry in the future' },
        400,
      );
    }

    // Only write over the state this request read, so a revoke or edit that
    // lands in between isn't silently undone.
    const [updated] = await db
      .update(inviteCodes)
      .set({ revokedAt: null, revokedBy: null, expiresAt: nextExpiry })
      .where(
        and(
          eq(inviteCodes.id, id),
          existing.revokedAt
            ? eq(inviteCodes.revokedAt, existing.revokedAt)
            : isNull(inviteCodes.revokedAt),
          existing.expiresAt
            ? eq(inviteCodes.expiresAt, existing.expiresAt)
            : isNull(inviteCodes.expiresAt),
        ),
      )
      .returning();
    if (!updated) {
      return ctx.json(
        {
          success: false,
          error: 'Invite code changed while you were editing; try again',
        },
        409,
      );
    }

    ctx.set('auditAction', 'invite_code.reactivate');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', userId);
    ctx.set('auditMeta', {
      wasRevoked: existing.revokedAt != null,
      expiresAt: nextExpiry ? nextExpiry.toISOString() : null,
    });

    return ctx.json({ success: true, data: updated });
  },
);

const redemptionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(5),
});

// Roles come from Clerk. A Clerk failure leaves the role null rather than
// failing the panel: who joined is still worth showing.
async function rolesFor(userIds: string[]): Promise<Map<string, Role>> {
  const roles = new Map<string, Role>();
  if (userIds.length === 0) return roles;
  try {
    const result = await clerkClient.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });
    for (const user of result.data) {
      const raw: unknown = user.publicMetadata['role'];
      roles.set(user.id, isRole(raw) ? raw : 'user');
    }
  } catch (err) {
    apiLogger.warn(
      { err },
      'Invite code redemptions: Clerk role lookup failed',
    );
  }
  return roles;
}

// GET /v1/admin/invite-codes/:id/redemptions — who joined with a code, newest
// first. A pre-redemptions-table code recorded only its first user in
// used_by/used_at; that person is included when the table has no row for them.
inviteCodesAdminRouter.get(
  '/:id/redemptions',
  zValidator('param', codeIdParamSchema, validationHook),
  zValidator('query', redemptionsQuerySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { limit } = ctx.req.valid('query');

    const [existing] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id));
    if (!existing) {
      return ctx.json({ success: false, error: 'Invite code not found' }, 404);
    }

    const byCode = eq(inviteCodeRedemptions.codeId, id);
    const [rows, [counted], legacyRow] = await Promise.all([
      db
        .select({
          userId: inviteCodeRedemptions.userId,
          redeemedAt: inviteCodeRedemptions.redeemedAt,
        })
        .from(inviteCodeRedemptions)
        .where(byCode)
        .orderBy(desc(inviteCodeRedemptions.redeemedAt))
        .limit(limit),
      db.select({ total: count() }).from(inviteCodeRedemptions).where(byCode),
      existing.usedBy
        ? db
            .select({ userId: inviteCodeRedemptions.userId })
            .from(inviteCodeRedemptions)
            .where(
              and(byCode, eq(inviteCodeRedemptions.userId, existing.usedBy)),
            )
        : Promise.resolve([]),
    ]);

    // The legacy first user, when the redemptions table has no row for them.
    const legacy =
      existing.usedBy && existing.usedAt && legacyRow.length === 0
        ? { userId: existing.usedBy, redeemedAt: existing.usedAt }
        : null;
    const people = legacy ? [...rows, legacy] : rows;
    people.sort(
      (left, right) => right.redeemedAt.getTime() - left.redeemedAt.getTime(),
    );
    const total = (counted?.total ?? 0) + (legacy ? 1 : 0);

    const page = people.slice(0, limit);
    const ids = page.map((person) => person.userId);
    const [profiles, roles] = await Promise.all([
      ids.length === 0
        ? Promise.resolve([])
        : db
            .select({
              userId: userProfiles.userId,
              handle: userProfiles.handle,
            })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, ids)),
      rolesFor(ids),
    ]);
    const handles = new Map(
      profiles.map((profile) => [profile.userId, profile.handle]),
    );

    const data: InviteCodeRedemption[] = page.map((person) => ({
      userId: person.userId,
      handle: handles.get(person.userId) ?? null,
      role: roles.get(person.userId) ?? null,
      redeemedAt: person.redeemedAt.toISOString(),
    }));
    const body: InviteCodeRedemptionsResponse = { data, total };
    return ctx.json({ success: true, data: body });
  },
);

// POST /v1/admin/invite-codes — generate a new code
inviteCodesAdminRouter.post(
  '/',
  zValidator('json', generateCodeSchema, validationHook),
  async (ctx) => {
    const { userId } = getAuthUser(ctx);
    const {
      code: customCode,
      expiresAt,
      recipientEmail,
      label,
      maxUses,
    } = ctx.req.valid('json');

    // A taken custom code is answered from the unique constraint (see
    // INVITE_CODE_UNIQUE), never from a separate check.
    let code: typeof inviteCodes.$inferSelect | undefined;
    try {
      [code] = await db
        .insert(inviteCodes)
        .values({
          code: customCode ?? generateInviteCode(),
          createdBy: userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          label: label ?? null,
          maxUses: maxUses ?? 1,
        })
        .returning();
    } catch (err) {
      if (customCode && isUniqueViolationOn(err, INVITE_CODE_UNIQUE)) {
        return ctx.json(await codeTakenResponse(customCode), 409);
      }
      throw err;
    }

    if (!code) {
      return ctx.json(
        {
          success: false,
          error:
            'Invite code was created but no row was returned by the database',
        },
        500,
      );
    }

    ctx.set('auditAction', 'invite_code.create');
    ctx.set('auditTargetId', code.id);
    ctx.set('auditActorId', userId);
    ctx.set('auditMeta', {
      label: code.label,
      maxUses: code.maxUses,
      custom: customCode !== undefined,
    });

    if (recipientEmail) {
      runBackgroundTask(async () => {
        try {
          await sendInviteCodeEmail(recipientEmail, code.code);
        } catch (err) {
          apiLogger.error({ err }, 'Failed to send invite code email');
        }
      });
    }

    return ctx.json({ success: true, data: code }, 201);
  },
);

// POST /v1/admin/invite-codes/:id/revoke — revoke a code
inviteCodesAdminRouter.post(
  '/:id/revoke',
  zValidator('param', codeIdParamSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { userId } = getAuthUser(ctx);

    const [existing] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id));
    if (!existing) {
      return ctx.json({ success: false, error: 'Invite code not found' }, 404);
    }
    if (existing.revokedAt) {
      return ctx.json(
        { success: false, error: 'Invite code already revoked' },
        400,
      );
    }

    // Guarded on still being live, so two admins pressing at once can't both
    // write: the second sees no row and gets the same answer as a late press,
    // and the audit names whoever actually revoked it.
    const [updated] = await db
      .update(inviteCodes)
      .set({ revokedAt: new Date(), revokedBy: userId })
      .where(and(eq(inviteCodes.id, id), isNull(inviteCodes.revokedAt)))
      .returning();
    if (!updated) {
      return ctx.json(
        { success: false, error: 'Invite code already revoked' },
        400,
      );
    }

    ctx.set('auditAction', 'invite_code.revoke');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', userId);

    return ctx.json({ success: true, data: updated });
  },
);

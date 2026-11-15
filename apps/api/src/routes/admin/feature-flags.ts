import {
  db,
  featureFlagHistory,
  featureFlagUsers,
  featureFlags,
  type FeatureFlagRow,
} from '@concert-crawl/db';
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  isFeatureFlagKey,
  type AdminFeatureFlag,
  type FeatureFlagKey,
} from '@concert-crawl/entitlements';
import { getAuth } from '@hono/clerk-auth';
import { and, desc, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';

import { clearFeatureFlagCache } from '../../lib/feature-flags.js';
import {
  FLAG_STAGES,
  isStagingEnvironment,
  stepsUp,
  type FlagStage,
} from '../../lib/flag-ladder.js';
import type { AdminVariables } from './index.js';

export const featureFlagsAdminRouter = new Hono<AdminVariables>();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// A flag's rung, written either as the new `stage` or as the old boolean
// (`enabled`: true is Everyone, false is Off). Moving to Everyone in production
// also needs `confirm: true`, the API half of the web dialog that asks first.
const patchSchema = z
  .object({
    enabled: z.boolean().optional(),
    stage: z.enum(FLAG_STAGES).optional(),
    confirm: z.boolean().optional(),
  })
  .refine((body) => body.enabled !== undefined || body.stage !== undefined);

const personSchema = z.object({ userId: z.string().trim().min(1).max(200) });

const verifySchema = z.object({
  note: z.string().trim().max(500).optional(),
  // The short check, stored as booleans beside the note. Not required.
  checks: z.record(z.string().max(60), z.boolean()).optional(),
});

const defaultStage = (key: FeatureFlagKey): FlagStage =>
  featureFlagDefaults()[key] ? 'everyone' : 'off';

const loadPeople = async (key: FeatureFlagKey): Promise<string[]> => {
  const rows = await db
    .select({ userId: featureFlagUsers.userId })
    .from(featureFlagUsers)
    .where(eq(featureFlagUsers.flagKey, key));
  return rows.map((row) => row.userId).sort();
};

const toAdminFlag = (
  key: FeatureFlagKey,
  row: FeatureFlagRow | undefined,
  people: string[],
): AdminFeatureFlag => {
  const staging = isStagingEnvironment();
  const stage = row?.stage ?? defaultStage(key);
  return {
    key,
    label: FEATURE_FLAGS[key].label,
    description: FEATURE_FLAGS[key].description,
    enabled: row?.enabled ?? featureFlagDefaults()[key],
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
    stage,
    stageOwnerUserId: row?.stageOwnerUserId ?? null,
    verifiedAt: row?.verifiedAt?.toISOString() ?? null,
    verifiedBy: row?.verifiedBy ?? null,
    verifiedNote: row?.verifiedNote ?? null,
    people,
    environment: staging ? 'staging' : 'production',
    // Production keeps a flag locked until it is verified there: stepping up
    // needs the mark. Stepping down never does.
    locked: !staging && row?.verifiedAt == null,
  };
};

// The row a ladder write hangs on. A flag nobody has touched has no row yet;
// the named people and the history both reference one, so it is created from
// the registry default (the same rung it was already reading as).
const ensureRow = async (
  tx: Tx,
  key: FeatureFlagKey,
  actorId: string,
): Promise<FeatureFlagRow> => {
  const stage = defaultStage(key);
  await tx
    .insert(featureFlags)
    .values({
      key,
      enabled: stage === 'everyone',
      stage,
      updatedBy: actorId,
    })
    .onConflictDoNothing();
  const [row] = await tx
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key));
  if (!row) throw new Error('feature flag row missing after insert');
  return row;
};

const audit = (
  ctx: Context<AdminVariables>,
  key: FeatureFlagKey,
  actorId: string,
  meta: Record<string, unknown>,
): void => {
  ctx.set('auditAction', 'feature_flag.toggle');
  ctx.set('auditTargetId', `feature_flag:${key}`);
  ctx.set('auditActorId', actorId);
  ctx.set('auditMeta', meta);
};

featureFlagsAdminRouter.get('/', async (ctx) => {
  // Reads storage directly rather than through the 30s-memoized loader: an
  // admin toggling a flag has to see its own write, and mixing a cached
  // `enabled` with a fresh `updatedAt` would show a row that never existed.
  const [rows, people] = await Promise.all([
    db.select().from(featureFlags),
    db.select().from(featureFlagUsers),
  ]);
  const stored = new Map(rows.map((row) => [row.key, row]));

  const data: AdminFeatureFlag[] = FEATURE_FLAG_KEYS.map((key) =>
    toAdminFlag(
      key,
      stored.get(key),
      people
        .filter((person) => person.flagKey === key)
        .map((person) => person.userId)
        .sort(),
    ),
  );

  return ctx.json({ success: true, data });
});

featureFlagsAdminRouter.patch('/:key', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }

  const parsed = patchSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!parsed.success) {
    return ctx.json(
      { success: false, error: 'send a stage, or enabled as a boolean' },
      400,
    );
  }

  const auth = getAuth(ctx);
  const actorId = auth?.userId ?? 'unknown';
  const { enabled, confirm } = parsed.data;
  const toStage: FlagStage =
    parsed.data.stage ?? (enabled ? 'everyone' : 'off');
  const staging = isStagingEnvironment();
  // Set explicitly in both branches: DEFAULT now() fires on insert only, so an
  // update that omitted it would freeze the timestamp at the first toggle.
  const updatedAt = new Date();

  type Outcome =
    | { ok: true; row: FeatureFlagRow; from: FlagStage }
    | { ok: false; status: 400 | 409; error: string };

  const outcome: Outcome = await db.transaction(async (tx) => {
    const before = await ensureRow(tx, key, actorId);
    const from = before.stage;

    // Production's lock: a flag climbs only once it is verified there, and
    // Everyone asks first. Stepping down or off is always allowed: turning a
    // feature off must never be blocked.
    if (!staging && stepsUp(from, toStage)) {
      if (before.verifiedAt == null) {
        return { ok: false, status: 409, error: 'flag_not_verified' };
      }
      if (toStage === 'everyone' && confirm !== true) {
        return { ok: false, status: 400, error: 'confirm_required' };
      }
    }

    const moved = from !== toStage;
    // On staging a new rung is a new thing to check, so the mark is cleared
    // and the flag must be verified again.
    const clearsMark = staging && moved && before.verifiedAt != null;

    const [saved] = await tx
      .update(featureFlags)
      .set({
        // `enabled` is the old boolean, kept until the contract step: on only
        // at Everyone.
        enabled: toStage === 'everyone',
        stage: toStage,
        // "Me" is the admin who set that rung; it is kept as the flag climbs
        // so they keep seeing it.
        stageOwnerUserId: toStage === 'me' ? actorId : before.stageOwnerUserId,
        ...(clearsMark
          ? { verifiedAt: null, verifiedBy: null, verifiedNote: null }
          : {}),
        updatedAt,
        updatedBy: actorId,
      })
      .where(eq(featureFlags.key, key))
      .returning();
    if (!saved) throw new Error('feature flag update returned no row');

    if (moved) {
      await tx.insert(featureFlagHistory).values({
        flagKey: key,
        kind: 'stage_set',
        fromStage: from,
        toStage,
        actorUserId: actorId,
        createdAt: updatedAt,
      });
    }
    if (clearsMark) {
      await tx.insert(featureFlagHistory).values({
        flagKey: key,
        kind: 'unverified',
        actorUserId: actorId,
        note: 'stage changed',
        createdAt: updatedAt,
      });
    }
    return { ok: true, row: saved, from };
  });

  if (!outcome.ok) {
    return ctx.json({ success: false, error: outcome.error }, outcome.status);
  }

  // In-process only. Other instances converge within the loader's TTL, which
  // is the tolerance the 30s memo already accepts.
  clearFeatureFlagCache();

  audit(ctx, key, actorId, {
    kind: 'stage',
    enabled: toStage === 'everyone',
    from: outcome.from,
    stage: toStage,
  });

  return ctx.json({
    success: true,
    data: toAdminFlag(key, outcome.row, await loadPeople(key)),
  });
});

// A named person: sees the flag at Me and Beta without a role.
featureFlagsAdminRouter.post('/:key/people', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }
  const parsed = personSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'userId is required' }, 400);
  }
  const actorId = getAuth(ctx)?.userId ?? 'unknown';
  const { userId } = parsed.data;

  const row = await db.transaction(async (tx) => {
    const flag = await ensureRow(tx, key, actorId);
    const added = await tx
      .insert(featureFlagUsers)
      .values({ flagKey: key, userId, addedBy: actorId })
      .onConflictDoNothing()
      .returning({ userId: featureFlagUsers.userId });
    if (added.length > 0) {
      await tx.insert(featureFlagHistory).values({
        flagKey: key,
        kind: 'person_added',
        subjectUserId: userId,
        actorUserId: actorId,
      });
    }
    return flag;
  });

  clearFeatureFlagCache();
  audit(ctx, key, actorId, { kind: 'person_added', userId });
  return ctx.json({
    success: true,
    data: toAdminFlag(key, row, await loadPeople(key)),
  });
});

featureFlagsAdminRouter.delete('/:key/people/:userId', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }
  const userId = ctx.req.param('userId');
  const actorId = getAuth(ctx)?.userId ?? 'unknown';

  const row = await db.transaction(async (tx) => {
    const flag = await ensureRow(tx, key, actorId);
    const removed = await tx
      .delete(featureFlagUsers)
      .where(
        and(
          eq(featureFlagUsers.flagKey, key),
          eq(featureFlagUsers.userId, userId),
        ),
      )
      .returning({ userId: featureFlagUsers.userId });
    if (removed.length > 0) {
      await tx.insert(featureFlagHistory).values({
        flagKey: key,
        kind: 'person_removed',
        subjectUserId: userId,
        actorUserId: actorId,
      });
    }
    return flag;
  });

  clearFeatureFlagCache();
  audit(ctx, key, actorId, { kind: 'person_removed', userId });
  return ctx.json({
    success: true,
    data: toAdminFlag(key, row, await loadPeople(key)),
  });
});

// Mark verified: a hand-set mark. Production keeps a flag locked until it is
// set there; it makes no call to the other environment.
featureFlagsAdminRouter.post('/:key/verify', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }
  const parsed = verifySchema.safeParse(await ctx.req.json().catch(() => ({})));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'invalid verify body' }, 400);
  }
  const actorId = getAuth(ctx)?.userId ?? 'unknown';
  const now = new Date();

  const row = await db.transaction(async (tx) => {
    await ensureRow(tx, key, actorId);
    const [saved] = await tx
      .update(featureFlags)
      .set({
        verifiedAt: now,
        verifiedBy: actorId,
        verifiedNote: parsed.data.note ?? null,
      })
      .where(eq(featureFlags.key, key))
      .returning();
    if (!saved) throw new Error('feature flag verify returned no row');
    await tx.insert(featureFlagHistory).values({
      flagKey: key,
      kind: 'verified',
      actorUserId: actorId,
      note: parsed.data.note ?? null,
      checks: parsed.data.checks ?? null,
      createdAt: now,
    });
    return saved;
  });

  audit(ctx, key, actorId, { kind: 'verified' });
  return ctx.json({
    success: true,
    data: toAdminFlag(key, row, await loadPeople(key)),
  });
});

// Undo verify: clears the mark, nothing else.
featureFlagsAdminRouter.delete('/:key/verify', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }
  const actorId = getAuth(ctx)?.userId ?? 'unknown';

  const row = await db.transaction(async (tx) => {
    const before = await ensureRow(tx, key, actorId);
    if (before.verifiedAt == null) return before;
    const [saved] = await tx
      .update(featureFlags)
      .set({ verifiedAt: null, verifiedBy: null, verifiedNote: null })
      .where(eq(featureFlags.key, key))
      .returning();
    if (!saved) throw new Error('feature flag unverify returned no row');
    await tx.insert(featureFlagHistory).values({
      flagKey: key,
      kind: 'unverified',
      actorUserId: actorId,
    });
    return saved;
  });

  audit(ctx, key, actorId, { kind: 'unverified' });
  return ctx.json({
    success: true,
    data: toAdminFlag(key, row, await loadPeople(key)),
  });
});

featureFlagsAdminRouter.get('/:key/history', async (ctx) => {
  const key = ctx.req.param('key');
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404);
  }
  const rows = await db
    .select()
    .from(featureFlagHistory)
    .where(eq(featureFlagHistory.flagKey, key))
    .orderBy(desc(featureFlagHistory.createdAt))
    .limit(100);
  return ctx.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      fromStage: row.fromStage,
      toStage: row.toStage,
      subjectUserId: row.subjectUserId,
      actorUserId: row.actorUserId,
      note: row.note,
      checks: row.checks,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

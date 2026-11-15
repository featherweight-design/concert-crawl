import { z } from 'zod';

/**
 * The feature-flag ladder (admin redesign Phase 5c). Pure rules, no IO: the
 * loader, the gate and the admin routes all read the same functions, so a flag
 * means one thing everywhere.
 */

export const FLAG_STAGES = ['off', 'me', 'beta', 'everyone'] as const;
export type FlagStage = (typeof FLAG_STAGES)[number];

const STAGE_RANK: Record<FlagStage, number> = {
  off: 0,
  me: 1,
  beta: 2,
  everyone: 3,
};

/** True when `to` is a higher rung than `from`: the only move production locks. */
export const stepsUp = (from: FlagStage, to: FlagStage): boolean =>
  STAGE_RANK[to] > STAGE_RANK[from];

/** Who is asking: a signed-in user and their Clerk role. Logged-out is `null`. */
export interface FlagViewer {
  userId: string;
  role: string | null;
}

const claimsSchema = z
  .object({ metadata: z.object({ role: z.string().optional() }).optional() })
  .passthrough();

/**
 * The viewer behind a Clerk auth object, or null when nobody is signed in. The
 * role comes from the session token's `metadata.role` claim, like every other
 * role gate in the API.
 */
export const flagViewerFrom = (
  auth: { userId?: string | null; sessionClaims?: unknown } | null | undefined,
): FlagViewer | null => {
  if (!auth?.userId) return null;
  const claims = claimsSchema.safeParse(auth.sessionClaims);
  return {
    userId: auth.userId,
    role: claims.success ? (claims.data.metadata?.role ?? null) : null,
  };
};

/** What the loader keeps per flag: its rung, who "Me" is, and the named people. */
export interface FlagState {
  stage: FlagStage;
  ownerUserId: string | null;
  people: ReadonlySet<string>;
}

/**
 * Does this viewer get the flag?
 *   off      nobody
 *   me       the admin who set the stage, and the named people
 *   beta     the above, plus everyone whose Clerk role is 'beta'
 *   everyone every visitor, signed in or not
 * Admins are not added automatically: they use Me or a named row.
 */
export const flagAppliesTo = (
  state: FlagState,
  viewer: FlagViewer | null,
): boolean => {
  if (state.stage === 'everyone') return true;
  if (state.stage === 'off' || viewer === null) return false;
  const named =
    state.ownerUserId === viewer.userId || state.people.has(viewer.userId);
  if (state.stage === 'me') return named;
  return named || viewer.role === 'beta';
};

// Environments that say so out loud. Anything else, unset included, is
// PRODUCTION: a flag lock must fail closed, and the staging Vercel project
// reports "production", so the app's own Sentry environment is the signal.
const STAGING_ENVIRONMENTS = new Set([
  'staging',
  'development',
  'dev',
  'local',
  'test',
]);

export const isStagingEnvironment = (
  environment: string | undefined = process.env['SENTRY_ENVIRONMENT'],
): boolean => STAGING_ENVIRONMENTS.has(environment?.trim().toLowerCase() ?? '');

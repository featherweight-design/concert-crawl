// apps/api/src/lib/crew-invite-token.ts
//
// Concert Crews (#1226) — the invite token. The token IS the capability (plan
// D3): anyone holding it can resolve the crew and join it, so it must never
// reach a log line, a Sentry breadcrumb, or an error body. Log the resolved
// crewId instead.

import { randomBytes } from 'node:crypto'
import { z } from 'zod'

/** 9 bytes → exactly 12 base64url characters, no padding. ~72 bits. */
const TOKEN_BYTES = 9

/** Length of the base64url encoding of TOKEN_BYTES, used to bound input. */
export const CREW_INVITE_TOKEN_LENGTH = 12

/** Seven days, matching the expiry line the invite sheet renders. */
export const CREW_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Follows the shape of `generateCode()` in routes/admin/invite-codes.ts —
 * crypto randomness, URL-safe alphabet, fixed length. Unlike a beta code this
 * one is never read aloud, so it takes the denser base64url alphabet.
 */
export const generateCrewInviteToken = (): string =>
  randomBytes(TOKEN_BYTES).toString('base64url')

/**
 * base64url only. Bounds what reaches the DB and rejects the obvious probes
 * before a query runs. Zod rather than a hand-rolled predicate because every
 * Hono boundary here validates with Zod, path params included — see
 * `uuidSchema` in routes/crews.ts.
 */
export const crewInviteTokenSchema = z
  .string()
  .length(CREW_INVITE_TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/)

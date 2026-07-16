/**
 * Concert Crawl — synthetic staging generator: price_submissions + submission_confirms.
 *
 * Inserts a set of price_submissions rows covering all 5 status enum values
 * and layout-hostile price amounts ($0.50, $0.00, $999+). For each
 * `corroborated` submission, 1–4 submission_confirms rows are also inserted
 * (keyed to other fixture users). An open price contest is modeled as a
 * `disputed` PARENT row (disputedSubmissionId = null) plus a `pending` counter
 * row that points back at the parent via disputedSubmissionId — the admin
 * Contests queue pivots on the counter (status='pending' AND
 * disputedSubmissionId IS NOT NULL) and treats the parent's id as the contestId.
 *
 * Two insert calls are made:
 *   1. price_submissions rows
 *   2. submission_confirms rows (may be empty if no corroborated rows)
 *
 * UUID generation strategy: since the DB generates IDs via defaultRandom()
 * and we need to cross-reference disputed rows before inserting, we
 * pre-generate deterministic UUIDs from the RNG. Each UUID is composed of
 * 6 rng.next() draws formatted as 8-4-4-4-12 hex. This avoids Math.random()
 * and crypto.randomUUID() (both non-deterministic) while satisfying Postgres's
 * uuid column type requirement.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import {
  priceSubmissions,
  submissionConfirms,
} from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

// Wider than the shared GenResult in the other generators — this generator
// writes to two tables (price_submissions + submission_confirms) so the
// orchestrator's inserted summary can report both counts. Every other
// generator returns just `{ inserted }`.
export type GenResult = { inserted: number; insertedConfirms: number }

const SUBMISSION_STATUSES = [
  'pending',
  'corroborated',
  'disputed',
  'stale',
  'archived',
] as const

const TIERS = ['GA', 'Reserved', 'VIP', 'Pit', 'Lawn'] as const

const VENDORS = [
  'AXS',
  'Ticketmaster',
  'SeatGeek',
  'DICE',
  'Eventbrite',
  'VenueBoxOffice',
] as const

const HOW_FOUND = ['bought_myself', 'saw_listing', 'at_the_venue'] as const

const CONFIRM_METHODS = ['same-vendor', 'other-vendor', 'box-office'] as const

// 280-char note for layout stress testing. Length is capped at exactly 280
// because the `note` column is `varchar(280)` and longer strings would fail
// the insert at runtime. Do NOT expand this without also expanding the
// column limit in packages/db/src/schema/prices.ts.
const LONG_NOTE =
  'Synthetic layout-hostile note from the staging seeder to stress test the price submission detail view. It fills the maximum allowed characters to verify that text overflow, line wrapping, and truncation are handled by the UI. Do not remove this note from staging data.'

/**
 * Produces a deterministic UUID-formatted string from 6 rng draws.
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12 hex).
 * The variant/version bits are NOT set — this is a synthetic ID for
 * seeding only, not a spec-compliant UUID v4. Postgres's `uuid` column
 * type accepts any correctly-formatted 8-4-4-4-12 hex string regardless
 * of variant bits.
 */
function deterministicUuid(rng: ReturnType<typeof createRng>): string {
  const toHex = (floatVal: number, chars: number): string =>
    Math.floor(floatVal * 0x100000000)
      .toString(16)
      .padStart(8, '0')
      .slice(0, chars)

  const seg1 = toHex(rng.next(), 8)
  const seg2 = toHex(rng.next(), 4)
  const seg3 = toHex(rng.next(), 4)
  const seg4 = toHex(rng.next(), 4)
  const seg5a = toHex(rng.next(), 8)
  const seg5b = toHex(rng.next(), 4)
  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5a}${seg5b}`
}

export const generatePriceSubmissions = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, eventIds, rng } = deps

  type SubmissionRow = typeof priceSubmissions.$inferInsert & { id: string }
  type ConfirmRow = typeof submissionConfirms.$inferInsert

  const submissionRows: SubmissionRow[] = []

  // --- Pinned layout-hostile rows (one per required status, anchored early) ---

  // 1. pending — free ticket ($0.00)
  const pendingId = deterministicUuid(rng)
  submissionRows.push({
    id: pendingId,
    userId: rng.pick(fixtureUserIds),
    eventId: rng.pick(eventIds),
    priceMin: '0.00',
    priceMax: null,
    tier: rng.pick(TIERS),
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'pending',
    note: null,
    disputedSubmissionId: null,
  })

  // 2. corroborated — $0.50 edge-case min price
  const corroborated1Id = deterministicUuid(rng)
  submissionRows.push({
    id: corroborated1Id,
    userId: rng.pick(fixtureUserIds),
    eventId: rng.pick(eventIds),
    priceMin: '0.50',
    priceMax: '5.00',
    tier: rng.pick(TIERS),
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'corroborated',
    note: null,
    disputedSubmissionId: null,
  })

  // 3. stale — high-price VIP ($999+) with a long 280-char note
  const staleId = deterministicUuid(rng)
  submissionRows.push({
    id: staleId,
    userId: rng.pick(fixtureUserIds),
    eventId: rng.pick(eventIds),
    priceMin: '999.00',
    priceMax: '1500.00',
    tier: 'VIP',
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'stale',
    note: LONG_NOTE,
    disputedSubmissionId: null,
  })

  // 4. archived
  const archivedId = deterministicUuid(rng)
  submissionRows.push({
    id: archivedId,
    userId: rng.pick(fixtureUserIds),
    eventId: rng.pick(eventIds),
    priceMin: '25.00',
    priceMax: '45.00',
    tier: rng.pick(TIERS),
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'archived',
    note: null,
    disputedSubmissionId: null,
  })

  // 5. disputed parent — the corroborated price a fan is now challenging.
  // This is the PARENT of the open contest formed with row 6; the pending
  // counter below references it via disputedSubmissionId. In the admin
  // Contests queue, this row's id IS the contestId. Both sides share one
  // eventId so the contest reads as a genuine single-event price dispute.
  const disputedParentId = deterministicUuid(rng)
  const contestEventId = rng.pick(eventIds)
  const parentUserId = rng.pick(fixtureUserIds)
  submissionRows.push({
    id: disputedParentId,
    userId: parentUserId,
    eventId: contestEventId,
    priceMin: '30.00',
    priceMax: '60.00',
    tier: rng.pick(TIERS),
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'disputed',
    note: 'This price appears higher than what was posted at the box office.',
    disputedSubmissionId: null,
  })

  // 6. pending counter — the challenger that forms ONE open price contest.
  // The admin Contests queue pivots on exactly this shape:
  //   status = 'pending' AND disputedSubmissionId IS NOT NULL
  // (see apps/api/src/routes/admin/contests.ts). Without this row the
  // Contests UI renders an empty queue even though a disputed parent exists.
  const counterId = deterministicUuid(rng)
  const otherUsers = fixtureUserIds.filter((uid) => uid !== parentUserId)
  // Fall back to the parent's author only in the degenerate single-user
  // fixture set (supported cleanup-API input); otherwise a fan disputes
  // someone else's price, never their own.
  const counterUserId =
    otherUsers.length > 0 ? rng.pick(otherUsers) : parentUserId
  submissionRows.push({
    id: counterId,
    userId: counterUserId,
    eventId: contestEventId,
    priceMin: '18.00',
    priceMax: '35.00',
    tier: rng.pick(TIERS),
    vendor: rng.pick(VENDORS),
    howFound: rng.pick(HOW_FOUND),
    status: 'pending',
    note: 'Saw a lower price at the box office — this listing looks inflated.',
    disputedSubmissionId: disputedParentId,
  })

  // --- Additional corroborated rows for volume and confirms variety ---
  const extraCorroboratedCount = rng.int(2, 4)
  for (let idx = 0; idx < extraCorroboratedCount; idx++) {
    const extraId = deterministicUuid(rng)
    submissionRows.push({
      id: extraId,
      userId: rng.pick(fixtureUserIds),
      eventId: rng.pick(eventIds),
      priceMin: String(rng.int(10, 150)) + '.00',
      priceMax: null,
      tier: rng.pick(TIERS),
      vendor: rng.pick(VENDORS),
      howFound: rng.pick(HOW_FOUND),
      status: 'corroborated',
      note: null,
      disputedSubmissionId: null,
    })
  }

  // --- Additional mixed-status rows for remaining fixture users ---
  for (const userId of fixtureUserIds) {
    const count = rng.int(1, 3)
    for (let idx = 0; idx < count; idx++) {
      const extraId = deterministicUuid(rng)
      const status = rng.pick(SUBMISSION_STATUSES)
      submissionRows.push({
        id: extraId,
        userId,
        eventId: rng.pick(eventIds),
        priceMin: String(rng.int(5, 200)) + '.00',
        priceMax: null,
        tier: rng.pick(TIERS),
        vendor: rng.pick(VENDORS),
        howFound: rng.pick(HOW_FOUND),
        status,
        note: null,
        disputedSubmissionId: null,
      })
    }
  }

  // --- Build submission_confirms for every corroborated submission ---
  // Every corroborated row — pinned, extra-volume, OR randomly-landed in the
  // per-user loop — gets 1–4 confirms from OTHER fixture users (not the
  // submitter). Iterate submissionRows directly rather than tracking ids
  // during creation, so status transitions can't silently miss confirms.
  const confirmRows: ConfirmRow[] = []
  for (const submission of submissionRows) {
    if (submission.status !== 'corroborated') continue
    const submitterUserId = submission.userId
    const otherUsers = fixtureUserIds.filter((uid) => uid !== submitterUserId)
    // A narrowed fixture set of a single user is a supported cleanup-API
    // input (per the plan). With one user, otherUsers is empty and there is
    // nobody to attribute a confirm to — skip. Skipping degrades layout
    // coverage (no confirm rows) but does not break correctness.
    if (otherUsers.length === 0) continue
    const confirmCount = rng.int(1, Math.min(4, otherUsers.length))
    // Shuffle a slice of otherUsers deterministically using rng
    const shuffled = [...otherUsers]
    for (let idx = shuffled.length - 1; idx > 0; idx--) {
      const jdx = Math.floor(rng.next() * (idx + 1))
      const temp = shuffled[idx]!
      shuffled[idx] = shuffled[jdx]!
      shuffled[jdx] = temp
    }
    for (let idx = 0; idx < confirmCount; idx++) {
      confirmRows.push({
        submissionId: submission.id,
        userId: shuffled[idx]!,
        method: rng.pick(CONFIRM_METHODS),
      })
    }
  }

  // Two-insert pattern: submissions first, then confirms.
  // Guard the confirms insert against an empty batch — Drizzle's
  // insert().values([]) throws at prepare time. Skipping matches the
  // user-events generator's empty-guard pattern.
  await staging.insert(priceSubmissions).values(submissionRows)
  if (confirmRows.length > 0) {
    await staging.insert(submissionConfirms).values(confirmRows)
  }

  return {
    inserted: submissionRows.length,
    insertedConfirms: confirmRows.length,
  }
}

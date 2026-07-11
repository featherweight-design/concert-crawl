/**
 * Concert Crawl — one-time gifted_comps backfill from Clerk metadata
 * (eng infra spec Part 1 §7, execution plan PR 2.1).
 *
 * Beta users were gifted Premium by hand-setting Clerk
 * `publicMetadata.plan = 'premium_gifted'`. The monetization schema makes
 * the new `gifted_comps` table the source of truth (Decision 10) — timers
 * (gift-ending notice) need SQL over all gifted users, which Clerk metadata
 * can't provide. This script copies every gifted Clerk user into
 * `gifted_comps`; Clerk metadata remains the JWT-fast mirror going forward.
 *
 * Row shape per spec §7 (beta cohort):
 *   - grantedBy  = the admin running the backfill (`--granted-by=<clerkId>`)
 *                  or the literal 'backfill' when not provided
 *   - expiresAt  = NULL (lifetime gift)
 *   - redeemedAt = the user's Clerk account creation time (beta grants set
 *                  it = createdAt per spec §7; the gift was live from day 1)
 *   - revokedAt  = NULL
 *
 * Usage (after migration 0045 has been applied to the target DB):
 *
 *   Dry run (default — lists gifted users, writes nothing):
 *     CLERK_SECRET_KEY=... DATABASE_URL=... \
 *       tsx scripts/2026-07-11-gifted-comps-backfill.ts
 *
 *   Commit:
 *     CLERK_SECRET_KEY=... DATABASE_URL=... \
 *       tsx scripts/2026-07-11-gifted-comps-backfill.ts \
 *         --commit --granted-by=user_<adminClerkId>
 *
 * Staging first, then prod (per CLAUDE.md prod-migration approval rule).
 * The Clerk instance is selected by CLERK_SECRET_KEY, so staging/prod runs
 * need the matching key + DATABASE_URL pair.
 *
 * Idempotent: inserts use ON CONFLICT (user_id) DO NOTHING against the
 * gifted_comps unique index, so a re-run (or a user granted through the
 * future admin flow before this runs) is a no-op for existing rows.
 *
 * NOTE on Clerk access: CLAUDE.md's "no direct Clerk imports outside
 * packages/auth" rule — no packages/auth exists yet; the established
 * server-side pattern is `createClerkClient` from '@clerk/backend'
 * (apps/api/src/routes/users.ts, apps/api/src/routes/admin/users.ts).
 * This one-off script follows that same pattern.
 */

import { pathToFileURL } from 'node:url'
import { createClerkClient } from '@clerk/backend'
import { db, giftedComps } from '@concert-crawl/db'
import {
  hasGiftedPlanMetadata,
  redactEmail,
  resolveGrantedBy,
} from './2026-07-11-gifted-comps-backfill-helpers.js'

const CLERK_PAGE_SIZE = 100

export interface GiftedCandidate {
  userId: string
  email: string
  createdAt: Date
}

export interface BackfillSummary {
  usersScanned: number
  giftedFound: number
  rowsInserted: number
  rowsSkippedExisting: number
  committed: boolean
}

export async function runBackfill(opts: {
  commit: boolean
  grantedBy: string
}): Promise<BackfillSummary> {
  const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required (staging or prod key)')
  }
  const clerkClient = createClerkClient({ secretKey })

  // 1. Page through every Clerk user and collect the gifted cohort.
  const candidates: GiftedCandidate[] = []
  let usersScanned = 0
  let offset = 0
  for (;;) {
    const page = await clerkClient.users.getUserList({
      limit: CLERK_PAGE_SIZE,
      offset,
      orderBy: '+created_at',
    })
    usersScanned += page.data.length
    for (const user of page.data) {
      if (!hasGiftedPlanMetadata(user.publicMetadata)) continue
      candidates.push({
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? '(no email)',
        createdAt: new Date(user.createdAt),
      })
    }
    if (page.data.length < CLERK_PAGE_SIZE) break
    offset += CLERK_PAGE_SIZE
  }

  console.log(
    `Scanned ${usersScanned} Clerk users; ${candidates.length} carry publicMetadata.plan = 'premium_gifted'.`,
  )

  // Per-user operator log (dry-run and --commit alike) — the cohort is
  // small enough to eyeball before committing.
  for (const candidate of candidates) {
    console.log(
      [
        '---',
        `userId    = ${candidate.userId}`,
        `email     = ${redactEmail(candidate.email)}`,
        `createdAt = ${candidate.createdAt.toISOString()} (→ redeemedAt)`,
        `grantedBy = ${opts.grantedBy}`,
        'expiresAt = (null — lifetime gift)',
      ].join('\n'),
    )
  }

  if (candidates.length === 0 || !opts.commit) {
    if (!opts.commit) {
      console.log('---')
      console.log(
        'Dry-run mode — no rows written. Re-run with --commit to apply.',
      )
    }
    return {
      usersScanned,
      giftedFound: candidates.length,
      rowsInserted: 0,
      rowsSkippedExisting: 0,
      // Sibling-script convention: committed reflects commit-mode
      // invocation, not whether any rows changed.
      committed: opts.commit,
    }
  }

  // 2. --commit path: insert with ON CONFLICT DO NOTHING on user_id so
  //    re-runs and pre-existing grants are no-ops.
  let insertedCount = 0
  for (const candidate of candidates) {
    const inserted = await db
      .insert(giftedComps)
      .values({
        userId: candidate.userId,
        grantedBy: opts.grantedBy,
        expiresAt: null,
        redeemedAt: candidate.createdAt,
        createdAt: candidate.createdAt,
      })
      .onConflictDoNothing({ target: giftedComps.userId })
      .returning({ id: giftedComps.id })
    if (inserted.length > 0) {
      insertedCount += 1
      console.log(`Inserted gifted_comps row for ${candidate.userId}`)
    } else {
      console.log(`Skipped ${candidate.userId} — gifted_comps row exists`)
    }
  }

  console.log('---')
  console.log(
    `Committed. Inserted ${insertedCount} rows, skipped ${candidates.length - insertedCount} existing.`,
  )

  return {
    usersScanned,
    giftedFound: candidates.length,
    rowsInserted: insertedCount,
    rowsSkippedExisting: candidates.length - insertedCount,
    committed: true,
  }
}

// CLI entrypoint guard so the module can be imported by a test without
// auto-running — same shape as the sibling scripts.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  const grantedBy = resolveGrantedBy(process.argv)
  runBackfill({ commit, grantedBy })
    .then((summary) => {
      console.log('---')
      console.log(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}

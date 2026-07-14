/**
 * Concert Crawl — synthetic staging generator: feedback.
 *
 * Inserts several feedback rows per fixture user. Layout-hostile shape
 * requirements (from spec §1b):
 *   - Full enum coverage: every feedback_status AND feedback_category value
 *     appears at least once across the generated set.
 *   - At least one message contains a long unbroken URL (≥200 chars, no
 *     whitespace) to stress the admin card text-overflow layout.
 *   - At least one row's metadata carries a full mobile user-agent string.
 *   - At least one row has adminNotes populated.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import { feedback } from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type GenResult = { inserted: number }

const FEEDBACK_STATUSES = [
  'unread',
  'read',
  'flagged',
  'issue_opened',
  'resolved',
  'archived',
] as const

const FEEDBACK_CATEGORIES = ['bug', 'idea', 'praise', 'other'] as const

/** A long fake URL (>200 chars, no whitespace) for text-overflow stress testing. */
const LONG_URL =
  'https://concertcrawl.app/events/detail/ogden-theatre-2026-08-15?utm_source=staging-seeder&utm_medium=synthetic&utm_campaign=layout-stress-test&utm_content=very-long-url-with-many-query-params&ref=abcdef1234567890abcdef1234567890abcdef12'

/** Full mobile user-agent string for metadata stress testing. */
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const PAGE_URLS = [
  'https://concertcrawl.app/events',
  'https://concertcrawl.app/events/ogden-theatre-2026-08-15',
  'https://concertcrawl.app/profile',
  'https://concertcrawl.app/admin/feedback',
  'https://concertcrawl.app/',
] as const

const MESSAGES = [
  'The event card text wraps oddly on my phone.',
  'Would love a dark mode toggle in settings.',
  'Love the new filter UI — much faster to find shows!',
  'Not sure where the "going" button went after I tapped it.',
  'The price on this listing looks wrong — shows $0.00.',
  "Can't seem to load the Bluebird listings on mobile.",
  'Great app overall, just missing a few venues I care about.',
] as const

const ADMIN_NOTES_SAMPLES = [
  'Reproduced on iOS 17 — tracking in #1234.',
  'Resolved in v1.92 — follow up with user if needed.',
  'Flagged for design review: text-overflow in admin card.',
  'Duplicate of #789 — closing after merge.',
] as const

export const generateFeedback = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, rng } = deps

  const rows: {
    userId: string
    pageUrl: string
    category: (typeof FEEDBACK_CATEGORIES)[number]
    message: string
    metadata: Record<string, unknown> | null
    status: (typeof FEEDBACK_STATUSES)[number]
    adminNotes: string | null
  }[] = []

  // --- Guaranteed layout-hostile rows (pinned to first fixture user) ---
  const anchorUserId = fixtureUserIds[0]!

  // 1. Long-URL message row
  rows.push({
    userId: anchorUserId,
    pageUrl: rng.pick(PAGE_URLS),
    category: 'bug',
    message: `Found a broken link that leads nowhere useful: ${LONG_URL}`,
    metadata: null,
    status: 'unread',
    adminNotes: null,
  })

  // 2. Mobile user-agent metadata row
  rows.push({
    userId: anchorUserId,
    pageUrl: rng.pick(PAGE_URLS),
    category: 'idea',
    message: 'Submitted from mobile — the submit button is hard to tap.',
    metadata: { userAgent: MOBILE_UA, viewportWidth: 390, viewportHeight: 844 },
    status: 'read',
    adminNotes: null,
  })

  // 3. adminNotes row
  rows.push({
    userId: anchorUserId,
    pageUrl: rng.pick(PAGE_URLS),
    category: 'bug',
    message: 'Price display shows NaN on the event detail page.',
    metadata: null,
    status: 'flagged',
    adminNotes: rng.pick(ADMIN_NOTES_SAMPLES),
  })

  // --- Cover all status enum values ---
  // Statuses used by the 3 pinned rows: unread, read, flagged.
  // Need: issue_opened, resolved, archived.
  const remainingStatuses: Array<(typeof FEEDBACK_STATUSES)[number]> = [
    'issue_opened',
    'resolved',
    'archived',
  ]
  for (const status of remainingStatuses) {
    const userId = rng.pick(fixtureUserIds)
    rows.push({
      userId,
      pageUrl: rng.pick(PAGE_URLS),
      category: rng.pick(FEEDBACK_CATEGORIES),
      message: rng.pick(MESSAGES),
      metadata: null,
      status,
      adminNotes: null,
    })
  }

  // --- Cover all category enum values ---
  // Categories used so far: bug, idea, bug (pinned) + whatever random picked above.
  // Guarantee all four appear by forcing them in turn.
  for (const category of FEEDBACK_CATEGORIES) {
    const userId = rng.pick(fixtureUserIds)
    rows.push({
      userId,
      pageUrl: rng.pick(PAGE_URLS),
      category,
      message: rng.pick(MESSAGES),
      metadata: null,
      status: rng.pick(FEEDBACK_STATUSES),
      adminNotes: null,
    })
  }

  // --- Additional rows per remaining fixture user for volume ---
  for (const userId of fixtureUserIds) {
    const count = rng.int(2, 4)
    for (let idx = 0; idx < count; idx++) {
      rows.push({
        userId,
        pageUrl: rng.pick(PAGE_URLS),
        category: rng.pick(FEEDBACK_CATEGORIES),
        message: rng.pick(MESSAGES),
        metadata: null,
        status: rng.pick(FEEDBACK_STATUSES),
        adminNotes: null,
      })
    }
  }

  await staging.insert(feedback).values(rows)

  return { inserted: rows.length }
}

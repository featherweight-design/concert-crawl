import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRng } from '../seeded-rng.js'
import { generateUserProfiles } from './user-profiles.js'
import { generateUserEvents } from './user-events.js'
import { generateFeedback } from './feedback.js'
import { generatePriceSubmissions } from './price-submissions.js'
import { generateNotifications } from './notifications.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SEED = 202607_12

const fixtureUserIds = [
  'user_2fixture_alpha',
  'user_2fixture_bravo',
  'user_2fixture_charlie',
  'user_2fixture_delta',
  'user_2fixture_echo',
] as const

// 50 distinct event IDs — enough for power-user tests (25+ unique rows per user)
const eventIds = Array.from(
  { length: 50 },
  (_, idx) =>
    `evt-00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
)

// ---------------------------------------------------------------------------
// Staging mock builder
// ---------------------------------------------------------------------------

/**
 * Builds a minimal staging mock whose insert().values() chain captures the row
 * array passed to values() and resolves it so the generator's await resolves.
 * Returns the spy so tests can inspect captured args.
 */
function buildStagingMock() {
  const valuesSpy = vi.fn().mockResolvedValue([])
  const staging = {
    insert: vi.fn().mockReturnValue({
      values: valuesSpy,
    }),
  }
  return { staging, valuesSpy }
}

// ---------------------------------------------------------------------------
// generateUserProfiles
// ---------------------------------------------------------------------------

describe('generateUserProfiles', () => {
  it('inserts exactly one row per fixture user', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserProfiles({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    expect(valuesSpy).toHaveBeenCalledTimes(1)
    const rows: { userId: string }[] = valuesSpy.mock.calls[0]![0]
    expect(rows).toHaveLength(fixtureUserIds.length)
  })

  it('every row userId is in fixtureUserIds', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserProfiles({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(fixtureUserIds).toContain(row.userId)
    }
  })

  it('produces deterministic output for the same seed', async () => {
    const { staging: stagingA, valuesSpy: spyA } = buildStagingMock()
    await generateUserProfiles({
      staging: stagingA as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    const { staging: stagingB, valuesSpy: spyB } = buildStagingMock()
    await generateUserProfiles({
      staging: stagingB as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    expect(JSON.stringify(spyA.mock.calls)).toBe(
      JSON.stringify(spyB.mock.calls),
    )
  })

  it('includes a mix of city=null and city set rows', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserProfiles({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { city: string | null }[] = valuesSpy.mock.calls[0]![0]
    const hasNull = rows.some((row) => row.city === null)
    const hasCity = rows.some((row) => row.city !== null)
    expect(hasNull).toBe(true)
    expect(hasCity).toBe(true)
  })

  it('handle is a long slug prefixed with seededHandle_', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserProfiles({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { handle: string }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(row.handle).toMatch(/^seededHandle_[a-z0-9]{40}$/)
    }
  })
})

// ---------------------------------------------------------------------------
// generateUserEvents
// ---------------------------------------------------------------------------

describe('generateUserEvents', () => {
  it('every row userId is in fixtureUserIds', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserEvents({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(fixtureUserIds).toContain(row.userId)
    }
  })

  it('every row eventId is in eventIds', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserEvents({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { eventId: string }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(eventIds).toContain(row.eventId)
    }
  })

  it('produces deterministic output for the same seed', async () => {
    const { staging: stagingA, valuesSpy: spyA } = buildStagingMock()
    await generateUserEvents({
      staging: stagingA as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    const { staging: stagingB, valuesSpy: spyB } = buildStagingMock()
    await generateUserEvents({
      staging: stagingB as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    expect(JSON.stringify(spyA.mock.calls)).toBe(
      JSON.stringify(spyB.mock.calls),
    )
  })

  it('at least one user has 25+ user_events rows (layout-hostile)', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserEvents({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string }[] = valuesSpy.mock.calls[0]![0]
    const countsByUser = new Map<string, number>()
    for (const row of rows) {
      countsByUser.set(row.userId, (countsByUser.get(row.userId) ?? 0) + 1)
    }
    const maxCount = Math.max(...countsByUser.values())
    expect(maxCount).toBeGreaterThanOrEqual(25)
  })

  it('covers all status enum values (going, interested, watching)', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateUserEvents({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { status: string }[] = valuesSpy.mock.calls[0]![0]
    const statuses = new Set(rows.map((row) => row.status))
    expect(statuses).toContain('going')
    expect(statuses).toContain('interested')
    expect(statuses).toContain('watching')
  })
})

// ---------------------------------------------------------------------------
// generateFeedback
// ---------------------------------------------------------------------------

describe('generateFeedback', () => {
  it('every row userId is in fixtureUserIds', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(fixtureUserIds).toContain(row.userId)
    }
  })

  it('produces deterministic output for the same seed', async () => {
    const { staging: stagingA, valuesSpy: spyA } = buildStagingMock()
    await generateFeedback({
      staging: stagingA as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    const { staging: stagingB, valuesSpy: spyB } = buildStagingMock()
    await generateFeedback({
      staging: stagingB as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    expect(JSON.stringify(spyA.mock.calls)).toBe(
      JSON.stringify(spyB.mock.calls),
    )
  })

  it('covers all feedback_status enum values', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { status: string }[] = valuesSpy.mock.calls[0]![0]
    const statuses = new Set(rows.map((row) => row.status))
    for (const val of [
      'unread',
      'read',
      'flagged',
      'issue_opened',
      'resolved',
      'archived',
    ]) {
      expect(statuses).toContain(val)
    }
  })

  it('covers all feedback_category enum values', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { category: string }[] = valuesSpy.mock.calls[0]![0]
    const categories = new Set(rows.map((row) => row.category))
    for (const val of ['bug', 'idea', 'praise', 'other']) {
      expect(categories).toContain(val)
    }
  })

  it('at least one message has a ≥200-char no-whitespace substring (layout-hostile)', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { message: string }[] = valuesSpy.mock.calls[0]![0]
    const hasLongToken = rows.some((row) => {
      // Split on whitespace and check if any token is ≥200 chars
      const tokens = row.message.split(/\s+/)
      return tokens.some((token) => token.length >= 200)
    })
    expect(hasLongToken).toBe(true)
  })

  it('at least one row has metadata with a mobile user-agent string', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { metadata: unknown }[] = valuesSpy.mock.calls[0]![0]
    const hasMobileUa = rows.some((row) => {
      if (row.metadata === null || typeof row.metadata !== 'object')
        return false
      const meta = row.metadata as Record<string, unknown>
      return (
        typeof meta['userAgent'] === 'string' &&
        meta['userAgent'].includes('Mobile')
      )
    })
    expect(hasMobileUa).toBe(true)
  })

  it('at least one row has adminNotes populated', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateFeedback({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { adminNotes: string | null | undefined }[] =
      valuesSpy.mock.calls[0]![0]
    const hasAdminNotes = rows.some(
      (row) =>
        row.adminNotes !== null &&
        row.adminNotes !== undefined &&
        row.adminNotes !== '',
    )
    expect(hasAdminNotes).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// generatePriceSubmissions
// ---------------------------------------------------------------------------

/**
 * The price submissions generator makes TWO insert calls: one for
 * price_submissions rows and one for submission_confirms rows. We need a mock
 * that returns a fresh values spy per insert() call so both can be inspected
 * independently.
 */
function buildMultiInsertStagingMock() {
  const submissionValuesSpy = vi.fn().mockResolvedValue([])
  const confirmsValuesSpy = vi.fn().mockResolvedValue([])
  let insertCallCount = 0
  const staging = {
    insert: vi.fn().mockImplementation(() => {
      insertCallCount++
      return {
        values: insertCallCount === 1 ? submissionValuesSpy : confirmsValuesSpy,
      }
    }),
  }
  return { staging, submissionValuesSpy, confirmsValuesSpy }
}

describe('generatePriceSubmissions', () => {
  it('every submission userId is in fixtureUserIds', async () => {
    const { staging, submissionValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string }[] = submissionValuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(fixtureUserIds).toContain(row.userId)
    }
  })

  it('produces deterministic output for the same seed', async () => {
    const mockA = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: mockA.staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    const mockB = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: mockB.staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    expect(JSON.stringify(mockA.submissionValuesSpy.mock.calls)).toBe(
      JSON.stringify(mockB.submissionValuesSpy.mock.calls),
    )
    expect(JSON.stringify(mockA.confirmsValuesSpy.mock.calls)).toBe(
      JSON.stringify(mockB.confirmsValuesSpy.mock.calls),
    )
  })

  it('at least one submission has a linked confirm (confirms insert spy called with rows)', async () => {
    const { staging, confirmsValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    expect(confirmsValuesSpy).toHaveBeenCalledTimes(1)
    const confirmRows: { submissionId: string }[] =
      confirmsValuesSpy.mock.calls[0]![0]
    expect(confirmRows.length).toBeGreaterThan(0)
  })

  it('at least one submission has priceMin = "0.50"', async () => {
    const { staging, submissionValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { priceMin: string }[] = submissionValuesSpy.mock.calls[0]![0]
    const hasCents = rows.some((row) => row.priceMin === '0.50')
    expect(hasCents).toBe(true)
  })

  it('at least one submission has priceMin >= 999', async () => {
    const { staging, submissionValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { priceMin: string }[] = submissionValuesSpy.mock.calls[0]![0]
    const hasHighPrice = rows.some((row) => parseFloat(row.priceMin) >= 999)
    expect(hasHighPrice).toBe(true)
  })

  it('covers all price_submission_status enum values', async () => {
    const { staging, submissionValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { status: string }[] = submissionValuesSpy.mock.calls[0]![0]
    const statuses = new Set(rows.map((row) => row.status))
    for (const val of [
      'pending',
      'corroborated',
      'disputed',
      'stale',
      'archived',
    ]) {
      expect(statuses).toContain(val)
    }
  })

  it('at least one disputed submission has a non-null disputedSubmissionId', async () => {
    const { staging, submissionValuesSpy } = buildMultiInsertStagingMock()
    await generatePriceSubmissions({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { status: string; disputedSubmissionId: string | null }[] =
      submissionValuesSpy.mock.calls[0]![0]
    const disputedWithRef = rows.find(
      (row) => row.status === 'disputed' && row.disputedSubmissionId !== null,
    )
    expect(disputedWithRef).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// generateNotifications
// ---------------------------------------------------------------------------

describe('generateNotifications', () => {
  it('every row userId is in fixtureUserIds (no nulls — cleanup catches only fixture-owned)', async () => {
    // Rationale: synthetic admin_alert rows are attributed to a fixture user
    // (not nullable) so cleanup-fixtures' inArray(userId, fixtureUserIds)
    // catches them on re-run. Nullable userId would make NULL IN (...) return
    // NULL (not TRUE), leaking rows across every run. See notifications.ts
    // header comment for the full trade-off.
    const { staging, valuesSpy } = buildStagingMock()
    await generateNotifications({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string | null }[] = valuesSpy.mock.calls[0]![0]
    for (const row of rows) {
      expect(row.userId).not.toBeNull()
      expect(fixtureUserIds).toContain(row.userId)
    }
  })

  it('produces deterministic output for the same seed', async () => {
    const { staging: stagingA, valuesSpy: spyA } = buildStagingMock()
    await generateNotifications({
      staging: stagingA as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    const { staging: stagingB, valuesSpy: spyB } = buildStagingMock()
    await generateNotifications({
      staging: stagingB as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })

    expect(JSON.stringify(spyA.mock.calls)).toBe(
      JSON.stringify(spyB.mock.calls),
    )
  })

  it('at least one notification has readAt = null', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateNotifications({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { readAt: Date | null }[] = valuesSpy.mock.calls[0]![0]
    const hasUnread = rows.some((row) => row.readAt === null)
    expect(hasUnread).toBe(true)
  })

  it('covers both notification type enum values', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateNotifications({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { type: string }[] = valuesSpy.mock.calls[0]![0]
    const types = new Set(rows.map((row) => row.type))
    expect(types).toContain('admin_alert')
    expect(types).toContain('user_notification')
  })

  it('at least one row per fixture user has a long title (≥80 chars)', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    await generateNotifications({
      staging: staging as any,
      fixtureUserIds,
      eventIds,
      rng: createRng(SEED),
    })
    const rows: { userId: string | null; title: string }[] =
      valuesSpy.mock.calls[0]![0]
    for (const userId of fixtureUserIds) {
      const userRows = rows.filter((row) => row.userId === userId)
      const hasLongTitle = userRows.some((row) => row.title.length >= 80)
      expect(hasLongTitle).toBe(true)
    }
  })
})

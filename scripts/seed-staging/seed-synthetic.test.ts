/**
 * Concert Crawl — tests for the synthetic seeder orchestrator (seed-synthetic.ts).
 *
 * Two suites:
 *   (a) Determinism + idempotency: two runSynthetic calls with the same seed
 *       produce identical insert args to every generator's values() spy.
 *   (b) Empty eventIds: only the four user-only generators (profiles, feedback,
 *       notifications, and the cleanup) run. user_events and price_submissions
 *       are skipped.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FIXTURE_USER_IDS, FIXTURE_SEED } from './fixture-users.js'

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted so they intercept imports in the module under test)
// ---------------------------------------------------------------------------

vi.mock('./cleanup-fixtures.js', () => ({
  cleanupFixtures: vi.fn().mockResolvedValue({
    deleted: {
      submissionConfirms: 0,
      priceSubmissions: 0,
      feedback: 0,
      userEvents: 0,
      notifications: 0,
      userProfiles: 0,
    },
  }),
}))

vi.mock('./generators/user-profiles.js', () => ({
  generateUserProfiles: vi.fn().mockResolvedValue({ inserted: 5 }),
}))

vi.mock('./generators/user-events.js', () => ({
  generateUserEvents: vi.fn().mockResolvedValue({ inserted: 10 }),
}))

vi.mock('./generators/feedback.js', () => ({
  generateFeedback: vi.fn().mockResolvedValue({ inserted: 10 }),
}))

vi.mock('./generators/price-submissions.js', () => ({
  // Mock must return `insertedConfirms` too — the real generator writes to
  // both `price_submissions` and `submission_confirms`, and the
  // orchestrator reads `.insertedConfirms` for the inserted summary.
  // A mock missing this field would silently pass `undefined` into the
  // summary and hide regressions in the orchestrator wiring.
  generatePriceSubmissions: vi
    .fn()
    .mockResolvedValue({ inserted: 10, insertedConfirms: 3 }),
}))

vi.mock('./generators/notifications.js', () => ({
  generateNotifications: vi.fn().mockResolvedValue({ inserted: 10 }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const eventIds = Array.from(
  { length: 10 },
  (_, idx) =>
    `evt-00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
)

/**
 * Builds a minimal staging mock whose select().from().orderBy().limit() chain
 * returns the given eventIds array, and whose insert().values() chain resolves
 * immediately. The orderBy step is required by the orchestrator (needed for
 * deterministic eventIds order across runs) — omitting it here would silently
 * break the tests when the orchestrator adds `.orderBy(events.id)`.
 */
function buildStagingMock(returnedEventIds: { id: string }[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(returnedEventIds),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  }
}

// ---------------------------------------------------------------------------
// Import the module under test after mocks are registered
// ---------------------------------------------------------------------------

const { runSynthetic } = await import('./seed-synthetic.js')

// ---------------------------------------------------------------------------
// Suite (a): determinism + idempotency
// ---------------------------------------------------------------------------

describe('runSynthetic — determinism and idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // What this test proves: the orchestrator threads STABLE non-rng deps
  // (staging, fixtureUserIds, eventIds) identically to every generator on
  // two runs with the same seed. It does NOT re-prove the deterministic
  // stream from a given seed — that's covered by seeded-rng.test.ts, and
  // per-generator "same seed → same rows" is covered in generators.test.ts.
  //
  // The rng object identity differs between runs (each run calls
  // `createRng(seed)` fresh), so comparing rng references directly is not
  // meaningful; comparing rng internal state after both runs would only
  // reflect whether generators consumed the same number of draws, which
  // is also covered by the generator-level tests.
  it('threads identical non-rng deps to every generator on two same-seed runs', async () => {
    const { generateUserProfiles } =
      await import('./generators/user-profiles.js')
    const { generateUserEvents } = await import('./generators/user-events.js')
    const { generateFeedback } = await import('./generators/feedback.js')
    const { generatePriceSubmissions } =
      await import('./generators/price-submissions.js')
    const { generateNotifications } =
      await import('./generators/notifications.js')

    const mappedEventIds = eventIds.map((id) => ({ id }))

    // First run
    const stagingA = buildStagingMock(mappedEventIds)
    await runSynthetic({
      staging: stagingA as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })
    const argsA = {
      profiles: (generateUserProfiles as ReturnType<typeof vi.fn>).mock
        .calls[0],
      userEvents: (generateUserEvents as ReturnType<typeof vi.fn>).mock
        .calls[0],
      feedback: (generateFeedback as ReturnType<typeof vi.fn>).mock.calls[0],
      priceSubmissions: (generatePriceSubmissions as ReturnType<typeof vi.fn>)
        .mock.calls[0],
      notifications: (generateNotifications as ReturnType<typeof vi.fn>).mock
        .calls[0],
    }

    vi.clearAllMocks()

    // Second run — same seed, fresh staging mock
    const stagingB = buildStagingMock(mappedEventIds)
    await runSynthetic({
      staging: stagingB as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })
    const argsB = {
      profiles: (generateUserProfiles as ReturnType<typeof vi.fn>).mock
        .calls[0],
      userEvents: (generateUserEvents as ReturnType<typeof vi.fn>).mock
        .calls[0],
      feedback: (generateFeedback as ReturnType<typeof vi.fn>).mock.calls[0],
      priceSubmissions: (generatePriceSubmissions as ReturnType<typeof vi.fn>)
        .mock.calls[0],
      notifications: (generateNotifications as ReturnType<typeof vi.fn>).mock
        .calls[0],
    }

    // Compare the deterministic, structured deps directly (not via
    // JSON.stringify — that silently drops function properties like the
    // staging mock and would make this test weaker than it looks). Strip
    // both `rng` (stateful, one-per-run identity) and `staging` (a
    // different mock instance per run by design) explicitly. What remains
    // — fixtureUserIds + eventIds — is the invariant we want to prove is
    // threaded identically to each generator.
    for (const key of [
      'profiles',
      'userEvents',
      'feedback',
      'priceSubmissions',
      'notifications',
    ] as const) {
      const { rng: _rngA, staging: _stagingA, ...restA } = argsA[key]![0]
      const { rng: _rngB, staging: _stagingB, ...restB } = argsB[key]![0]
      expect(restA).toEqual(restB)
    }
  })

  it('returns deleted and inserted summary counts', async () => {
    const stagingMock = buildStagingMock(eventIds.map((id) => ({ id })))
    const result = await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })
    expect(result).toHaveProperty('deleted')
    expect(result).toHaveProperty('inserted')
    expect(typeof result.deleted).toBe('object')
    expect(typeof result.inserted).toBe('object')
  })

  it('calls cleanupFixtures before any generator', async () => {
    const { cleanupFixtures } = await import('./cleanup-fixtures.js')
    const { generateUserProfiles } =
      await import('./generators/user-profiles.js')

    const stagingMock = buildStagingMock(eventIds.map((id) => ({ id })))
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    const cleanupOrder = (cleanupFixtures as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0]
    const profilesOrder = (generateUserProfiles as ReturnType<typeof vi.fn>)
      .mock.invocationCallOrder[0]

    expect(cleanupOrder).toBeLessThan(profilesOrder!)
  })

  it('passes the same rng instance to every generator (same object reference)', async () => {
    const { generateUserProfiles } =
      await import('./generators/user-profiles.js')
    const { generateUserEvents } = await import('./generators/user-events.js')

    const stagingMock = buildStagingMock(eventIds.map((id) => ({ id })))
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    const rngFromProfiles = (generateUserProfiles as ReturnType<typeof vi.fn>)
      .mock.calls[0]![0].rng
    const rngFromEvents = (generateUserEvents as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].rng
    // Same object reference means one rng instance is threaded through
    expect(rngFromProfiles).toBe(rngFromEvents)
  })
})

// ---------------------------------------------------------------------------
// Suite (b): empty eventIds
// ---------------------------------------------------------------------------

describe('runSynthetic — empty eventIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips user_events generator when eventIds is empty', async () => {
    const { generateUserEvents } = await import('./generators/user-events.js')

    const stagingMock = buildStagingMock([])
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    expect(generateUserEvents).not.toHaveBeenCalled()
  })

  it('skips price_submissions generator when eventIds is empty', async () => {
    const { generatePriceSubmissions } =
      await import('./generators/price-submissions.js')

    const stagingMock = buildStagingMock([])
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    expect(generatePriceSubmissions).not.toHaveBeenCalled()
  })

  it('still runs profiles, feedback, and notifications when eventIds is empty', async () => {
    const { generateUserProfiles } =
      await import('./generators/user-profiles.js')
    const { generateFeedback } = await import('./generators/feedback.js')
    const { generateNotifications } =
      await import('./generators/notifications.js')

    const stagingMock = buildStagingMock([])
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    expect(generateUserProfiles).toHaveBeenCalledTimes(1)
    expect(generateFeedback).toHaveBeenCalledTimes(1)
    expect(generateNotifications).toHaveBeenCalledTimes(1)
  })

  it('still runs cleanup when eventIds is empty', async () => {
    const { cleanupFixtures } = await import('./cleanup-fixtures.js')

    const stagingMock = buildStagingMock([])
    await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    expect(cleanupFixtures).toHaveBeenCalledTimes(1)
  })

  it('inserted counts for skipped generators are 0 when eventIds is empty', async () => {
    const stagingMock = buildStagingMock([])
    const result = await runSynthetic({
      staging: stagingMock as any,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    expect(result.inserted['userEvents']).toBe(0)
    expect(result.inserted['priceSubmissions']).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Suite (c): empty fixtureUserIds — reject up front
// ---------------------------------------------------------------------------

describe('runSynthetic — empty fixtureUserIds guard', () => {
  it('throws a clear error before any generator or cleanup runs', async () => {
    // Regression guard: several generators assume ≥1 user (feedback reads
    // fixtureUserIds[0]!; notifications calls rng.pick(fixtureUserIds);
    // profiles would insert([])). Failing at the entry point is more
    // debuggable than a deep crash mid-generation.
    const stagingMock = buildStagingMock([])
    await expect(
      runSynthetic({
        staging: stagingMock as any,
        fixtureUserIds: [],
        seed: FIXTURE_SEED,
      }),
    ).rejects.toThrow('fixtureUserIds must not be empty')
  })
})

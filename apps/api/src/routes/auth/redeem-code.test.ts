import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetAuth, mockCode, mockDb } = vi.hoisted(() => ({
  mockGetAuth: vi.fn(),
  // Hoisted with the rest: `vi.mock`'s factory runs before any module-scope
  // const, so a db stub declared below is not in scope when it is read.
  mockDb: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
  mockCode: {
    id: 'code-id-1',
    code: 'BETA-3C41-8BC0',
    usedBy: null,
    usedAt: null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

// `where` resolves for the invite lookup and `limit` for the comp read-back,
// so the chain has to be usable both with and without the extra hop.
const mockSelectChain: {
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
} = {
  from: vi.fn(() => mockSelectChain),
  where: vi.fn(() =>
    Object.assign(Promise.resolve([mockCode]), {
      limit: mockSelectChain.limit,
    }),
  ),
  // The comp the grant reads back. Live by default (no revoke, no expiry),
  // which is the state every case here is about.
  limit: vi.fn(async () => [{ revokedAt: null, expiresAt: null }]),
}
const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'code-id-1' }]),
}
// The beta comp write. `values` is what the assertions read, so the chain
// records rather than just resolving.
const mockOnConflict = vi.fn().mockResolvedValue(undefined)
const mockInsertChain = {
  values: vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict }),
}

mockDb.select.mockImplementation(() => mockSelectChain)
mockDb.update.mockImplementation(() => mockUpdateChain)
mockDb.insert.mockImplementation(() => mockInsertChain)
// The claim and the grant share one transaction, so the stub hands the
// callback something that can do both.
mockDb.transaction.mockImplementation(
  async (run: (tx: unknown) => Promise<unknown>) => await run(mockDb),
)

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  inviteCodes: {},
  giftedComps: { userId: 'gifted_comps.user_id' },
}))

// The Clerk mirror is a third-party write with its own failure path; what
// this file asserts is the route's own behaviour.
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: { updateUserMetadata: vi.fn(async () => undefined) },
  }),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
  gt: vi.fn(),
}))

import { createApp } from '../../app.js'

const app = createApp()

function authedUser(userId = 'user_123') {
  mockGetAuth.mockReturnValue({ userId, sessionClaims: { metadata: {} } })
}

describe('POST /v1/auth/redeem-code', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockInsertChain.values.mockClear()
    mockOnConflict.mockClear()
    // Every db spy, not just the new ones. The ordering case reads
    // `invocationCallOrder[0]`, and an uncleared spy carries a call from an
    // earlier test — which made it pass against a build with the grant moved
    // ahead of the claim, the exact regression it exists to catch.
    mockDb.transaction.mockClear()
    mockDb.update.mockClear()
    mockDb.select.mockClear()
    mockDb.insert.mockClear()
  })

  it('returns 401 without auth', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: '' },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and marks code used', async () => {
    authedUser()
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // Premium for the beta cohort. Without it the tester derives `free` —
    // the card-less trial is seeded only for accounts created after the
    // founder window opens, which is NULL until launch day.
    expect(mockInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        expiresAt: null,
      }),
    )
    // Lifetime, and never re-granted over an existing row: an admin's revoke
    // is a decision a second redemption must not undo.
    expect(mockOnConflict).toHaveBeenCalled()
  })

  it('returns 200 (idempotent) if already redeemed by same user', async () => {
    authedUser('user_123')
    mockSelectChain.where.mockReturnValueOnce(
      Object.assign(
        Promise.resolve([
          { ...mockCode, usedBy: 'user_123', usedAt: new Date() },
        ]),
        { limit: mockSelectChain.limit },
      ),
    )
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(200)
    // The grant runs on this path too, which covers a repeat of the same trip
    // — a retried POST or a reload while the invite cookie is still live.
    expect(mockInsertChain.values).toHaveBeenCalled()
  })

  // The ordering IS the safety property: a grant written before the
  // conditional claim hands Premium to the loser of a race for the last code.
  // No integration case can pin it — the early `used_by` read short-circuits
  // before the update, so moving the grant passes there — but the call order
  // inside the transaction is deterministic and says exactly the same thing.
  it('claims the code before it grants the comp', async () => {
    authedUser()
    await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })

    const claimOrder = mockDb.update.mock.invocationCallOrder[0]
    const grantOrder = mockInsertChain.values.mock.invocationCallOrder[0]
    expect(claimOrder).toBeDefined()
    expect(grantOrder).toBeDefined()
    expect(claimOrder!).toBeLessThan(grantOrder!)
    // And both inside one transaction, so a crash between them cannot leave a
    // code marked used by an account with no comp.
    expect(mockDb.transaction).toHaveBeenCalledTimes(1)
  })

  it('returns 409 if already used by different user', async () => {
    authedUser('user_new')
    mockSelectChain.where.mockReturnValueOnce(
      Object.assign(
        Promise.resolve([
          { ...mockCode, usedBy: 'user_other', usedAt: new Date() },
        ]),
        { limit: mockSelectChain.limit },
      ),
    )
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(409)
    // A code someone else already claimed grants nothing. The same reasoning
    // orders the write after the conditional update: the loser of a race for
    // the last code must not walk away with Premium.
    expect(mockInsertChain.values).not.toHaveBeenCalled()
  })
})

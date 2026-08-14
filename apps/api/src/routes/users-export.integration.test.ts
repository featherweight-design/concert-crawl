import { describe, expect, it, vi } from 'vitest'

interface AuthState {
  current: { userId: string } | null
}

const { authState } = vi.hoisted(() => {
  const authState: AuthState = { current: null }
  return { authState }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ users: {} }),
}))

import { z } from 'zod'
import { USER_DATA_REGISTRY } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { seedUserWithDataEverywhere } from '../test/helpers/seed.js'

const app = createApp()

// Parsed, not cast. `await res.json()` is `unknown` crossing a system
// boundary, and CLAUDE.md's type-safety rule makes Zod the tool for that —
// an `as` here would assert a shape the route is free to break.
const exportSchema = z.object({
  exportedAt: z.string(),
  data: z.record(z.string(), z.array(z.unknown())),
})

const readExport = async (
  userId: string,
): Promise<z.infer<typeof exportSchema>> => {
  authState.current = { userId }
  const res = await app.request('/v1/users/me/export')
  expect(res.status).toBe(200)
  return exportSchema.parse(await res.json())
}

describe('GET /v1/users/me/export', () => {
  it('rejects an unauthenticated request', async () => {
    authState.current = null
    const res = await app.request('/v1/users/me/export')
    expect(res.status).toBe(401)
  })

  it('returns every exportKey in the registry', async () => {
    const userId = await seedUserWithDataEverywhere()
    const payload = await readExport(userId)

    const expectedKeys = USER_DATA_REGISTRY.flatMap((entry) =>
      entry.exportKey === null ? [] : [entry.exportKey],
    )

    for (const key of expectedKeys) {
      expect(payload.data, `export is missing ${key}`).toHaveProperty(key)
    }
  })

  // Crews are the one export the registry cannot express, so no registry-driven
  // assertion above would notice the join going missing.
  it('returns the crews the user belongs to', async () => {
    const userId = await seedUserWithDataEverywhere()
    const payload = await readExport(userId)

    const crewSchema = z.array(
      z.object({
        name: z.string(),
        joined_at: z.string(),
        muted: z.boolean(),
      }),
    )
    const crewRows = crewSchema.parse(payload.data['crews'])
    expect(crewRows).toHaveLength(1)
    expect(crewRows[0]?.name).toMatch(/^Deletion Crew /)
    expect(crewRows[0]?.muted).toBe(true)
  })

  it('serves as a downloadable attachment', async () => {
    const userId = await seedUserWithDataEverywhere()
    authState.current = { userId }
    const res = await app.request('/v1/users/me/export')
    expect(res.headers.get('content-disposition')).toContain(
      'attachment; filename="concertcrawl-data-export.json"',
    )
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('never returns another user’s rows', async () => {
    // Two users seeded with identical shapes. If the export were unscoped,
    // every array would hold two rows instead of one.
    const mine = await seedUserWithDataEverywhere()
    await seedUserWithDataEverywhere()

    const payload = await readExport(mine)

    for (const [key, rows] of Object.entries(payload.data)) {
      expect(rows, `${key} picked up another user's rows`).toHaveLength(1)
    }
  })

  it('never echoes a Clerk user id back', async () => {
    // #527: "Exclude userId (they know who they are)." The allowlist is what
    // enforces this; this test is the proof it stayed enforced.
    const mine = await seedUserWithDataEverywhere()
    const payload = await readExport(mine)

    expect(JSON.stringify(payload)).not.toMatch(/user_test_/)
  })

  it('rate limits a second export within the hour', async () => {
    const userId = await seedUserWithDataEverywhere()
    authState.current = { userId }

    const first = await app.request('/v1/users/me/export')
    expect(first.status).toBe(200)

    const second = await app.request('/v1/users/me/export')
    expect(second.status).toBe(429)
    expect(Number(second.headers.get('Retry-After'))).toBeGreaterThan(0)
  })
})

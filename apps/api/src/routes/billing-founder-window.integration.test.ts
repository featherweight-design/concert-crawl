import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { founderWindow } from '@concert-crawl/db'
import {
  createFounderWindowRouter,
  resolveFounderWindowView,
} from './billing-founder-window.js'
import { testDb } from '../test/helpers/db.js'

const DAY_MS = 86_400_000

function buildApp(cacheTtlMs = 0): Hono {
  const app = new Hono()
  app.route('/v1/billing', createFounderWindowRouter({ cacheTtlMs }))
  return app
}

async function setFounderWindow(values: {
  opensAt: Date | null
  seatsRemaining: number
  seatsTotal?: number
  windowDays?: number
}): Promise<void> {
  const row = {
    opensAt: values.opensAt,
    seatsTotal: values.seatsTotal ?? 100,
    seatsRemaining: values.seatsRemaining,
    seatsRemainingTest: 100,
    windowDays: values.windowDays ?? 30,
  }
  await testDb
    .insert(founderWindow)
    .values({ id: 1, ...row })
    .onConflictDoUpdate({ target: founderWindow.id, set: row })
}

async function getWindow(app: Hono): Promise<Response> {
  return app.request('/v1/billing/founder-window')
}

const successBodySchema = z.object({
  success: z.literal(true),
  data: z.object({
    state: z.string(),
    seatsTotal: z.number(),
    seatsRemaining: z.number().optional(),
    closesAt: z.string().nullable(),
  }),
})

async function readBody(
  res: Response,
): Promise<z.infer<typeof successBodySchema>> {
  const body: unknown = await res.json()
  const parsed = successBodySchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(`Unexpected body: ${JSON.stringify(body)}`)
  }
  return parsed.data
}

describe('GET /v1/billing/founder-window', () => {
  beforeEach(async () => {
    await setFounderWindow({ opensAt: null, seatsRemaining: 100 })
  })

  it('is public — no auth required', async () => {
    const res = await getWindow(buildApp())
    expect(res.status).toBe(200)
  })

  it('returns pre-launch (seatsRemaining omitted) while opens_at is NULL', async () => {
    const res = await getWindow(buildApp())
    const body = await readBody(res)
    expect(body.data.state).toBe('pre-launch')
    expect(body.data.seatsTotal).toBe(100)
    expect(body.data.closesAt).toBeNull()
    expect('seatsRemaining' in body.data).toBe(false)
  })

  it('returns pre-launch when opens_at is in the future', async () => {
    await setFounderWindow({
      opensAt: new Date(Date.now() + DAY_MS),
      seatsRemaining: 100,
    })
    const body = await readBody(await getWindow(buildApp()))
    expect(body.data.state).toBe('pre-launch')
    expect('seatsRemaining' in body.data).toBe(false)
  })

  it('returns open with seats + closesAt inside the window', async () => {
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 42 })
    const body = await readBody(await getWindow(buildApp()))
    expect(body.data.state).toBe('open')
    expect(body.data.seatsRemaining).toBe(42)
    expect(body.data.seatsTotal).toBe(100)
    expect(typeof body.data.closesAt).toBe('string')
    if (body.data.closesAt === null) throw new Error('closesAt missing')
    const closesAtMs = new Date(body.data.closesAt).getTime()
    expect(closesAtMs).toBeGreaterThan(Date.now() + 29 * DAY_MS)
  })

  it('returns closed once closes_at has passed', async () => {
    await setFounderWindow({
      opensAt: new Date(Date.now() - 31 * DAY_MS),
      seatsRemaining: 42,
      windowDays: 30,
    })
    const body = await readBody(await getWindow(buildApp()))
    expect(body.data.state).toBe('closed')
    expect(body.data.seatsRemaining).toBe(42)
  })

  it('returns closed when all seats are claimed inside the window', async () => {
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 0 })
    const body = await readBody(await getWindow(buildApp()))
    expect(body.data.state).toBe('closed')
    expect(body.data.seatsRemaining).toBe(0)
  })

  it('serves the cached view inside the TTL', async () => {
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 42 })
    const app = buildApp(60_000)
    const first = await readBody(await getWindow(app))
    expect(first.data.seatsRemaining).toBe(42)

    // The DB changes, but the cached payload keeps serving inside the TTL.
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 7 })
    const second = await readBody(await getWindow(app))
    expect(second.data.seatsRemaining).toBe(42)
  })

  it('re-reads after the TTL expires (ttl 0 disables the cache)', async () => {
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 42 })
    const app = buildApp(0)
    expect((await readBody(await getWindow(app))).data.seatsRemaining).toBe(42)
    await setFounderWindow({ opensAt: new Date(), seatsRemaining: 7 })
    expect((await readBody(await getWindow(app))).data.seatsRemaining).toBe(7)
  })
})

describe('resolveFounderWindowView', () => {
  const now = new Date('2026-08-01T00:00:00Z')
  const base = { seatsTotal: 100, seatsRemaining: 50 }

  it('treats a boundary-exact closesAt as closed (mirrors evaluateFounderGates)', () => {
    const view = resolveFounderWindowView(
      { ...base, opensAt: new Date('2026-07-01T00:00:00Z'), closesAt: now },
      now,
    )
    expect(view.state).toBe('closed')
  })

  it('reports open with an ISO closesAt inside the window', () => {
    const view = resolveFounderWindowView(
      {
        ...base,
        opensAt: new Date('2026-07-30T00:00:00Z'),
        closesAt: new Date('2026-08-29T00:00:00Z'),
      },
      now,
    )
    expect(view).toEqual({
      state: 'open',
      seatsTotal: 100,
      seatsRemaining: 50,
      closesAt: '2026-08-29T00:00:00.000Z',
    })
  })
})

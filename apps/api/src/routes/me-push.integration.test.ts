import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

interface TestAuthState {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(
  (): { authState: { current: TestAuthState | null } } => ({
    authState: { current: null },
  }),
)

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { sql } from 'drizzle-orm'

import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'

const app = createApp()

const USER_ID = 'user_prefs_test'

// Parsed, not cast: a 500 or a renamed field would otherwise read as
// `undefined` and quietly satisfy an assertion expecting `false`.
const prefsResponse = z.object({
  success: z.literal(true),
  data: z.object({
    masterEnabled: z.boolean(),
    watchUpdatesEnabled: z.boolean(),
    priceDropsEnabled: z.boolean(),
    artistAlertsEnabled: z.boolean(),
    artistAutoWatch: z.boolean(),
    weeklyDigestEnabled: z.boolean(),
    productEmailsEnabled: z.boolean(),
  }),
})

type Prefs = z.infer<typeof prefsResponse>['data']

const readPrefs = async (res: Response): Promise<Prefs> => {
  expect(res.status).toBe(200)
  return prefsResponse.parse(await res.json()).data
}

const patch = (body: Record<string, boolean>): Promise<Response> =>
  app.request('/v1/me/notification-preferences', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const get = (): Promise<Response> =>
  app.request('/v1/me/notification-preferences')

describe('/v1/me/notification-preferences', () => {
  beforeEach(async () => {
    authState.current = {
      userId: USER_ID,
      sessionClaims: { metadata: { role: 'user' } },
    }
    await testDb.execute(
      sql`DELETE FROM user_notification_preferences WHERE user_id = ${USER_ID}`,
    )
  })

  it('returns the artist defaults before any row exists', async () => {
    const data = await readPrefs(await get())
    // Asymmetric on purpose: alerts on, auto-watch off.
    expect(data.artistAlertsEnabled).toBe(true)
    expect(data.artistAutoWatch).toBe(false)
    expect(data.weeklyDigestEnabled).toBe(true)
    expect(data.productEmailsEnabled).toBe(true)
  })

  // #1572. The Settings switch and the signed one-click link write the same
  // column, so this endpoint has to carry it in both directions or an email
  // unsubscribe would be invisible in the UI.
  it('round-trips productEmailsEnabled', async () => {
    const patched = await readPrefs(
      await patch({ productEmailsEnabled: false }),
    )
    expect(patched.productEmailsEnabled).toBe(false)
    expect((await readPrefs(await get())).productEmailsEnabled).toBe(false)
  })

  it('accepts a partial patch of only the artist keys', async () => {
    const data = await readPrefs(
      await patch({ artistAlertsEnabled: false, weeklyDigestEnabled: false }),
    )
    expect(data.artistAlertsEnabled).toBe(false)
    expect(data.weeklyDigestEnabled).toBe(false)
    expect(await readPrefs(await get())).toEqual(data)
  })

  it('leaves the other six fields untouched when only artistAutoWatch is sent', async () => {
    // Seed a row where every field is the OPPOSITE of its default, so a reset
    // to defaults is distinguishable from a correct partial merge.
    const seeded = await readPrefs(
      await patch({
        masterEnabled: true,
        watchUpdatesEnabled: false,
        priceDropsEnabled: false,
        artistAlertsEnabled: false,
        artistAutoWatch: false,
        weeklyDigestEnabled: false,
        productEmailsEnabled: false,
      }),
    )
    expect(seeded.masterEnabled).toBe(true)

    const patched = await readPrefs(await patch({ artistAutoWatch: true }))

    expect(patched).toEqual({ ...seeded, artistAutoWatch: true })
    // And it survives the round trip rather than only being echoed back.
    expect(await readPrefs(await get())).toEqual(patched)
  })

  // The PATCH must not write keys the caller left out. productEmailsEnabled
  // has a second writer (the signed one-click unsubscribe link), so a merge
  // that read the row first and wrote all seven fields back would clobber an
  // unsubscribe that landed in between.
  it('does not write columns the caller omitted', async () => {
    await patch({ artistAlertsEnabled: false })
    // Stand in for the one-click link: a write from outside this endpoint,
    // after the row exists and after a PATCH has already read it.
    await testDb.execute(
      sql`UPDATE user_notification_preferences SET product_emails_enabled = false WHERE user_id = ${USER_ID}`,
    )

    const patched = await readPrefs(await patch({ artistAutoWatch: true }))

    expect(patched.productEmailsEnabled).toBe(false)
    expect(patched.artistAutoWatch).toBe(true)
    expect(patched.artistAlertsEnabled).toBe(false)
  })

  it('rejects a non-boolean artist value', async () => {
    const res = await patch({
      // @ts-expect-error — the point of the test is the runtime boundary.
      artistAutoWatch: 'yes',
    })
    expect(res.status).toBe(400)
  })

  it('rejects an unknown key rather than silently stripping it', async () => {
    const res = await patch({
      // @ts-expect-error — a typo'd key is exactly what `.strict()` is for.
      artistAlertsEnabledd: true,
    })
    expect(res.status).toBe(400)
  })

  it('401s an anonymous caller', async () => {
    authState.current = null
    expect((await get()).status).toBe(401)
    expect((await patch({ artistAutoWatch: true })).status).toBe(401)
  })
})

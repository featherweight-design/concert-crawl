// The beta funnel's return path (#1226, gate (b)).
//
// A visitor who arrives at a crew link with no account is bounced to the beta
// code screen, and Clerk's own screens sit between that and the finished
// account. A query param cannot cross them; a second signed cookie can. This
// suite walks the two halves that carry it — the code action writes the
// cookie, and /auth/complete spends it — so the four edits are not plumbing
// nobody exercises. The middleware's first hop has its own suite in
// src/middleware.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const { cookieStore, redirectCalls, authState } = vi.hoisted(() => {
  const cookies = new Map<string, string>()
  const redirects: string[] = []
  const auth: { userId: string | null } = { userId: 'user_new_arrival' }
  return { cookieStore: cookies, redirectCalls: redirects, authState: auth }
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value)
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }),
}))

// The real one throws to unwind the render; mirroring that keeps the call
// sites honest about being terminal.
vi.mock('next/navigation', () => ({
  redirect: (target: string) => {
    redirectCalls.push(target)
    throw new Error(`NEXT_REDIRECT:${target}`)
  },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: authState.userId,
    getToken: async () => 'test-token',
  }),
}))

import { validateAndSetInviteCode } from './code/actions'
import AuthCompletePage from './complete/page'
import {
  INVITE_COOKIE_NAME,
  RETURN_PATH_COOKIE_NAME,
  signInviteCookie,
} from '@/lib/invite-cookie'

const SECRET = 'test-secret-32-bytes-minimum-len'
const CODE = 'BETA-AB12-CD34'
const CREW_LINK = '/crew/join/abc123XYZ_-0'

/** Both entry points redirect, which throws. */
const runToRedirect = async (work: () => Promise<unknown>): Promise<string> => {
  const before = redirectCalls.length
  await expect(work()).rejects.toThrow(/NEXT_REDIRECT/)
  const target = redirectCalls[before]
  if (!target) throw new Error('expected a redirect')
  return target
}

beforeEach(() => {
  cookieStore.clear()
  redirectCalls.length = 0
  authState.userId = 'user_new_arrival'
  vi.stubEnv('INVITE_COOKIE_SECRET', SECRET)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  )
})

describe('the beta funnel carries a crew link across Clerk', () => {
  it('lands the visitor back on the link rather than on /events', async () => {
    const toOnboarding = await runToRedirect(() =>
      validateAndSetInviteCode(CODE, CREW_LINK),
    )
    expect(toOnboarding).toBe('/onboarding')
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(true)
    // The signed cookie is opaque, so the raw path is not sitting in it in the
    // clear-and-editable sense the query param was.
    expect(cookieStore.get(RETURN_PATH_COOKIE_NAME)).not.toBe(CREW_LINK)

    const landing = await runToRedirect(() => AuthCompletePage())
    expect(landing).toBe(CREW_LINK)
    // A return path is spent once — a later visit must not replay it.
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(false)
  })

  it('leaves a front-door arrival on /events', async () => {
    await runToRedirect(() => validateAndSetInviteCode(CODE))
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(false)

    const landing = await runToRedirect(() => AuthCompletePage())
    expect(landing).toBe('/events')
  })

  it.each([
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    // Same-origin by every other measure, but the value ends up in a `Location`
    // header, where a decoded newline is response splitting. `/%0Aevil` only
    // reveals itself on the second decode pass.
    '/\nevil',
    '/%0Aevil',
    '/events',
  ])('writes no return-path cookie for %s', async (hostile) => {
    await runToRedirect(() => validateAndSetInviteCode(CODE, hostile))
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(false)
  })

  it('clears a cookie left behind by an abandoned earlier attempt', async () => {
    // A first trip started at a crew link and was never finished, so its
    // cookie outlives it. A later trip with nowhere to go must not inherit it.
    cookieStore.set(
      RETURN_PATH_COOKIE_NAME,
      signInviteCookie(CREW_LINK, SECRET),
    )

    await runToRedirect(() => validateAndSetInviteCode(CODE))
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(false)

    const landing = await runToRedirect(() => AuthCompletePage())
    expect(landing).toBe('/events')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/%0Aevil'])(
    're-sanitises a hostile cookie value %s on read',
    async (hostile) => {
      // Signed with the real secret: the signature proves we wrote it, which is
      // exactly why signing alone is not enough. A redirect target read from a
      // cookie is still a redirect target.
      cookieStore.set(
        RETURN_PATH_COOKIE_NAME,
        signInviteCookie(hostile, SECRET),
      )

      const landing = await runToRedirect(() => AuthCompletePage())
      expect(landing).toBe('/events')
    },
  )

  it('ignores a forged cookie and clears it', async () => {
    cookieStore.set(RETURN_PATH_COOKIE_NAME, 'forged.payload')

    const landing = await runToRedirect(() => AuthCompletePage())
    expect(landing).toBe('/events')
    expect(cookieStore.has(RETURN_PATH_COOKIE_NAME)).toBe(false)
  })

  it('still redeems the beta code on the way through', async () => {
    cookieStore.set(INVITE_COOKIE_NAME, signInviteCookie(CODE, SECRET))
    cookieStore.set(
      RETURN_PATH_COOKIE_NAME,
      signInviteCookie(CREW_LINK, SECRET),
    )

    const landing = await runToRedirect(() => AuthCompletePage())

    expect(landing).toBe(CREW_LINK)
    expect(cookieStore.has(INVITE_COOKIE_NAME)).toBe(false)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/v1/auth/redeem-code'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

// @vitest-environment node

// The invite gate on /sign-up, and the one case it used to get wrong.
//
// Middleware puts `/sign-up` in `isPublicOnceLaunched` — an account costs no
// invite code once the product is public — but this layout gated on the cookie
// unconditionally, so the launched funnel's own primary conversion path
// (landing "Sign up free", the signed-out account menu, the watch hand-off)
// redirected every signed-out visitor to the invite screen.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// `invite-cookie` imports `server-only`, which throws outside a server
// component. Same stub the auth funnel's suite uses.
vi.mock('server-only', () => ({}))

const { cookieStore, redirectCalls } = vi.hoisted(() => {
  // Annotated rather than asserted: `as string[]` widens an empty literal by
  // silencing the compiler, and the house rule is that a cast proves nothing.
  const redirects: string[] = []
  return { cookieStore: new Map<string, string>(), redirectCalls: redirects }
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value === undefined ? undefined : { name, value }
    },
  }),
}))

// The real one throws to unwind the render; mirroring that is what lets a test
// tell "redirected" apart from "rendered and then called redirect".
vi.mock('next/navigation', () => ({
  redirect: (target: string) => {
    redirectCalls.push(target)
    throw new Error(`NEXT_REDIRECT:${target}`)
  },
}))

import SignUpLayout from './layout'
import { INVITE_COOKIE_NAME, signInviteCookie } from '@/lib/invite-cookie'

const SECRET = 'test-secret-32-bytes-minimum-len'
const CODE = 'BETA-AB12-CD34'

const render = () => SignUpLayout({ children: 'sign-up' })

beforeEach(() => {
  cookieStore.clear()
  redirectCalls.length = 0
  vi.stubEnv('INVITE_COOKIE_SECRET', SECRET)
  vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
})

describe('/sign-up invite gate', () => {
  it('lets a signed-out visitor through once launched, with no cookie at all', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')

    await expect(render()).resolves.toBeTruthy()
    expect(redirectCalls).toEqual([])
  })

  it('still sends a visitor with no cookie to the invite screen before launch', async () => {
    await expect(render()).rejects.toThrow('NEXT_REDIRECT:/auth/code')
  })

  it('admits a code-holder before launch', async () => {
    cookieStore.set(INVITE_COOKIE_NAME, signInviteCookie(CODE, SECRET))

    await expect(render()).resolves.toBeTruthy()
    expect(redirectCalls).toEqual([])
  })

  it('refuses a forged cookie before launch', async () => {
    cookieStore.set(INVITE_COOKIE_NAME, 'forged.payload')

    await expect(render()).rejects.toThrow('NEXT_REDIRECT:/auth/code')
  })

  // The launched branch returns before the secret is read, so a missing secret
  // must not shut the public funnel. Before launch it still fails closed.
  it('fails closed on a missing secret before launch, and open after', async () => {
    vi.stubEnv('INVITE_COOKIE_SECRET', '')
    await expect(render()).rejects.toThrow('NEXT_REDIRECT:/auth/code')

    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    await expect(render()).resolves.toBeTruthy()
  })
})

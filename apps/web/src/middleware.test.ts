import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// The launch gate defaults to closed (#794), but every suite below this line
// describes the launched shape. Beta-mode behaviour has its own suite at the
// bottom of the file which stubs the flag off.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// clerkMiddleware returns the handler directly so we can call it with our own auth stub
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: Function) => handler,
  createRouteMatcher: (patterns: string[]) => (req: NextRequest) =>
    patterns.some((pattern) => {
      // Strip trailing (.*) glob for simple path matching
      const base = pattern.replace(/\(.*\)$/, '')
      // Exact-only for '/' — startsWith('/') would match every path
      if (base === '/') return req.nextUrl.pathname === '/'
      return (
        req.nextUrl.pathname === base || req.nextUrl.pathname.startsWith(base)
      )
    }),
}))

interface ProtectOptions {
  unauthenticatedUrl: string
}

type AuthStub = (() => Promise<{ userId: string | null }>) & {
  protect: ReturnType<typeof vi.fn<(opts: ProtectOptions) => Promise<void>>>
}

function makeAuth(userId: string | null): AuthStub {
  const fn = async () => ({ userId })
  // A spy rather than a plain function so the negative cases can assert both
  // that protection ran and which unauthenticatedUrl it was handed.
  const protect = vi.fn(async () => {
    if (!userId) throw new Error('Unauthorized')
  })
  return Object.assign(fn, { protect })
}

const makeReq = (path: string, cookies?: Record<string, string>) =>
  new NextRequest(
    `http://localhost${path}`,
    cookies
      ? {
          headers: {
            cookie: Object.entries(cookies)
              .map(([name, value]) => `${name}=${value}`)
              .join('; '),
          },
        }
      : undefined,
  )

describe('middleware — returning-user redirect (#80)', () => {
  it('redirects unauthenticated user with invite cookie from / to /onboarding', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await (middleware as Function)(makeAuth(null), req)

    expect(result).not.toBeUndefined()
    expect(result.headers.get('location')).toContain('/onboarding')
  })

  it('does not redirect unauthenticated user without invite cookie from /', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/')

    const result = await (middleware as Function)(makeAuth(null), req)

    // / is always-public with no cookie → no redirect
    expect(result).toBeUndefined()
  })

  it('redirects authenticated user from / to /events (#842)', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await (middleware as Function)(makeAuth('user_123'), req)

    // Logged-in users never see the marketing landing — middleware redirects
    // them to /events so the page itself stays ISR-eligible (no auth() call
    // in the server component).
    expect(result).not.toBeUndefined()
    expect(result.headers.get('location')).toContain('/events')
  })

  it('does not redirect authenticated user on non-/ public routes', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/legal/privacy')

    const result = await (middleware as Function)(makeAuth('user_123'), req)

    // Authenticated user on a non-preAuth, non-/ public route → no redirect
    expect(result).toBeUndefined()
  })
})

describe('middleware — edge auth gate (#841)', () => {
  it('blocks unauthenticated request to a (protected) route via auth.protect', async () => {
    const { default: middleware } = await import('./middleware')

    // Retargeted from /events/abc-123 to /me in #794: browse routes are public
    // now, so this test needs a route that is still genuinely private.
    const req = new NextRequest('http://localhost/me')
    const stub = makeAuth(null)

    // auth.protect throws on unauthenticated — middleware lets it bubble. In
    // production Clerk catches that throw at the edge and emits a 307 to the
    // configured unauthenticatedUrl. Here we just assert the protection path
    // was exercised (i.e. the request was NOT allowed to fall through).
    await expect((middleware as Function)(stub, req)).rejects.toThrow(
      /unauthorized/i,
    )
  })

  it('lets unauthenticated request to a public route through without protect', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/legal/terms')
    const result = await (middleware as Function)(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  // Not merely public-once-launched: the account menu offers "What's new" to
  // signed-out visitors in both launch modes, and the page has no user data.
  it('lets a signed-out visitor read the changelog before launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const { default: middleware } = await import('./middleware')

    const auth = makeAuth(null)
    const result = await (middleware as Function)(
      auth,
      new NextRequest('http://localhost/changelog'),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('lets authenticated request to a (protected) route through without redirect', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/me')
    const result = await (middleware as Function)(makeAuth('user_123'), req)

    expect(result).toBeUndefined()
  })

  it('lets unauthenticated PWA icon fetches through without protect', async () => {
    const { default: middleware } = await import('./middleware')

    // The OS/browser fetches install icons with no session. If middleware
    // gated these, auth.protect would redirect the fetch to the HTML landing
    // page and the icon would render blank.
    const req = new NextRequest('http://localhost/api/pwa/icon-192')
    const result = await (middleware as Function)(makeAuth(null), req)

    expect(result).toBeUndefined()
  })
})

// ⚠️ The createRouteMatcher mock above uses `startsWith`, which is looser than
// the real path-to-regexp. That looseness is deliberate here: the negative cases
// fail more readily than production would, so a passing suite is a real signal.
describe('middleware — public browse routes (#794)', () => {
  it.each([
    '/events',
    '/events/some-event-id',
    '/venues',
    '/venues/bluebird-theater',
    '/search',
    '/search?q=geese',
    '/watching',
    '/onboarding',
  ])('lets a signed-out visitor through to %s', async (path) => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await (middleware as Function)(auth, makeReq(path))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // The reason this PR exists: broadening the public set must not open a
  // private neighbour. Note `/me` is not a prefix of any public pattern.
  it.each([
    '/me',
    '/me?section=watching',
    '/me/anything',
    '/admin',
    '/admin/venues',
    '/admin/review',
  ])('still protects %s for a signed-out visitor', async (path) => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      (middleware as Function)(auth, makeReq(path)),
    ).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalledWith(
      expect.objectContaining({
        unauthenticatedUrl: expect.stringContaining('/sign-in'),
      }),
    )
  })

  it('preserves the attempted path so sign-in can return the visitor', async () => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      (middleware as Function)(auth, makeReq('/me?section=watching')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('redirect_url')).toBe('/me?section=watching')
  })

  it('never puts an absolute origin in redirect_url', async () => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      (middleware as Function)(auth, makeReq('/me')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    // A leading slash followed by neither slash nor backslash: `//evil.example`
    // and `/\evil.example` are both browser-resolvable as hosts.
    expect(url.searchParams.get('redirect_url')).toMatch(/^\/[^/\\]/)
  })

  // These exercise the adversarial pathnames the assertion above only described.
  // Each one, left unnarrowed, would hand Clerk a redirect target that resolves
  // off-origin: `//host` and `/\host` are protocol-relative, and the encoded
  // forms decode to the same thing after a naive prefix check has passed.
  it.each([
    '//evil.example',
    '//evil.example/me',
    '/\\evil.example',
    '/%5Cevil.example',
    '/%2F%2Fevil.example',
    // Double-encoded. These survive a single decode pass as `/%5Cevil.example`
    // and `/%2F%2Fevil.example`, which is exactly how a one-pass check gets
    // bypassed, so decoding runs to a fixed point.
    '/%255Cevil.example',
    '/%252F%252Fevil.example',
    // Triple, to prove the loop is a loop and not two hardcoded passes.
    '/%25255Cevil.example',
  ])('rejects %s as a redirect_url and falls back to /events', async (path) => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      (middleware as Function)(auth, makeReq(path)),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    const redirectUrl = url.searchParams.get('redirect_url') ?? ''
    expect(redirectUrl).toBe('/events')

    // Belt and braces: whatever we hand Clerk must resolve back to our own
    // origin, not just look relative.
    expect(new URL(redirectUrl, 'https://concertcrawl.app').origin).toBe(
      'https://concertcrawl.app',
    )
  })

  it('still preserves a legitimate path containing an encoded character', async () => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    // Narrowing must not swallow ordinary escaped paths — only off-origin ones.
    await expect(
      (middleware as Function)(auth, makeReq('/me/my%20shows?tab=a%26b')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.searchParams.get('redirect_url')).toBe(
      '/me/my%20shows?tab=a%26b',
    )
  })

  it('no longer bounces a signed-in user off /onboarding', async () => {
    const { default: middleware } = await import('./middleware')

    const result = await (middleware as Function)(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(result).toBeUndefined()
  })

  it.each(['/auth/code', '/sign-up', '/'])(
    'still bounces a signed-in user off %s to /events',
    async (path) => {
      const { default: middleware } = await import('./middleware')

      const result = await (middleware as Function)(
        makeAuth('user_1'),
        makeReq(path),
      )

      expect(result?.headers.get('location')).toContain('/events')
    },
  )

  // Inverted from the assertion #794 shipped. Leaving /sign-up invite-gated
  // while the landing page advertised "Sign up" meant the public shape's own
  // primary conversion path bounced to /auth/code. Once launched, an account
  // costs no invite code; the pre-launch case lives in the beta suite below.
  it('lets a signed-out visitor reach /sign-up without an invite code', async () => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await (middleware as Function)(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // Guards the `/` + invite_verified branch, which is evaluated BEFORE
  // isAlwaysPublic and must stay that way — reorder those blocks and invited
  // users stop reaching onboarding from the landing page.
  it('still redirects a signed-out visitor with an invite cookie from / to /onboarding', async () => {
    const { default: middleware } = await import('./middleware')

    const result = await (middleware as Function)(
      makeAuth(null),
      makeReq('/', { invite_verified: '1' }),
    )

    expect(result?.headers.get('location')).toContain('/onboarding')
  })
})

describe('middleware — private-beta launch gate (#794)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
  })

  it.each(['/events', '/events/abc', '/venues', '/search', '/watching'])(
    'gates %s from signed-out visitors before launch',
    async (path) => {
      const { default: middleware } = await import('./middleware')
      const auth = makeAuth(null)

      await expect(
        (middleware as Function)(auth, makeReq(path)),
      ).rejects.toThrow()
      expect(auth.protect).toHaveBeenCalled()
    },
  )

  it('sends a signed-out visitor without the invite cookie from /onboarding to /auth/code', async () => {
    const { default: middleware } = await import('./middleware')

    const result = await (middleware as Function)(
      makeAuth(null),
      makeReq('/onboarding'),
    )

    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toContain('/auth/code')
  })

  it('lets an invite-cookie holder through to /onboarding', async () => {
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await (middleware as Function)(
      auth,
      makeReq('/onboarding', { invite_verified: 'abc123' }),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still bounces a signed-in user off /onboarding before launch', async () => {
    const { default: middleware } = await import('./middleware')

    const result = await (middleware as Function)(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toContain('/events')
  })

  it('leaves the landing page and the invite funnel reachable', async () => {
    const { default: middleware } = await import('./middleware')

    for (const path of ['/', '/auth/code', '/sign-in', '/legal/terms']) {
      const auth = makeAuth(null)
      await (middleware as Function)(auth, makeReq(path))
      expect(auth.protect).not.toHaveBeenCalled()
    }
  })

  it('treats an unset flag as closed', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', '')
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      (middleware as Function)(auth, makeReq('/events')),
    ).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalled()
  })

  it('sends a signed-out visitor from /sign-up to /auth/code before launch', async () => {
    const { default: middleware } = await import('./middleware')

    const result = await (middleware as Function)(
      makeAuth(null),
      makeReq('/sign-up'),
    )

    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toContain('/auth/code')
  })

  // #794 left /sign-up unconditionally invite-gated, so the public landing
  // page's own "Sign up" button bounced to /auth/code. The launched shape is
  // only complete if an account costs no invite code.
  it('opens /sign-up to a signed-out visitor after launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { default: middleware } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await (middleware as Function)(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still bounces a signed-in user off /sign-up in both modes', async () => {
    for (const flag of ['false', 'true']) {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { default: middleware } = await import('./middleware')

      const result = await (middleware as Function)(
        makeAuth('user_1'),
        makeReq('/sign-up'),
      )

      expect(result.status).toBe(307)
      expect(result.headers.get('location')).toContain('/events')
    }
  })

  it('opens the same routes as soon as the flag flips, with no other change', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { default: middleware } = await import('./middleware')

    for (const path of ['/events', '/venues', '/search', '/watching']) {
      const auth = makeAuth(null)
      const result = await (middleware as Function)(auth, makeReq(path))
      expect(result).toBeUndefined()
      expect(auth.protect).not.toHaveBeenCalled()
    }
  })

  it('keeps /me and /admin private in both modes', async () => {
    const { default: middleware } = await import('./middleware')

    for (const path of ['/me', '/admin']) {
      const auth = makeAuth(null)
      await expect(
        (middleware as Function)(auth, makeReq(path)),
      ).rejects.toThrow()
      expect(auth.protect).toHaveBeenCalled()
    }
  })
})

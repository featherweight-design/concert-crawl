import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, type NextResponse } from 'next/server'

// The launch gate defaults to closed (#794), but every suite below this line
// describes the launched shape. Beta-mode behaviour has its own suite at the
// bottom of the file which stubs the flag off.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// The suite calls `middlewareHandler` directly, so this stub only has to let
// the module's default export construct without a real Clerk runtime.
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: <Handler>(handler: Handler): Handler => handler,
  createRouteMatcher: (patterns: string[]) => (req: NextRequest) =>
    patterns.some((pattern) => {
      // A pattern without a trailing (.*) glob is an exact path in
      // path-to-regexp, and treating it as a prefix here would let a genuine
      // over-broad match pass the suite. `/api/revalidate` relies on this.
      if (!pattern.endsWith('(.*)')) return req.nextUrl.pathname === pattern
      const base = pattern.slice(0, -'(.*)'.length)
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

/**
 * The handler returns `NextResponse | undefined`. Redirect assertions narrow
 * through here so a missing response fails loudly instead of being cast away.
 */
const expectRedirect = (result: NextResponse | undefined): NextResponse => {
  if (!result) throw new Error('expected a redirect response, got undefined')
  return result
}

const redirectLocation = (result: NextResponse | undefined): string | null =>
  expectRedirect(result).headers.get('location')

describe('middleware — returning-user redirect (#80)', () => {
  it('redirects unauthenticated user with invite cookie from / to /onboarding', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).not.toBeUndefined()
    expect(redirectLocation(result)).toContain('/onboarding')
  })

  it('does not redirect unauthenticated user without invite cookie from /', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/')

    const result = await middlewareHandler(makeAuth(null), req)

    // / is always-public with no cookie → no redirect
    expect(result).toBeUndefined()
  })

  it('redirects authenticated user from / to /events (#842)', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await middlewareHandler(makeAuth('user_123'), req)

    // Logged-in users never see the marketing landing — middleware redirects
    // them to /events so the page itself stays ISR-eligible (no auth() call
    // in the server component).
    expect(result).not.toBeUndefined()
    expect(redirectLocation(result)).toContain('/events')
  })

  it('does not redirect authenticated user on non-/ public routes', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/legal/privacy')

    const result = await middlewareHandler(makeAuth('user_123'), req)

    // Authenticated user on a non-preAuth, non-/ public route → no redirect
    expect(result).toBeUndefined()
  })
})

describe('middleware — edge auth gate (#841)', () => {
  it('blocks unauthenticated request to a (protected) route via auth.protect', async () => {
    const { middlewareHandler } = await import('./middleware')

    // Retargeted from /events/abc-123 to /me in #794: browse routes are public
    // now, so this test needs a route that is still genuinely private.
    const req = new NextRequest('http://localhost/me')
    const stub = makeAuth(null)

    // auth.protect throws on unauthenticated — middleware lets it bubble. In
    // production Clerk catches that throw at the edge and emits a 307 to the
    // configured unauthenticatedUrl. Here we just assert the protection path
    // was exercised (i.e. the request was NOT allowed to fall through).
    await expect(middlewareHandler(stub, req)).rejects.toThrow(/unauthorized/i)
  })

  it('lets unauthenticated request to a public route through without protect', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/legal/terms')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  // Not merely public-once-launched: the account menu offers "What's new" to
  // signed-out visitors in both launch modes, and the page has no user data.
  it('lets a signed-out visitor read the changelog before launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const { middlewareHandler } = await import('./middleware')

    const auth = makeAuth(null)
    const result = await middlewareHandler(
      auth,
      new NextRequest('http://localhost/changelog'),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('lets authenticated request to a (protected) route through without redirect', async () => {
    const { middlewareHandler } = await import('./middleware')

    const req = new NextRequest('http://localhost/me')
    const result = await middlewareHandler(makeAuth('user_123'), req)

    expect(result).toBeUndefined()
  })

  it('lets unauthenticated PWA icon fetches through without protect', async () => {
    const { middlewareHandler } = await import('./middleware')

    // The OS/browser fetches install icons with no session. If middleware
    // gated these, auth.protect would redirect the fetch to the HTML landing
    // page and the icon would render blank.
    const req = new NextRequest('http://localhost/api/pwa/icon-192')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  it('lets the unauthenticated revalidate POST through without protect', async () => {
    const { middlewareHandler } = await import('./middleware')

    // The crawler cron carries a token header, never a Clerk session. Gating
    // this 307'd it to /sign-in, so #1442 silently no-opped in prod; the route
    // itself checks REVALIDATE_SECRET and fails closed.
    const req = new NextRequest('http://localhost/api/revalidate', {
      method: 'POST',
    })
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  it('does not make paths under /api/revalidate public', async () => {
    const { middlewareHandler } = await import('./middleware')

    // The allowlist entry is an exact path. If it ever gains a `(.*)` glob,
    // a future /api/revalidate/* handler would be public by default.
    const req = new NextRequest('http://localhost/api/revalidate/all', {
      method: 'POST',
    })
    const auth = makeAuth(null)
    await expect(middlewareHandler(auth, req)).rejects.toThrow('Unauthorized')
    expect(auth.protect).toHaveBeenCalled()
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
    // #1115 — artist pages join the browse set on exactly the venue terms.
    '/artists',
    '/artists/nightjar-choir',
    '/search',
    '/search?q=geese',
    '/watching',
    '/onboarding',
  ])('lets a signed-out visitor through to %s', async (path) => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq(path))

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
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalledWith(
      expect.objectContaining({
        unauthenticatedUrl: expect.stringContaining('/sign-in'),
      }),
    )
  })

  it('preserves the attempted path so sign-in can return the visitor', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(
      middlewareHandler(auth, makeReq('/me?section=watching')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('redirect_url')).toBe('/me?section=watching')
  })

  it('never puts an absolute origin in redirect_url', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq('/me'))).rejects.toThrow()

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
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()

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
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    // Narrowing must not swallow ordinary escaped paths — only off-origin ones.
    await expect(
      middlewareHandler(auth, makeReq('/me/my%20shows?tab=a%26b')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.searchParams.get('redirect_url')).toBe(
      '/me/my%20shows?tab=a%26b',
    )
  })

  it('no longer bounces a signed-in user off /onboarding', async () => {
    const { middlewareHandler } = await import('./middleware')

    const result = await middlewareHandler(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(result).toBeUndefined()
  })

  it.each(['/auth/code', '/sign-up', '/'])(
    'still bounces a signed-in user off %s to /events',
    async (path) => {
      const { middlewareHandler } = await import('./middleware')

      const result = await middlewareHandler(makeAuth('user_1'), makeReq(path))

      expect(redirectLocation(result)).toContain('/events')
    },
  )

  // Inverted from the assertion #794 shipped. Leaving /sign-up invite-gated
  // while the landing page advertised "Sign up" meant the public shape's own
  // primary conversion path bounced to /auth/code. Once launched, an account
  // costs no invite code; the pre-launch case lives in the beta suite below.
  it('lets a signed-out visitor reach /sign-up without an invite code', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // Guards the `/` + invite_verified branch, which is evaluated BEFORE
  // isAlwaysPublic and must stay that way — reorder those blocks and invited
  // users stop reaching onboarding from the landing page.
  it('still redirects a signed-out visitor with an invite cookie from / to /onboarding', async () => {
    const { middlewareHandler } = await import('./middleware')

    const result = await middlewareHandler(
      makeAuth(null),
      makeReq('/', { invite_verified: '1' }),
    )

    expect(redirectLocation(result)).toContain('/onboarding')
  })
})

describe('middleware — private-beta launch gate (#794)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
  })

  it.each([
    '/events',
    '/events/abc',
    '/venues',
    '/artists',
    '/artists/nightjar-choir',
    '/search',
    '/watching',
  ])('gates %s from signed-out visitors before launch', async (path) => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalled()
  })

  it('sends a signed-out visitor without the invite cookie from /onboarding to /auth/code', async () => {
    const { middlewareHandler } = await import('./middleware')

    const result = await middlewareHandler(
      makeAuth(null),
      makeReq('/onboarding'),
    )

    expect(expectRedirect(result).status).toBe(307)
    expect(redirectLocation(result)).toContain('/auth/code')
  })

  it('lets an invite-cookie holder through to /onboarding', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(
      auth,
      makeReq('/onboarding', { invite_verified: 'abc123' }),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still bounces a signed-in user off /onboarding before launch', async () => {
    const { middlewareHandler } = await import('./middleware')

    const result = await middlewareHandler(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(expectRedirect(result).status).toBe(307)
    expect(redirectLocation(result)).toContain('/events')
  })

  it('leaves the landing page and the invite funnel reachable', async () => {
    const { middlewareHandler } = await import('./middleware')

    for (const path of ['/', '/auth/code', '/sign-in', '/legal/terms']) {
      const auth = makeAuth(null)
      await middlewareHandler(auth, makeReq(path))
      expect(auth.protect).not.toHaveBeenCalled()
    }
  })

  it('treats an unset flag as closed', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', '')
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq('/events'))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalled()
  })

  it('sends a signed-out visitor from /sign-up to /auth/code before launch', async () => {
    const { middlewareHandler } = await import('./middleware')

    const result = await middlewareHandler(makeAuth(null), makeReq('/sign-up'))

    expect(expectRedirect(result).status).toBe(307)
    expect(redirectLocation(result)).toContain('/auth/code')
  })

  // #794 left /sign-up unconditionally invite-gated, so the public landing
  // page's own "Sign up" button bounced to /auth/code. The launched shape is
  // only complete if an account costs no invite code.
  it('opens /sign-up to a signed-out visitor after launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still bounces a signed-in user off /sign-up in both modes', async () => {
    for (const flag of ['false', 'true']) {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./middleware')

      const result = await middlewareHandler(
        makeAuth('user_1'),
        makeReq('/sign-up'),
      )

      expect(expectRedirect(result).status).toBe(307)
      expect(redirectLocation(result)).toContain('/events')
    }
  })

  it('opens the same routes as soon as the flag flips, with no other change', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { middlewareHandler } = await import('./middleware')

    for (const path of [
      '/events',
      '/venues',
      '/artists',
      '/search',
      '/watching',
    ]) {
      const auth = makeAuth(null)
      const result = await middlewareHandler(auth, makeReq(path))
      expect(result).toBeUndefined()
      expect(auth.protect).not.toHaveBeenCalled()
    }
  })

  // #72 — the share loop's two routes join the browse set on exactly the
  // /artists terms: closed before launch, open after. The negative neighbours
  // below are the proof that widening the matcher opened nothing else.
  it.each([
    '/e/11111111-1111-4111-8111-111111111111',
    '/share/11111111-1111-4111-8111-111111111111/link.png',
  ])('gates %s from signed-out visitors before launch', async (path) => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalledWith(
      expect.objectContaining({
        unauthenticatedUrl: expect.stringContaining('/sign-in'),
      }),
    )

    // The visitor's place is kept: sign-in returns them to the shared link
    // rather than dropping them on the calendar with the show lost.
    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.searchParams.get('redirect_url')).toBe(path)
    expect(url.searchParams.get('redirect_url')).toMatch(/^\/[^/\\]/)
  })

  it.each([
    '/e/11111111-1111-4111-8111-111111111111',
    '/share/11111111-1111-4111-8111-111111111111/link.png',
  ])('lets a signed-out visitor reach %s after launch', async (path) => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq(path))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // The required negative case for the two new patterns: neither `/e/` nor
  // `/share/` is a prefix of anything private, in either launch mode.
  it.each(['false', 'true'])(
    'keeps /me and /admin private with the flag %s alongside the share routes',
    async (flag) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./middleware')

      for (const path of ['/me', '/me/anything', '/admin', '/admin/venues']) {
        const auth = makeAuth(null)
        await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
        expect(auth.protect).toHaveBeenCalled()
      }
    },
  )

  it('keeps /me and /admin private in both modes', async () => {
    const { middlewareHandler } = await import('./middleware')

    for (const path of ['/me', '/admin']) {
      const auth = makeAuth(null)
      await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
      expect(auth.protect).toHaveBeenCalled()
    }
  })
})

// The crew join surface (#1226) is authenticated. The correct middleware change
// for it was NO change at all — it falls through to auth.protect() and gets
// redirect_url for free. This suite pins that, so a later reader does not
// "fix" the missing matcher entry by adding one. /crew/join and /crews differ
// by one character and neither is public.
describe('middleware — crew join surface (#1226)', () => {
  it.each(['false', 'true'])(
    'sends a signed-out visitor to sign-in with the link intact, flag %s',
    async (flag) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./middleware')
      const auth = makeAuth(null)
      const path = '/crew/join/abc'

      await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()

      const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
      expect(url.pathname).toBe('/sign-in')
      expect(url.searchParams.get('redirect_url')).toBe(path)
    },
  )

  it.each(['false', 'true'])(
    'keeps /crews, /me, and /admin gated alongside it, flag %s',
    async (flag) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./middleware')

      for (const path of ['/crews', '/crews/abc', '/me', '/admin']) {
        const auth = makeAuth(null)
        await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
        expect(auth.protect).toHaveBeenCalled()
      }
    },
  )
})

// Gate (b): a visitor who arrives at a crew link with no account is bounced
// through the beta code screen, and has to land back on the link afterwards.
// The middleware owns the first hop.
describe('middleware — beta funnel return path (#1226)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
  })

  it('prefers the incoming redirect_url over the /sign-up path itself', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(
      auth,
      makeReq('/sign-up?redirect_url=%2Fcrew%2Fjoin%2Fabc'),
    )

    const location = redirectLocation(result)
    expect(location).not.toBeNull()
    const url = new URL(location!)
    expect(url.pathname).toBe('/auth/code')
    // Without this preference the visitor would be returned to /sign-up.
    expect(url.searchParams.get('redirect_url')).toBe('/crew/join/abc')
  })

  it('falls back to the attempted path when no param is present', async () => {
    const { middlewareHandler } = await import('./middleware')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    const url = new URL(redirectLocation(result)!)
    expect(url.pathname).toBe('/auth/code')
    expect(url.searchParams.get('redirect_url')).toBe('/sign-up')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com'])(
    'refuses to forward the hostile redirect_url %s',
    async (hostile) => {
      const { middlewareHandler } = await import('./middleware')
      const auth = makeAuth(null)

      const result = await middlewareHandler(
        auth,
        makeReq(`/sign-up?redirect_url=${encodeURIComponent(hostile)}`),
      )

      const url = new URL(redirectLocation(result)!)
      expect(url.searchParams.get('redirect_url')).toBe('/events')
    },
  )
})

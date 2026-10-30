import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, type NextResponse } from 'next/server'
import { KNOWN_TOP_LEVEL_SEGMENTS } from './proxy'

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

describe('proxy — returning-user redirect (#80)', () => {
  it('redirects unauthenticated user with invite cookie from / to /sign-up', async () => {
    const { middlewareHandler } = await import('./proxy')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).not.toBeUndefined()
    expect(redirectLocation(result)).toContain('/sign-up')
  })

  it('does not redirect unauthenticated user without invite cookie from /', async () => {
    const { middlewareHandler } = await import('./proxy')

    const req = new NextRequest('http://localhost/')

    const result = await middlewareHandler(makeAuth(null), req)

    // / is always-public with no cookie → no redirect
    expect(result).toBeUndefined()
  })

  it('redirects authenticated user from / to /events (#842)', async () => {
    const { middlewareHandler } = await import('./proxy')

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
    const { middlewareHandler } = await import('./proxy')

    const req = new NextRequest('http://localhost/legal/privacy')

    const result = await middlewareHandler(makeAuth('user_123'), req)

    // Authenticated user on a non-preAuth, non-/ public route → no redirect
    expect(result).toBeUndefined()
  })
})

describe('proxy — auth gate (#841)', () => {
  it('blocks unauthenticated request to a (protected) route via auth.protect', async () => {
    const { middlewareHandler } = await import('./proxy')

    // Retargeted from /events/abc-123 to /me in #794: browse routes are public
    // now, so this test needs a route that is still genuinely private.
    const req = new NextRequest('http://localhost/me')
    const stub = makeAuth(null)

    // auth.protect throws on unauthenticated — middleware lets it bubble. In
    // production Clerk catches that throw in the proxy and emits a 307 to the
    // configured unauthenticatedUrl. Here we just assert the protection path
    // was exercised (i.e. the request was NOT allowed to fall through).
    await expect(middlewareHandler(stub, req)).rejects.toThrow(/unauthorized/i)
  })

  it('lets unauthenticated request to a public route through without protect', async () => {
    const { middlewareHandler } = await import('./proxy')

    const req = new NextRequest('http://localhost/legal/terms')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  // The invite-code screen links here, so it must open before sign-up and
  // before launch (#1619).
  it('lets a signed-out visitor read the beta agreement before launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const { middlewareHandler } = await import('./proxy')

    const auth = makeAuth(null)
    const req = new NextRequest('http://localhost/legal/beta')
    const result = await middlewareHandler(auth, req)

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // Not merely public-once-launched: the account menu offers "What's new" to
  // signed-out visitors in both launch modes, and the page has no user data.
  it('lets a signed-out visitor read the changelog before launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const { middlewareHandler } = await import('./proxy')

    const auth = makeAuth(null)
    const result = await middlewareHandler(
      auth,
      new NextRequest('http://localhost/changelog'),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // Our own user agent advertises /bot on every crawl request, so it has to
  // resolve for a venue sysadmin with no account, in either launch mode.
  // Both spellings: middleware matches the path as requested, so a trailing
  // slash must not reach sign-in on its way to Next's own normalization.
  it.each(['/bot', '/bot/'])(
    'lets a signed-out visitor read %s before launch',
    async (path) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
      const { middlewareHandler } = await import('./proxy')

      const auth = makeAuth(null)
      const result = await middlewareHandler(
        auth,
        new NextRequest(`http://localhost${path}`),
      )

      expect(result).toBeUndefined()
      expect(auth.protect).not.toHaveBeenCalled()
    },
  )

  // The negative case #794 requires of every isAlwaysPublic addition: /bot is an
  // exact path, so a neighbour that merely starts with it stays protected.
  it('does not make a /bot-prefixed route public', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const { middlewareHandler } = await import('./proxy')

    const auth = makeAuth(null)

    // `/bots` is not a segment this app serves, so it 404s rather than
    // inheriting `/bot`'s public treatment. Nothing is disclosed either way.
    const result = await middlewareHandler(
      auth,
      new NextRequest('http://localhost/bots/secret'),
    )

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // A crawler has no session, so gating the two files that tell it what to do
  // redirected both to sign-in and made #1228's sitemap and robots.txt unreadable
  // in prod. They must resolve in either launch mode: what robots.txt says off
  // the canonical origin is "disallow everything", which only works if it can be
  // read at all.
  it.each([
    ['/robots.txt', 'false'],
    ['/robots.txt', 'true'],
    ['/sitemap.xml', 'false'],
    ['/sitemap.xml', 'true'],
  ])(
    'lets an unauthenticated crawler read %s with public browse %s',
    async (path, launched) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', launched)
      const { middlewareHandler } = await import('./proxy')

      const auth = makeAuth(null)
      const result = await middlewareHandler(
        auth,
        new NextRequest(`http://localhost${path}`),
      )

      expect(result).toBeUndefined()
      expect(auth.protect).not.toHaveBeenCalled()
    },
  )

  // The negative case #794 requires of every isAlwaysPublic addition. Both are
  // exact paths, so neither opens a neighbour that merely shares the prefix.
  it.each([
    ['/robots.txt/secret', 'false'],
    ['/robots.txt/secret', 'true'],
    ['/sitemap.xml/secret', 'false'],
    ['/sitemap.xml/secret', 'true'],
  ])(
    'does not make %s public with public browse %s',
    async (path, launched) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', launched)
      const { middlewareHandler } = await import('./proxy')

      const auth = makeAuth(null)
      auth.protect.mockRejectedValueOnce(new Error('unauthorized'))

      await expect(
        middlewareHandler(auth, new NextRequest(`http://localhost${path}`)),
      ).rejects.toThrow(/unauthorized/i)
    },
  )

  it('lets authenticated request to a (protected) route through without redirect', async () => {
    const { middlewareHandler } = await import('./proxy')

    const req = new NextRequest('http://localhost/me')
    const result = await middlewareHandler(makeAuth('user_123'), req)

    expect(result).toBeUndefined()
  })

  it('lets unauthenticated PWA icon fetches through without protect', async () => {
    const { middlewareHandler } = await import('./proxy')

    // The OS/browser fetches install icons with no session. If middleware
    // gated these, auth.protect would redirect the fetch to the HTML landing
    // page and the icon would render blank.
    const req = new NextRequest('http://localhost/api/pwa/icon-192')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  it('lets the unauthenticated site social card through without protect', async () => {
    const { middlewareHandler } = await import('./proxy')

    // An unfurl crawler following a bare concertcrawl.app link carries no
    // session. Gated, the card resolves to a redirect and the link unfurls
    // bare.
    const req = new NextRequest('http://localhost/api/og')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  it('does not make paths under /api/og public', async () => {
    const { middlewareHandler } = await import('./proxy')

    // '/api/og' is listed as an exact path, so a nested route added later is
    // gated by default rather than inheriting the card's openness.
    const req = new NextRequest('http://localhost/api/og/private')
    const auth = makeAuth(null)
    await expect(middlewareHandler(auth, req)).rejects.toThrow('Unauthorized')
    expect(auth.protect).toHaveBeenCalled()
  })

  it('lets the unauthenticated revalidate POST through without protect', async () => {
    const { middlewareHandler } = await import('./proxy')

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
    const { middlewareHandler } = await import('./proxy')

    // The allowlist entry is an exact path. If it ever gains a `(.*)` glob,
    // a future /api/revalidate/* handler would be public by default.
    const req = new NextRequest('http://localhost/api/revalidate/all', {
      method: 'POST',
    })
    const auth = makeAuth(null)
    await expect(middlewareHandler(auth, req)).rejects.toThrow('Unauthorized')
    expect(auth.protect).toHaveBeenCalled()
  })

  it('lets a signed-out visitor reach the offline fallback', async () => {
    const { middlewareHandler } = await import('./proxy')

    // Serwist precaches /~offline through a plain navigation fetch with no
    // session. Gating it redirects that fetch, the fallback never lands in the
    // cache, and an offline navigation dies with ERR_FAILED.
    const req = new NextRequest('http://localhost/~offline')
    const result = await middlewareHandler(makeAuth(null), req)

    expect(result).toBeUndefined()
  })

  it('does not make a route under /~offline public', async () => {
    const { middlewareHandler } = await import('./proxy')

    // Same exact-path guard as /api/revalidate above: a `/~offline(.*)` glob
    // would make a future private sibling public by default. The path has to
    // stay under the `~offline` top-level segment or `isKnownRoute` returns
    // first and nothing is protected either way.
    const req = new NextRequest('http://localhost/~offline/anything')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, req)).rejects.toThrow('Unauthorized')
    expect(auth.protect).toHaveBeenCalled()
  })
})

// ⚠️ The createRouteMatcher mock above uses `startsWith`, which is looser than
// the real path-to-regexp. That looseness is deliberate here: the negative cases
// fail more readily than production would, so a passing suite is a real signal.
describe('proxy — public browse routes (#794)', () => {
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
  ])('lets a signed-out visitor through to %s', async (path) => {
    const { middlewareHandler } = await import('./proxy')
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
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalledWith(
      expect.objectContaining({
        unauthenticatedUrl: expect.stringContaining('/sign-in'),
      }),
    )
  })

  it('preserves the attempted path so sign-in can return the visitor', async () => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(
      middlewareHandler(auth, makeReq('/me?section=watching')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('redirect_url')).toBe('/me?section=watching')
  })

  it('keeps a query string whose escapes the path validator could not resolve', async () => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    // `%25` decodes to a bare `%`, which the next decode pass throws on. The
    // query is never put through that pass precisely so a legitimate one like
    // this is not answered with /events.
    await expect(
      middlewareHandler(auth, makeReq('/me?q=50%25')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.searchParams.get('redirect_url')).toBe('/me?q=50%25')
  })

  it('never puts an absolute origin in redirect_url', async () => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq('/me'))).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    // A leading slash followed by neither slash nor backslash: `//evil.example`
    // and `/\evil.example` are both browser-resolvable as hosts.
    expect(url.searchParams.get('redirect_url')).toMatch(/^\/[^/\\]/)
  })

  // These adversarial pathnames — `//host`, `/\host`, and the encoded forms
  // that decode to them — can never name a segment this app serves, so the
  // known-route gate 404s them before Clerk is consulted and no redirect_url is
  // built at all. `sanitizeReturnPath` is still what narrows the reachable
  // paths; lib/auth/intent.test.ts carries every one of these shapes against it
  // directly, which is where that property belongs.
  it.each([
    '//evil.example',
    '//evil.example/me',
    '/\\evil.example',
    '/%5Cevil.example',
    '/%2F%2Fevil.example',
    '/%255Cevil.example',
    '/%252F%252Fevil.example',
    '/%25255Cevil.example',
  ])('never builds a redirect_url from %s at all', async (path) => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq(path))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still preserves a legitimate path containing an encoded character', async () => {
    const { middlewareHandler } = await import('./proxy')
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
    const { middlewareHandler } = await import('./proxy')

    const result = await middlewareHandler(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(result).toBeUndefined()
  })

  it.each(['/auth/code', '/sign-up', '/'])(
    'still bounces a signed-in user off %s to /events',
    async (path) => {
      const { middlewareHandler } = await import('./proxy')

      const result = await middlewareHandler(makeAuth('user_1'), makeReq(path))

      expect(redirectLocation(result)).toContain('/events')
    },
  )

  // Inverted from the assertion #794 shipped. Leaving /sign-up invite-gated
  // while the landing page advertised "Sign up" meant the public shape's own
  // primary conversion path bounced to /auth/code. Once launched, an account
  // costs no invite code; the pre-launch case lives in the beta suite below.
  // The tour is post-auth in both launch modes: its artist step reads and
  // writes as the signed-in user, so a signed-out walk can only end in the
  // error panel. Sign-in, then straight back to it.
  it('sends a signed-out visitor from /onboarding to sign-in once launched', async () => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(
      middlewareHandler(auth, makeReq('/onboarding')),
    ).rejects.toThrow()

    const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('redirect_url')).toBe('/onboarding')
  })

  it('lets a signed-out visitor reach /sign-up without an invite code', async () => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  // Guards the `/` + invite_verified branch, which is evaluated BEFORE
  // isAlwaysPublic and must stay that way — reorder those blocks and a
  // returning code-holder stops reaching the funnel from the landing page.
  it('still redirects a signed-out visitor with an invite cookie from / to /sign-up', async () => {
    const { middlewareHandler } = await import('./proxy')

    const result = await middlewareHandler(
      makeAuth(null),
      makeReq('/', { invite_verified: '1' }),
    )

    expect(redirectLocation(result)).toContain('/sign-up')
  })
})

describe('proxy — private-beta launch gate (#794)', () => {
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
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalled()
  })

  // The invite cookie no longer buys the tour, because the tour no longer runs
  // on a cookie-only visitor: the funnel is invite code → sign-up → tour, and
  // `/auth/complete` spends the cookie before the tour is ever reached.
  it('sends a signed-out visitor from /onboarding to sign-in, cookie or not', async () => {
    const { middlewareHandler } = await import('./proxy')

    for (const cookies of [undefined, { invite_verified: 'abc123' }]) {
      const auth = makeAuth(null)

      await expect(
        middlewareHandler(auth, makeReq('/onboarding', cookies)),
      ).rejects.toThrow()

      const url = new URL(auth.protect.mock.calls[0]![0].unauthenticatedUrl)
      expect(url.pathname).toBe('/sign-in')
    }
  })

  // Inverted from what #794 shipped. Bouncing a signed-in user off the tour
  // would bounce exactly the people the funnel just sent there.
  it('no longer bounces a signed-in user off /onboarding before launch', async () => {
    const { middlewareHandler } = await import('./proxy')

    const result = await middlewareHandler(
      makeAuth('user_1'),
      makeReq('/onboarding'),
    )

    expect(result).toBeUndefined()
  })

  it('leaves the landing page and the invite funnel reachable', async () => {
    const { middlewareHandler } = await import('./proxy')

    for (const path of ['/', '/auth/code', '/sign-in', '/legal/terms']) {
      const auth = makeAuth(null)
      await middlewareHandler(auth, makeReq(path))
      expect(auth.protect).not.toHaveBeenCalled()
    }
  })

  it('treats an unset flag as closed', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', '')
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    await expect(middlewareHandler(auth, makeReq('/events'))).rejects.toThrow()
    expect(auth.protect).toHaveBeenCalled()
  })

  it('sends a signed-out visitor from /sign-up to /auth/code before launch', async () => {
    const { middlewareHandler } = await import('./proxy')

    const result = await middlewareHandler(makeAuth(null), makeReq('/sign-up'))

    expect(expectRedirect(result).status).toBe(307)
    expect(redirectLocation(result)).toContain('/auth/code')
  })

  // #794 left /sign-up unconditionally invite-gated, so the public landing
  // page's own "Sign up" button bounced to /auth/code. The launched shape is
  // only complete if an account costs no invite code.
  it('opens /sign-up to a signed-out visitor after launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it('still bounces a signed-in user off /sign-up in both modes', async () => {
    for (const flag of ['false', 'true']) {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./proxy')

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
    const { middlewareHandler } = await import('./proxy')

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
    const { middlewareHandler } = await import('./proxy')
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
    const { middlewareHandler } = await import('./proxy')
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
      const { middlewareHandler } = await import('./proxy')

      for (const path of ['/me', '/me/anything', '/admin', '/admin/venues']) {
        const auth = makeAuth(null)
        await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
        expect(auth.protect).toHaveBeenCalled()
      }
    },
  )

  it('keeps /me and /admin private in both modes', async () => {
    const { middlewareHandler } = await import('./proxy')

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
describe('proxy — crew join surface (#1226)', () => {
  it.each(['false', 'true'])(
    'sends a signed-out visitor to sign-in with the link intact, flag %s',
    async (flag) => {
      vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', flag)
      const { middlewareHandler } = await import('./proxy')
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
      const { middlewareHandler } = await import('./proxy')

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
describe('proxy — beta funnel return path (#1226)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
  })

  it('prefers the incoming redirect_url over the /sign-up path itself', async () => {
    const { middlewareHandler } = await import('./proxy')
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
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq('/sign-up'))

    const url = new URL(redirectLocation(result)!)
    expect(url.pathname).toBe('/auth/code')
    expect(url.searchParams.get('redirect_url')).toBe('/sign-up')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com'])(
    'refuses to forward the hostile redirect_url %s',
    async (hostile) => {
      const { middlewareHandler } = await import('./proxy')
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

describe('proxy — unknown paths 404 rather than redirecting to sign-in', () => {
  it.each([
    '/wp-admin/setup-config.php',
    '/.env',
    '/phpmyadmin',
    '/definitely-not-a-route',
  ])('lets %s fall through to Next’s 404', async (path) => {
    const { middlewareHandler } = await import('./proxy')
    const auth = makeAuth(null)

    const result = await middlewareHandler(auth, makeReq(path))

    expect(result).toBeUndefined()
    expect(auth.protect).not.toHaveBeenCalled()
  })

  it.each(['/me', '/admin', '/me/settings'])(
    'still protects the known private route %s',
    async (path) => {
      const { middlewareHandler } = await import('./proxy')
      const auth = makeAuth(null)

      await expect(middlewareHandler(auth, makeReq(path))).rejects.toThrow()
      expect(auth.protect).toHaveBeenCalled()
    },
  )
})

describe('proxy — the known-segment list tracks the filesystem', () => {
  /**
   * Route groups are erased from the URL, so `(protected)/(main)/events` is
   * served at `/events`. Anything under a real segment is irrelevant here —
   * only the first one is matched.
   */
  const topLevelSegmentsUnder = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) return []
      if (entry.name.startsWith('_') || entry.name.startsWith('@')) return []
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        return topLevelSegmentsUnder(join(dir, entry.name))
      }
      return [entry.name]
    })

  /**
   * A route group is erased from the URL, so a metadata file inside one —
   * `app/(protected)/opengraph-image.tsx` — is served from the root just as an
   * `app/` root file is. Collected the same way for the same reason.
   */
  const rootLevelFilesUnder = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return entry.name.startsWith('(') && entry.name.endsWith(')')
          ? rootLevelFilesUnder(join(dir, entry.name))
          : []
      }
      return [entry.name]
    })

  const appDir = join(import.meta.dirname, 'app')

  /**
   * Next turns these into ordinary URLs. Listed by hand because the filename
   * does not spell the served path; the assertion below fails when a root file
   * appears that is not accounted for either here or as a non-route.
   */
  const METADATA_ROUTES: Record<string, string> = {
    'apple-icon.tsx': 'apple-icon',
    'icon.svg': 'icon.svg',
    'manifest.ts': 'manifest.webmanifest',
    'robots.ts': 'robots.txt',
    'sitemap.ts': 'sitemap.xml',
    'sw.ts': 'sw.js',
  }

  const NON_ROUTE_ROOT_FILES = new Set([
    'error.tsx',
    'globals.css',
    'layout.tsx',
    'not-found.tsx',
    'page.tsx',
  ])

  it('lists every top-level directory under app/', () => {
    for (const segment of topLevelSegmentsUnder(appDir)) {
      expect(
        KNOWN_TOP_LEVEL_SEGMENTS.has(segment),
        `/${segment} exists in app/ but is missing from KNOWN_TOP_LEVEL_SEGMENTS, so it 404s`,
      ).toBe(true)
    }
  })

  it('lists every entry served from public/', () => {
    const publicDir = join(import.meta.dirname, '..', 'public')

    for (const entry of readdirSync(publicDir)) {
      // `.gitkeep` and friends are VCS placeholders, not assets anyone links to.
      if (entry.startsWith('.')) continue
      // `next.config.ts` points Serwist's `swDest` at `public/sw.js`, so a local
      // web build drops `sw.js` and its source map here. `sw.js` is listed; the
      // map is a build artifact nobody links to, and asserting on it would fail
      // this test on an otherwise clean tree after `pnpm build`.
      if (entry.endsWith('.map')) continue

      expect(
        KNOWN_TOP_LEVEL_SEGMENTS.has(entry),
        `/${entry} is served from public/ but is missing from KNOWN_TOP_LEVEL_SEGMENTS`,
      ).toBe(true)
    }
  })

  it('accounts for every metadata route generated from an app/ root file', () => {
    const rootFiles = rootLevelFilesUnder(appDir).filter(
      (name) => !/\.test\.tsx?$/.test(name),
    )

    for (const name of rootFiles) {
      if (NON_ROUTE_ROOT_FILES.has(name)) continue

      const served = METADATA_ROUTES[name]
      expect(
        served,
        `${name} is a new app/ root file — add the URL it serves to METADATA_ROUTES, or to NON_ROUTE_ROOT_FILES if it serves none`,
      ).toBeDefined()
      expect(KNOWN_TOP_LEVEL_SEGMENTS.has(served!)).toBe(true)
    }
  })
})

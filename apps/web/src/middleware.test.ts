import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

type AuthStub = (() => Promise<{ userId: string | null }>) & {
  protect?: () => Promise<void>
}

function makeAuth(userId: string | null): AuthStub {
  const fn: AuthStub = async () => ({ userId })
  fn.protect = async () => {
    if (!userId) throw new Error('Unauthorized')
  }
  return fn
}

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

    const req = new NextRequest('http://localhost/events/abc-123')
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

  it('lets authenticated request to a (protected) route through without redirect', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/events/abc-123')
    const result = await (middleware as Function)(makeAuth('user_123'), req)

    expect(result).toBeUndefined()
  })
})

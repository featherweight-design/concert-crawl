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

  it('does not redirect authenticated user with invite cookie from /', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    const result = await (middleware as Function)(makeAuth('user_123'), req)

    // Authenticated user on a non-preAuth route → no redirect
    expect(result).toBeUndefined()
  })
})

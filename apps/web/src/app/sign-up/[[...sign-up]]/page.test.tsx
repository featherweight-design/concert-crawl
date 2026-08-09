// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Stand-in for Clerk's <SignUp /> — we only care that the page passes
// `forceRedirectUrl="/auth/complete"` so the invite cookie is consumed
// after signup (#1113). Rendering the real component would require a
// ClerkProvider + browser env we don't have in unit tests.
vi.mock('@clerk/nextjs', () => ({
  SignUp: ({ forceRedirectUrl }: { forceRedirectUrl?: string }) => (
    <div
      data-testid="clerk-signup"
      data-force-redirect-url={forceRedirectUrl}
    />
  ),
}))

const renderPage = async (
  searchParams: Record<string, string | string[] | undefined>,
) => {
  // Dynamic import so the vi.mock above is guaranteed to be in place
  // before the page module resolves `@clerk/nextjs` — matches the
  // convention used by other page-level tests in this repo
  // (e.g. app/page.test.ts, admin/events/[id]/edit/page.test.tsx).
  const { default: SignUpPage } = await import('./page')
  render(await SignUpPage({ searchParams: Promise.resolve(searchParams) }))
  return screen
    .getByTestId('clerk-signup')
    .getAttribute('data-force-redirect-url')
}

describe('SignUpPage (#1113)', () => {
  it('routes Clerk sign-up through /auth/complete so the invite cookie gets consumed', async () => {
    // Without this prop, Clerk's default post-signup destination is `/`
    // and `/v1/auth/redeem-code` never runs — the invite row stays
    // unclaimed even for successful signups.
    expect(await renderPage({})).toBe('/auth/complete')
  })

  it('forwards a safe redirect_url so the caller keeps its destination', async () => {
    // forceRedirectUrl outranks Clerk's own redirect_url param, so a caller
    // that appends one is dropped unless the page forwards it by hand.
    expect(await renderPage({ redirect_url: '/e/abc' })).toBe(
      '/auth/complete?return=%2Fe%2Fabc',
    )
  })

  it('drops an off-origin redirect_url rather than forwarding it', async () => {
    expect(await renderPage({ redirect_url: 'https://evil.test/x' })).toBe(
      '/auth/complete',
    )
  })
})

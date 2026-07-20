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

describe('SignUpPage (#1113)', () => {
  it('routes Clerk sign-up through /auth/complete so the invite cookie gets consumed', async () => {
    // Dynamic import so the vi.mock above is guaranteed to be in place
    // before the page module resolves `@clerk/nextjs` — matches the
    // convention used by other page-level tests in this repo
    // (e.g. app/page.test.ts, admin/events/[id]/edit/page.test.tsx).
    const { default: SignUpPage } = await import('./page')
    render(<SignUpPage />)
    const clerk = screen.getByTestId('clerk-signup')
    // Without this prop, Clerk's default post-signup destination is `/`
    // and `/v1/auth/redeem-code` never runs — the invite row stays
    // unclaimed even for successful signups.
    expect(clerk.getAttribute('data-force-redirect-url')).toBe('/auth/complete')
  })
})

import { test, expect } from '@playwright/test'
import { waitForHydrated } from '../fixtures/hydration'
import { PUBLIC_BROWSE_ENABLED } from '../helpers/launch-mode'

// Unit tests prove the matcher; only a real browser proves the vertical.
test.describe('logged-out browse (#794)', () => {
  // Explicit empty state rather than `undefined` — see the note in auth.spec.ts.
  // This whole file is meaningless if the session leaks in from the project
  // config, so the signed-out condition is stated outright.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('a signed-out visitor can browse, and is offered a way in', async ({
    page,
  }) => {
    // The /me and /admin cases below hold in both modes and stay unskipped —
    // they are the ones that would matter most if the gate went wrong.
    test.skip(
      !PUBLIC_BROWSE_ENABLED,
      'browse surfaces are invite-gated until launch (#794)',
    )

    await page.goto('/events')
    await expect(page.locator('[data-testid="event-row"]').first()).toBeVisible(
      { timeout: 15_000 },
    )

    await page.goto('/watching')
    await expect(page).toHaveURL(/\/watching/)
    // The signed-out teaching state, so the URL check is not passing on a
    // page that never rendered.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // The gated accessible name from PR-F: the honesty lives in the name, not
    // in the pixels, so asserting it here doubles as a regression test.
    await page.goto('/events')
    const gatedEye = page
      .getByRole('button', { name: /sign up to start watching/i })
      .first()
    await expect(gatedEye).toBeVisible({ timeout: 15_000 })

    await waitForHydrated(gatedEye)
    await gatedEye.click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('a signed-out visitor is sent to sign-in from /me and can be returned after', async ({
    page,
  }) => {
    await page.goto('/me')
    await expect(page).toHaveURL(/\/sign-in/)
    expect(new URL(page.url()).searchParams.get('redirect_url')).toBe('/me')
  })

  test('a signed-out visitor cannot reach admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

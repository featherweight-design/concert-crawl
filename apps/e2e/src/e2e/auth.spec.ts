import { test, expect } from '@playwright/test'
import { PUBLIC_BROWSE_ENABLED } from '../helpers/launch-mode'

test.describe('unauthenticated access', () => {
  // An explicit empty state, not `undefined`. Passing `undefined` to a fixture
  // override is ambiguous — it can resolve back to the project-wide
  // `storageState: '.auth/user.json'` in playwright.config.ts, which would run
  // these signed IN and quietly invert every assertion below.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('admin route redirects to sign-in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)
  })

  test('protected route returns edge 307 redirect before invoking a server function (#841)', async ({
    request,
  }) => {
    // Hit a private route directly without following redirects so we can
    // assert the middleware-level 307 — the whole point of the edge gate is
    // that this never touches a Node serverless function.
    //
    // Retargeted from `/events/non-existent-id` to `/me` in #794: browse is
    // public now, so the edge gate needs a route that is still private.
    const response = await request.get('/me', { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    const location = response.headers()['location']
    expect(location).toBeTruthy()
    expect(location).not.toMatch(/^\/me/)
    expect(location).toMatch(/sign-in/)
  })

  test('truly-public route loads without auth (legal terms)', async ({
    page,
  }) => {
    // `/legal/terms` is in the middleware's `isAlwaysPublic` matcher; it
    // should render without any redirect.
    await page.goto('/legal/terms')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/legal\/terms/)
    expect(page.url()).not.toMatch(/sign-in/)
  })

  test('public /events serves unauthenticated requests directly (#794)', async ({
    request,
  }) => {
    test.skip(
      !PUBLIC_BROWSE_ENABLED,
      '/events is invite-gated until launch (#794)',
    )

    // The inverse of the assertion this test used to make. `/events` joined
    // `isAlwaysPublic`, so the edge gate must NOT redirect it — a 307 here
    // means the browse-only shape regressed and signed-out visitors are
    // being bounced off the front door again.
    const response = await request.get('/events', { maxRedirects: 0 })

    expect(response.status()).toBe(200)
  })

  test('still protects /me and /admin, carrying the attempted path (#794)', async ({
    request,
  }) => {
    // Broadening the public set must not open a private neighbour. `/me` is
    // deliberately not a prefix of any public pattern.
    for (const path of ['/me', '/admin']) {
      const response = await request.get(path, { maxRedirects: 0 })

      expect(response.status()).toBe(307)
      const location = response.headers()['location'] ?? ''
      expect(location).toMatch(/sign-in/)
      expect(
        new URL(location, 'http://localhost').searchParams.get('redirect_url'),
      ).toBe(path)
    }
  })
})

test.describe('authenticated access', () => {
  test('authenticated user can access events page', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    expect(page.url()).not.toMatch(/sign-in/)
    await expect(page).toHaveTitle(/concert crawl/i)
  })
})

import { test, expect } from '@playwright/test'

test.describe('unauthenticated access', () => {
  test.use({ storageState: undefined })

  test('admin route redirects to sign-in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)
  })

  test('protected route returns edge 307 redirect before invoking a server function (#841)', async ({
    request,
  }) => {
    // Hit a (protected) route directly without following redirects so we can
    // assert the middleware-level 307 — the whole point of the edge gate is
    // that this never touches a Node serverless function.
    const response = await request.get('/events/non-existent-id', {
      maxRedirects: 0,
    })

    expect(response.status()).toBe(307)
    const location = response.headers()['location']
    expect(location).toBeTruthy()
    // Clerk's auth.protect redirects to the configured unauthenticatedUrl.
    // We don't care which public surface — just that it's a same-origin
    // redirect off the protected path.
    expect(location).not.toMatch(/\/events\/non-existent-id/)
  })

  test('truly-public route loads without auth (legal terms)', async ({
    page,
  }) => {
    // `/legal/terms` is in the middleware's `isAlwaysPublic` matcher; it
    // should render without any redirect. The old version of this test
    // pointed at `/events`, which lives under `(protected)` and now
    // correctly redirects via the edge gate — testing it as "public" was
    // inconsistent with the canonical auth surface (#845 Copilot R2).
    await page.goto('/legal/terms')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/legal\/terms/)
    expect(page.url()).not.toMatch(/sign-in/)
  })

  test('protected /events redirects unauthenticated requests', async ({
    request,
  }) => {
    // Mirror of the `/events/:id` redirect assertion above but for the
    // list route — locks down both the detail and index branches of the
    // (protected) /events tree.
    const response = await request.get('/events', { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    const location = response.headers()['location']
    expect(location).toBeTruthy()
    expect(location).not.toMatch(/\/events$/)
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

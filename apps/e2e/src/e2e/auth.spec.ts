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

  test('public browse page is accessible without auth', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/concert crawl/i)
    expect(page.url()).toMatch(/\/events/)
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

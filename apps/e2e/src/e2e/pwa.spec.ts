import { test, expect } from '@playwright/test'

test.describe('PWA', () => {
  // Relative paths resolve against the config's baseURL, matching every other spec.
  test('serves a valid manifest', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBeTruthy()
    const manifest = await res.json()
    expect(manifest.display).toBe('standalone')
    expect(Array.isArray(manifest.icons)).toBeTruthy()
    expect(
      manifest.icons?.some((icon: { purpose?: string }) =>
        icon.purpose?.includes('maskable'),
      ),
    ).toBeTruthy()
  })

  test('registers a service worker', async ({ page }) => {
    await page.goto('/')
    // Wait for the SW to activate so getRegistration() is populated. The SW is
    // production-only (disabled in dev); this passes against staging/prod builds.
    await page.evaluate(() => navigator.serviceWorker.ready)
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return Boolean(reg)
    })
    expect(registered).toBeTruthy()
  })

  test('shows the offline fallback for uncached navigations', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await context.setOffline(true)
    await page.goto('/a-path-that-was-never-cached')
    await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible()
    await context.setOffline(false)
  })
})

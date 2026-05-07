import { test, expect } from '@playwright/test'

test.describe('unauthenticated access', () => {
  test('admin route redirects to sign-in', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)

    await context.close()
  })

  test('public browse page is accessible without auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/concert crawl/i)
    expect(page.url()).toMatch(/\/events/)

    await context.close()
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

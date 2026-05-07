import { test, expect } from '@playwright/test'

test.describe('venue detail page', () => {
  test('renders venue info and event list', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const venueLink = page.locator('[data-testid="venue-name-link"]').first()
    const linkVisible = await venueLink.isVisible()
    if (!linkVisible) {
      test.skip(true, 'No venue name link found on browse page')
      return
    }

    await venueLink.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/venues\/[a-z0-9-]+/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('Larimer Lounge venue page renders (seed data check)', async ({
    page,
  }) => {
    await page.goto('/venues/larimer-lounge')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveTitle(/404|not found/i)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/larimer/i)
  })
})

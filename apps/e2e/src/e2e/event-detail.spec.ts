import { test, expect } from '@playwright/test'

test.describe('event detail page', () => {
  test('renders event details from the browse page', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[data-testid="event-card"]').first()
    await expect(firstCard).toBeVisible()

    await firstCard.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/events\/[a-z0-9-]+/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    const venueLink = page.locator('[data-testid="event-venue-name"]')
    await expect(venueLink).toBeVisible()
  })

  test('back navigation returns to browse', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[data-testid="event-card"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/events$/)
  })
})

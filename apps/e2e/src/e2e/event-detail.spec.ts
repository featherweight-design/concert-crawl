import { test, expect } from '@playwright/test'

test.describe('event detail page', () => {
  test('renders event details from the browse page', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const rowCount = await page.locator('[data-testid="event-row"]').count()
    if (rowCount === 0) {
      test.skip(
        true,
        'No events on staging — cannot test event detail navigation',
      )
      return
    }

    const firstRow = page.locator('[data-testid="event-row"]').first()
    await expect(firstRow).toBeVisible()

    await firstRow.click()
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

    const rowCount = await page.locator('[data-testid="event-row"]').count()
    if (rowCount === 0) {
      test.skip(true, 'No events on staging — cannot test back navigation')
      return
    }

    const firstRow = page.locator('[data-testid="event-row"]').first()
    await firstRow.click()
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/events$/)
  })
})

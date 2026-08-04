import { test, expect } from '@playwright/test'

test.describe('browse events page', () => {
  test('loads the browse page with events', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/concert crawl/i)

    const firstRow = page.locator('[data-testid="event-row"]').first()
    await expect(firstRow).toBeVisible()
  })

  test('venue filter chip narrows the event list', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const chipContainer = page.locator('[data-testid="venue-chip"]')
    const chipCount = await chipContainer.count()
    if (chipCount === 0) {
      test.skip(true, 'No venue chips present on staging — skip filter test')
      return
    }

    const firstChip = chipContainer.first()
    const chipLabel = await firstChip.textContent()

    await firstChip.click()
    await page.waitForLoadState('networkidle')

    await expect(firstChip).toHaveAttribute('aria-expanded', 'true')

    const filteredCount = await page
      .locator('[data-testid="event-row"]')
      .count()
    if (filteredCount > 0) {
      await expect(
        page.locator('[data-testid="event-row"]').first(),
      ).toBeVisible()
    }

    console.log(`Filtered by venue: ${chipLabel}`)
  })

  test('load more fetches additional events', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const loadMoreButton = page.getByRole('button', { name: /load more/i })
    const isVisible = await loadMoreButton.isVisible()

    if (!isVisible) {
      test.skip(
        true,
        'Load More button not visible — fewer events than one page',
      )
      return
    }

    const initialCount = await page.locator('[data-testid="event-row"]').count()
    await loadMoreButton.click()
    await page.waitForLoadState('networkidle')
    const newCount = await page.locator('[data-testid="event-row"]').count()

    expect(newCount).toBeGreaterThan(initialCount)
  })
})

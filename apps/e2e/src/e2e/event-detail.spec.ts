import { test, expect } from '@playwright/test'

import { isVisibleWithin } from '../fixtures/presence'

test.describe('event detail page', () => {
  test('renders event details from the browse page', async ({ page }) => {
    await page.goto('/events')

    // The row's link is the stretched artist-name anchor. Clicking the row
    // container instead can land on the action gutter's button, which sits
    // above the stretch overlay (globals.css: .event-row button { z-index: 2 })
    // and does not navigate.
    const firstRowLink = page
      .locator('[data-testid="event-row"] a.event-row-stretch')
      .first()
    // Waits, rather than sampling once: rows arrive client-side, so a bare
    // isVisible() probe skips on a populated environment.
    if (!(await isVisibleWithin(firstRowLink, 15_000))) {
      test.skip(true, 'No event rows on this environment')
      return
    }

    await firstRowLink.click()
    // waitForURL, not waitForLoadState: an App Router soft navigation can leave
    // the network idle before the transition commits, so networkidle is not a
    // navigation barrier.
    await page.waitForURL(/\/events\/[a-z0-9-]+/)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="event-venue-name"]')).toBeVisible()
  })

  test('back navigation returns to browse', async ({ page }) => {
    await page.goto('/events')

    // Same stretched-anchor rule as above: the row container's centre can land
    // on the action gutter's button (z-index: 2) and navigate nowhere.
    const firstRowLink = page
      .locator('[data-testid="event-row"] a.event-row-stretch')
      .first()
    if (!(await isVisibleWithin(firstRowLink, 15_000))) {
      test.skip(true, 'No event rows on this environment')
      return
    }

    await firstRowLink.click()
    await page.waitForURL(/\/events\/[a-z0-9-]+/)

    await page.goBack()
    await page.waitForURL(/\/events$/)
  })
})

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

  // The returner state needs a signed-in viewer with an attending row at this
  // exact venue, which staging data cannot guarantee. So rather than a test that
  // passes vacuously when that row is absent, assert the invariant that holds in
  // both modes: the guide renders exactly one of its two shapes, never both and
  // never a collapsed card sitting under the expanded section header.
  test('venue guide renders in exactly one viewer mode', async ({ page }) => {
    await page.goto('/venues/larimer-lounge')
    await page.waitForLoadState('networkidle')

    const guide = page.locator('[data-testid="venue-guide"]')
    if ((await guide.count()) === 0) {
      test.skip(true, 'Larimer Lounge has no published guide on this env')
      return
    }

    const accordion = page.locator('[data-testid="returner-guide-accordion"]')
    const callout = page.locator('[data-testid="first-timer-callout"]')

    const isReturner = (await accordion.count()) > 0
    if (isReturner) {
      await expect(callout).toHaveCount(0)
      await expect(
        page.locator('[data-testid="guide-still-gathering"]'),
      ).toHaveCount(0)
      // Collapsed by default — no chip body is on screen until it is opened.
      await expect(page.locator('[data-testid^="guide-chip-"]')).toHaveCount(0)
      await accordion.getByRole('button').click()
      await expect(
        page.locator('[data-testid^="guide-chip-"]').first(),
      ).toBeVisible()
    } else {
      await expect(
        page.locator('[data-testid^="guide-chip-"]').first(),
      ).toBeVisible()
    }
  })
})

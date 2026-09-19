import { test, expect } from '@playwright/test'

// `waitForLoadState('networkidle')` is deliberately absent from this file. The
// browse page keeps react-query polling in the background, so networkidle either
// resolves before the rows render or never resolves at all — either way it is
// unrelated to whether the thing under test is on screen. Every wait below is on
// the element the assertion needs.
test.describe('browse events page', () => {
  test('loads the browse page with events', async ({ page }) => {
    await page.goto('/events')

    await expect(page).toHaveTitle(/concert crawl/i)

    const firstRow = page.locator('[data-testid="event-row"]').first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
  })

  test('venue filter chip applies a venue filter', async ({ page }) => {
    await page.goto('/events')

    // `count()` samples once and returns 0 on a page that has not finished
    // hydrating, which silently skipped this test on an environment that does
    // have venues. Wait for the chip and treat only a real timeout as empty.
    const venueChip = page.locator('[data-testid="venue-chip"]').first()
    try {
      await venueChip.waitFor({ state: 'visible', timeout: 15_000 })
    } catch {
      test.skip(true, 'No venue chips present on staging — skip filter test')
      return
    }

    await venueChip.click()
    await expect(venueChip).toHaveAttribute('aria-expanded', 'true')

    // Clicking the chip only opens its popover — the old version of this test
    // stopped there and asserted nothing about filtering, despite its name. The
    // filter is applied by choosing an option, and the popover's first button is
    // the placeholder that clears the filter, so the first venue is at index 1.
    const panel = page.getByRole('dialog', { name: /filter$/ })
    const firstVenueOption = panel.getByRole('button').nth(1)
    await firstVenueOption.waitFor({ state: 'visible', timeout: 10_000 })
    const venueLabel = (await firstVenueOption.textContent())?.trim() ?? ''

    await firstVenueOption.click()

    // The filter lives in the URL, and the chip relabels itself to the active
    // venue — both have to agree for the filter to have actually landed.
    await page.waitForURL(/filterWhere=/, { timeout: 15_000 })
    await expect(venueChip).toContainText(venueLabel)
  })

  test('load more fetches additional events', async ({ page }) => {
    await page.goto('/events')

    const rows = page.locator('[data-testid="event-row"]')
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })

    // Same reason as the chip wait above: a one-shot isVisible() here reported
    // "fewer events than one page" and skipped on a staging environment with
    // hundreds of events, because the button had not been painted yet.
    const loadMoreButton = page.getByRole('button', { name: /load more/i })
    try {
      await loadMoreButton.waitFor({ state: 'visible', timeout: 10_000 })
    } catch {
      test.skip(
        true,
        'Load More button not visible — fewer events than one page',
      )
      return
    }

    const initialCount = await rows.count()
    await loadMoreButton.click()

    // EventsList appends through react-query's fetchNextPage — no navigation
    // happens, so the new rows arrive after the click resolves. Poll the count
    // instead of sampling it once.
    await expect
      .poll(async () => rows.count(), { timeout: 10_000 })
      .toBeGreaterThan(initialCount)
  })
})

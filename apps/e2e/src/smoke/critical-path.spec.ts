import { test, expect } from '@playwright/test'
import { healthCheck } from '../helpers/api.js'
import { waitForHydrated } from '../fixtures/hydration.js'

// No `waitForLoadState('networkidle')` in this file. Next 16 holds a
// proxy-redirected RSC prefetch open, so the network never idles and every
// wait on it timed out. Each test waits on the element that means its page is
// ready, and on hydration before it clicks anything the server rendered.

test.describe('smoke: app availability', () => {
  test('homepage renders with content', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/concert crawl/i)
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })

  test('API health endpoint responds', async ({ request }) => {
    const healthy = await healthCheck(request)
    expect(healthy).toBe(true)
  })
})

test.describe('smoke: event data', () => {
  test('browse page loads with at least one event', async ({ page }) => {
    await page.goto('/events')

    const eventRows = page.locator('[data-testid="event-row"]')
    await expect(eventRows.first()).toBeVisible({ timeout: 10_000 })
    const count = await eventRows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('venue filter chip produces results', async ({ page }) => {
    await page.goto('/events')

    // Require the chip to be present. The previous version no-op'd
    // silently when no chip was visible, which masked the auth-redirect
    // bug that landed the entire suite on `/` — a page that has no
    // chips at all. If real venue data ever disappears such that no
    // chip renders, that's itself a smoke-worthy failure.
    const firstChip = page.locator('[data-testid="venue-chip"]').first()
    await expect(firstChip).toBeVisible({ timeout: 10_000 })

    await waitForHydrated(firstChip)
    await firstChip.click()
    // The chip opens its venue popover; that is the concrete result of the
    // click, and the error check below only means something once it landed.
    await expect(firstChip).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('body')).not.toContainText(
      /error|500|unexpected/i,
    )
  })

  test('event detail page renders for the first browse event', async ({
    page,
  }) => {
    await page.goto('/events')

    const firstRow = page.locator('[data-testid="event-row"]').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })

    const detailLink = firstRow.locator('a[href*="/events/"]').first()
    const href = await detailLink.getAttribute('href')
    if (!href) {
      throw new Error('First event row has no detail link href')
    }

    await page.goto(href)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(page).not.toHaveTitle(/404|not found/i)
  })

  test('venues index page lists venues', async ({ page }) => {
    await page.goto('/venues')

    const venueLinks = page.locator('a[href^="/venues/"]')
    // Wait for a link before counting: `count()` samples once.
    await expect(venueLinks.first()).toBeVisible({ timeout: 10_000 })
    await expect(page).not.toHaveTitle(/404|not found/i)
    const count = await venueLinks.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('smoke: search', () => {
  // Exercise search through the SSR page rather than calling the API
  // directly. Reads are public since #794, so a raw request would work — but
  // SSR is what real users hit, and asserting on the rendered page catches
  // wiring breaks between the API and the UI that an API-only check misses.
  test('events page renders results or empty state when filtered by search', async ({
    page,
  }) => {
    await page.goto('/events?search=concert')

    // The search rendered SOMETHING meaningful: either at least one
    // event row matched, or the filtered empty-state title ("Crickets.")
    // is shown. Both confirm the search actually executed and the page
    // reached its data-rendering path — a "page didn't crash" check
    // alone would pass even if the search filter silently broke. It runs
    // first because it is also the readiness wait for the checks below.
    const eventRow = page.locator('[data-testid="event-row"]').first()
    const emptyState = page.getByText(/crickets\./i).first()
    await expect(eventRow.or(emptyState)).toBeVisible({ timeout: 10_000 })

    await expect(page).not.toHaveTitle(/404|not found/i)
    await expect(page.locator('body')).not.toContainText(
      /error|500|unexpected/i,
    )
  })
})

test.describe('smoke: auth protection', () => {
  // Run this describe without the shared smoke storage state so we
  // can verify the unauthenticated redirect contract. Without the
  // override, the suite-wide signed-in session would let /admin
  // render (or 403), and we'd no longer be testing the auth gate.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('admin route redirects unauthenticated users to sign-in', async ({
    page,
  }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/sign-in/)
    // apps/web/src/middleware.ts sends auth-gated routes to `/sign-in` with a
    // relative `redirect_url` (#794 — it was `/` while the whole app was
    // private). The smoke contract follows the middleware: landing anywhere
    // under /admin means the gate failed open.
    const url = new URL(page.url())
    expect(url.pathname).not.toMatch(/^\/admin/)
    expect(url.pathname).toMatch(/sign-in/)
    expect(url.searchParams.get('redirect_url')).toBe('/admin')
  })
})

test.describe('smoke: known venue', () => {
  test('a seeded venue page loads', async ({ page }) => {
    await page.goto('/venues/larimer-lounge')

    // Assert the heading actually contains the venue name. The
    // previous version only checked that an h1 was visible — the
    // homepage also has an h1, so the test passed even when the
    // route silently redirected to `/`.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/larimer/i)
    await expect(page).not.toHaveTitle(/404|not found/i)
  })
})

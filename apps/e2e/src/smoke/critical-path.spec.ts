import { test, expect } from '@playwright/test'
import { healthCheck } from '../helpers/api.js'

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
    await page.waitForLoadState('networkidle')

    const eventCards = page.locator('[data-testid="event-card"]')
    await expect(eventCards.first()).toBeVisible({ timeout: 10_000 })
    const count = await eventCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('venue filter chip produces results', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstChip = page.locator('[data-testid="venue-chip"]').first()
    const isChipVisible = await firstChip.isVisible()

    if (isChipVisible) {
      await firstChip.click()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).not.toContainText(
        /error|500|unexpected/i,
      )
    }
  })

  test('event detail page renders for the first browse event', async ({
    page,
  }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[data-testid="event-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 10_000 })

    const detailLink = firstCard.locator('a[href*="/events/"]').first()
    const href = await detailLink.getAttribute('href')
    expect(href).toBeTruthy()
    if (!href) return

    await page.goto(href)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveTitle(/404|not found/i)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('venues index page lists venues', async ({ page }) => {
    await page.goto('/venues')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveTitle(/404|not found/i)
    const venueLinks = page.locator('a[href^="/venues/"]')
    const count = await venueLinks.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('smoke: search', () => {
  // Exercise search through the SSR page rather than calling the API
  // directly. The events API is gated by serviceOrClerkAuth when
  // REQUIRE_BETA_AUTH=true, which a raw Playwright request would 401 on;
  // SSR uses the service key and is what real users hit anyway.
  test('events page renders without error when filtered by search', async ({
    page,
  }) => {
    await page.goto('/events?search=concert')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveTitle(/404|not found/i)
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
    await expect(page.locator('body')).not.toContainText(
      /error|500|unexpected/i,
    )
  })
})

test.describe('smoke: auth protection', () => {
  test('admin route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)
  })
})

test.describe('smoke: known venue', () => {
  test('a seeded venue page loads', async ({ page }) => {
    await page.goto('/venues/larimer-lounge')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveTitle(/404|not found/i)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })
})

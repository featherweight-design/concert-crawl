import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Resolve an event id from the browse page. TEST_EVENT_ID used to be read from
 * the environment and defaulted to the string 'test-event-id', which 404s on
 * every environment — the specs never ran against a real event.
 */
const resolveEventId = async (page: Page): Promise<string | null> => {
  await page.goto('/events')
  const firstRowLink = page
    .locator('[data-testid="event-row"] a.event-row-stretch')
    .first()

  // `isVisible()` is a non-waiting probe: it samples the DOM once and returns
  // false immediately. /events renders its rows client-side after the RSC
  // payload resolves, so a bare isVisible() call reports "no events" on a
  // staging environment that does in fact have events, and every price spec
  // then skips. Wait explicitly, and treat only a genuine timeout as empty.
  try {
    await firstRowLink.waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    return null
  }

  const href = await firstRowLink.getAttribute('href')
  if (href === null) return null
  const match = /\/events\/([^/?#]+)/.exec(href)
  return match?.[1] ?? null
}

test.describe('Price Transparency v2', () => {
  test('submit flow — fill form and see success state', async ({ page }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
    await page.goto(`/events/${eventId}/submit-price`)
    await expect(page.getByText('Submit a price')).toBeVisible()

    await page.getByLabel('Floor *').fill('45')
    await page.getByRole('button', { name: 'GA' }).click()
    await page.getByRole('button', { name: 'Ticketmaster' }).click()
    await page.getByRole('button', { name: 'Bought it myself' }).click()

    await page.getByRole('button', { name: 'Submit price' }).click()
    await expect(page.getByText('Got it. Thanks.')).toBeVisible()
  })

  test('alreadySubmitted state — shows existing card or form', async ({
    page,
  }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
    await page.goto(`/events/${eventId}/submit-price`)
    const alreadyCard = page.getByText('You already submitted a price.')
    const form = page.getByRole('button', { name: 'Submit price' })
    const oneOf = await Promise.race([
      alreadyCard.waitFor({ timeout: 5000 }).then(() => 'already'),
      form.waitFor({ timeout: 5000 }).then(() => 'form'),
    ])
    expect(['already', 'form']).toContain(oneOf)
  })

  test('verify sheet — opens on reports link', async ({ page }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
    await page.goto(`/events/${eventId}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      await expect(page.getByText('Confirm what you saw')).toBeVisible()
    }
  })

  test('dispute flow — navigate to dispute page and submit', async ({
    page,
  }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
    await page.goto(`/events/${eventId}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      const disputeBtn = page.getByRole('button', { name: 'Dispute' }).first()
      if (await disputeBtn.isVisible()) {
        await disputeBtn.click()
        await expect(page.getByText('Dispute price')).toBeVisible()
        await page.getByLabel('Floor *').fill('30')
        await page.getByRole('button', { name: 'AXS' }).click()
        await page.getByRole('button', { name: 'File dispute' }).click()
        await expect(page.getByText('Logged.')).toBeVisible()
      }
    }
  })
})

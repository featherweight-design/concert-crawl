import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { isVisibleWithin } from '../fixtures/presence'

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
  if (!(await isVisibleWithin(firstRowLink, 15_000))) return null

  const href = await firstRowLink.getAttribute('href')
  if (href === null) return null
  const match = /\/events\/([^/?#]+)/.exec(href)
  return match?.[1] ?? null
}

/**
 * This file used to hold four tests that could neither pass nor fail. Two
 * navigated to `/events/:id/submit-price`, a route that has never existed —
 * price submission is a modal opened from the event detail page. The other two
 * wrapped every assertion in `if (await button.isVisible())`, so whenever the
 * button had not rendered yet they executed no assertions and still reported
 * green. Both pairs also asserted against copy that has since moved on ("Got
 * it. Thanks." is now "Got it · submitted"; the dispute button now reads
 * "Update").
 *
 * What remains is the part that is deterministic on a seeded environment: the
 * modal opens from the event detail CTA. The submit itself is deliberately not
 * driven — a real submission mutates staging data and the endpoint caps a user
 * at three prices per show per 24h, so an E2E job that submitted would go red
 * on its fourth run of the day for reasons that are not a regression.
 */
test.describe('Price Transparency v2', () => {
  test('opens the price submission modal from event detail', async ({
    page,
  }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }

    await page.goto(`/events/${eventId}`)

    // Two CTAs open the same modal and which one renders depends on the event:
    // PriceDisplay's "Submit a price" on an event with no listed price,
    // SubmitPriceCardCta's "Submit another price" once a price exists. The first
    // browse row is whatever the environment has, so match either.
    await page
      .getByRole('button', { name: /Submit (a|another) price/ })
      .first()
      .click()

    // The dialog's accessible name, not a state-specific string: the modal
    // opens into the form, the already-submitted card or the tier picker
    // depending on what this account has already done to this event, and all
    // three are a pass for "the CTA opens the modal".
    await expect(
      page.getByRole('dialog', { name: 'Submit price' }),
    ).toBeVisible({ timeout: 15_000 })
  })
})

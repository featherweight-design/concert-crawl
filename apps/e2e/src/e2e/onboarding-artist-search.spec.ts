import { test, expect } from '@playwright/test'
import type { Locator } from '@playwright/test'

import { waitForHydrated } from '../fixtures/hydration'

// The close-out walk for the in-tour artist search (onboarding step 7).
//
// This exists because component tests cannot accept this feature. jsdom lays
// nothing out and mounts one tree; the tour renders its mobile and desktop
// trees at once, and the thing that broke this step in the first place was a
// SESSION, not a component. So the walk loads the real route, at both widths,
// and presses the control.
//
// It runs against staging, where the fixture account is authenticated. The
// tour lives behind auth now — deliberately, since its artist step reads and
// writes as the signed-in reader — so a signed-out run has nothing to walk and
// skips rather than failing.
const WIDTHS = [
  { label: 'phone', width: 390, height: 844 },
  { label: 'desktop', width: 1300, height: 900 },
] as const

/** Step 7 of 8. Reached by pressing Next, because the tour has no deep link. */
const ARTISTS_STEP_INDEX = 6

/**
 * The tour mounts BOTH trees and hides one with `display:none`, so `.first()`
 * takes whichever is first in the document — the mobile one — and at desktop
 * that is the hidden copy. Every locator here filters on visibility instead,
 * or the walk times out on a perfectly good build.
 */
const visible = (locator: Locator): Locator =>
  locator.filter({ visible: true }).first()

test.describe('onboarding step 7 — artist search', () => {
  for (const viewport of WIDTHS) {
    test(`searches inside the step at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await page.goto('/onboarding?entry=menu')

      if (/sign-in|clerk\.com|accounts\./i.test(page.url())) {
        test.skip(true, 'No authenticated session — the tour is post-auth')
      }

      // The walk below is a run of clicks on server-rendered buttons; one that
      // lands before hydration does nothing and the walk stops a step short.
      await waitForHydrated(
        visible(page.getByRole('button', { name: /next/i })),
      )

      // Walk to the artists step. `.first()` because both trees are mounted;
      // only one is visible, and Playwright's visibility filter picks it.
      for (let step = 0; step < ARTISTS_STEP_INDEX; step += 1) {
        await visible(page.getByRole('button', { name: /next/i })).click()
      }

      const trigger = visible(
        page.getByRole('button', { name: /search for someone specific/i }),
      )
      await expect(trigger).toBeVisible()

      // PICK ONE FIRST. Without a selection the rail reads "Continue without
      // following" on both sides of the swap, so every assertion below holds
      // even if opening search wiped the selection outright — which is the
      // one thing this walk exists to rule out.
      const tiles = page.getByRole('checkbox').filter({ visible: true })
      if ((await tiles.count()) === 0) {
        test.skip(true, 'No suggestions to pick from on this account')
      }
      await tiles.first().click()

      const rail = visible(
        page.getByRole('button', {
          name: /follow|continue without following/i,
        }),
      )
      const railBefore = await rail.textContent()
      // The rail has to be counting, or it is not the state being preserved.
      expect(railBefore).toMatch(/follow 1 artist/i)

      // Where the head block sits BEFORE the swap. The field is supposed to
      // take this slot; the defect was the step's body re-centring itself
      // once the grid left, which slid the field ~150px down the card and
      // made a swap read as a relayout. Only a laid-out page can answer it.
      const headTop = await visible(
        page.getByRole('heading', { name: /follow a few of these/i }),
      ).evaluate((node) => node.getBoundingClientRect().top)

      await trigger.click()

      const field = visible(
        page.getByRole('textbox', { name: /search artists by name/i }),
      )
      await expect(field).toBeVisible()
      const fieldTop = await field.evaluate(
        (node) => node.getBoundingClientRect().top,
      )
      // Generous, because the field's box and the eyebrow's cap height do not
      // start on the same pixel — and still far inside the drop it catches.
      expect(Math.abs(fieldTop - headTop)).toBeLessThan(24)
      // The mode swap moves focus, or a keyboard reader is left on a control
      // that is no longer there.
      await expect(field).toBeFocused()

      // THE RULING THIS WALK EXISTS FOR: the rail stays, live, unchanged. A
      // sheet or a route would take it away, and taking it away is what made
      // the old link-to-/search a defect rather than a detour.
      await expect(rail).toBeVisible()
      expect(await rail.textContent()).toBe(railBefore)

      // The picked strip is the on-screen proof the selection survived — the
      // sessionStorage silence is the defect this whole surface is here to
      // end, so its absence is a failure rather than a cosmetic miss.
      await expect(visible(page.getByText(/picked · 1/i))).toBeVisible()

      // And the step's own way out survives the swap. Opened from the account
      // menu the rail reads "Close" rather than "Skip" (`entry=menu`), so the
      // name has to allow both or this fails on a correct build.
      await expect(
        visible(page.getByRole('link', { name: /^(skip|close)$/i })),
      ).toBeVisible()

      await field.fill('the')
      // WAIT FOR A SETTLED ANSWER, never a fixed sleep. The read is debounced
      // and then goes to the network, so a timeout races it: a slow staging
      // response leaves the skeletons up, every "no results" branch below
      // takes itself out of the run, and the walk reports green having
      // exercised none of it. Rows or a notice — both are answers; skeletons
      // are not.
      const resultRows = page.getByRole('checkbox').filter({ visible: true })
      const searchNotice = visible(
        page.getByText(/nobody by that name|already follow those/i),
      )
      await expect
        .poll(
          async () =>
            (await resultRows.count()) > 0 || (await searchNotice.count()) > 0,
          { timeout: 15_000 },
        )
        .toBe(true)
      // Results or "nobody by that name" — both are a real answer. What must
      // not happen is the step leaving, so the URL is the assertion.
      expect(new URL(page.url()).pathname).toBe('/onboarding')
      // And the pick is still counted with a query in the box, which is the
      // case that made the strip necessary: a pick leaves the visible list
      // the moment the query moves past it.
      await expect(rail).toHaveText(/follow 1 artist/i)

      // A pick made in SEARCH has to survive the trip back to the grid with a
      // tile of its own — the rail counted it and the grid drew nothing, which
      // reads as the pick having been dropped. Skipped rather than failed when
      // the query matched nothing on this account: no result is no subject.
      //
      // The row has to be an UNCHECKED one. Search drops artists the server
      // says you already follow, not ones ticked in this uncommitted tour, so
      // the tile picked above can come back as a match — and clicking it
      // blind unticks it, drops the count to zero and fails the assertion on
      // a perfectly good build.
      const row = page
        .getByRole('checkbox', { checked: false })
        .filter({ visible: true })
        .first()
      let searchPickName: string | null = null
      if ((await row.count()) > 0) {
        searchPickName =
          (await row.getByTestId('pick-name').textContent())?.trim() ?? null
        await row.click()
        await expect(rail).toHaveText(/follow 2 artists/i)
      }

      // Back to the grid, and focus comes back with it. The field's own X is
      // the control that exists in EVERY search state — the labelled "Back to
      // suggestions" button is drawn only in the empty ones, so pressing that
      // finds nothing whenever the query actually matched something.
      await visible(page.getByRole('button', { name: /close search/i })).click()
      await expect(trigger).toBeVisible()
      await expect(trigger).toBeFocused()

      if (searchPickName !== null) {
        // By NAME rather than by position: it is appended after the
        // suggestions, and asserting the last tile would pass just as well on
        // a build that drew the wrong artist there.
        const tile = page
          .getByRole('checkbox')
          .filter({ visible: true })
          .filter({
            has: page
              .getByTestId('pick-name')
              .and(page.getByText(searchPickName, { exact: true })),
          })
          .first()
        await expect(tile).toBeVisible()
        await expect(tile).toHaveAttribute('aria-checked', 'true')
        await expect(rail).toHaveText(/follow 2 artists/i)
      }
    })
  }
})

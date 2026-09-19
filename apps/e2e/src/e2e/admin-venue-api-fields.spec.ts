import { test, expect } from '@playwright/test'

import { isVisibleWithin } from '../fixtures/presence'

// Admin venue-edit: API provider + account ID fields (#506).
// Runs against staging with the shared authenticated storage state. If the
// creds aren't admin (or the venues list is empty) the spec skips rather than
// failing — mirrors the defensive pattern in the other e2e specs.
//
// The spec deliberately avoids a successful save so it never mutates staging
// venue data. It exercises the two behaviours that are pure UI contract:
//   1. Conditional reveal — the account-ID field appears only when a provider
//      is selected, and disappears when set back to None.
//   2. Cross-field validation — selecting a provider but saving with an empty
//      account ID surfaces the field error (the API's superRefine 400, which
//      does not persist).
test.describe('admin venue edit — API integration fields', () => {
  test('provider select reveals account ID and validates on empty save', async ({
    page,
  }) => {
    await page.goto('/admin/venues')
    await page.waitForLoadState('networkidle')

    if (/sign-in|clerk\.com|accounts\./i.test(page.url())) {
      test.skip(true, 'Authenticated user is not an admin')
      return
    }

    const firstVenue = page
      .locator('a[href^="/admin/venues/"]')
      .filter({ hasNotText: /new|robots/i })
      .first()
    if (!(await isVisibleWithin(firstVenue, 15_000))) {
      test.skip(true, 'No venues in the admin list')
      return
    }

    await firstVenue.click()
    await page.waitForLoadState('networkidle')

    const providerSelect = page.locator('#edit-venue-api-provider')
    if (!(await isVisibleWithin(providerSelect, 5_000))) {
      test.skip(true, 'API provider field not present on this venue')
      return
    }

    const accountIdInput = page.locator('#edit-venue-api-account-id')

    // Baseline: with no provider selected, the account-ID field is hidden.
    await providerSelect.selectOption('')
    await expect(accountIdInput).toHaveCount(0)

    // Selecting a provider reveals the account-ID field.
    await providerSelect.selectOption('venuepilot')
    await expect(accountIdInput).toBeVisible()

    // Save with an empty account ID → the API rejects (superRefine 400) and
    // the field error surfaces. Nothing is persisted.
    await accountIdInput.fill('')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/API account ID is required/i)).toBeVisible()

    // Setting the provider back to None hides the field again.
    await providerSelect.selectOption('')
    await expect(accountIdInput).toHaveCount(0)
  })
})

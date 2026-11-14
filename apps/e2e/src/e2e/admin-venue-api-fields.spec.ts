import { test, expect } from '@playwright/test';

import { waitForHydrated } from '../fixtures/hydration';
import { isVisibleWithin } from '../fixtures/presence';

// Admin venue Source tab (3b part 6). The API provider and account ID fields
// this spec used to drive moved into Source's How we read it, with its own
// save bar. Runs against staging with the shared authenticated storage state;
// if the creds aren't admin (or the venues list is empty) the spec skips.
//
// The spec never saves, so it never mutates staging venue data. It checks
// the pure UI contract: the crawl rules are shown read-only, and Source's own
// bar appears only once something changed and leaves on Discard.
test.describe('admin venue Source tab', () => {
  test('crawl rules are read-only, and the save bar follows an edit', async ({
    page,
  }) => {
    await page.goto('/admin/venues');

    if (/sign-in|clerk\.com|accounts\./i.test(page.url())) {
      test.skip(true, 'Authenticated user is not an admin');
      return;
    }

    const firstVenue = page
      .locator('a[href^="/admin/venues/"]')
      .filter({ hasNotText: /new|robots/i })
      .first();
    if (!(await isVisibleWithin(firstVenue, 15_000))) {
      test.skip(true, 'No venues in the admin list');
      return;
    }

    const href = await firstVenue.getAttribute('href');
    if (href === null) {
      test.skip(true, 'Venue link has no href');
      return;
    }
    await page.goto(`${href.split('?')[0]}?tab=source`);

    const source = page.getByTestId('venue-source');
    await expect(source).toBeVisible({ timeout: 15_000 });

    const rules = page.getByTestId('source-rules');
    await expect(rules).toBeVisible();
    await expect(rules.locator('input, select, textarea, button')).toHaveCount(
      0,
    );

    const saveBar = page.getByTestId('source-save-bar');
    await expect(saveBar).toHaveCount(0);

    // A click before hydration never tells React.
    const advancedToggle = source.getByRole('button', { name: /Advanced/ });
    await waitForHydrated(advancedToggle);
    await advancedToggle.click();

    // Wait until applies to every venue. The input is visually hidden inside
    // its drawn segment, so the click goes to the label.
    const advanced = page.getByTestId('source-advanced');
    const label = (await advanced
      .getByRole('radio', { name: 'Loaded' })
      .isChecked())
      ? 'HTML ready'
      : 'Loaded';
    await advanced.getByText(label, { exact: true }).click();
    await expect(advanced.getByRole('radio', { name: label })).toBeChecked();
    await expect(saveBar).toBeVisible();

    await saveBar.getByRole('button', { name: 'Discard' }).click();
    await expect(saveBar).toHaveCount(0);
  });
});

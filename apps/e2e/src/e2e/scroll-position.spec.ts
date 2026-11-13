import { test, expect } from '@playwright/test';

import { isVisibleWithin } from '../fixtures/presence';

// The shell resets the window to the top on a pathname change, because Next
// skips its own reset whenever the new page's top is still on screen. These
// pin both halves on a real browser: a new page opens at its top, and Back
// still lands where the list was left (the browser's restoration, which the
// reset must not undo). A unit test cannot show the second half: jsdom has no
// scroll restoration.
//
// A phone viewport, since that is where the bug was reported.
test.use({ viewport: { width: 390, height: 844 } });

// Restoration can settle a few pixels off once rows re-measure.
const TOLERANCE_PX = 48;

test.describe('scroll position across navigation', () => {
  test('a new page opens at the top and Back restores the list position', async ({
    page,
  }) => {
    await page.goto('/events');

    const rowLinks = page.locator(
      '[data-testid="event-row"] a.event-row-stretch',
    );
    if (!(await isVisibleWithin(rowLinks.first(), 15_000))) {
      test.skip(true, 'No event rows on this environment');
      return;
    }

    // Scroll a long way down the list, then open a row that is on screen there.
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(600);
    // A row already on screen at this offset, so the click itself does not
    // scroll; the offset recorded here is the one Back must return to.
    const visibleLink = rowLinks.filter({ visible: true }).nth(1);
    await visibleLink.scrollIntoViewIfNeeded();
    const listY = await page.evaluate(() => window.scrollY);
    await visibleLink.click();
    await page.waitForURL(/\/events\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The event page opens at its top, not part way down.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.goBack();
    await page.waitForURL(/\/events(\?|$)/);
    await expect(rowLinks.first()).toBeVisible({ timeout: 15_000 });

    // Back returns to where the list was left.
    await expect
      .poll(async () =>
        Math.abs((await page.evaluate(() => window.scrollY)) - listY),
      )
      .toBeLessThanOrEqual(TOLERANCE_PX);

    // A forward navigation from the restored list opens at the top again.
    await rowLinks.filter({ visible: true }).first().click();
    await page.waitForURL(/\/events\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

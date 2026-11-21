// The What's new popup takes focus on open, keeps Tab inside, and returns focus to its opener on Escape.
export default async function ({ page, goto, press, check }) {
  await goto('/changelog');
  // A dev page presses before hydration does nothing.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  // Only the popup: the app shell has its own dialogs (search).
  const dialog = page.locator(
    '[role="dialog"][aria-labelledby="spotlight-modal-title"]',
  );
  // The spotlight strip is the one button carrying the "Feature drop" eyebrow.
  const opener = page
    .locator('button', { hasText: 'Feature drop · announcement' })
    .first();
  await opener.waitFor({ timeout: 10000 });
  await opener.scrollIntoViewIfNeeded();
  await press(opener);
  await page.waitForTimeout(1500);
  if ((await dialog.count()) === 0)
    return check(
      false,
      'pressing the spotlight strip opens the popup',
      await page.evaluate(
        () =>
          `url=${location.pathname} dialogs=${document.querySelectorAll('[role=dialog]').length} active=${document.activeElement?.tagName}`,
      ),
    );
  await dialog.waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  const inside = () =>
    dialog.evaluate((el) => el.contains(document.activeElement));
  check(
    await inside(),
    'focus moves into the popup on open',
    await page.evaluate(() => {
      const el = document.activeElement;
      return `${el?.tagName} ${el?.getAttribute('aria-label') ?? ''}`;
    }),
  );
  let stayed = true;
  for (let tab = 0; tab < 14; tab += 1) {
    await page.keyboard.press('Tab');
    if (!(await inside())) stayed = false;
  }
  check(stayed, 'Tab stays inside the popup through a full cycle');
  stayed = true;
  for (let tab = 0; tab < 14; tab += 1) {
    await page.keyboard.press('Shift+Tab');
    if (!(await inside())) stayed = false;
  }
  check(stayed, 'Shift+Tab stays inside the popup through a full cycle');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: 10000 });
  check(
    await opener.evaluate((el) => el === document.activeElement),
    'focus returns to the button that opened it',
  );
}

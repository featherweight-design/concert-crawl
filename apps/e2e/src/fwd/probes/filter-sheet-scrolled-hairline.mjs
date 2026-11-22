// The phone Filters sheet draws no hairline under its header at rest, and draws one once its
// body has scrolled (addendum 6 item 15). Phone only: from 640 up filters open as popovers.
// Fails with PhoneFilterSheet's header put back to an always-on border-border.
export const widths = ['xs'];

export default async function ({ page, goto, press, check }) {
  await goto('/events');
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const opener = page.locator('[data-testid="filters-button"]:visible').first();
  await opener.waitFor({ timeout: 15000 });
  await press(opener);
  const header = page.locator('[data-testid="filter-sheet-header"]');
  const body = page.locator('[data-testid="filter-sheet-body"]');
  await header.waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);

  const rule = () =>
    header.evaluate((el) => getComputedStyle(el).borderBottomColor);
  const clear = (colour) =>
    colour === 'rgba(0, 0, 0, 0)' || colour === 'transparent';

  const before = await rule();
  check(clear(before), 'no hairline under the header at rest', before);

  const room = await body.evaluate((el) => el.scrollHeight - el.clientHeight);
  check(room > 0, 'the body has more to scroll at 320', `room=${room}`);
  await body.evaluate((el) => {
    el.scrollTop = 60;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(200);
  const after = await rule();
  check(!clear(after), 'a hairline under the header once the body scrolls', after);
}

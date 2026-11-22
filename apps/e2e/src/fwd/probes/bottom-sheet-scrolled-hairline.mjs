// The event Share sheet draws a hairline under its close row once its body has scrolled, and
// none before; from desktop width the sheet is capped at the window less 80px.
// Data: CC_EVENT_ID (an upcoming event). Fails with the sheet-rule span removed from
// pwa/BottomSheet, or with the desktop cap put back to 85vh.
export const widths = ['xs', 'desktop'];

export default async function ({ page, goto, press, check, width }) {
  const eventId = process.env.CC_EVENT_ID;
  if (!eventId) return check(false, 'CC_EVENT_ID is set', 'unset');
  // A short window, so the sheet's body has to scroll (the board is 320 x 568; the Share
  // sheet's story shape still fits there, so the phone goes shorter still).
  await page.setViewportSize(
    width.label === 'desktop' ? { width: 1300, height: 560 } : { width: 320, height: 460 },
  );
  await goto(`/events/${eventId}`);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const opener = page
    .getByRole('button', { name: /^Share this show$/ })
    .first();
  await opener.waitFor({ timeout: 15000 });
  await press(opener);
  const dialog = page.getByRole('dialog', { name: /^Share this show$/ });
  await dialog.waitFor({ timeout: 10000 });
  const body = dialog.locator('[data-testid="sheet-body"]');
  await body.waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);

  const ruleColour = () =>
    page.evaluate(() => {
      const rule = document.querySelector('[data-testid="sheet-rule"]');
      if (!rule) return 'missing';
      return getComputedStyle(rule).backgroundColor;
    });
  const clear = (colour) =>
    colour === 'rgba(0, 0, 0, 0)' || colour === 'transparent';

  const metrics = await body.evaluate((el) => ({
    room: el.scrollHeight - el.clientHeight,
  }));
  const before = await ruleColour();
  check(
    before !== 'missing' && clear(before),
    'no hairline before the body scrolls',
    before,
  );

  check(metrics.room > 0, 'the body has more to scroll', `room=${metrics.room}`);
  if (metrics.room > 0) {
    await body.evaluate((el) => {
      el.scrollTop = 40;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);
    const after = await ruleColour();
    // PROBE_SHOTS=<dir> keeps a frame of the scrolled sheet for the PR's Design review.
    if (process.env.PROBE_SHOTS)
      await page.screenshot({ path: `${process.env.PROBE_SHOTS}/share-scrolled-${width.label}.png` });
    check(
      after !== 'missing' && !clear(after),
      'a hairline under the close row once the body scrolls',
      `${after} room=${metrics.room}`,
    );
    // Edge to edge inside the sheet's rim: the same span as the pinned footer's hairline.
    const box = await page.evaluate(() => {
      const rule = document.querySelector('[data-testid="sheet-rule"]');
      const footer = document.querySelector('[data-testid="sheet-footer"]');
      if (!rule || !footer) return null;
      const ruleBox = rule.getBoundingClientRect();
      const footerBox = footer.getBoundingClientRect();
      return {
        left: Math.round(ruleBox.left - footerBox.left),
        right: Math.round(footerBox.right - ruleBox.right),
      };
    });
    check(
      box !== null && box.left === 0 && box.right === 0,
      'the hairline spans the sheet as the footer hairline does',
      JSON.stringify(box),
    );
  }

  if (width.label === 'desktop') {
    const geometry = await dialog.evaluate((el) => ({
      maxHeight: getComputedStyle(el).maxHeight,
      window: window.innerHeight,
    }));
    const cap = Number.parseFloat(geometry.maxHeight);
    check(
      Math.abs(cap - (geometry.window - 80)) <= 1,
      'the desktop sheet is capped at the window less 80px',
      `${geometry.maxHeight} window=${geometry.window}`,
    );
  }
}

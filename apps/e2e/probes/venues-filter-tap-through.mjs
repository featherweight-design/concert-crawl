// On a phone, picking "Nearest first" in the Venues Sort sheet selects it and
// never taps through to the venue card under the option (Hugh, 2026-11-27).
export const widths = ['xs', 'phone'];

export default async function ({ goto, page, press, check, base }) {
  await goto('/venues');
  const chip = page
    .getByRole('button', { name: /^Sort/ })
    .locator('visible=true')
    .first();
  await chip.waitFor();
  await press(chip);
  const sheet = page.getByRole('dialog', { name: 'Sort filter' });
  await sheet.waitFor();
  await page.waitForTimeout(400);
  const option = sheet.getByRole('button', { name: 'Nearest first' });
  const box = await option.boundingBox();
  // A card link must sit directly under the option, or the probe proves nothing.
  const under = await page.evaluate(
    ({ x, y }) => {
      const hits = document.elementsFromPoint(x, y);
      return hits.some(
        (el) =>
          el.closest('a[href^="/venues/"]') && !el.closest('[role="dialog"]'),
      );
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  await page.evaluate(() => {
    window.__tap = { linkClicks: 0, sheetOpenAtClick: null };
    window.addEventListener(
      'click',
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('a[href^="/venues/"]')
        )
          window.__tap.linkClicks += 1;
        window.__tap.sheetOpenAtClick = !!document.querySelector(
          '[role="dialog"][aria-label="Sort filter"]',
        );
      },
      true,
    );
  });
  await press(option);
  await page.waitForTimeout(500);
  const seen = await page.evaluate(() => window.__tap);
  check(
    under,
    'a venue card sits behind the option (probe is meaningful)',
    `under=${under}`,
  );
  check(
    seen.sheetOpenAtClick === true,
    'sheet still open when the click lands',
    JSON.stringify(seen),
  );
  check(
    seen.linkClicks === 0,
    'the click never reaches a card link',
    JSON.stringify(seen),
  );
  check(
    new URL(page.url()).pathname === '/venues',
    'still on /venues',
    page.url(),
  );
  check(
    (await chip.innerText()).includes('Nearest'),
    'Sort chip now reads Nearest first',
    await chip.innerText(),
  );
}

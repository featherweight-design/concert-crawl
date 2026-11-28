// A MusicBrainz-only artist preview carries a visible Close (44px hit box)
// that closes it in one press, focus opens on Follow, the plate is 84px on the
// phone sheet and 96px on the desktop card, and a long name wraps before the
// Close instead of under it (addendum 15).
const ACT = {
  name: 'The Extraordinarily Long Named Appreciation Society Of Clip',
  slug: null,
  photoUrl: null,
  upcomingShowCount: 0,
  nextShow: null,
  following: false,
  mbid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  disambiguation: 'Detroit rapper',
  area: 'Michigan',
  type: 'person',
  hasShows: false,
};

export default async function ({ goto, page, press, check, width }) {
  await page.route('**/v1/search/artists*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      // The API is a second origin: the mock needs CORS headers.
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ success: true, data: [ACT] }),
    }),
  );
  await page.route('**/v1/events*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      // The API is a second origin: the mock needs CORS headers.
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
    }),
  );
  await goto('/search');
  const field = page.locator('input[placeholder="Search artists, venues…"]');
  await field.waitFor();
  // Typing before hydration leaves the field uncontrolled: let React attach.
  await page.waitForTimeout(2500);
  await field.fill('clip');
  const row = page.locator('button:has-text("Appreciation Society")').first();
  await row.waitFor();
  await press(row);
  const dialog = page.getByRole('dialog', { name: ACT.name });
  await dialog.waitFor();
  await page.waitForTimeout(500);

  const close = dialog.getByRole('button', { name: 'Close' });
  const box = await close.boundingBox();
  check(
    box !== null && box.width >= 44 && box.height >= 44,
    'Close has a 44px hit box',
    `box=${box && `${box.width}x${box.height}`}`,
  );

  const focused = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? '',
  );
  check(focused === 'Follow', 'focus opens on Follow', `active=${focused}`);

  const heading = await dialog
    .getByRole('heading', { name: ACT.name })
    .boundingBox();
  check(
    box !== null && heading !== null && heading.x + heading.width <= box.x + 1,
    'the long name ends before the Close',
    `nameRight=${heading && Math.round(heading.x + heading.width)} closeLeft=${box && Math.round(box.x)}`,
  );

  const plate = await page.evaluate(() => {
    const el = document.querySelector('[data-artist-preview] span');
    const rect = el?.getBoundingClientRect();
    return rect ? Math.round(rect.width) : null;
  });
  const want = width.width >= 1024 ? 96 : 84;
  check(plate === want, `plate is ${want}px`, `plate=${plate}`);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  check(overflow <= 0, 'no horizontal overflow', `overflow=${overflow}`);

  await press(close);
  await page.waitForTimeout(400);
  const stillOpen = await dialog.count();
  check(
    stillOpen === 0,
    'one press on Close closes the preview',
    `dialogs=${stillOpen}`,
  );
}

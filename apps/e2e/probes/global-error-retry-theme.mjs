// The root error page keeps its theme after Try again, pressed several times:
// <html> still carries data-theme and the --bg token, and the page is not
// drawn black on white. Then one press on Go home leaves the error page.
//
// Needs a route that trips global-error (nothing in the app does on demand);
// PROBE_THROW_ROUTE names it. Locally, make one page throw, never committed.
const ROUTE = process.env.PROBE_THROW_ROUTE ?? '/bot';
const PRESSES = 4;

const readTheme = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    return {
      theme: root.getAttribute('data-theme'),
      bg: getComputedStyle(root).getPropertyValue('--bg').trim(),
      body: getComputedStyle(document.body).backgroundColor,
    };
  });

export default async function ({ page, base, press, check }) {
  await page.goto(new URL(ROUTE, base).href);
  const retry = page.getByRole('button', { name: /try again/i });
  await retry.waitFor();

  const first = await readTheme(page);
  check(
    Boolean(first.theme && first.bg),
    'first paint is themed',
    JSON.stringify(first),
  );

  for (let n = 1; n <= PRESSES; n += 1) {
    await press(retry);
    // Try again refreshes and re-renders; wait until the page is back.
    await page.waitForLoadState('networkidle');
    await retry.waitFor();
    const now = await readTheme(page);
    check(
      Boolean(now.theme && now.bg) &&
        now.theme === first.theme &&
        now.bg === first.bg,
      `theme holds after Try again ×${n}`,
      JSON.stringify(now),
    );
  }

  const home = page.getByRole('link', { name: /go home/i });
  if ((await home.count()) === 0) return;
  const before = new URL(page.url()).pathname;
  // Local dev only: the Next dev overlay sits over the page and takes the
  // first press. A production build has no overlay.
  await page.evaluate(() =>
    document.querySelectorAll('nextjs-portal').forEach((el) => el.remove()),
  );
  await press(home.first());
  await page
    .waitForURL((url) => url.pathname !== before, { timeout: 8000 })
    .catch(() => undefined);
  // The URL alone: the landing page may draw its own error boundary (locally,
  // with no API running), which is not this page.
  const after = new URL(page.url()).pathname;
  check(
    after !== before,
    'one press on Go home leaves the error page',
    `from=${before} to=${after}`,
  );
}

// The root error page keeps its theme after Try again, pressed several times:
// <html> still carries data-theme and the --bg token, and the page is not
// drawn black on white. Then one press on Go home leaves the error page.
//
// Needs a route that trips global-error, named by PROBE_THROW_ROUTE. Nothing
// in the app throws on demand, so locally make one page throw (never commit
// the throw) and point the variable at it.
const ROUTE = process.env.PROBE_THROW_ROUTE;
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

// Try again calls router.refresh() then reset(). The same button stays
// mounted throughout, so waiting on it proves nothing: wait for the refresh's
// RSC response when one is sent (dev does not always send one), then for the
// network to settle. sawRefresh is printed, not asserted.
const isRefresh = (res) => Boolean(res.request().headers()['rsc']);

export default async function ({ page, base, press, check }) {
  if (!ROUTE) {
    check(false, 'PROBE_THROW_ROUTE names a route that throws', 'unset');
    return;
  }
  await page.goto(new URL(ROUTE, base).href);
  const retry = page.getByRole('button', { name: /try again/i });
  await retry.waitFor();

  const first = await readTheme(page);
  check(
    Boolean(first.theme && first.bg),
    'first paint is themed',
    JSON.stringify(first),
  );

  for (let round = 1; round <= PRESSES; round += 1) {
    const refreshed = page.waitForResponse(isRefresh, { timeout: 5000 });
    await press(retry);
    const sawRefresh = await refreshed.then(
      () => true,
      () => false,
    );
    await page.waitForLoadState('networkidle');
    await retry.waitFor();
    const now = await readTheme(page);
    check(
      Boolean(now.theme && now.bg) &&
        now.theme === first.theme &&
        now.bg === first.bg,
      `theme holds after Try again ×${round}`,
      JSON.stringify({ ...now, sawRefresh }),
    );
  }

  const home = page.getByRole('link', { name: /go home/i });
  const homeCount = await home.count();
  check(homeCount > 0, 'the page offers Go home', `links=${homeCount}`);
  if (homeCount === 0) return;

  const before = new URL(page.url()).pathname;
  // Local dev only: the Next dev overlay sits over the page and takes the
  // first press. A production build has no overlay.
  await page.evaluate(() =>
    document.querySelectorAll('nextjs-portal').forEach((el) => el.remove()),
  );
  await press(home.first());
  const left = await page
    .waitForURL((url) => url.pathname !== before, { timeout: 8000 })
    .then(
      () => 'navigated',
      (err) => `no navigation: ${err.message.split('\n')[0]}`,
    );
  // The URL alone: the landing page may draw its own error boundary (locally,
  // with no API running), which is not this page.
  const after = new URL(page.url()).pathname;
  check(
    after !== before,
    'one press on Go home leaves the error page',
    `from=${before} to=${after} (${left})`,
  );
}

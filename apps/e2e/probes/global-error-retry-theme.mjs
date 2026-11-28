// The root error page keeps its theme after Try again, pressed several times:
// <html> still carries data-theme and the --bg token, and the page is not
// drawn black on white. Then one press on Go home leaves the error page.
//
// Loads /probe-throw, a page that always throws outside production
// (apps/web/src/lib/definitions/probe-throw.ts). PROBE_THROW_ROUTE overrides.
const ROUTE = process.env.PROBE_THROW_ROUTE || '/probe-throw';
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
  const res = await page.goto(new URL(ROUTE, base).href);
  // The page's own status is 500 by design; a 404 means production, or no route.
  check(
    res?.status() !== 404,
    `${ROUTE} exists on this deploy`,
    `status=${res?.status()}`,
  );
  const retry = page.getByRole('button', { name: /try again/i });
  await retry.waitFor();
  // A nested error.tsx would keep the root layout (and its theme script)
  // mounted, and every theme check below would pass without testing this page.
  const isGlobalError = () =>
    page.evaluate(() => document.body.hasAttribute('data-global-error'));
  check(await isGlobalError(), 'the root error page rendered', page.url());

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
    check(await isGlobalError(), `still the root error page ×${round}`);
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

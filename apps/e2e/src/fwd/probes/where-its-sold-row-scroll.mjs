// Tapping a "Where it's sold" row's › scrolls the page to the price card for that row's own
// tier, and stays on the page. Needs PROBE_EVENT_ID (or CC_VENDORS_EVENT_ID): an upcoming event
// with two or more sellers and two or more tiers, so two rows can name different tiers.
const EVENT_ID = process.env.PROBE_EVENT_ID ?? process.env.CC_VENDORS_EVENT_ID;

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));

// Smooth scrolling is the engine's own animation: wait until the position holds still.
async function scrollStill(page) {
  let last = await scrollY(page);
  for (let tries = 0; tries < 40; tries += 1) {
    await page.waitForTimeout(150);
    const now = await scrollY(page);
    if (now === last) return now;
    last = now;
  }
  return last;
}

export default async function ({ page, goto, press, check }) {
  check(
    EVENT_ID !== undefined && EVENT_ID !== '',
    'an event id is set (PROBE_EVENT_ID)',
  );
  await goto(`/events/${EVENT_ID}`);
  const rows = page.locator('[data-testid="where-its-sold-row"]');
  await rows.first().waitFor();
  // A tap before hydration follows the plain anchor: wait until React owns the row.
  await page.waitForFunction(() => {
    const link = document.querySelector(
      '[data-testid="where-its-sold-row"] a',
    );
    return (
      link !== null &&
      Object.keys(link).some((key) => key.startsWith('__reactProps'))
    );
  });
  const count = await rows.count();
  check(count >= 2, 'the card shows two or more sellers', `rows=${count}`);

  const marked = await page.evaluate(() =>
    [...document.querySelectorAll('[data-price-tier]')].map((el) =>
      el.getAttribute('data-price-tier'),
    ),
  );
  check(marked.length > 0, 'the page marks a tier card', `marked=${marked}`);

  const landed = new Map();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const line = (
      await row.locator('[data-testid="where-its-sold-line"]').innerText()
    ).trim();
    // The row's line opens with its tier ("GA · all-in").
    const tier = line.split(' · ')[0];
    const anchorId = `price-${await row.locator('a').getAttribute('data-price-id')}`;
    const hasCard = marked.includes(tier);
    const label = `row ${index + 1} (${line})`;

    await page.evaluate(() =>
      history.replaceState(null, '', location.pathname + location.search),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollStill(page);
    await row.scrollIntoViewIfNeeded();
    const before = await scrollY(page);
    const pathBefore = new URL(page.url()).pathname;
    await press(row.locator('a'));
    const after = await scrollStill(page);

    // A tier with a marked card scrolls to that card and stays put; a tier
    // with none (the flat legacy card) falls through to the row's own anchor.
    const top = await page.evaluate(
      ([name, anchor, marked]) => {
        const el = marked
          ? document.querySelector(`[data-price-tier="${name}"]`)
          : document.getElementById(anchor);
        return el === null ? null : Math.round(el.getBoundingClientRect().top);
      },
      [tier, anchorId, hasCard],
    );
    const viewport = await page.evaluate(() => window.innerHeight);
    const url = new URL(page.url());
    const target = hasCard ? `the ${tier} card` : 'its anchor';
    check(after !== before, `${label} scrolls the page`, `y ${before} -> ${after}`);
    check(
      top !== null && top >= 0 && top < viewport,
      `${label}: ${target} is in view`,
      `top=${top} viewport=${viewport} hasCard=${hasCard}`,
    );
    check(url.pathname === pathBefore, `${label} stays on the event page`);
    check(
      hasCard ? url.hash === '' : url.hash === `#${anchorId}`,
      hasCard
        ? `${label} scrolls to the card, not the anchor`
        : `${label} falls through to its anchor`,
      `hash=${url.hash === '' ? '(none)' : '#price-<id>'}`,
    );
    if (!landed.has(tier)) landed.set(tier, after);
  }

  if (landed.size >= 2) {
    const spots = [...landed.values()];
    check(
      new Set(spots).size === spots.length,
      'rows of different tiers land on different cards',
      JSON.stringify([...landed]),
    );
  }
}

// A two-name co-billed heading always shows both names in full: a long pair
// wraps to at most three lines, stepping the type 34 -> 30 -> 26px first (down from the stage size)
// (addendum-8 05-co-billed, cobill-3plus-m). Nothing ellipsizes or overflows.
//
// PROBE_EVENTS: comma list of event ids; default is the longest real pair and
// a synthetic long pair on the scratch branch.
const EVENTS = (
  process.env.PROBE_EVENTS ??
  '9fdc2599-56c1-47c2-9aa5-a5f118c753a4,8c1307e6-288a-4594-8403-08c21af68fa5'
).split(',');

export default async function ({ goto, page, check, width }) {
  for (const id of EVENTS) {
    await goto(`/events/${id}`);
    const heading = page.locator('h1').first();
    await heading.waitFor();
    // The fit is client code: let hydration finish before measuring.
    await page.waitForLoadState('networkidle');
    // The fit runs after fonts and layout settle: wait for the heading's box
    // to hold still for a few frames before measuring it.
    await heading.evaluate(
      (el) =>
        new Promise((resolve) => {
          let last = '';
          let still = 0;
          const tick = () => {
            const box = el.getBoundingClientRect();
            const now = `${box.width}x${box.height}`;
            still = now === last ? still + 1 : 0;
            last = now;
            if (still >= 10) resolve(undefined);
            else requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    const m = await heading.evaluate((el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight);
      const box = el.getBoundingClientRect();
      return {
        font: parseFloat(cs.fontSize),
        lines: Math.round(box.height / lh),
        overflowX: el.scrollWidth - el.clientWidth,
        clamped: el.hasAttribute('data-clamped'),
        text: el.textContent,
      };
    });
    const tag = `${id.slice(0, 8)} @${width}`;
    const saw = `font=${m.font}px lines=${m.lines} clamped=${m.clamped} overflowX=${m.overflowX}`;
    check(m.lines <= 3, `${tag}: at most three lines`, saw);
    check(!m.clamped, `${tag}: both names show in full, no clamp`, saw);
    check(m.overflowX <= 1, `${tag}: no horizontal overflow`, saw);
    check(m.font >= 26, `${tag}: never below the 26px floor`, saw);
  }
}

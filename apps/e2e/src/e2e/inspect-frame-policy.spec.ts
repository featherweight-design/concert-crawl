import { test, expect, type Page } from '@playwright/test';

// Admin Inspect's Page tab (3b part 5b) draws a venue's stored HTML in
// <iframe sandbox="" srcdoc> under a CSP meta and the iframe `csp` attribute.
// CSS and media fetches (url(), @import, @font-face, img/srcset/poster/svg
// image) are governed by that policy, not by the sanitiser, and jsdom can't
// prove a browser won't fetch. This proves it in real Chromium: with the
// policy, nothing reaches the venue's host (the admin's IP never leaks);
// without it (the control), the same body does, so the probe can see a leak.
//
// Self-contained: setContent, no app and no staging data. The policy string
// mirrors INSPECT_CSP in apps/web/src/components/admin/inspect/inspect-rules.ts,
// whose unit test pins the same exact string.
const INSPECT_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";

const LEAK = 'https://leak.test';

const BODY = `<style>@import url(${LEAK}/import.css);
body{background:url(${LEAK}/bg.png)}
@font-face{font-family:x;src:url(${LEAK}/font.woff2)}
p{font-family:x}</style>
<p style="background-image:url(${LEAK}/inline.png)">text</p>
<img src="${LEAK}/img.png">
<img srcset="${LEAK}/srcset.png 1x">
<picture><source srcset="${LEAK}/source.png"><img src="${LEAK}/pic.png"></picture>
<video poster="${LEAK}/poster.png"></video>
<svg><image href="${LEAK}/svgimage.png"/></svg>
<input type="image" src="${LEAK}/input.png">`;

const requestsToVenue = async (
  page: Page,
  policy: string | null,
): Promise<string[]> => {
  const hits: string[] = [];
  await page.route(`${LEAK}/**`, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, body: '' });
  });
  const meta = policy
    ? `<meta http-equiv="Content-Security-Policy" content="${policy}">`
    : '';
  const srcdoc = `<!doctype html><html><head>${meta}</head><body>${BODY}</body></html>`;
  await page.setContent('<!doctype html><body></body>');
  await page.evaluate(
    ({ doc, csp }) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', '');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      if (csp) frame.setAttribute('csp', csp);
      frame.srcdoc = doc;
      document.body.appendChild(frame);
    },
    { doc: srcdoc, csp: policy },
  );
  // Long enough for every image, font and stylesheet to have been requested.
  await page.waitForTimeout(2500);
  return hits;
};

test.describe('Inspect Page tab frame policy', () => {
  test('the policy blocks every CSS and media fetch to the venue', async ({
    page,
  }) => {
    expect(await requestsToVenue(page, INSPECT_CSP)).toEqual([]);
  });

  test('control: without the policy the same body does fetch, so a leak would show', async ({
    page,
  }) => {
    expect((await requestsToVenue(page, null)).length).toBeGreaterThan(0);
  });
});

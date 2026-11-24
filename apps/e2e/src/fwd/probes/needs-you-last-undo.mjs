// Answering the LAST Needs you card leaves its Undo line up instead of flipping to All clear.
// The queue API is stubbed in the browser: nothing is written and no fan is told.
const ITEM = {
  key: 'show-dropped:probe-1',
  kind: 'show-dropped',
  title: 'Probe Act w/ Guest',
  venueId: 'v1',
  venueName: 'Globe Hall',
  fanDate: '2099-01-01',
  watchers: 3,
  answers: [
    {
      slug: 'still_on',
      label: 'Still on',
      notifiesFans: false,
      undoable: true,
      suggested: false,
    },
  ],
  evidence: [{ label: 'Last seen', value: 'Nov 7' }],
};
const COUNT = {
  decisions: 1,
  handledToday: 0,
  byKind: {
    'show-dropped': 1,
    'show-moved': 0,
    'venue-failing': 0,
    'venue-blocked': 0,
    'venue-no-reply': 0,
    artist: 0,
    'event-low-confidence': 0,
    'price-check': 0,
    'price-batch': 0,
    bug: 0,
  },
};
const ok = (data) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify({ success: true, data }),
});

export default async function ({ page, goto, press, check }) {
  await page.route('**/v1/admin/needs-you**', async (route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    if (url.endsWith('/count')) return route.fulfill(ok(COUNT));
    if (url.endsWith('/facts')) return route.fulfill(ok({}));
    if (url.endsWith('/answer'))
      return route.fulfill(
        ok({ key: ITEM.key, slug: 'still_on', auditId: 'a1', undoable: true }),
      );
    return route.fulfill(ok([ITEM]));
  });
  await goto('/admin/needs-you');
  const card = page.getByTestId('needs-you-item').first();
  await card.waitFor();
  await press(card.getByRole('button', { name: 'Still on' }));
  const line = page.getByTestId('needs-you-answered');
  await line.waitFor({ timeout: 5000 }).catch(() => undefined);
  check(
    (await page.getByTestId('needs-you-answered').count()) === 1,
    'the answered line is drawn for the last card',
  );
  check(
    (await page.getByTestId('needs-you-all-clear').count()) === 0,
    'All clear does not replace it',
  );
  check(
    (await line.getByRole('button', { name: 'Undo' }).count()) === 1,
    'the Undo button is on the line',
  );
}

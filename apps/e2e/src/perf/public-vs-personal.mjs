// Which public API reads change when the caller is signed in? Run against
// staging before caching any read server-side: a read that differs by caller
// carries personal data and must not go into a shared cache (caching skill,
// section 1: public vs personal).
//
//   E2E_AUDIT_USER_EMAIL=... E2E_AUDIT_USER_PASSWORD=... \
//     node apps/e2e/src/perf/public-vs-personal.mjs [apiBase] [--expect-identical]
//
// For each endpoint it fetches the answer twice, anonymous and with the audit
// account's Clerk token, and prints the JSON paths that differ (array indexes
// folded to `[]`). Credentials come from the shell and are never printed; the
// token is held in memory only. Staging or localhost only (assertSignInTarget).
//
// A path that differs is personal. `--expect-identical` exits 1 if any endpoint
// differs, so the same script can guard a cached endpoint later.
import { chromium } from '@playwright/test';
import { assertSignInTarget, signIn } from '../fwd/sign-in.mjs';

const args = process.argv.slice(2);
const expectIdentical = args.includes('--expect-identical');
const apiBase = (
  args.find((arg) => !arg.startsWith('--')) ??
  'https://api-staging.concertcrawl.app'
).replace(/\/$/, '');
const webBase =
  process.env.PROOF_WEB_BASE ?? 'https://staging.concertcrawl.app';

assertSignInTarget(webBase);
const apiHost = new URL(apiBase).hostname;
if (!/staging|localhost|127\.0\.0\.1/.test(apiHost)) {
  throw new Error(`refusing ${apiHost}: staging or localhost only`);
}

const serviceKey = process.env.INTERNAL_API_SECRET;
const headersFor = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
});

const getJson = async (path, token) => {
  const res = await fetch(`${apiBase}${path}`, { headers: headersFor(token) });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON: compared as null, reported by status
  }
  return { status: res.status, body };
};

/** Every path in `left` or `right` whose value differs, `[]` for array slots. */
const diffPaths = (left, right, path = '$', out = new Set()) => {
  const leftObj = left !== null && typeof left === 'object';
  const rightObj = right !== null && typeof right === 'object';
  if (!leftObj || !rightObj) {
    if (JSON.stringify(left) !== JSON.stringify(right)) out.add(path);
    return out;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      out.add(path);
      return out;
    }
    if (left.length !== right.length) out.add(`${path}.length`);
    for (
      let index = 0;
      index < Math.min(left.length, right.length);
      index += 1
    ) {
      diffPaths(left[index], right[index], `${path}[]`, out);
    }
    return out;
  }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    diffPaths(left[key], right[key], `${path}.${key}`, out);
  }
  return out;
};

const browser = await chromium.launch();
let token;
try {
  const page = await browser.newPage();
  await signIn(page, { baseUrl: webBase });
  // Clerk loads after the sign-in lands: wait for a live session first.
  await page.waitForFunction(() => Boolean(window.Clerk?.session), null, {
    timeout: 30_000,
  });
  token = await page.evaluate(async () => window.Clerk.session.getToken());
} finally {
  await browser.close();
}
if (!token) throw new Error('no Clerk session token after sign-in');

const first = await getJson('/v1/events?limit=5', null);
const eventId = first.body?.data?.data?.[0]?.id;
const today = new Date().toISOString().slice(0, 10);
const later = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const endpoints = [
  '/v1/events?limit=20',
  '/v1/events/genres',
  `/v1/events/availability?from=${today}&to=${later}`,
  '/v1/venues',
  ...(eventId
    ? [
        `/v1/events/${eventId}`,
        `/v1/events/${eventId}/related`,
        `/v1/events/${eventId}/watchers`,
      ]
    : []),
];

let differing = 0;
console.log(`API ${apiHost}\n`);
console.log('| endpoint | anon | signed in | differing paths |');
console.log('|---|---|---|---|');
for (const path of endpoints) {
  const [anon, authed] = await Promise.all([
    getJson(path, null),
    getJson(path, token),
  ]);
  const diffs = [...diffPaths(anon.body, authed.body)];
  if (diffs.length > 0 || anon.status !== authed.status) differing += 1;
  const shown =
    diffs.length > 0
      ? diffs
          .slice(0, 8)
          .map((p) => `\`${p}\``)
          .join(', ')
      : 'identical';
  console.log(
    `| ${path.replace(eventId ?? '\0', ':id').replace(/from=[^&]*&to=.*/, 'from=..&to=..')} | ${anon.status} | ${authed.status} | ${shown} |`,
  );
}
if (expectIdentical && differing > 0) {
  console.error(`\n${differing} endpoint(s) differ by caller`);
  process.exit(1);
}

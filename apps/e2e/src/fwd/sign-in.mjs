// The fwd feature-acceptance kit's sign-in hook (`featureAcceptance.signIn` in
// `.claude/fwd.json`). The kit's contact sheet calls `signIn(page, { baseUrl })`
// once per width before an inventory's rows, and fails every cell at that width
// if this throws.
//
// It reuses the house Clerk flow (`signInWithClerk` in `../fixtures/auth.ts`,
// loaded through Node's type stripping) so the e2e suites and the contact sheet
// cannot drift apart on how sign-in works.
//
// Credentials come from the operator's shell, by name only, never printed:
//   E2E_AUDIT_USER_EMAIL / E2E_AUDIT_USER_PASSWORD     (default)
//   E2E_AUDIT_ADMIN_EMAIL / E2E_AUDIT_ADMIN_PASSWORD   (CONTACT_SHEET_ROLE=admin)
import { signInWithClerk } from '../fixtures/auth.ts';

const STAGING_HOST = 'staging.concertcrawl.app';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * The audit account signs in to two places only: staging over https, or this
 * machine's dev server over http (pre-PR sheets). Anything else, production
 * above all, is refused before the browser leaves about:blank, so a mis-set
 * base can never put the audit credentials into another Clerk instance.
 */
export function assertSignInTarget(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch (err) {
    console.error('[sign-in] base URL does not parse', err);
    throw new Error('sign-in refused: the base URL does not parse');
  }
  const host = url.hostname.replace(/\.+$/, '').toLowerCase();
  const staging = url.protocol === 'https:' && host === STAGING_HOST;
  const local = url.protocol === 'http:' && LOCAL_HOSTS.has(host);
  if (!staging && !local) {
    throw new Error(
      `sign-in refused for ${url.protocol}//${host}: only https://${STAGING_HOST} or http://localhost`,
    );
  }
}

export async function signIn(page, { baseUrl }) {
  assertSignInTarget(baseUrl);
  const admin = process.env.CONTACT_SHEET_ROLE === 'admin';
  const prefix = admin ? 'E2E_AUDIT_ADMIN' : 'E2E_AUDIT_USER';
  const email = (process.env[`${prefix}_EMAIL`] ?? '').trim();
  const password = (process.env[`${prefix}_PASSWORD`] ?? '').trim();
  if (email === '' || password === '') {
    throw new Error(
      `${prefix}_EMAIL and ${prefix}_PASSWORD must both be set in the shell`,
    );
  }
  await page.goto(`${new URL(baseUrl).origin}/sign-in`, { waitUntil: 'domcontentloaded' });
  await signInWithClerk(page, email, password);
}

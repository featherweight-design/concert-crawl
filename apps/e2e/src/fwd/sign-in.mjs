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

export async function signIn(page, { baseUrl }) {
  const admin = process.env.CONTACT_SHEET_ROLE === 'admin';
  const prefix = admin ? 'E2E_AUDIT_ADMIN' : 'E2E_AUDIT_USER';
  const email = (process.env[`${prefix}_EMAIL`] ?? '').trim();
  const password = (process.env[`${prefix}_PASSWORD`] ?? '').trim();
  if (email === '' || password === '') {
    throw new Error(
      `${prefix}_EMAIL and ${prefix}_PASSWORD must both be set in the shell`,
    );
  }
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded' });
  await signInWithClerk(page, email, password);
}

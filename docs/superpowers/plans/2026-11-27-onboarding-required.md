# Onboarding required for new accounts

Approved by the orchestrator on 2026-11-27 (lane a6, add-on 3). One PR, no migration, no feature switch.

## Rule

An account created on or after `2026-11-28T00:00:00Z` must finish or skip the tour before the app opens. Any
signed-in page request from such an account without `publicMetadata.onboardedAt` redirects to
`/onboarding?return=<the page asked for>`. Older accounts are never forced, and there is no backfill.

## How

- **Claim source.** The Clerk session token template carries `created_at` (`{{user.created_at}}`, ms epoch) next to
  `metadata` (`{{user.public_metadata}}`). Hugh added `created_at` on staging and prod on 2026-11-27.
- **Proxy** (`apps/web/src/proxy.ts`). `needsOnboarding(sessionClaims)` (`lib/auth/onboarding-required.ts`) parses
  the claims with Zod. A missing or malformed claim, or an account made before the cutoff, never forces (fail open).
  Exempt: `/onboarding`, `/auth/*`, `/sign-in`, `/sign-up`, `/api/*`, and every always-public path.
- **Stamp.** `POST /v1/me/onboarded` (empty strict body) writes `publicMetadata.onboardedAt` through
  `updateUserMetadata`, which merges. First write wins. A structured log line is the audit.
- **Leaving the tour.** Finish and Skip call `useMarkOnboarded()`, which posts the stamp and then mints a fresh
  session token (`getToken({ skipCache: true })`) before navigating, so the proxy sees the stamp on the next request.
  A failed write is logged and never blocks leaving; the proxy brings the visitor back on their next page.
- **No visual change.** Skip stays a link with the same look, copy and focus order; only its click is held until the
  stamp lands. A modified click (new tab) stamps and is not prevented.

## Proof

- Unit: `needsOnboarding`, the proxy redirect and exemptions, the API route, Finish and Skip holding navigation.
- Local contact sheet: `docs/superpowers/inventories/onboarding-required.json` (first step with Skip, last step with
  Finish, phone and desktop).
- Staging after merge: an existing (pre-cutoff) account is not forced, and its session token carries `created_at` as
  a ms number. Staging Clerk is a production instance with bot protection on sign-up, so a fresh account cannot be
  made by script: Hugh's morning sign-up rewalk checks that typing `/events` bounces to `/onboarding?return=/events`
  until Finish or Skip, and not after.

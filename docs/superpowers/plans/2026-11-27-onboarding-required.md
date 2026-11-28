# Onboarding required for new accounts

Approved by the orchestrator on 2026-11-27 (lane a6, add-on 3). One PR, no migration, no feature switch.

## Rule

An account created on or after `2026-11-28T00:00:00Z` must finish or skip the tour before the app opens. Any
signed-in page request from such an account without `publicMetadata.onboardedAt` redirects to
`/onboarding?return=<the page asked for>`. Older accounts are never forced, and there is no backfill.

## How

- **Claim source.** The Clerk session token template carries `created_at` (`{{user.created_at}}`, which the token renders in seconds; the rule also accepts ms) next to
  `metadata` (`{{user.public_metadata}}`). Hugh added `created_at` on staging and prod on 2026-11-27.
- **Proxy** (`apps/web/src/proxy.ts`). `needsOnboarding(claims, userId, cookie)` (`lib/auth/onboarding-required.ts`) parses
  the claims with Zod. A missing or malformed claim, or an account made before the cutoff, never forces (fail open).
  Exempt: `/onboarding`, `/auth/*`, `/sign-in`, `/sign-up`, `/api/*`, and every always-public path.
- **Stamp.** `POST /v1/me/onboarded` (empty strict body) writes `publicMetadata.onboardedAt` through
  `updateUserMetadata`, which merges. A repeat call returns the existing stamp. A structured log line is the audit.
- **Leaving the tour.** Finish and Skip call `useMarkOnboarded()`, which is synchronous: it sets the
  `cc_onboarded` cookie to the user's id, then posts the stamp in the background (skipped when the token already
  carries one). The proxy honours either the cookie (this browser, at once, even if the write fails) or the claim
  (every device, once the token refreshes). A cookie naming another user does not count, so a second new account on
  the same browser still owes the tour. The cookie is not a security boundary: anyone can skip the tour anyway.
- **Only page loads are redirected.** GET and HEAD only, and never a router prefetch: the Skip link prefetches its
  destination, and a cached redirect would send the click back to the tour.
- **No visual change.** Skip stays a link with the same look, copy and focus order, and navigates as before.

## Proof

- Unit: `needsOnboarding`, the proxy redirect and exemptions, the API route, Finish and Skip marking the tour done.
- Local contact sheet: `docs/superpowers/inventories/onboarding-required.json` (first step with Skip, last step with
  Finish, phone and desktop).
- Staging after merge: an existing (pre-cutoff) account is not forced, and its session token carries `created_at` (a
  seconds number, verified on staging 2026-11-27). Staging Clerk is a production instance with bot protection on sign-up, so a fresh account cannot be
  made by script: Hugh's morning sign-up rewalk checks that typing `/events` bounces to `/onboarding?return=/events`
  until Finish or Skip, and not after.

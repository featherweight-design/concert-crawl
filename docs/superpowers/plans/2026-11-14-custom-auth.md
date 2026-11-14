# Custom sign-in and sign-up

Design: `design/design_handoff_custom_auth/` (README, COPY.md, 89 boards in 9 sections). Readiness: Yellow, 16 gaps, all settled from drawn patterns (`READINESS` report of 2026-11-12, kept in the private handoff folder).
Hugh answered the 8 questions on 2026-11-12: **all yes, Design's recommendations** (ruling log 2026-11-12T18:56Z). So Google while invite-only turns a new Google account away to an invite code (Q1), the same message covers wrong password and unknown email with Clerk protection at Strict (Q2), no first name at sign-up (Q3), "Email me a code instead" stays (Q4), the intent card ships (Q5), Brave and blockers keep the "didn't load, try again" state and the Clerk proxy is a separate spike (Q6), branded Clerk emails are a later PR (Q7), and one checkbox carries the Private Beta Agreement during beta (Q8).

This replaces Clerk's stock `<SignIn />` and `<SignUp />` with our own pages on Clerk's custom-flow hooks (`useSignIn`, `useSignUp`; none exist in the app today). Out of scope: account settings, sign-out, delete account, onboarding, Clerk's emails, billing.

## Why this is risky, and how each PR is reviewed

Auth. Every code PR gets `/code-review medium` plus the risk checklist under `## Claude review`, `## Copilot off` in the body, green CI, and, for UI, the `feature-acceptance` contact sheet and a `## Design review` table. The plan PR is doc-only: no review round.

**Dark until cutover.** Nothing replaces the live pages until PR 9. The new flows are built at `/sign-in/new` and `/sign-up/new` (a static segment beats the `[[...sign-in]]` catch-all, so no proxy change and no new top-level segment). Rollback of the cutover is a revert.

## Decisions this plan makes (override any of them)

1. **Routes.** Dark: `/sign-in/new`, `/sign-up/new`, `/sign-in/forgot`, `/sign-in/sso-callback`. At cutover the first two become `/sign-in` and `/sign-up`; the others keep their paths. The README's `/sso-callback` is not used: a new top-level segment needs `KNOWN_TOP_LEVEL_SEGMENTS` and `isAlwaysPublic` in `proxy.ts` (a gated callback loops). Nested under `/sign-in` it needs neither. The Clerk redirect URLs and the `#clerk-captcha` mount still go on that callback.
2. **Signed-in visitor on `/sign-in`** (gap 9): the page redirects itself (`auth()` then the sanitized `redirect_url`). `/sign-in(.*)` is not in `isPreAuth` today and stays out; Clerk's component does it now.
3. **The `ended` invite state** (`CodeEnded.tsx`, live, no board): restyle on the new primitives from `code-expired-m`. A 🔸 row in that PR's table. Same for `invalid_format` and `server_error` (gap 7).
4. **Password-step button.** The board says "Sign in"; `signInWithClerk` clicks a button named exactly "Continue" on both steps. Build to the board. The cutover PR changes the fixture to accept either name (`/^(continue|sign in)$/i`), so the contact-sheet sign-in works before and after.
5. **Intent card data** (`useSignInRedirect` sends only `redirect_url`). A small server loader resolves the return path to its subject: `/events/<id>` to the show, `/artists/<slug>` to the artist, `/crew/join/<token>` to the crew host. Anything else, including `/crews/<id>`, My shows, Settings, Notifications and the tier or price intents, gets the board's "Sign in to keep going" card (gap 11). Names only, from public data. Adds a `follow` verb to `lib/auth/intent.ts` (`INTENT_ACTIONS` is `['watch']` today; gap 10).
6. **Toast against `ReturnStrip` and `ReturnSeamReplay`.** The board's toast ("You're watching {show}.") replaces the strip for a replayed `watch` or `follow`; the strip stays for plain returns. Ruled yes by the orchestrator on 2026-11-14, as was the route nesting in decision 1.
7. **Venue row count** (gap 12): the landing's `venueCount` source, through a cached loader (the auth page stays dynamic; see `fwd:caching`).
8. **Release notes:** none for the swap (a replacement, not a feature). Copy still goes through `copy-review` in every PR that touches a copy file.
9. **README's "invite-code divergence"** is stale: main already accepts custom 4 to 20 character codes (`isInviteCodeShape`). `COPY.md`'s `inv.description` note is stale for the same reason.
10. **Stays as built:** the invite-cookie gate in `sign-up/layout.tsx`, `/auth/complete` as the single exit (redemption, then onboarding), the sign-up page's forwarding of `redirect_url` as `return` and `tier`, and `auth/code/actions.ts`.

## PR split

Each PR is branched from `main`, merges alone, and is under ~800 lines and ~20 files. No stacked PRs: PRs that need the primitives wait for PR 2 to merge.

| #   | PR                                                                                                                                                                                                    | Contents                                                                                                                                                                                                                                                                                        | Review                                   | Depends on               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| 0   | **This plan**                                                                                                                                                                                         | Plan doc only                                                                                                                                                                                                                                                                                   | none (doc)                               | none                     |
| 1   | **Spike** (throwaway dark route, findings in the PR body, no production code kept)                                                                                                                    | Settles gaps 4, 14 and 15 against Strict: `signUp.create` on a taken email, `legalAccepted` through `sso()`, blocking the OAuth sign-in to sign-up transfer, the `user_locked` and 429 shapes, the Client Trust device code, breached-password codes. Output: the confirmed settings list below | risky: `/code-review medium` + checklist | Hugh's Clerk steps below |
| 2   | **Foundations**: `AuthPage`, `AuthField`, `PasswordField`, `CodeBoxes`, `ConsentCheck`, `GoogleButton`, `StepTrail`, `AuthBanner`, `LegalSheet`, the copy files, and a parts page matching `09-parts` | No Clerk, not routed                                                                                                                                                                                                                                                                            | Claude review (cavecrew) + contact sheet | none                     |
| 3   | **Sign-in** at `/sign-in/new`                                                                                                                                                                         | Password, email code, new-device code, breached, didn't-work (900 ms pad), 429, offline, loading, blocked; `redirect_url` handling; signed-in redirect                                                                                                                                          | risky                                    | 1, 2                     |
| 4   | **Forgot password** at `/sign-in/forgot`                                                                                                                                                              | Email, code plus new password on one screen, too short, too easy, breached, done (1500 ms pad)                                                                                                                                                                                                  | risky                                    | 2, 3                     |
| 5   | **Sign-up** at `/sign-up/new`                                                                                                                                                                         | Consent, bot check, verify, email-used, done, step trail; keeps the `/auth/complete` target logic                                                                                                                                                                                               | risky                                    | 1, 2                     |
| 6   | **Google**                                                                                                                                                                                            | `sso()` on both pages with consent first, `/sign-in/sso-callback`, cancelled, refused card (transfer blocked), consent-return fallback                                                                                                                                                          | risky, highest                           | 1, 3, 5                  |
| 7   | **Invite code restyle** (`/auth/code`)                                                                                                                                                                | New primitives, prefilled chip, rate-limit countdown, `ended`, `invalid_format`, `server_error`, paste-hint fix (gap 8), "Use a different code" clearing the cookie (gap 16). "Step 1 of 2" becomes "Step 1 of 3" and the "By continuing you agree" line goes only when PR 5's checkbox is live | risky                                    | 2, 5                     |
| 8   | **Intent**: `follow` verb, loader, `IntentCard`, the replay toast                                                                                                                                     | Cards on the dark pages                                                                                                                                                                                                                                                                         | risky                                    | 3, 5                     |
| 9   | **Cutover**                                                                                                                                                                                           | Swap `/sign-in` and `/sign-up` to the new flows, fixture change (decision 4), delete the `/new` routes, build-against-design pass                                                                                                                                                               | risky                                    | all                      |

PRs 3, 4, 5 and 8 can run in parallel once 1 and 2 are merged. If any PR passes ~800 lines, split on the screen boundary named in its row, not by stacking.

## Hugh's Clerk setup (Claude never changes a Clerk setting)

Check each on **both** the staging and the production instance, and tell Claude the values. Nothing here is verified yet; the spike (PR 1) confirms what each does.

1. **Email enumeration protection: Strict.** Rule 2 (one message for wrong password and unknown email; a taken email still reaches Verify).
2. **Password** and **email code** both enabled for sign-in, sign-up verification and reset. Verification by code, not link. Confirm the code lifetime is 10 minutes (the copy says so).
3. **Password policy:** minimum length 8, the strength check on, and **reject compromised passwords** on (sign-up, reset and sign-in all depend on it).
4. **Google OAuth** on, with our own credentials in production; redirect URL `/sign-in/sso-callback` allowed. Whether the OAuth sign-in to sign-up transfer can be blocked is a spike question.
5. **Require acceptance of legal terms** on, with Terms `/legal/terms` and Privacy `/legal/privacy`. The cutover gate is "Legal accepted" visible on the Clerk user after both a password and a Google sign-up.
6. **Bot protection** (Smart CAPTCHA) on: sign-up and the callback mount `#clerk-captcha`.
7. **Client Trust** (new-device code) on: rule 9. Check it for the e2e, smoke and audit accounts, whose fixture only handles the password path (use the Clerk testing token or a `+clerk_test` address if it prompts).
8. **First name** not required, username unused, email the only identifier, phone off.
9. **Unchanged:** session lifetime (90 days), Clerk Pro (no "Secured by Clerk"), the frontend API domain, the stock email templates (Q7 is later), the URL variables in `.env.example`.

## Route x viewport inventory (for `feature-acceptance`)

Widths 320, 390 and 1300; Electric and Light on the screens the boards draw in Light, Electric elsewhere. Only 3 boards are drawn at 320 (start, code, sign-up) and 16 at 1300; every other cell is built from the drawn pattern and recorded 🔸. Each build PR adds its own `docs/superpowers/inventories/custom-auth-<pr>.json`. These are signed-out pages, so each inventory sets `signedOut` and needs no sign-in.

| Route (dark, then live)                                | States photographed                                                                                                                              | Board section             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `/sign-in/new` then `/sign-in`                         | start, not an email, password, didn't work, signing in, email code (sent, wrong, expired, resent), new device, breached                          | `01-sign-in`              |
| `/sign-in/forgot`                                      | email, code and password, too short, too easy, breached, saving, changed                                                                         | `02-forgot-password`      |
| `/sign-in/sso-callback`                                | returning, cancelled, refused, consent return and its error                                                                                      | `03-google`               |
| `/auth/code`                                           | prefilled, typing, plain, busy, not found, used, expired, rate limit, plus `ended`, `invalid_format`, `server_error` (🔸)                        | `04-invite-code`          |
| `/sign-up/new` then `/sign-up`                         | sign-up, ticked, unticked press, legal sheet, too short, too easy, breached, bot check, busy, verify, wrong code, email used, done, after launch | `05-sign-up`              |
| `/sign-in/new?redirect_url=...` and `/sign-up/new?...` | watch, follow, crew, page, replay toast                                                                                                          | `06-arriving-with-intent` |
| any of the above                                       | loading, blocked, offline, rate limited                                                                                                          | `07-loading-and-trouble`  |
| `/sign-in/new` in the other themes                     | start at 390                                                                                                                                     | `08-nine-themes`          |

Hand-walked, since a sheet cannot set them up: a real Google round trip, the Client Trust device code, a taken-email sign-up, a breached password, and the 429. These go on the staging walk list for Hugh (Android + Brave).

Checks per build PR: no copy reveals whether an account exists, consent is unticked on every path (including Google), the step count is right (3 in beta, 2 after launch), targets are 44px and inputs 16px, `aria-invalid` and a polite live region on every field, focus moves to the first invalid field, and the Escape and focus-trap rules (excluding `[disabled]`) hold on the legal sheet and dialog.

## Open

- PR 1 (the spike) waits for Hugh to confirm the staging instance settings above.
- Whether legal acceptance is already on in the staging and production instances (Hugh's step 5).
- The spike may move gap 4's answer (lockout wording under Strict); if it does, that is a one-line change to PR 3.

## Next

Orchestrator reviews the split. Then PR 1 (spike) and PR 2 (foundations) start in parallel.

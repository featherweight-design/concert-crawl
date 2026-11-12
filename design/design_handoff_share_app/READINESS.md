# Readiness Review — Share Concert Crawl by QR

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12, cold read of `origin/main` @ `b5ed547ba` (handoff merged as PR #238, 2026-11-12 18:31Z)
**Handoff:** `design/design_handoff_share_app/` (README, COPY, manifest, 23 boards)
**Related ticket(s):** none (pipeline row "Share Concert Crawl by QR", 🕰️ Backlog)
**Plan PR target:** `docs/superpowers/plans/2026-11-1x-share-app-qr.md` (TBD)

## Summary

The handoff is buildable. It names the live pieces it builds on (`BottomSheet`, `ShareSheet` and its
`lib/share/destinations` helpers, the poster's `uqr` QR path, `inviteShortLinkRedirect`, the
`UserMenu` "You" section, the "Mix two" avatar pair) and they all exist as named. Every state has a
board on phone, and desktop and Light are drawn for the main sheet. Three things in "What the build
needs" do not work as written: the API cannot read the launch flag, NULL `max_uses` breaks every
current seat check, and the analytics event is typed so it cannot take `subject: 'app'`. All three
have eng-side fixes that change no screen, so the verdict is Yellow, not Orange. Hugh approved the
design, and Design's recommendations on the four open questions count as accepted: menu only, show
the sharer's first name, no join notification, plain link after launch.

**Update 2026-11-12 (Hugh):** the sharer's first name (Q2) is ruled out for good: no code-to-name
lookup is built, and neither `GET /v1/me/invite` nor the public code validation exposes a name. PR 4
and objection 4 below are void.

## Technical objections (as audited)

1. **The API cannot see the launch flag.** The web decides `invite` or `open` with
   `isPublicBrowseEnabled()`. `GET /v1/me/invite` is invite-only and drops `mode` and `url`. The web
   builds the URL with `siteOrigin()`.
2. **NULL `max_uses` = unlimited breaks every current reader** (`validate-code.ts:75`,
   `redeem-code.ts:204`, `poster-rule.ts` `inviteStatus`, and the SQL claim at `redeem-code.ts:248`).
   Proposed instead (expand-only): a `kind` column (`'admin'` | `'member'`, `NOT NULL DEFAULT
   'admin'`), a partial unique index on `created_by WHERE kind = 'member'`, and a finite ceiling
   `MEMBER_CODE_SEATS = 10000` on member codes. The UI and admin key off `kind`, never `maxUses`.
   `isPrintable` and `people-detail.ts` get a member arm, so a member code never reaches Posters.
3. **Analytics typing.** Use a sibling event, `app_share_destination_selected`, not `subject: 'app'`
   on `share_destination_selected`.
4. ~~Privacy condition on Q2, the sharer's first name.~~ Void: Hugh ruled no sharer name, ever.

## PR split

No stacking: each PR merges to main before the next branch is cut.

1. `feat(api): member invite codes and GET /v1/me/invite`: the migration (`kind`, its check, the
   partial unique index), the schema and types, the `me-invite` route (get-or-create, joined count
   and faces, revoked flag, rate limit, Zod), the admin list exposing kind and owner, the
   people-detail member source, and the `isPrintable` guard.
2. `feat(web): share Concert Crawl from the account menu`: the menu row, the sheet and all its
   states, the link-only share helper, the sibling analytics event, the reviewed copy, the
   `releases.ts` entry. Lands after #239.
3. `feat(web): full-screen QR, invite unfurl, admin personal label`.
4. ~~Name the sharer on the invite screen (Q2).~~ Not built.

## Decisions inherited

- One member code per account, made on first open, reused for good, never named after the person,
  and a plain `BETA-XXXX-XXXX` code.
- No seat limit, in practice (Hugh, 2026-11-12). Revoke falls back to the plain origin and makes no
  new code automatically.
- The QR is uppercase alphanumeric at ECC Q with a quiet zone of 4.
- The full audit (per-dimension findings, touched files, crawl and privacy notes) is kept with the
  orchestrator's audit file; this copy records the verdict and what changed the build.

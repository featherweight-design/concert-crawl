# Invite-code posters for the pre-launch ramp: plan

**Brief (Hugh, approved 2026-11-10):** let Hugh print posters that carry an invite code, for the pre-launch ramp. The app is invite-gated before launch. The model is The 99's flyer trial, read-only at `~/Projects/the-99`.

**Ruling (orchestrator, 2026-11-10, Hugh can override):** codes become **multi-use**. A poster on a wall has to admit more than one person, and today's codes are single-use. The new dependency `uqr` is approved.

## How The 99 does it

- `admin/invites/flyers/[code]` is a server-rendered **print page**: US Letter at 816×1056 CSS px, `@page { size: letter; margin: 0 }`, chrome hidden in print, and a Print button that calls `window.print()`.
- The QR code is an SVG path generated with **`uqr`** (ECC M, no network call). It encodes `https://<origin>/join/<CODE>`, and the URL is also printed as text under the code.
- Codes are **multi-use** (a capacity of 50), each with a label, and are minted separately from the print page. The page 404s for a code that is unknown or revoked.
- Only admins can use it.

## Concert Crawl today

- `invite_codes` holds `code`, `created_by`, `used_by`, `used_at`, `expires_at` and `revoked_at`/`revoked_by`. A code is **single-use**: `redeem-code.ts` claims it with a conditional `UPDATE … WHERE used_by IS NULL`, in one transaction with the Premium grant.
- Visitors type the code at `/auth/code` (always public). That sets a signed `invite_verified` cookie, then they go through `/sign-up` and `/auth/complete`, which redeems it. **Nothing pre-fills a code from the URL.**
- Admin mints and revokes codes at `/admin/invite-codes`. The format is `BETA-XXXX-XXXX`.

## Design

### Multi-use codes (expand-only)

Migration **0093**:

- `invite_codes`:
  - `max_uses int NOT NULL DEFAULT 1`;
  - `use_count int NOT NULL DEFAULT 0`, backfilled to `1` where `used_by IS NOT NULL`;
  - `label text NULL`, which names the poster, e.g. "Hi-Dive bathroom, Nov".
- A new `invite_code_redemptions` table (`code_id`, `user_id`, `redeemed_at`), with `UNIQUE (code_id, user_id)`. It records who redeemed a multi-use code. `used_by` can only hold one person, and one person must not be able to spend two seats.
- `used_by` and `used_at` stay, and are still written for the first redemption, so every existing reader keeps working. Dropping them would be a later contract migration, if ever.

**Redeem stays one atomic act.** In the existing transaction:

1. `UPDATE invite_codes SET use_count = use_count + 1, used_by = COALESCE(used_by, $user), used_at = COALESCE(used_at, now) WHERE id = $id AND use_count < max_uses AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now) RETURNING id`. This is a conditional UPDATE, never a read followed by a write, so two people racing for the last seat cannot both win.
2. `INSERT INTO invite_code_redemptions … ON CONFLICT (code_id, user_id) DO NOTHING RETURNING`. If nothing comes back, the user already redeemed this code: roll back the increment and answer exactly as today's "already used by you" path does.
3. Then `grantBetaComp`, unchanged.

**Validate** (`/v1/auth/validate-code`) checks `use_count < max_uses` in place of `used_by IS NULL`. The admin list and stats show uses as "N of M".

**Admin mint** (`POST /v1/admin/invite-codes`) accepts an optional `label` and `maxUses` (1–500, default 1). A plain mint keeps today's single-use behaviour.

### Pre-fill: `/auth/code?code=`

`/auth/code` reads a `code` search param and pre-fills the field, the same way it already reads `redirect_url`. The visitor still presses the button, so nothing is redeemed on a scan. The QR encodes `https://<site>/auth/code?code=BETA-XXXX-XXXX`. `/auth/code` is already public, so `proxy.ts` needs no change. The printed text is the bare code plus the short URL.

### The poster page

- **Route:** `app/(protected)/admin/invite-codes/[id]/poster/page.tsx`. It is admin-gated by the admin layout and `requireAdminUser()`, and returns a 404 for a code that is unknown, revoked, expired or used up. It lives under `/admin`, so there is no new top-level segment.
- **Rendering:** server-rendered, using `poster.css`:
  - US Letter at 816×1056 CSS px, `@page { size: letter; margin: 0 }`, chrome hidden in print;
  - one ink, so it prints on coloured paper;
  - on screen, scaled to fit, with a print bar holding a **Print** button and a **Download QR (PNG)** button.
- **Components:** `components/admin/invite-codes/PosterSheet.tsx` (self-contained, so the coming redesign can restyle it) and `PosterPrintBar.tsx`.
- **Helpers:** `lib/poster/poster-rule.ts` holds `posterJoinUrl(origin, code)`, `qrPath(url)` (from `uqr`, as an SVG path with a quiet zone) and `isPrintable(code)`.
- **Entry point:** each row in the invite list gets a **Poster** link, shown only for a printable code.
- **Copy:** a new `ADMIN_COPY.inviteCodes.poster` block for admin, and `POSTER_COPY` for the printed sheet. The printed sheet is consumer copy, so it goes through copy-review: locked vocabulary, no em-dashes.

## PRs (no stacking; each from fresh main)

1. **This plan** (doc only).
2. **Multi-use codes, API and schema.** Migration 0093 and the schema; redeem's atomic increment plus the redemptions insert; validate; admin mint gains `label` and `maxUses`; the list shows uses. Integration tests:
   - last-seat race: two redeems for one remaining seat, exactly one wins;
   - the same user twice spends one seat;
   - revoked, expired and used-up codes are refused;
   - single-use codes behave exactly as before.

   **Risky** (migration, API routes, auth): `/code-review medium` plus the checklist pass. About 10 files.
3. **Web: pre-fill, poster page, `uqr`.** Tests:
   - `/auth/code?code=` pre-fills and redeems nothing;
   - the poster helpers (URL, QR grid and quiet zone);
   - the poster page: the admin gate, a 404 for an unprintable code, and that the QR and the typed URL appear on the sheet;
   - the admin mint form's label and cap.

   It touches the auth page, so it takes the risky path. About 12 files.

## Owed to Hugh

- Migration 0093 runs on the next deploy. It is additive and backfills `use_count` from `used_by`.
- Printing is Hugh's: mint a code with a label and a cap, open **Poster**, and print.

## Open questions (defaults chosen; override if wrong)

- **Default cap for a poster code:** 50, as in The 99. The admin form defaults the cap to 50 when a label is given and to 1 otherwise.
- **Should a poster code grant the same beta comp as a personal code?** Yes, unchanged: it is the same redeem path.

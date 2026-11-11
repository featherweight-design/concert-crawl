# Invite poster redesign and the admin Posters tab: plan

**Handoff:** `design/design_handoff_invite_poster/` (merged in #84). Hugh approved it on 2026-11-11.
**Replaces:** the interim poster UI from #79. That PR's data model stays as it is: `invite_codes.max_uses`, `use_count` and `label`, plus `isPrintable` and `seatsTaken` in `apps/web/src/lib/poster/poster-rule.ts`. Codes are multi-use and minted through `mintInviteCodeWithOptions`, with an audit row.
**Scope:** this is admin-only plus a public redirect, so it doesn't depend on the B+ plan's open questions. It is listed after F2 in the B+ lane.

## PRs

Each PR is at most ~800 lines, can ship alone and never stacks on an open PR.

| # | PR | What | Risk |
| --- | --- | --- | --- |
| P1 | **`/i/[code]` and the QR** | <ul><li>A public route `/i/[code]` that matches the code case-insensitively against the `BETA-XXXX-XXXX` format and 302s to `/auth/code?code=<CODE>`. That page already pre-fills from `?code=` and redeems nothing until the visitor presses the button. A string that isn't a code goes to `/auth/code` with nothing filled.</li><li>`i` joins `KNOWN_TOP_LEVEL_SEGMENTS` and `isAlwaysPublic` in `proxy.ts`, or the middleware 404s it.</li><li>In `poster-rule.ts`, `posterJoinUrl` encodes the uppercased canonical origin plus `/I/<CODE>` (QR alphanumeric mode), at ECC Q with `QR_QUIET_ZONE = 4`. A test checks that the example code gives a 29-module symbol (v3 plus the quiet zone).</li><li>`posterTypedUrl` becomes `concertcrawl.app/i`.</li></ul> | The route is public, so it is risky. It only redirects and never reads the database. |
| P2 | **Poster sheet restyle** | <ul><li>`PosterSheet` and `poster.css` follow `sheets/poster-night.html`, `poster-paper.html` and `poster-night-tabs.html`. That means Night (the default, with a 0.3 in paper frame and `print-color-adjust: exact`), Paper (one ink) and Tear-off tabs (nine tabs, with the QR at 3.5 in).</li><li>Real `CCMark` geometry. Venue names come from the venues table at render time, and the count fills the sub.</li><li>Poster strings move to `lib/poster/definitions/copy.ts` through copy-review, since they hang in public and count as consumer copy.</li><li>No launch date appears anywhere on the sheet.</li><li>The existing `/admin/invite-codes/[id]/poster` page renders the new sheet, with Night as its default.</li></ul> | Admin-only. |
| P3 | **Posters tab** | <ul><li>`/admin/invite-codes/posters`, a tab beside Codes, built in three steps from the admin boards:<ol><li>**Code:** live multi-seat code cards with a seats bar; full codes are faded; personal codes are left out with a note; a "New poster code" inline form (label, seats 25, 50, 100 or Other from 1 to 500, expiry) that mints through the existing action and selects the new code.</li><li>**Look:** Night or Paper tiles and a Tear-off tabs switch.</li><li>**Print:** `window.print()`, "QR as SVG" and the print checklist.</li></ol></li><li>A live preview at scale. On mobile from 320px, the picker becomes one card, Look becomes a segmented control, and QR and Print are pinned.</li><li>The old `/admin/invite-codes/[id]/poster` redirects to the tab with that code selected.</li><li>Admin strings go into `ADMIN_COPY.inviteCodes.poster`. Admin copy is exempt from the em-dash rule, but still goes through copy-review.</li></ul> | Admin-only. If it runs over ~800 lines, it splits into a tab-and-picker PR and a form-and-print PR. |

## What the design needs that the API lacks

- **Scans per code.** The "{n} scans" figure needs a count per code. That means either a small expand-only table written by `/i/[code]`, or an audit row per scan. Either way, it's a migration plus a write on a public route. **P3 ships without the figure.** It is a proposal for Hugh, and nothing is built.
- **The cut-off for the venue list.** The sub reads "{venueCount} venue calendars" from the active venue count, which is 21 today. The list of names stops at what fits on one line, followed by "· and more". The exact cut-off is a layout constant in P2.
- **"Not affiliated with the venues listed."** It's kept as the design's cautious default. Whether it's needed is a counsel question, not an engineering one.

Everything else is already there: multi-use codes, labels, seats, expiry, revocation, minting with an audit row, and `?code=` pre-fill on `/auth/code`.

## Checks

- Each PR runs typecheck, lint and its tests. P1 adds a middleware test, because a new top-level segment that isn't listed 404s for everyone.
- Before P2 merges, print the sheet once at Letter in Chrome: margins None, background graphics on, 100% scale. The scan test runs from across the room on the printout. `source/scan_test.py` sets the expectation, which is about 8 ft for Night and 6 ft with tabs.
- Copy-review covers every string in COPY.md before P2 and P3 merge.

## Next

P1, then P2, then P3, one at a time, after the B+ lane's A2, F1 and F2.

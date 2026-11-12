# Share Concert Crawl by QR · design handoff

**Status:** design, 2026-11-12. Strings are DRAFT and go through the `copy-review` skill before they ship (see `COPY.md`). Boards are example data.

Any signed-in person can share the app from a personal QR code. It is not tied to a role: it works the same for every account, before and after launch.

- **Before launch** the QR opens the person's own invite link, `concertcrawl.app/i/<CODE>`. **No seat limit** (Hugh, 2026-11-12): anyone who scans it skips the waitlist.
- **After launch** the same row and sheet show a plain link to `concertcrawl.app`. No code, no stub.

Canvas: see the PR description. Boards: `screens/` (2x JPG) and `boards/` (standalone HTML), listed in `manifest.json`.

## Screens

| Section | What it shows |
|---|---|
| 01 Where it lives | One new row in the account menu, last in **You** (after Submitted prices): QR tile in accent, no meta text. Phone sheet and desktop popover. |
| 02 The share sheet | The QR drawn as a ticket: the code above a perforation, **Joined with your code** below it (count and faces). Share… (system sheet), Copy link, Full screen. At 320, desktop dialog, Light. Full screen is always white so it scans in a dark venue. |
| 03 States | Making your invite (first open), Link copied, Share failed, Couldn't make the code, Code turned off. |
| 04 After launch | Plain link, no stub, the title changes. The signed-out menu gains the row too (first in App); before launch it is absent signed out. |
| 05 The friend's side | The link preview a pasted `/i/` link unfurls as, and the existing "From a link or QR" invite screen with the sharer's first name (optional, question 2). |
| 06 Parts | Every ticket state, the row (before, hover, after launch) and the presses, Electric and Light. |

## Decisions

1. **One personal code per account, unlimited.** Made on first open of the sheet, then reused for good. A plain `BETA-XXXX-XXXX` code from the existing generator, so it works with today's `/auth/code` checks and the sign-up handoff's prefilled board. It never names the person.
2. **The short `/i/` link the poster already uses.** The QR encodes `HTTPS://CONCERTCRAWL.APP/I/<CODE>` in capitals: QR alphanumeric mode, version 3 at error correction Q, quiet zone 4. `inviteShortLinkRedirect` in `apps/web/src/proxy.ts` already sends it to `/auth/code?code=`. The copied and shared link is lowercase except the code.
3. **Built on the live share pieces.** The sheet is `components/pwa/BottomSheet` (mobile sheet, centered dialog on desktop), like `consumer/share/ShareSheet.tsx`, and uses its helpers in `lib/share/destinations` (`canSystemShare`, `systemShare`, `copyLink`). `Share…`, `Copy link` and `Link copied` are live strings reused word for word.
4. **Share… only where the browser has it.** Phone: Share… leads, Copy link and Full screen sit under it. Desktop: Copy link leads; Share… shows only when `navigator.share` exists; no Full screen.
5. **Full screen** is a white page whatever the theme, with the QR at the screen width minus 56px, the link and the joined line. The Full screen press is the only visible way in; tapping the QR is a shortcut with no icon of its own (Hugh found the two redundant, 2026-11-12). It holds a Wake Lock while open (where supported) and gives it back on Done.
6. **Brightness.** Hugh asked for brightness up on open and back down on Done. No browser lets a web page or PWA set screen brightness (iOS and Android keep it to native apps), so the page does the most it can: pure white at full contrast, the screen kept awake, and a foot line asking for brightness. If Concert Crawl ever ships in a native shell, raise brightness there on open and restore the previous level on Done, on leaving the page and when the app goes to the background.
7. **Joined with your code** counts redemptions of this person's code (`invite_code_redemptions`) and shows up to four faces with the live "mix two" avatars, then +N. No one yet shows three dashed seats and "Your code doesn't run out."
8. **Code turned off.** An unlimited code could end up somewhere public. An admin revokes it with the existing `revoked_at`, and the sheet falls back to the plain site link (the waitlist before launch) with a one-line note. The person is not told why, and nothing new is made for them automatically.
9. **One glow per screen.** The ticket is this feature's own motif (perforation and notches), echoing the poster's tear-off tabs. The sheet's blue-to-pink edge follows the corners.

## What the build needs (for the CLI plan)

- **API:** `GET /v1/me/invite`, signed in: gets or makes the caller's personal code and returns `{ mode: 'invite' | 'open', code, url, joined: { count, faces[] }, revoked }`. `mode` is `open` when `NEXT_PUBLIC_PUBLIC_BROWSE` is on (`lib/launch-mode.ts`); then nothing is made. Zod on the response; rate limited.
- **Schema (expand only):** unlimited needs a way past `max_uses >= 1` and `use_count BETWEEN 0 AND max_uses`. Suggested: allow `max_uses` NULL to mean unlimited (drop NOT NULL, keep both checks, which pass on NULL), plus a `kind` column (`'personal' | 'admin'`) or a partial unique index on `created_by` where personal, so each account has at most one. The redeem claim must treat NULL as no cap. Settle this in the plan; no destructive change.
- **Admin:** personal codes show in Invite codes with label `Personal · @handle`, their joins, and the existing Revoke. Revoking is an audited admin action like today.
- **Scans:** the poster handoff already asks the `/i` route to log scans; personal codes get the same for free.
- **Analytics:** reuse `share_destination_selected` with a new `subject: 'app'` (or a sibling event), destinations `system`, `copy-link`, `fullscreen`.
- **Link preview:** `/i/<code>` is a 302, so crawlers unfurl `/auth/code`. Give `/auth/code` the "You're invited" OG image (05, 1200×630) and title. It names nobody, so one cached image serves every code.
- **Release notes:** this is user-facing: a `releases.ts` entry, through copy-review.

## Build-vs-design check (required)

Concert Crawl builds have drifted from handoffs before. Before the PR is ready: screenshot the menu, the sheet (every state in 02 and 03), Full screen and the desktop dialog at 320, 390 and 1280, Electric and Light, next to these boards, and list every difference in the PR. Use the live UserMenu row, BottomSheet and avatar components, not copies. Scan the on-screen QR and the full-screen QR with a real phone in a dim room.

## Questions for Hugh

1. **Where else does the row live?** Recommended: the account menu only, for now. Settings or the How it works page could carry it later.
2. **Name the sharer on the invite screen?** "Hugh sent you this invite" is warmer, but it shows a first name to anyone holding the link. Recommended: yes, first name only, and only from a personal code.
3. **Tell the sharer when someone joins?** A notification ("Maya joined with your invite") would close the loop. Recommended: not now; the count in the sheet covers it.
4. **After launch, keep the personal code in the link** for attribution, or plain `concertcrawl.app`? Recommended: plain, as drawn.

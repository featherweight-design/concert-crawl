# Invite poster and admin Posters tab

A US Letter poster that hangs in venues, record shops and bars and recruits beta testers before launch. A passerby gets what Concert Crawl is at a glance, sees that it's a limited test, and scans a QR that opens the invite screen with the code filled in. Each poster carries one shared, multi-seat invite code.

This replaces the placeholder sheet from PR #79. PR #79's data model stays: `invite_codes.max_uses`, `use_count`, `label`, plus `isPrintable` and `seatsTaken` in `apps/web/src/lib/poster/poster-rule.ts`.

Live review page: https://claude.ai/artifact/Stqc7b4qqVrd5rPTUtvbPD (same as `Invite Poster.html` here). Approved by Hugh on 2026-11-11.

## Files

| Path | What it is |
|---|---|
| `Invite Poster.html` | The full review page: poster variants, scan test, admin screens, code changes |
| `sheets/poster-night.html`, `poster-paper.html`, `poster-night-tabs.html` | One sheet each, print-ready at Letter. Exact markup and CSS to port |
| `screens/*.png` | 2x renders of the three posters and three admin boards |
| `COPY.md` | Every new string, for copy review |
| `source/build.py`, `source/page.py` | Generators for the sheets and the review page (`sheet()`, `POSTER_CSS`, `admin_desktop()`, `admin_mobile()`, `ADMIN_CSS`) |
| `source/scan_test.py` | The simulated distance and dim-light scan test |

## The poster

Three variants, chosen in admin:

- **Night** (default). Electric dark panel with a 0.3 in paper frame designed in, since most printers can't print to the edge. Real `CCMark` geometry (`TRAIL`, halo, core) drawn large, trail climbing to the halo. Headline in `--fg` with "One list." in the signal-to-accent gradient. White QR card. Needs `print-color-adjust: exact` and the user's "Background graphics" setting.
- **Paper**. One ink (black) on white, for B&W printers, photocopies and colored paper. The halo becomes two rings; the trail dots keep their opacity ramp.
- **Tear-off tabs** (either look). Nine vertical tabs across the bottom 1.55 in with the URL and code. The QR drops from 4.5 in to 3.5 in.

Layout, top to bottom: wordmark (`BRAND_COPY.wordmark`) and the "Beta testers wanted" chip; the "Launching later · Testing now" line; headline; one-sentence sub; the venue names in mono caps (from the venues table at render time, not hard-coded); the QR card with "Scan to test it", the seat line, and the typed fallback (short URL plus code); a small "Not affiliated" line.

No launch date anywhere on the sheet, so a poster on a wall never goes stale. CLAUDE.md: there is no launch date.

## The QR

| | Today (PR #79) | This design |
|---|---|---|
| Encodes | `https://concertcrawl.app/auth/code?code=BETA-…` | `HTTPS://CONCERTCRAWL.APP/I/BETA-…` |
| Mode, version | byte, v4 (33 modules) | alphanumeric, v3 (29 modules) |
| Error correction | M | Q |
| Quiet zone | 2 modules | 4 modules |
| Printed size | ~3.75 in | 4.5 in (3.5 in with tabs) |

The all-caps short URL fits QR's alphanumeric mode, so the code holds fewer, larger modules even at the stronger Q level (about 4 mm each at 4.5 in). Always black modules on white, never inverted or brand-colored, no logo inside the code.

Scan test (`source/scan_test.py`): the QR rendered at print size, scaled to what a 12 MP phone camera sees at each distance, light cut to 15%, sensor noise and blur added, decoded with OpenCV, 8 trials each. Today: 4 of 8 at 6 ft, 0 of 8 at 8 ft. This design: 8 of 8 at 6 ft, 7 of 8 at 8 ft. Tabs: 8 of 8 at 6 ft, 3 of 8 at 8 ft. Phone camera apps outperform OpenCV, so real distances run longer; the relative gap is the point.

This needs a new route, `/i/[code]` (see below). Until it exists, the sample QR scans but opens nothing.

## Admin: Posters tab

`/admin/invite-codes/posters`, a tab beside Codes. Current B+ style: one ambient glow (the page), gradient edge only on the selected code. Three steps, in order:

1. **Code.** Live multi-seat codes as cards: label, code, seats bar ("12 of 50 seats taken"), scans, expiry. Selected card gets the gradient edge. Full codes stay listed, faded, with "Every seat is taken. Mint a new code to put up another poster." Personal (1-seat) codes are left out, with a note saying why. "New poster code" opens an inline form: label ("Where it's going", admin-only), seats (25 / 50 / 100 / Other, 1 to 500), expiry (Never / 30 days / 90 days), "Mint and preview". While the form is open the preview dims with "The preview switches to the new code once it's minted." Minting reuses `mintInviteCodeWithOptions` and is audited.
2. **Look.** Night or Paper (radio tiles with mini thumbnails), and a Tear-off tabs switch that states the trade-off (3.5 in QR, about 6 ft instead of 8).
3. **Print.** "Print poster" (`window.print()`, existing scoped print CSS) and "QR as SVG". A checklist of print-dialog settings (Letter at 100%, margins None, Background graphics on, headers and footers off) and "Before you hang it, scan the printout from across the room."

The right column is the real sheet at scale with "Preview · 8.5 × 11 in" and the QR size and scan distance.

Mobile (from 320px): the code picker is one card that opens the list, Night/Paper is a segmented control, the preview sits in the flow, and QR plus Print are pinned at the bottom.

The existing `/admin/invite-codes/[id]/poster` URL should redirect to the tab with that code selected.

## Code changes this implies

1. **`/i/[code]` route.** Case-insensitive code match, 302 to `/auth/code?code=<CODE>`; unknown codes land on `/auth/code` with nothing filled. No auth. Optional: count scans per code (expand-only migration) to feed the admin "scans" figure.
2. **QR settings** in `poster-rule.ts`: encode the uppercased canonical origin plus `/I/<CODE>`, ECC Q, `QR_QUIET_ZONE = 4`. Add a test asserting the example code gives a 29-module symbol.
3. **Restyle `PosterSheet` and `poster.css`** to the sheets here.
4. **Posters tab** as above.
5. **Copy** into `lib/poster/definitions/copy.ts` and `ADMIN_COPY.inviteCodes.poster`, through copy-review. No em-dashes.

## Open questions

- Scans per code needs a small new table or audit rows. Ship the tab without the figure if that's not wanted yet.
- The venue count ("21") and list should come from live data; confirm the cut-off for "and more".
- "Not affiliated with the venues listed." is a cautious default for a poster that names venues and hangs inside them; drop it if counsel says it's unneeded.

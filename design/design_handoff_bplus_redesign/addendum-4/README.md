# B+ redesign · Design addendum 4 (2026-11-12)

Design's answers to the B+ build's round 3 follow-up questions: 8 places where the boards conflict with each other or with what ships. Each item gets a ruling, a board, or both. Where engineering chose an interim, it says **keep** or **change**.

Canvas: https://claude.ai/artifact/8Nroa2y1jVk8kBZ2AtQUuz

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. These boards win over any earlier board they contradict, and the earlier addenda's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg` (2x JPG); the HTML is in `boards/`.

**Build-vs-design check:** before the PR that builds any of this is ready, screenshot each touched screen at 320, 390 and 1280 against these boards and list the diffs.

| # | Item | Answer |
|---|---|---|
| 1 | What's new popup hero | **Ruling:** Showtime wins. No board. |
| 2 | Crew patch rim | **Ruling:** crew colour wins. `02/patch-rim-spec` |
| 3 | CTA gradient end | **Ruling:** keep `--accent`, add one derived stop. `03/cta-gradient-end` |
| 4 | Venue short names | **Hugh** (new field). Recommendation A. `04/where-tiles-m` |
| 5 | Price age stamp and pending trust pill | **Keep both**, drawn. `05/price-states-age-trust` |
| 6 | Stale and archived in Submitted prices | **Keep** the CLOSED pill, plus a reason line. `06/submitted-closed-m` |
| 7 | Vibe full list back link | **Keep** "‹ Filters". `07/vibe-full-m` |
| 8 | Passport title, stamp shape, no past shows yet | **Ruling:** "Your Passport", round stamps, **keep** the interim. `08/*` |

## 1. What's new popup: icon tile or Showtime hero

**Ruling: the Showtime heroes win**, in the popup and on the What's new page, as built (`design/design_handoff_spotlight_heroes/`, `release-notes/heroes/`).

- They already cover every past spotlight, so nobody needs to draw tiles for them.
- Each one has its own motif. The icon tile repeats the account-menu tiles, which breaks the no-repeated-motifs rule (`design-style-rules`).
- From `07/more-r3-feature_modal`, keep the **frame**: the gradient top edge, the eyebrow and title, the How it works step card with its dots, and the Maybe later / CTA footer. Only the hero slot changes.
- A new spotlight without a Showtime hero falls back to the compact Passport hero, as `SpotlightHero` does today. Design owes a Showtime hero for each new spotlight in its release handoff.

## 2. Crew patch rim

**Ruling: the crew colour wins.** A neutral rim makes every crew look the same. The values are the B+ kit's (`screens_r3.patch`), scaled by size:

- **Rim:** the crew chord's **secondary** colour at 60% opacity. Width = size × 1.5/56, never under 1px. That's 3.2px at 120, 2px at 76, 1.5px at 56 and 1px at 32 and below. Corner radius = size × 14/56.
- **Glow:** `drop-shadow(0 0 size×8/56 px)` in the secondary at 35%, **only at 56px and up** (crew home hero, Crews list, invite card). Under 56px the patch sits in rows of chips, where a glow reads as a selected state, so there's no glow there (the Who chip in Filters, rows).
- This replaces the neutral 2px `--border-strong` rim in `crew-art.jsx`. The stitched inner line and the weaves stay.

Board: `02/patch-rim-spec` (five sizes × four chords).

## 3. Gradient end: #DE96DF or --accent

**Ruling: keep `--accent` #FF7BD4 app-wide.** #DE96DF isn't a new colour. It's `color-mix(in srgb, var(--accent) 75%, var(--signal))`, the B+ kit's `grad()`, and it only appears where a gradient **fills** a CTA under dark label text.

- Add one token, `--cta-end: color-mix(in srgb, var(--accent) 75%, var(--signal))`, defined in each theme so the light theme derives its own stop. Filled gradient CTAs and the pager's active dot run `--signal` → `--cta-end`.
- Gradient text, gradient borders, the sheet top edge and every solid accent use (Sold out, the pop genre) keep `--accent`, as built.
- Two files already hard-code #DE96DF (`NotifPanelEdge.tsx`, `invite-landing/definitions/styles.ts`). Point them at the token.

Board: `03/cta-gradient-end`. This is a visual call; Hugh can overrule it.

## 4. Venue tiles: short names

**Hugh's call** (it adds a field). **Recommendation: A, an optional short name per venue.**

- **A (recommended):** an optional `shortName` on the venue, set in admin Venue Details (the Look card). Captions under about 90px use it: the Where tiles, and the Venues collected grid. Everywhere else keeps the full name. With no short name, the tile falls back to B. The proposed names for all 21 venues are on the board; they are drafts.
- **B:** no field. Full name, two lines, then an ellipsis. It works, but "Cervantes' Masterpiece Ballroom" and "The Fillmore Auditorium" clip, and the tiles stop matching the boards.
- Deriving the name from `splitVenueName` was considered and rejected. It gives "Cervantes' Masterpiece", "Meow Wolf Denver", "Larimer" and "Church", and it can't be corrected without a code change.

Board: `04/where-tiles-m`. Either way, the 2-line clamp stays as the fallback.

## 5. Price cards: the price age and the pending trust pill

**Keep both.** Dropping them would remove shipped trust signals. Board: `05/price-states-age-trust`.

- **Trust pill on pending cards:** the live card's pill (Community, ★ Box office, Resale), top right of the card body on the TICKETS line. It appears on every pending card, yours included. There's one pill component for live and pending. The B+ pill styling replaces the old oklch tokens in `PendingTrustPill`.
- **Price age on live cards:** its own line under "Submitted by … · N fans confirmed", in plain subtle mono ("AS OF 3 DAYS AGO"), and above the fees link.
- **Change:** the amber "could be stale" tone and dot go. Hugh dropped the stale chip everywhere (2026-11-10). Past the stale threshold, the line stays plain and **Still accurate?** joins it, as built.

## 6. Submitted prices: stale and archived

**Keep the interim** muted CLOSED pill, with two additions (`06/submitted-closed-m`):

- The price goes `--fg-muted`, and the text beside the pill says why: stale → "No second fan in time", archived → "A newer price replaced it" (draft copy).
- Closed rows show under **All** only. They count in Submitted, never in Live or Confirmed. There's no new filter tab.

## 7. Vibe full list: back link

**Keep "‹ Filters"**, the same header as the Where list (`05/bp-f-filt_venues_m`): back link left, Clear right, then the "Vibe" title. Board: `07/vibe-full-m`.

## 8. Passport

- **Title: "Your Passport"** at both widths. It's what ships (`copy.ts` pageTitle) and what the filled phone and desktop boards say. The one board that said "Passport", the phone empty state, is redrawn: `08/passport-empty-title-m`. "Passport" alone stays an eyebrow only (PASSPORT · 2026, the empty-state eyebrow).
- **Stamps: round.** Addendum 3, rule 4 already settled it: one round VenueStamp everywhere, with the tilt only inside the Passport booklet. The square stamps in Edit your Concerts' `concerts_m` are superseded (addendum 3 `04/one-stamp-m`).
- **Upcoming shows, no past ones: keep the interim**, now drawn at both widths (`08/passport-next-d`, `08/passport-next-m`):
  - The open booklet with 0 nights, 0 venues and "—" for top genre.
  - Page 1 holds the dashed NEXT stamp (the kit's `ghost_stamp`: the venue glyph in greyscale, the date, straight because it isn't stamped yet) and three empty dashed slots.
  - Up next and "0 of 21" venues collected sit below or beside it.
  - There's no Share or Save image, since there's nothing to share yet. The subtitle is "Your first stamp lands after Feb 22." (draft).

## Question for Hugh

- **Item 4:** add an optional short-name field per venue (A, recommended), or live with the 2-line clamp (B)?

## Files

- `boards/` and `screens/`: the HTML boards and 2x JPGs. `manifest.json` lists them.
- Generator sources are in the project's design files (`design/addendum-4/`: `a4.py` boards, `boards.py` export, `canvas.py`), built on the B+ kit and addendum 2 and 3 helpers.

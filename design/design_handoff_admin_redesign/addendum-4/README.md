# Admin redesign · Design addendum 4 (2026-11-24)

Design's answers to the open Add a venue asks: the three venue hero settings the picker left waiting on B+ B11 ([`../QUESTIONS-2026-11-12.md`](../QUESTIONS-2026-11-12.md) line 430, [`../../design_handoff_bplus_redesign/QUESTIONS-2026-11-12.md`](../../design_handoff_bplus_redesign/QUESTIONS-2026-11-12.md) "B11 Venues"), and the Start and Basics rows sent to Design from #816, #817 and #818.

`NN/board` means `screens/NN-<section>/board.jpg` (2x), with the HTML in `boards/NN-<section>/board.html`. Like earlier addenda, these boards win over a board they contradict. **All new wording is draft** and goes through `copy-review`; copy is not part of this ask.

| # | Item | Ruling | Boards |
|---|---|---|---|
| 1 | Venue hero art: Theater, Club, Gallery | **Drawn**, in the street/outdoor/arena system, phone and desktop. Unblocks the last Add a venue step. | `01/hero-settings-spec`, `01/hero-{theater,club,gallery}-{d,m}`, `01/hero-venue-page-crop-d`; art in `assets/` |
| 2a | Right-column card fill | **`--bg-elevated`** (#0E1226) is canonical for every admin card. Board 05's #11162E (`--surface-1`) was drift; Start, Asked for by and robots.txt move to `--bg-elevated`. | `02/card-fill-ruling`, `02/basics-desktop-canonical` |
| 2b | robots.txt pill tint and states | **Confirmed as built**: the shared status pill at 16% fill, 35% border. Four tones, now drawn: success allows, danger disallows, warning couldn't check, muted checking (ring spinner). Disallowed and unknown add one muted line. | `02/robots-pill-states` |
| 2c | Rail done step | **Confirmed as built**: success check in a 22px success circle, label 600 in `--fg`, clickable back to the step. | `02/rail-done-step-d` |
| 2d | Saving state | **Drawn**: fields disabled at 50%, Back disabled, Continue `aria-busy` with a spinner and same width, footer note reads "Saving…". Nothing shows for saves under 300ms. | `02/saving-d` |
| 2e | Phone save confirmation | **Proposal accepted**: "Saved as you go" above Continue, 12px `--fg-subtle` with a success check, only after the first save lands. "Saving…" with a ring while a save runs. Failure stays addendum 3 row 9's toast. | `02/phone-saved-as-you-go`, `02/phone-saving` |

## Decisions only Hugh can make

None. Every row above is a Design ruling.

## 1. Venue hero settings

Each of the three new settings follows the same rules as the built three (`apps/web/src/components/consumer/venue-glyph/VenueBackdrop.tsx`):

- The venue's ground, with its **to** colour washed in at 18% toward the bottom, then the scene, then the glyph and halo exactly as today.
- **Theater** (Ogden Theatre): curtain folds in the venue's **from** colour both sides, a valance swag, a row of marquee bulbs in signal cyan at 35/55/75% repeating, and a stage lip.
- **Club** (Hi-Dive): a truss in **to** along the top, two big lights and two small, each beam starting at its own lamp, two soft pin spots, haze, and a floor edge.
- **Gallery** (Meow Wolf Denver): a room in one-point perspective (vanishing point centred on a 42% horizon), floor rays and depth lines in **to**, three lit panels on the back wall.
- Scene lights use the board's fixed neon set (cyan, yellow, pink, lime), like the arena's window yellow, so they never disappear into a venue of the same colour.
- **Two layers, like the arena moon.** The scene slices from the bottom (`xMidYMax slice`), so the 1300×340 venue page crops its top. The theater bulbs and valance and the club truss are a separate top-anchored strip at fixed size, so they survive the crop (`01/hero-venue-page-crop-d`). Gallery has no strip.
- Light theme washes each pale like the other three (addendum 2 item 16).

`assets/` holds the art for build: `<setting>-phone.svg` (380×200) and `<setting>-wide.svg` (1200×420) for the scene, `<setting>-top-{phone,wide}.svg` for the strip, and a full `<venue>-<setting>-hero.svg` sample with the glyph. Colours in the SVGs are the sample venue's; the build takes `ground`, `from` and `to` per venue, as `VenueBackdrop` does now.

The picker thumbnails in `05/all-six-settings` stay as drawn; these heroes are those thumbnails at size.

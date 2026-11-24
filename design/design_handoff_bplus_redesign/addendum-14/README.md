# B+ redesign · Design addendum 14 (2026-11-24)

Design's answers to the B+ rows still open in [`../QUESTIONS-2026-11-12.md`](../QUESTIONS-2026-11-12.md) after the 2026-11-12 and 2026-11-23 rounds, checked against main on 2026-11-24.

`NN/board` means `screens/NN-<section>/board.jpg` (2x), with the HTML in `boards/NN-<section>/board.html`. Like earlier addenda, these boards win over a board they contradict. **All new wording is draft** and goes through `copy-review`; copy is not part of this ask. The venue hero settings for Theater, Club and Gallery (B11) are in admin addendum 4.

| # | Row | Ruling | Boards |
|---|---|---|---|
| 3a | Light theme stamps (line 299) | **Yes, a darker ink on Light.** Ring and name take the venue's `to` darkened toward #070A1A, same hue, until the ring is 3:1 and the text 4.5:1 on its surface. Passing colours are unchanged. The glyph keeps its colours. Dark themes unchanged. | `01/stamps-light-spec`, `01/stamps-light-m`, `01/stamps-light-d` |
| 3b | Page glow per theme (line 300) | **One recipe for every theme**: Electric's geometry, the theme's warm accent top left and its signal bottom right, over a ramp from 3% lighter than `--bg`. Values per theme on the boards; Light is 7% and 5%. New tokens `--glow-1`, `--glow-2`. | `02/page-glow-m`, `02/page-glow-d` |
| 3c | Account sheet grabber (line 302) | **Keep it, and use one grabber for every sheet that drags**: 36×4, radius 2, 8px from the top, `--fg-muted` at 45% (70% while dragging). Sheets that don't drag have none. Desktop has no sheets, so no grabber. | `03/grabber-spec`, `03/account-sheet-m`, `03/account-sheet-drag-m`, `03/account-menu-d` |
| 3d | B24 card placeholder (line 116) | **The venue's night, not `--surface-1`**: its ground with a `to` ramp and radial, and its icon. It's art, so it stays dark on Light. The image fades in over it. | `04/card-placeholder-spec`, `04/invite-light-m`, `04/invite-electric-m`, `04/invite-light-d` |
| 3e | #139 search clear (line 126) | **Keep it on both.** Phone as addendum 12 draws it. Desktop puts a 22px x left of ESC once something is typed: x clears and keeps focus, ESC closes. | `05/search-clear-m`, `05/search-clear-d` |
| 3f | #143 desktop install (line 154) | **Same animation, sized to the window.** Start at 128px centred in the content area, grow to 50% of the shorter side, land on the 28px header mark. Under 600 wide, use the phone sizes. | `06/install-desktop`, `06/install-phone-ref` |
| 3g | Profile with no handle (line 293) | **Same card, neutral.** Same ring and 4px cutout over the banner, with a neutral ring (`--border-strong` to muted), the dashed placeholder inside it, and muted banner stripes. The name stands in for the handle; the second line is a Pick a handle link. | `07/profile-no-handle-m`, `07/profile-no-handle-d` |

## Decisions only Hugh can make

None. Every row above is a Design ruling.

## Notes for the build

- **3a.** Compute the ink once per venue and store it beside the glyph colours in `venue-glyph/definitions`, not at runtime. `01/stamps-light-spec` lists every board venue's ring and text values with their contrast.
- **3b.** Electric keeps its drawn #BC77F2. The glow stays the only soft radial on a screen (README rule 1).
- **3d.** With no venue (rare), use the Electric ground and the CC mark. Under reduced motion the image cuts in instead of fading.
- **3f.** The mark on the boards stands in for the CCMark; position and size are what these boards settle. Cold standalone start only; reduced motion is a straight cut; it never blocks the load.

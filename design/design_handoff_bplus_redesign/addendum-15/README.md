# Addendum 15 (2026-11-27): the artist preview, six open rows from #836

PR #836 built U3 (addendum 13, `boards/01-musicbrainz-tap`): a tap on a MusicBrainz-only search row opens a preview, as a phone sheet, a palette drill-in and a desktop card. Its contact sheet (`docs/superpowers/inventories/artist-search-u3-preview.json`) left six rows the boards don't settle. This addendum rules on each. Where it differs from addendum 13, this one wins.

**Live canvas (source of truth for review):** the addendum 12/13 canvas, page **"Artist preview: six rulings"**.

Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-15/a15.py` (`python3 a15.py <dest>`, then `node ../addendum-12/render.js <dest>`; `dc15.py` puts them on the canvas). The strings on the boards are the built copy from #836. Sample acts only. The dashed pink outline marks the piece under discussion; it is not UI. No new colours or motion.

## The rulings, in one table

| Row | Ruling | Build change | Boards |
|---|---|---|---|
| 1. Photo plate | **Panel**, rounded square, `SLOT_RADIUS.panel` (12), the slot hairline, no second ring. 84px on the phone sheet, **96px** in the palette and desktop card | Pass 96 on desktop and in the palette | `parts-spec`, all previews |
| 2. Pitch copy | **The built copy stands** (copy-reviewed in #836). Layout unchanged | None. Boards now carry the built strings | `preview-360` |
| 3. Open their page | **10px under the pitch**, full width, only once Following and the slug are back. 44px, **radius 12**, 1px `--border-strong`, no fill, 14/700 `--fg`, **trailing 14px chevron** in `--fg-muted`. Hover: `--fg-muted` border on `--surface-2`. Focus: the standard ring | Radius 14 to 12; add the chevron | `parts-spec`, `preview-360-following`, `palette-preview-d-following`, `search-page-preview-d-following` |
| 4. Palette back row | Keep the built **44px** button. 0 6px padding, 8px gap, 14px chevron at stroke 2, label 13/700 `--fg-muted` (`--fg` on hover), focus ring, 38% while a follow is in flight. The drill-in's footer reads **ESC BACK TO RESULTS · ↵ FOLLOW**, then **↵ OPEN PAGE** | Weight 700, chevron 14/2, gap 8; swap the footer hints while drilled in | `parts-spec`, `palette-preview-d`, `palette-preview-d-following` |
| 5. Error line | **The preview has no load to fail**: it is drawn from the search row and makes no request (a failed search has no row to tap, addendum 13 `palette-error-d`). The only error it shows is a refused Follow: `FollowErrorMessage`, page variant, in the pitch line's place. `--danger` for 404 and 409 with Follow greyed at 38%; `--warning` for 429 and 503 with Follow live. No Open their page while an error shows | None. Confirmed as built | `parts-spec`, `preview-360-error` |
| 6. Close button | **Keep a visible Close.** Phone sheet: grabber (addendum 14 §3c) and Close. Desktop card: Close. Palette: none (ESC and the back row) | Add the Close to the phone sheet and desktop card; 44px right gutter on the head; plate top-aligned | `parts-spec`, `preview-320-long`, every preview |

## 6. Close, in detail

The addendum 13 sheet and desktop card boards draw a Close (a 36px circle, top-right, beside the grabber); on main the preview renders the grabber only, because #836's review declined the Close as undrawn. It was drawn, and it stays:

- The desktop card can't be dragged. Without a Close its only exits are the scrim and Esc, and neither is visible.
- On the phone, drag-to-dismiss is invisible to screen-reader and switch users. Our other action sheets (report, filters, feedback) carry a Close already.
- Spec: 36px circle in a 44px hit box, 1px `--border-strong`, an 11px × in `--fg-muted` at stroke 1.6, the standard focus ring. Phone: the hit box at right 8, top 14 of the sheet. Desktop card: right 12, top 12. `aria-label` from copy (placeholder "Close").
- The head keeps a 44px right gutter so a long name wraps before the Close, and the plate aligns to the top of the head (`preview-320-long`).
- Focus lands on Follow when the preview opens. Tab order: Follow, Open their page, Close. Esc still closes.

## Decisions only Hugh can make

- **404 and 409 grey out the Follow** (the open call since addendum 13). This addendum keeps it as built.

## READINESS

**Verdict: READY.** Four small build changes (plate size on desktop, Open their page radius and chevron, back row style and palette footer, the Close), all with existing tokens and components. No API or copy change.

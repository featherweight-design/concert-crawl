# Addendum 11 (2026-11-22): the Vibe chip with three or more vibes

One build question, answered. #792 built the phone Vibe chip for one and two picks (`screens/04-genre-and-vibe/bp-vibe-browse_vibe_m`: "Electronic, Hip-hop" over a two-dot stack). No board drew three or more picks, where the names stop fitting at 360px. This addendum draws them at 320, 360 and 1280.

Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-11/a11.py` (`python3 a11.py <dest>`, then `node render.js <dest>`). **All wording here is placeholder** for copy review. `01/board` means `screens/01-vibe-chip/board.jpg`. The dashed pink outline on the boards only marks the piece under discussion; it is not UI.

## The ruling, in one table (`01/vibe-chip-spec`)

| Picks | Phone chip | Desktop segment | Legend in the count row (both sizes) |
|---|---|---|---|
| 1 | one dot, "Electronic" (unchanged) | one dot, "Electronic" (unchanged) | the name |
| 2 | two dots, "Electronic, Hip-hop" (unchanged, #792) | two dots, "Electronic +1" (unchanged) | both names |
| 3 or 4 | **three dots, "3 vibes" / "4 vibes"** | **three dots, "Electronic +2" / "+3"** | every name |
| 5 to 15 | three dots, "N vibes" | three dots, "Electronic +N" | **the first three names, then "+N more"** |
| all 16 | **three dots, "All vibes"** | **three dots, "All vibes", no suffix** | **no names** (the chip says it) |

## 1. The dot stack grows to three, then stops

- 7px dots, each tucked 2px under the one before, as built: one dot is 7px wide, two 12px, three 17px.
- It shows the **first three picks, in the order they were picked**, the same order as the legend. The live code shows `values.slice(0, 2)`; that becomes `slice(0, 3)`, on the phone chip and the desktop segment alike.
- **No fourth dot, and no "+" on the stack.** The label already carries the count, so the stack only says "several genres". No ring is cut around the dots (the B+ boards ring tiles, not dots).

## 2. Names switch to a count from three picks

- **Phone:** three or more picks read as a count, "3 vibes", which is what #792 already ships (`copy.vibeCount`). Names would truncate mid-word at 360 and a truncated list hides which genres are on. The count never truncates.
- From three picks the chip is **narrower than at two** (about 100px against about 175px for "Electronic, Hip-hop"), so 3+ never pushes the row harder than the two-pick chip already does. The 160px label cap stays, for long pairs.
- **All 16 picked** reads **"All vibes"** rather than "16 vibes". It still filters (shows with no genre bucket drop out), so it keeps its chip and its ✕. Whether picking every vibe should instead clear the filter is a product call, not drawn here (see the end).
- **Desktop:** the segment keeps the pattern it has, "Electronic +2", the first pick's name plus a count, with the name ellipsising before the "+N" ever does (`01/vibe-4-d`, every segment on). All 16 reads "All vibes" with no suffix.

## 3. The legend caps too

The count row under the chips (phone) and under the bar (desktop) names each pick with its dot (`VibeLegend`). Unchecked, 16 names would run to four or five lines at 320px.

- **Up to four picks:** every name. At 320 and 360 that wraps to two lines at most (`01/vibe-4-320`, `01/vibe-4-360`).
- **Five to fifteen:** the first three names, then **"+N more"** in the count's mono style (`subtle`, not a link).
- **All 16:** no names; the count stands alone.
- The screen-reader sentence (`copy.vibeLegend`) keeps naming **every** pick, whatever the visible legend shows.

## 4. Beside the other chips, the row never wraps

- The phone chip row already scrolls sideways and bleeds off the right edge (`PhoneFilterChips`, `browse-active-320`). That stays: **the row never wraps**, at any count.
- Vibe is last in bar order (Who, When, Where, Price, Vibe), so with every filter on it starts off-screen at 320 and 360 (`01/vibe-crowded-320`, `01/vibe-crowded-360`). Scrolled to the end it sits whole, with the 16px gutter after it (`01/vibe-crowded-320-scrolled`). The Filters count (4) and the legend under the row still say a Vibe is on while the chip is off-screen.
- With only When on, "3 vibes" and "All vibes" sit whole beside it at 320 (`01/vibe-3-320`, `01/vibe-all-320`).

## Boards

| Board | Shows |
|---|---|
| `vibe-chip-spec` | The table above, the dot stack at 4x and the chip widths |
| `vibe-3-320`, `vibe-3-360` | 3 picks on the phone |
| `vibe-4-320`, `vibe-4-360` | 4 picks; the legend on two lines |
| `vibe-all-320`, `vibe-all-360` | All 16; "All vibes", no legend names |
| `vibe-crowded-320`, `vibe-crowded-360` | Every filter on; the row runs off the edge |
| `vibe-crowded-320-scrolled` | The same row scrolled to the end |
| `vibe-3-d`, `vibe-4-d`, `vibe-all-d` | Desktop segment and legend (4 picks drawn with every segment on) |

## Build notes

- `FilterBar.tsx` `dimensionMarks`: the Vibe stack takes `slice(0, 3)`. Where keeps its two tiles.
- `filter-defs.ts` `getChipLabel`: 16 of 16 (`values.length === VIBE_ORDER.length`) reads "All vibes"; everything else as built. The desktop segment's value does the same.
- `VibeLegend`: cap as in §3. Two new placeholder strings for copy review: "All vibes" and "+{n} more".
- Before the build PR is ready, screenshot Browse at 320, 390 and 1280 against these boards and list the diffs in its body.

## Decisions only Hugh can make

None block the build. Two go a step past the question, and Hugh can overrule either:
- **All 16 reads "All vibes" and stays a filter.** The alternative is that picking the last vibe clears the Vibe filter, since "every vibe" is almost "any vibe". That changes behaviour, not just the chip, so it is not drawn.
- **The legend caps at four names.** The question was about the chip; the legend sits right under it and grows with it, so it got the same treatment.

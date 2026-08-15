import { SURFACES, type RowSurface } from './surfaces'

/**
 * Rule 3 — the row reserves its own height.
 *
 * `MetaRow` returns null when a row has no chips to render, and a row whose
 * line 4 vanishes is shorter than its neighbours. On a list where most rows
 * carry a chip and some do not, that reads as the list stepping rather than as
 * one row saying less. The reservation is what makes a collapsed line 4 free.
 *
 * ## The derivation
 *
 * Every figure below is the sum of the shipped components' own type, at cozy —
 * the only density that ships. Re-derive rather than guess if any of them
 * changes; the comment exists so a future type change is a recalculation and
 * not a mystery.
 *
 * | line | source | wide | narrow |
 * |---|---|---|---|
 * | 1 title | `RowTitleLine` 15.5 / 14.5 x 1.35 | 20.925 | 19.575 |
 * | 2 support | `marginTop: 3` + `SupportingLine` 11.5 / 11 x 1.35 | 18.525 | 17.85 |
 * | 3 when/where | `mt-0.5` (2) + `WhenWhere` 11.5 / 11 x 1.5 | 19.25 | 18.5 |
 * | 4 chips | `mt-0.5` (2) + `RowMetaChip` 9.5 x 1.5 + 4 padding + 2 border | 22.25 | 22.25 |
 *
 * Line 3 inherits Tailwind preflight's 1.5 rather than declaring one, which is
 * why it is taller than line 2 at the same font size.
 *
 * Four lines: 80.95 wide, 78.175 narrow. Three lines drop line 2: 62.425 and
 * 60.325. Rounded up, because a reservation that lands under the natural
 * height reserves nothing.
 *
 * These are content-box heights for the inner row, which is where the value is
 * applied — the outer padding and any `footer` sit outside it, so neither can
 * absorb the reservation. The artwork (56 wide, 44 narrow) never reaches these
 * figures, so the text column always governs.
 */
const FOUR_LINE = { wide: 81, narrow: 79 } as const
const THREE_LINE = { wide: 63, narrow: 61 } as const

/**
 * Keyed off `showsSupports` rather than hand-listed per surface, so adding a
 * surface stays an entry in `surfaces.ts` and cannot silently arrive without a
 * reserved height.
 */
export function rowMin(surface: RowSurface, narrow: boolean): number {
  const lines = SURFACES[surface].showsSupports ? FOUR_LINE : THREE_LINE
  return narrow ? lines.narrow : lines.wide
}

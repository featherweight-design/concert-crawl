# Follow button — scale &amp; weight pass (R3)

**Open:** `Follow Button Scale.html` · before/after across all five surfaces, all three themes.

## The problem

R2 shipped **one object at three sizes, all in the same `--signal` fill** (sm 36 · md 44 · full 48). On a 390 screen that put a saturated cyan slab beside every artist name — three on a 3-act bill, plus a full-width one under it. The button stopped reading as an action and became the page's subject.

Size alone wasn't the bug. A smaller cyan slab is still a cyan slab.

## The call

**Two moves.**

1. **Scale** — two notches down at row level.
2. **Weight** — rows go **quiet** (outline). The filled `--signal` pill is reserved for the artist page's single primary CTA.

> **One filled Follow per screen, maximum.**

The tap target does not move. Every quiet button carries a transparent 44px hit overlay, so the pill shrinks and the target doesn't (WCAG 2.5.8 / iOS HIG). See the *Hit area* artboard — the dashed box is drawn for the canvas only.

## The ramp

| size | R2 → R3 | where |
|---|---|---|
| `badge` | 34 → **26** | on art — shelf cards |
| `row` | 36 → **28** | bill rows, search rows, sticky sub-header |
| `rowWide` | 44 → **32** | desktop rows (pointer target isn't the constraint) |
| `primary` | 48 → **44** | artist page hero — **the only filled one** |

New prop: **`tone`** — `quiet | loud`. `size` is unchanged in kind. `state` is `idle · following · locked`, plus the shipped `signedOut`, which draws at rest at either tone (#794 §3.10). The canvas also renders a `pending` skin; that one is prototype-only and is **not** built — the shipped flip is instant and its optimism lives in `useArtistFollow`.

## Rules

1. One filled Follow per screen. It belongs to the artist page hero.
2. Everywhere else is quiet: outline, `--fg` text, `--border-strong`.
3. `Following` stays `--signal`-tinted at either tone — it's a **state**, and losing the colour loses the read.
4. Visual height may shrink; the 44px target may not.
5. `--accent` is still **Watching**. Following never borrows it.

## What else changed on the surfaces

- **Bill block** — "Follow all N" moves out of the full-width slot and into the header row as one quiet pill, where it reads as a shortcut for the rows below rather than the section's primary action. **The gate is still one unit**: below Premium the shortcut and every row lock together — one paywall, one tap.
- **Search rows** — quiet at 28 lets the `ARTIST PAGE` chip and the button form a single right-hand cluster instead of competing. Under 360 the label drops to a 28px icon-only square with `aria-label`; the row itself is still a full-width target to the artist page, so the small square is the secondary action on a row that already has a big one.
- **Sticky sub-header** — 28 inside the 56px bar. R2's 44 left 6px of air and made the bar feel like a toolbar of one button.
- **Artist page** — height only. Pitch line unchanged.

## Files

| File | Holds |
|---|---|
| `follow-scale.jsx` | `CCFollow`, `CCFollowBadge`, `FS_SIZES` (+ `FS_SIZES_R2` for the before column), `fsLocked`, glyphs |
| `follow-surfaces.jsx` | The five surfaces, each with a `legacy` prop that renders R2 |
| `follow-canvas.jsx` | The canvas — 6 sections |
| `theme-context.jsx` · `identity-art.jsx` · `design-canvas.jsx` | Verbatim copies |

## To land in the shipped code

`FollowButton` (`artist-surface.jsx`) and `NFFollow` (`nf-shared.jsx`) both take the new size table and a `tone` prop; `CCFollow` here is the merged contract for the two. Call sites that pass only `following` keep working — they land on `tone="quiet"`, `size="row"`, which is the intended default everywhere except the artist page hero (`tone="loud" size="primary"`).

## Open

- **Row `Following` state at quiet weight** uses a 55%-mixed `--signal` border. Worth a look on the Light theme specifically — that's the one where the mix loses the most.
- ~~Onboarding steps 6–7 use the badge~~ — **resolved, no action.** The picker is a selection tile (`ArtistPickTile`) with its own check/plus glyph and no follow control, so nothing inherits the new diameter and the collision this flagged cannot occur. The picker is out of scope for this pass.
- The shelf badge shipped at 34px as a hand-rolled circle outside the size table, not the 30 this handoff first recorded. The ramp above carries the real before-number; folding it into the shared table is part of the build.

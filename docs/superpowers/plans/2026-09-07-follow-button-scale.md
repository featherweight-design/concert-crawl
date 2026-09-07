# Follow button — scale & weight pass (R3) — implementation plan

**Issue:** none (unticketed design iteration) · **Design handoff:** `design/design_handoff_follow_button_scale/`
**Readiness verdict:** 🟡 Yellow (`design/design_handoff_follow_button_scale/READINESS.md`)

## Why

R2 shipped one follow control at three densities, all filled with `--signal`. On a 390px
screen a three-act bill renders three saturated cyan slabs beside three artist names and a
fourth full-width one underneath. The button stopped reading as an action and became the
page's subject.

Size alone is not the fix — a smaller cyan slab is still a cyan slab — so R3 moves two
axes. Everything shrinks, and everything except one primary CTA goes quiet (outline,
`--fg` text, `--border-strong`). The filled pill survives in exactly one place per screen.
The tap target does not move: every shrunken control carries a transparent 44px overlay.

## Shape

Two PRs. PR-A is a mechanical but wide change — renaming the size keys forces every call
site at once, so it cannot be split further without leaving the tree uncompilable. PR-B is
the one structural change (the bill's header shortcut) plus the shelf badge, both of which
are independent of the rename and would only fight PR-A for the same lines if bundled.

| PR    | Scope                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------- |
| **A** | The control: size table, `tone`, quiet skins, hit overlay, all nine call sites, both skeletons |
| **B** | Bill header shortcut relocation + shelf badge folded into the shared table                     |

---

## PR-A — The control

### 1. Size table (`artist-page/definitions/constants.ts:87`)

`NF_FOLLOW_SIZES` is replaced key-for-key. The old names described density; the new ones
describe placement, which is what the "one filled per screen" rule actually constrains.

| new key   | height | font | glyph | padding  | radius | replaces    | where                              |
| --------- | ------ | ---- | ----- | -------- | ------ | ----------- | ---------------------------------- |
| `badge`   | 26     | —    | 12    | 0        | 999    | (new)       | on art — shelf cards               |
| `row`     | 28     | 12   | 11    | `0 10px` | 8      | `sm` (36)   | bill rows, search rows, sticky bar |
| `rowWide` | 32     | 12.5 | 11    | `0 12px` | 8      | `md` (44)   | desktop rows                       |
| `primary` | 44     | 14.5 | 14    | `0 18px` | 10     | `full` (48) | artist hero, nudge card            |

The long comment above the table currently explains why `sm` (36) is below the touch
minimum and where it is therefore permitted. That reasoning is retired by the hit overlay
and must be rewritten rather than left in place — it would otherwise read as a live
constraint on sizes that no longer exist.

### 2. `FollowButton` (`artist-page/FollowButton.tsx`)

**New prop `tone: 'quiet' | 'loud'`, defaulting to `'quiet'`.** The default is the point:
every call site that does not opt in lands on quiet, which is correct everywhere except
the two loud surfaces.

Skins, with `active = !signedOut && !locked && following` unchanged:

| state     | quiet                                                                                  | loud                                                    |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| at rest   | `transparent` · `--fg` · `1px --border-strong`                                         | `--signal` fill · `--fg-on-accent` · `1px --signal`     |
| following | `transparent` · `--signal` · `1px color-mix(in oklab, var(--signal) 55%, transparent)` | unchanged from R2 (14% mix, `--signal` text and border) |
| locked    | `transparent` · `--fg` · `1px --border-strong`                                         | same                                                    |

Three deliberate departures from the prototype, each recorded in READINESS.md:

- **No `pending` skin.** `FollowButton.tsx:60` already documents why: the flip is instant,
  so a spinner would only ever flash, and the optimism lives in `useArtistFollow` in one
  place. R3's `pending` skin and "Following…" label are not implemented.
- **Locked keeps `--fg`**, not the prototype's `--fg-muted`. At quiet weight the locked and
  at-rest skins are otherwise identical but for an 11px glyph, and a paywall that reads
  quieter than the action it gates is the opposite of this pass's intent.
- **`signedOut` keeps the at-rest skin** at either tone, per #794 §3.10.

**Hit overlay.** A transparent `<span aria-hidden>` child, absolutely positioned, on every
control shorter than 44:

```ts
const grow = Math.max(0, (44 - geometry.height) / 2)
// symmetric: the prototype's fixed -6px horizontal inset leaves an icon-only
// 28px square at 40px wide, which misses the target it exists to guarantee
{ position: 'absolute', inset: -grow }
```

Labelled buttons are already wider than 44; only the vertical expansion does work there,
and `inset` covering both axes costs nothing since the horizontal overhang is the button's
own margin. Icon-only and badge are square, so the same expression lands them at exactly
44 × 44.

**Unchanged and load-bearing:** `className="ap-follow"` (the focus ring, which `all: unset`
wipes and no inline style can restore), `aria-pressed` omitted rather than `false` for
dialog triggers, `aria-haspopup` / `aria-expanded` / `aria-describedby`, and the
name-carrying `ARTIST_COPY.followAria(name)` accessible name. The prototype's bare "Follow"
`aria-label` is not adopted — icon-only is precisely where the accessible name is the only
name.

**New optional prop `label?: string`** so the header shortcut in PR-B can render
"Follow all 3" through the same geometry. It overrides the visible text only; the
accessible name still comes from the state.

### 3. Call sites

| File                                         | Change                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artist-page/FollowBlock.tsx:27`             | `size="primary" tone="loud"` — the one canonical filled CTA                                                                                                |
| `artist-page/StickyBar.tsx:69`               | `md` → `row`, quiet                                                                                                                                        |
| `artist-page/EmptyUpcoming.tsx:66`           | `primary` + `loud`. It already owns the page's single live follow via `inlineFollow`, so this is the hero's slot on a page whose hero has no dates to show |
| `search/ArtistResultRow.tsx:190`             | `row` quiet on mobile, `rowWide` quiet on desktop; `iconOnly` below 360                                                                                    |
| `following/bill/BillFollowBlock.tsx:234`     | `md` → `row`, quiet. The `{!locked && …}` guard stays — the bill's gate is the single bulk button, not N locked pills                                      |
| `following/my-shows/ArtistManageRow.tsx:152` | `md` → `rowWide` on the desktop card, `row` on the mobile row, quiet                                                                                       |
| `following/nudge/FollowNudgeCard.tsx:160`    | `primary` + `loud`. Second sanctioned loud: it is a dedicated conversion card and the only follow on its screen                                            |

`FollowNudgeCard` and `EmptyUpcoming` are the two places the plan reads rule 1 as a
per-screen count rather than a literal "only the artist hero". Both are a single
full-width CTA on a screen with no hero present, which is the situation the rule exists to
protect, not one it forbids.

### 4. Skeletons

Both hardcode the control's height with a comment saying they must track it. They do not
track it, and a skeleton that is 20px taller than what replaces it is a layout-shift lie.

- `artist-page/skeletons/Skeletons.tsx:68` — `FollowSkeleton` 48 → 44.
- `app/(protected)/(main)/following/loading.tsx:54` — 44 → 28, width 92 → the row label
  width the quiet pill actually occupies.

### 5. Tests

Existing `FollowButton`, `BillFollowBlock`, `ArtistResultRow` and `ShelfCard` suites are
updated where they assert geometry. New coverage:

- `tone` defaults to `quiet`, and quiet at rest renders no `--signal` background.
- The hit overlay is present and symmetric for every size under 44, absent at `primary`.
- Locked and at-rest render distinguishable skins at quiet weight (the regression this
  plan's third departure exists to prevent).
- The bill renders no per-row control when locked.

---

## PR-B — Bill header shortcut and the shelf badge

### 1. "Follow all N" moves into the header row

Today it is a full-width button below the list (`BillFollowBlock.tsx:250`). It reads as the
section's primary action; it is a shortcut for the rows below it. It moves into the header
row beside "On this bill", at `row` geometry, quiet.

It stays a hand-rolled `.ap-follow` button rather than becoming a `FollowButton`. Its
semantics are an action, not a toggle: `aria-haspopup` when locked, `aria-busy` and
`aria-disabled` while committing, no `aria-pressed`, and `COPY.followAllPendingAria` as the
in-flight accessible name. Only its geometry and skin change, to match the quiet `row`
skin exactly.

The locked shape is unchanged: below Premium the per-row controls stay absent and this
button is the single gate. One paywall, one tap.

At 320px the header holds a title and a "Follow all 3" pill. The title truncates; the pill
does not (`flexShrink: 0`, as everywhere else). Verify at 320.

The act count stays in the header beside the title rather than being displaced by the pill.
It counts the BILL, while the shortcut counts what is left to follow, so on a 3-act bill
with one act already followed the two legitimately read 3 and 2. Dropping it would also lose
the bill's size on every screen where the shortcut is hidden.

The locked and unlocked skins converge, because quiet has exactly one at-rest skin. The lock
glyph is what separates them, as it already is on `FollowButton`. Nothing about the
one-paywall-one-tap shape changes.

**`label?: string` is NOT added to `FollowButton`.** PR-A's section proposed it for this
shortcut; the shortcut stayed hand-rolled, so the prop would ship with no consumer.

### 2. Shelf badge joins the size table

`following/ShelfCard.tsx:232` is a hand-rolled 34px circle — different diameter, different
scrim (`rgba(0,0,0,0.5)` rather than `var(--scrim)`), different border weight (1.5px). It
adopts `badge` (26) and the shared hit overlay, keeping its own on-art treatment
(backdrop blur, the light border that reads against artwork rather than against `--bg`).

The handoff's "30 → 26" row is wrong about this surface — it was never 30. The plan lands
26 regardless; the before number is a documentation error, not a behaviour one.

### 3. Not in scope

The onboarding artist picker. README §Open assumes steps 6–7 use the badge and inherit 26
automatically. `ArtistPickTile` is a selection tile with its own glyph and no
`FollowButton`, so nothing inherits and the flagged collision with the picker's selection
check cannot occur.

---

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` in the worktree before each push.
- Walk both tones across all three themes at 320 / 390 / desktop, with attention to the
  quiet outline on Light — `--border-strong` against `--bg` is roughly 1.5:1 on Dark, below
  WCAG 1.4.11's 3:1 for a non-text boundary. The label carries the affordance so this is
  arguable rather than a failure, but Design flagged the neighbouring case (the 55%-mixed
  `--signal` border on Light) and both want the same look.
- Confirm on a touch device that the shrunken pills still take a fat-thumb tap, and that
  the 6px overhang on search rows does not steal the row's own navigation.

## Not shipping with this

No `releases.ts` entry and no `progress.md` row. This is a visual polish pass on a shipped
control — no new capability, nothing a changelog reader would act on.

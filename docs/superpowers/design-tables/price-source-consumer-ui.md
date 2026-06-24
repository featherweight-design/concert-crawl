# Design Property Table — Price-Source Consumer UI (PR 4 of price-source-discoverability cycle)

Source-of-truth enumeration of every visual + state claim for the consumer-side surfaces shipping in PR 4. Built from `design/design_handoff_price_source_discoverability/` (price-source-mocks.jsx, multi-tier-mocks.jsx, multi-tier.jsx, pending-card.jsx, design-canvas.jsx, theme-context.jsx, README.md, READINESS.md). Closes #641 (price source discoverability) + #644 (multi-tier pricing).

**Scope note:** The shipped components from prior PRs (`MultiTierLiveCard`, `MixedTierCard`, `TierAlternateRow`, `PendingCardB`, `TwoPendingStack`, `PendingTrustPill`, `PendingStarGlyph`, `PendingCheckGlyph`) are NOT re-enumerated here — they live in `multi-tier.jsx` + `pending-card.jsx` from prior cycle. PR 4 reuses them verbatim, sometimes with new props (e.g., `cheapestKind='boxoffice'`, `reports`).

---

## Shared primitives (price-source-mocks.jsx)

### Tier color constants
| Token | Value | Source line |
|---|---|---|
| `TIER.boxoffice` | `oklch(0.66 0.14 78)` (gold) | price-source-mocks.jsx:23 |
| `TIER.resale` | `oklch(0.65 0.20 25)` (coral) | price-source-mocks.jsx:24 |
| `TIER.community` | `oklch(0.62 0.12 240)` (azure) | price-source-mocks.jsx:25 |
| `mix(c, pct, base='transparent')` | `color-mix(in oklab, ${c} ${pct}%, ${base})` | price-source-mocks.jsx:27-28 |

### Mono Eyebrow primitive (price-source-mocks.jsx:31-39)
| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9.5px` |
| letter-spacing | `0.12em` |
| text-transform | `uppercase` |
| font-weight | `700` |
| color | `var(--fg-subtle)` (default; overridable) |

### TierMark helper (price-source-mocks.jsx:42-63)
| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `5px` |
| padding | `2px 7px` |
| border-radius | `4px` |
| background | `mix(color, 14)` |
| border | `1px solid mix(color, 50)` |
| color | tier color (gold/coral/azure) |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9px` |
| letter-spacing | `0.08em` |
| text-transform | `uppercase` |
| font-weight | `700` |
| line-height | `1` |
| white-space | `nowrap` |

When `kind='boxoffice'` AND `glyph={true}`, render the gold star SVG (width=9, height=9, viewBox=`0 0 12 12`, fill=color, path d="M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z").

---

## §1. FaceValueCard (price-source-mocks.jsx:127-198)

The centerpiece of #641. Two-row ladder (resale + box-office ghost) with a `--signal` CTA.

### Outer container (lines 128-132)
| Property | Value |
|----------|-------|
| border-radius | `12px` |
| overflow | `hidden` |
| background | `var(--surface-1)` |
| border | `1px solid var(--border)` |

### Head block (line 134)
| Property | Value |
|----------|-------|
| padding | `14px 14px 10px` |

### Eyebrow text
Default: `"Face value ≠ resale"`. Inherits Eyebrow primitive styling.

### Headline (lines 136-141)
| Property | Value |
|----------|-------|
| margin-top | `7px` |
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `16.5px` |
| color | `var(--fg)` |
| letter-spacing | `-0.02em` |
| line-height | `1.2` |
| text-wrap | `balance` |

Default copy: `"That's resale — not face value."`.
`AfterNoPrice` override: `"All we can see is resale."`.

### Subline (lines 142-148)
| Property | Value |
|----------|-------|
| margin-top | `5px` |
| font-family | `Inter, system-ui` |
| font-size | `12.5px` |
| font-weight | `500` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.5` |

Default copy: `"Only resale tickets left. Know the box-office price? Add it."`.

### Ladder wrapper (lines 152-156)
| Property | Value |
|----------|-------|
| margin | `2px 0` |
| border-top | `1px solid var(--border)` |
| border-bottom | `1px solid var(--border)` |

Inter-row divider (line 162): 1px high, `background: var(--border)`, `margin: 0 14px`.

### Resale LadderRow props
- `kind: 'resale'`
- `sub: ${resaleVendor} · marked up over face`
- `right: resaleRange` (default `"$110–180"`)
- `ghost: false`

### Box-office (ghost) LadderRow props (lines 163-168)
- `kind: 'boxoffice'`
- `sub: 'the printed price · no fees'`
- `right: 'not reported'`
- `ghost: true`

### LadderRow internals (lines 75-118)

**Row container:** `display: flex`, `align-items: center`, `gap: 11px`, `padding: 12px 14px`.

**Tier dot/star wrapper (`<span>`):**
| Property | Value |
|----------|-------|
| width | `18px` |
| height | `18px` |
| flex-shrink | `0` |
| border-radius | `5px` |
| background | `mix(color, ghost ? 10 : 18)` |
| border (ghost=true) | `1px dashed mix(color, 55)` |
| border (ghost=false) | `1px solid mix(color, 45)` |
| display | `inline-flex` |
| align-items | `center` |
| justify-content | `center` |

**Inner glyph:**
- `kind='boxoffice'`: star SVG (width=9, height=9, viewBox=`0 0 12 12`, fill=color, same path d as TierMark)
- `kind='resale'/'community'`: solid dot — width=6px, height=6px, border-radius=50%, background=color

**Label (`<span>`):**
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `13.5px` |
| color (ghost=true) | `var(--fg-muted)` |
| color (ghost=false) | `var(--fg)` |
| letter-spacing | `-0.005em` |
| (truncation) | white-space: nowrap, overflow: hidden, text-overflow: ellipsis |

**Sub (`<span>`):**
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `11.5px` |
| font-weight | `500` |
| color | `var(--fg-subtle)` |
| letter-spacing | `-0.005em` |

**Right value (`<div>`):**
| Property | ghost=true | ghost=false |
|----------|------------|-------------|
| font-family | `'JetBrains Mono', monospace` | `Inter, system-ui` |
| font-weight | `700` | `800` |
| font-size | `9.5px` | `16px` |
| letter-spacing | `0.07em` | `-0.015em` |
| text-transform | `uppercase` | `none` |
| color | `mix(color, 90, var(--fg-subtle))` | `var(--fg)` |
| (common) | text-align: right, white-space: nowrap, flex-shrink: 0 |  |

### CTA wrapper (line 172): `padding: 12px 14px 14px`.

### CTA button (lines 173-181)
| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| box-sizing | `border-box` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |
| gap | `8px` |
| width | `100%` |
| height | `46px` |
| border-radius | `10px` |
| background | `var(--signal)` |
| color | `var(--fg-on-accent)` |
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `14.5px` |
| letter-spacing | `-0.01em` |
| box-shadow | `0 12px 28px -14px var(--signal)` |

Default label: `"Add the box-office price"` (the trailing `→` is the SVG arrow).
`AfterNoPrice` override: `"Add a price you've seen"`.

### CTA arrow SVG (lines 183-186)
width=13, height=13, viewBox=`0 0 16 16`, path d=`M3 8h9M9 4l4 4-4 4`, stroke=`currentColor`, stroke-width=2, stroke-linecap=round, stroke-linejoin=round.

### Caption row under CTA (lines 188-192)
| Property | Value |
|----------|-------|
| margin-top | `9px` |
| text-align | `center` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9px` |
| color | `var(--fg-subtle)` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |

Caption copy: `"Goes live once one more fan confirms"`.

---

## §2. ProvenanceCTA (price-source-mocks.jsx:213-235)

Honest outbound "Get Tickets" button. 3 variants × optional outline.

### Outer wrapper (line 213)
| Property | Value |
|----------|-------|
| display | `flex` |
| flex-direction | `column` |
| gap | `9px` |

### Button — common (lines 214-223)
| Property | Value |
|----------|-------|
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |
| height | `48px` |
| width | `100%` |
| border-radius | `10px` |
| box-sizing | `border-box` |
| text-decoration | `none` |
| white-space | `nowrap` |
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `15px` |
| letter-spacing | `-0.01em` |

### Variant: `kind='boxoffice'` (outline=false)
- Button: `background: var(--signal)`, `border: none`, `color: var(--fg-on-accent)`
- Label: `"Get Tickets ↗"`
- Caption dot: 6×6 circle, background=`TIER.boxoffice` (gold)
- Caption text: `${vendor} · face value, no fees`

### Variant: `kind='primary'` (outline=false)
- Button: same as boxoffice (signal background)
- Label: `"Get Tickets ↗"`
- Caption dot: background=`var(--fg-subtle)`
- Caption text: `Official vendor · ${vendor} · face + fees`

### Variant: `kind='resale'` (outline=true everywhere it's used in compositions)
- Button: `background: transparent`, `border: 1px solid var(--border-strong)`, `color: var(--fg)`
- Label: `"See resale tickets ↗"`
- Caption dot: background=`TIER.resale` (coral)
- Caption text: `${vendor} resale · usually above face value`
- Caption color: `mix(TIER.resale, 92, var(--fg-muted))`

### Caption row (lines 224-233)
| Property | Value |
|----------|-------|
| display | `flex` |
| align-items | `center` |
| gap | `7px` |
| justify-content | `center` |

### Caption text (common across variants)
| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `10px` |
| color | `var(--fg-muted)` (resale variant overrides) |
| letter-spacing | `0.03em` |

---

## §3. SubmitForm — provenance-first reorder (price-source-mocks.jsx:546-614)

The Q1 supporting change. `FormAfter` is the canonical "AFTER" state; `FormBefore` is the baseline for reference.

### FormCard shell (lines 532-541)
| Property | Value |
|----------|-------|
| width | `100%` |
| box-sizing | `border-box` |
| background | `var(--bg-elevated)` |
| border | `1px solid var(--border-strong)` |
| border-radius | `14px` |
| padding | `18px` |
| display | `flex` |
| flex-direction | `column` |
| gap | `16px` |

### Source-category block (line 578) — LEADS THE FORM
- FormLabel `req`: `"Where's this price from?"`
- Chip row: gap 8px, flex-wrap
- Chips:
  - Active: `color={TIER.boxoffice}`, gold star SVG + label `"Box office"`
  - Inactive: `"Standard ticket"`, default color
  - Inactive: `color={TIER.resale}`, label `"Resale"`
- Helper text below chips (line 588): Inter 12px, color `var(--fg-muted)`, line-height 1.5
  - Copy: `"Box office is face value — the most useful number for other fans."`

### Number row (line 592): `display: flex; gap: 12px`.
- NumberField "Face value" (label changes per source): placeholder `"32"`, hint `"the printed price"`
- NumberField "Ceiling": placeholder `"optional"`

### Tier picker (line 596)
- FormLabel `"Tier"` (no required marker)
- Chip row: gap 8px, flex-wrap
- Chips: `[GA, Reserved, VIP, Pit, Lawn]`, default active = `GA`

### Vendor block (lines 603-606) — DEMOTED BUT REQUIRED
- FormLabel `req`: `"Vendor"`
- Chip row: gap 8px, flex-wrap
- Chips: `[Venue, AXS, Ticketmaster]`, default active = `Venue` when source=boxoffice

### `howFound` field
**REMOVED.** Does not render. Locked per spec + memory.

### SourceChip primitive (lines 519-527)
| Property | Value |
|----------|-------|
| padding | `9px 13px` |
| border-radius | `999px` |
| box-sizing | `border-box` |
| border (active) | `1.5px solid ${color}` |
| border (inactive) | `1px solid var(--border-strong)` |
| background (active) | `mix(color, 10)` |
| background (inactive) | `var(--surface-1)` |
| color (active) | `color` (default `var(--signal)`) |
| color (inactive) | `var(--fg)` |
| font-family | `Inter, system-ui` |
| font-size | `13px` |
| font-weight | `600` |
| letter-spacing | `-0.005em` |
| white-space | `nowrap` |
| display | `inline-flex` |
| align-items | `center` |
| gap | `7px` |

### NumberField primitive (lines 500-513)
**Wrapper:** flex column, gap 6px, flex 1.

**Input shell:** `display: flex`, `align-items: center`, `background: var(--surface-1)`, `border: 1px solid var(--border-strong)`, `border-radius: 10px`, `padding: 0 0 0 12px`.

**`$` prefix:** mono 14px, font-weight 700, color `var(--fg-muted)`.

**Value:** flex 1, `padding: 12px`, Inter 16px, font-weight 700, color `var(--fg-subtle)` (placeholder color), letter-spacing `-0.01em`.

**Hint** (when set): Inter 12px, color `var(--fg-muted)`.

### FormLabel primitive (lines 491-495)
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `13px` |
| font-weight | `700` |
| color | `var(--fg)` |
| letter-spacing | `-0.005em` |
| display | `flex` |
| align-items | `center` |
| gap | `6px` |

Required asterisk: `color: var(--accent)`, rendered only when `req` prop true.

---

## §4. MT_ListChip — browse/search collapsed state (multi-tier-mocks.jsx:201-216)

The price chip surface for browse cards. Replaces today's `PriceChip` with same-source-selection-logic-as-detail-headline + gold star when boxoffice.

### Default props
| Prop | Default |
|------|---------|
| price | `25` |
| kind | `'boxoffice'` |
| from | `true` |

### Resolved color (line 202)
| kind | color |
|------|-------|
| `'boxoffice'` | `GOLD_T` (`oklch(0.66 0.14 78)`) |
| `'community'` | `AZ_T` (`oklch(0.62 0.12 240)`) |
| (default — incl. `'resale'`, `'standard'`) | `var(--fg-muted)` |

### Chip container — common (lines 204-208)
| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `6px` |
| padding | `5px 10px` |
| border-radius | `8px` |
| background | `var(--surface-1)` |
| border | `1px solid var(--border)` |

### Variant: kind='boxoffice'
StarGlyph rendered (line 209): `<window.PendingStarGlyph size={10} color={GOLD_T} />`.

### Price label — common (lines 210-213)
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `14px` |
| letter-spacing | `-0.01em` |
| white-space | `nowrap` |
| color (boxoffice) | `GOLD_T` |
| color (community) | `var(--fg)` |
| color (resale / default) | `var(--fg)` |

Format: `from=true` → `from $${price}`; `from=false` → `$${price}`.

---

## §5. MT_AddTierSuccess — submit-success card (multi-tier-mocks.jsx:219-278)

Net-new — submission success with sequential "add another tier" fold-in.

### Outer container (lines 222-226)
| Property | Value |
|----------|-------|
| width | `100%` |
| box-sizing | `border-box` |
| background | `var(--bg-elevated)` |
| border | `1px solid var(--border-strong)` |
| border-radius | `14px` |
| padding | `18px` |
| display | `flex` |
| flex-direction | `column` |
| gap | `14px` |

### Success eyebrow panel (lines 227-232)
| Property | Value |
|----------|-------|
| padding | `16px 14px` |
| border-radius | `12px` |
| background | `color-mix(in oklab, var(--success) 6%, var(--surface-1))` |
| border | `1px solid var(--success)` |
| display | `flex` |
| flex-direction | `column` |
| gap | `8px` |

### Success header row (line 233): flex, align-items center, gap 10px.

### Check glyph circle (lines 234-237)
| Property | Value |
|----------|-------|
| width | `22px` |
| height | `22px` |
| border-radius | `11px` |
| background | `var(--success)` |
| color | `var(--fg-on-accent)` |
| display | `inline-flex` |
| align-items | `center` |
| justify-content | `center` |

Inner CheckGlyph: `<window.PendingCheckGlyph size={12} color="var(--fg-on-accent)" />`.

### Success headline (lines 240-242)
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `15px` |
| color | `var(--fg)` |

Copy: `"GA price is in. Thanks."` (tier label is interpolated).

### Success body line (lines 244-246)
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `13px` |
| line-height | `1.5` |
| color | `var(--fg-muted)` |

Copy: `$25 box office · sits pending · 1/2 until one more fan confirms.`.
The `pending · 1/2` segment is wrapped in `<strong>` with color `AZ_T` (azure).

### "Add another tier" section container (line 249): flex column, gap 8px.

### Section eyebrow (line 250)
Eyebrow primitive copy: `"This show has more than one tier?"`.

### Tier-pill row (line 251): flex, gap 8px, flex-wrap.

### Tier "Add" pill button (lines 252-263)
Rendered per non-submitted tier from the event's tier enum.

| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| box-sizing | `border-box` |
| display | `inline-flex` |
| align-items | `center` |
| gap | `7px` |
| padding | `10px 14px` |
| border-radius | `999px` |
| border | `1px dashed var(--border-strong)` |
| background | `var(--surface-1)` |
| color | `var(--fg)` |
| font-family | `Inter, system-ui` |
| font-size | `13px` |
| font-weight | `600` |

Label format: `+ Add ${tier.toLowerCase()}` (e.g. `+ Add reserved`, `+ Add vip`).

`+` glyph inside pill: font-weight 800, color `var(--signal)`.

### Helper line (lines 265-267)
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-size | `12px` |
| color | `var(--fg-muted)` |
| line-height | `1.5` |

Copy: `"Each tier is its own quick submission — only add the ones you actually saw."`.

### "Done" button (lines 270-275)
| Property | Value |
|----------|-------|
| all | `unset` |
| cursor | `pointer` |
| text-align | `center` |
| height | `44px` |
| border-radius | `10px` |
| border | `1px solid var(--border-strong)` |
| color | `var(--fg)` |
| font-family | `Inter, system-ui` |
| font-weight | `700` |
| font-size | `14px` |
| display | `flex` |
| align-items | `center` |
| justify-content | `center` |

Label: `"Done"`.

---

## §6. MultiSourceMultiTierCard (multi-tier-mocks.jsx:125-159)

Net-new composition for box-office × resale mixed sources across multiple tiers. Entry tier headlines; cross-source resale folds into "Or pay for convenience"; remaining tiers render via shipped `TierAlternateRow`.

### Card container (lines 129-132)
| Property | Value |
|----------|-------|
| border-radius | `12px` |
| background | `var(--surface-1)` |
| border | `1px solid var(--border)` |
| padding | `14px 14px 12px` |

### Eyebrow: `"Tickets"`.

### Headline row (line 136)
| Property | Value |
|----------|-------|
| margin-top | `6px` |
| display | `flex` |
| align-items | `baseline` |
| gap | `8px` |
| flex-wrap | `wrap` |

### "from" word (line 137): Inter 13px, font-weight 600, color `var(--fg-muted)`.

### Price headline `"$20"` (line 138): Inter 28px, font-weight 800, color `var(--fg)`, letter-spacing `-0.025em`, line-height 1.05.

### Tier label `"GA"` (line 139): mono 11px, font-weight 700, color `var(--fg-muted)`, letter-spacing 0.06em, uppercase.

### PendingTrustPill (line 140): shipped `window.PendingTrustPill`, `kind='boxoffice'`.

### Headline meta line (lines 142-144): margin-top 6px, mono 10px, color `var(--fg-muted)`, letter-spacing 0.04em.
Copy: `seen on Venue · face value · no fees`.

### "Or pay for convenience" section (lines 147-151)
- Wrapper margin-top 12px
- Eyebrow: mono 9px, color `var(--fg-subtle)`, letter-spacing 0.06em, uppercase, margin-bottom 2px
- Copy: `Or pay for convenience`
- Then `<AltSourceRow source="Ticketmaster" kind="resale" price={35} />`

### "Other tiers" section (lines 153-156)
- Wrapper margin-top 12px
- Same eyebrow style; copy: `Other tiers`
- Then `<TierAlternateRow tier="VIP" floor={80} vendor="Venue" kind="boxoffice" confirms={2} />` (shipped)

### AltSourceRow (lines 100-115) — net-new sub-component
| Property | Value |
|----------|-------|
| display | `flex` |
| align-items | `baseline` |
| gap | `8px` |
| padding | `8px 0` |
| border-top | `1px dashed var(--border)` |

Kind dot: 5×5, border-radius 2.5px, background matches kind (resale=coral, boxoffice=gold, community=azure, default=`var(--fg-muted)`).
Source label: Inter 12px, font-weight 500, color `var(--fg-muted)`.
Kind pill: mono 8.5px, color matches dot, uppercase, letter-spacing 0.06em.
Price: Inter 12.5px, font-weight 600, color `var(--fg-muted)`. Format: `$${price}`.

---

## §7. Existing surfaces reused (reference only — DO NOT re-enumerate)

These are shipped from prior PRs (`multi-tier.jsx`, `pending-card.jsx`). PR 4 reuses them with possibly-new-prop wiring:

- **MultiTierLiveCard** — entry tier headline + alternates + per-tier confirm tells. PR 4 adds the optional `reports` prop wiring (already in the shipped component, just passed by callers). When `reports > 1`, appends `· N reports` to the meta line. Also: `cheapestKind='boxoffice'` already supported (eng #5).
- **MixedTierCard** — entry tier resolved, alternate tiers pending. Reused verbatim.
- **TierAlternateRow** — per-tier alternate row.
- **PendingCardB** — single-tier pending card. `view='other'` or `view='submitter'`.
- **TwoPendingStack** — stacks two PendingCardBs.
- **PendingTrustPill** — gold/azure/coral trust pill.
- **PendingStarGlyph** — used by MT_ListChip (size=10, color=gold for boxoffice).
- **PendingCheckGlyph** — used by MT_AddTierSuccess (size=12).
- **NoPriceCard** — existing community handoff. Reused as-is; new `FaceValueCard` nests beneath it for the no-price state.
- **SoldOutPriceCard** — existing strikethrough sold-out card. Reused as-is; new `FaceValueCard` + `ProvenanceCTA` REPLACE the disabled `SoldOutCTA` button.

---

## §8. State coverage table

### Event detail page — price-region states

| # | State | Trigger (API field/value) | Components | Key props | Source |
|---|---|---|---|---|---|
| 1 | Live single-tier · box-office headline | `event.status != 'soldout'` AND `priceByTier.length === 1` AND `priceByTier[0].headline.sourceCategory === 'boxoffice'` | `MultiTierLiveCard` (shipped) + `ProvenanceCTA kind='boxoffice'` | `cheapestTier, cheapestFloor, cheapestVendor='Venue', cheapestKind='boxoffice', observedAt, reports, alternates` | README §"Multi-tier pricing"; `MTDetailScreen` |
| 2 | Live single-tier · community headline | `priceByTier.length === 1` AND `headline.sourceCategory === 'standard'` | `MultiTierLiveCard` | `cheapestKind='community'`, vendor name | README §"kind=community vocabulary" |
| 3 | Live single-tier · resale headline (no box-office reported yet) | `priceByTier.length === 1` AND `headline.sourceCategory === 'resale'` AND no boxoffice alternate | `MultiTierLiveCard` (coral) + show-level `FaceValueCard` (invites box-office number) | `cheapestKind='resale'`, FaceValueCard with headline's vendor/range | README §"How #641 and #644 interact" — "no box office yet" |
| 4 | Live multi-tier · box-office cheapest tier headline | `priceByTier.length > 1`, cheapest tier `sourceCategory='boxoffice'` | `MultiTierLiveCard` | `cheapestKind='boxoffice'`, `alternates=[{tier, floor, vendor, kind, confirms}, …]` | `MTDetailScreen`; README §"Display = MultiTierLiveCard / MixedTierCard" |
| 5 | Live multi-tier · mixed sources, cross-source for entry tier | `priceByTier.length > 1` AND entry tier has BOTH a `headline` (boxoffice) AND an `alternates[]` entry whose `sourceCategory='resale'` for the same tier | `MultiSourceMultiTierCard` (net-new) wrapping shipped `TierAlternateRow` + new `AltSourceRow` ("Or pay for convenience") | headline tier props, `AltSourceRow source/kind/price` for cross-source, other-tier rows | README §round-3 #4; `MultiSourceMultiTierCard` |
| 6 | Live tier headline + other tier(s) pending | `priceByTier[a].headline !== null` AND `priceByTier[b].headline === null` AND `priceByTier[b].pending.length > 0` | `MixedTierCard` (shipped) | shipped `pending · N/2` tell per alternate row | README §"MixedTierCard demonstrates per-tier corroboration" |
| 7 | All tiers pending — stacked focused cards | every `priceByTier[i].headline === null` AND `priceByTier[i].pending.length > 0` | `TwoPendingStack` (shipped) — each as `PendingCardB` | `floor, ceiling, tier, vendor, kind, submitter, submittedAt, confirms, needed=2, view='other'/'submitter', note` | `multi-tier.jsx` `TwoPendingStack`; README §round-3 #5 |
| 8 | Pending — viewer IS the submitter | `pending[i].isSubmitter === true` | `PendingCardB view='submitter'` (shipped) | "YOUR SUBMISSION" footer, suppress confirm affordance | shipped `PendingCardB` |
| 9 | Pending — other viewer (can confirm) | `pending[i].isSubmitter === false` | `PendingCardB view='other'` (shipped) | "Saw a different number?" + "Confirm price" footer | README §round-3 #5 |
| 10 | Sold-out with resale available | `event.status === 'soldout'` AND `ticketLinks` has `kind='resale'` entry | `SoldOutPriceCard` (shipped) + new `FaceValueCard` + new `ProvenanceCTA kind='resale' outline` + `ReportFooter` (shipped) | FaceValueCard `resaleRange, resaleVendor`; ProvenanceCTA `kind='resale', vendor, outline=true` | `AfterSoldOut`; README §"The fix — sold-out" |
| 11 | ⚠️ Sold-out with no resale or primary link | `event.status='soldout'` AND `ticketLinks` empty | `SoldOutPriceCard` (shipped) + `FaceValueCard` degraded ("available, above face value", no number) + `ReportFooter` | FaceValueCard degraded variant | README open Q #1 — verify with user |
| 12 | No-price (community handoff) — resale link exists | `priceByTier === null \|\| priceByTier.length === 0` AND `event.status !== 'soldout'` AND `ticketLinks` has resale | `NoPriceCard` (shipped) + new `FaceValueCard` (alt headline + CTA) + `ProvenanceCTA kind='resale' outline` + `ReportFooter` | FaceValueCard `headline='All we can see is resale.'`, `ctaLabel='Add a price you've seen'` | `AfterNoPrice`; README §"The fix — no price" |
| 13 | ⚠️ No-price (community handoff) — no ticket links at all | priceByTier empty AND `ticketLinks` empty | `NoPriceCard` only + community-handoff CTA wired to submit-price modal | — | ⚠️ verify — design doesn't specify whether `FaceValueCard` appears |
| 14 | Outbound CTA · boxoffice (rare, venue sells direct) | `ticketLinks[0].kind='boxoffice'` | `ProvenanceCTA kind='boxoffice'` filled | `vendor='Venue'` per round-3 #2 | `CTAVariants` |
| 15 | Outbound CTA · primary (official vendor) | `ticketLinks[0].kind='primary'` | `ProvenanceCTA kind='primary'` filled | `vendor=<AXS\|Ticketmaster\|SeatGeek\|…>` | `CTAVariants`; SeatGeek stays per round-3 #1 |
| 16 | Outbound CTA · resale only | only resale link in `ticketLinks` | `ProvenanceCTA kind='resale' outline` | `vendor, outline=true` (NOT recommended path) | `ProvenanceCTA`; README §"`<ProvenanceCTA/>`" |
| 17 | **Per-tier counter pending — dispute affordance HIDDEN** | `priceByTier[t].counterSubmission !== null` (any value, regardless of `lastAdminActionKind`) | shipped tier card with the "Saw a different number? Let us know →" entry REMOVED for that tier; counter card surfaces | conditional render guard; `memory:project_pr4_dispute_affordance_hiding` | READINESS §"Eng-side clarifications #1" |
| 18 | **Per-tier counter pending — admin deferred engagement pill** | `priceByTier[t].counterSubmission.lastAdminActionKind === 'defer'` (and `lastAdminActionAt !== null`) | counter card with quiet "Admin requested more info" pill | `lastAdminActionAt`, `lastAdminActionKind` | from `#697`; passive surface added here |
| 19 | Multi-tier reports caption (consensus tell) | `priceByTier[t].reports > 1` | `MultiTierLiveCard` with `reports` prop → "· N reports" appended to meta line | `reports: number` | README §"Ask #3 — within-tier pick cue" |

### Submit-price form — states

| # | State | Trigger | Components | Notes |
|---|---|---|---|---|
| 1 | Initial — provenance-first | modal opened | `FormCard` with source-category picker FIRST | source-chip group `[Box office, Standard ticket, Resale]`, none selected by default per round-2 |
| 2 | source = `boxoffice` selected | user clicks `"Box office"` chip | NumberField label `"Face value"` + hint `"the printed price"`; vendor auto-fills `Venue` | `label='Face value', placeholder='32', hint='the printed price'` |
| 3 | source = `standard` selected | user clicks `"Standard ticket"` chip | NumberField generic label | — |
| 4 | source = `resale` selected | user clicks `"Resale"` chip | NumberField label `"Resale price"` | `label='Resale price'` |
| 5 | Tier picker rendered | source selected | Tier chip row `[GA, Reserved, VIP, Pit, Lawn]` — single-select | active state on default GA |
| 6 | Vendor field — required but demoted | source selected | Vendor chip row, required asterisk; `Venue` chip auto-selected when source=boxoffice | `vendor: Vendor`, required |
| 7 | `howFound` — REMOVED | always | does not render | dropped per spec |

### Submit-success — states

| # | State | Trigger | Components | Notes |
|---|---|---|---|---|
| 1 | First tier submitted | API 201 | `MTAddTierSuccess` | tier label, floor price, sourceCategory, `confirms=1`, `needed=2` |
| 2 | Add-another-tier picker | success state | `MTAddTierSuccess` continues; shows `[+ Add reserved] [+ Add VIP]` etc. for tiers user hasn't submitted | client-side state; verify with `priceByTier` whether to disable |
| 3 | Add-another-tier — chip click | user clicks `+ Add reserved` | reopens submit modal pre-scoped to picked tier | tier locked, other fields cleared |
| 4 | ⚠️ All tiers submitted | every tier has user submission | `MTAddTierSuccess` collapses to `"Done"` only | verify with API |
| 5 | ⚠️ Submit error — duplicate (tier, source) | API 409 | error state in modal | copy not in handoff; eng-owned per READINESS |
| 6 | Submit error — counter race | API 409 because counter filed between page-load and POST | toast: `"Another challenge was just filed — refresh to see it."` | READINESS §"Defensive 409 handling" |

### Browse / search — states

| # | State | Trigger | Components | Notes |
|---|---|---|---|---|
| 1 | List chip — boxoffice headline | event list response cheapest tier `sourceCategory='boxoffice'` | `MT_ListChip kind='boxoffice'` — gold StarGlyph + gold `"from $X"` | `price, kind='boxoffice', from=true` |
| 2 | List chip — community headline | cheapest tier `sourceCategory='standard'` | `MT_ListChip kind='community'` — azure | `price, kind='community', from=true` |
| 3 | ⚠️ List chip — resale-only | cheapest tier `sourceCategory='resale'` AND no boxoffice/standard | `MT_ListChip kind='resale'` — coral | ⚠️ verify intent — mock doesn't show; could be omitted or distinct affordance |
| 4 | List chip — multi-tier collapsed | `priceByTier.length > 1` | `MT_ListChip` with `from=true`, price = cheapest tier's floor | README §"Browse/search collapse to 'from $X'" |
| 5 | ⚠️ List chip — no price | event has no `priceByTier` entries | omitted entirely OR no-price variant | verify with current `PriceChip` behavior |
| 6 | List chip — sold-out | `event.status === 'soldout'` | shipped sold-out chip (out of scope) | existing behavior |
| 7 | **PriceChip browse-card selection parity** | any event with `priceByTier` | `PriceChip` must mirror `pickTierHeadline` / `compareTierRows` from `apps/api/src/lib/price-aggregation/` | flagged as PR 4 sub-task; READINESS §"PriceChip selection parity" |

### Cross-cutting / passive surfaces

| # | State | Trigger | Components | Notes |
|---|---|---|---|---|
| 1 | aria-label on resale outbound | `ProvenanceCTA kind='resale'` | anchor with aria-label carrying caveat | Suggested: `"Buy resale on {vendor} — usually above face value"` |
| 2 | Outbound link semantics | any `ProvenanceCTA` | `<a target="_blank" rel="noopener noreferrer">` | matches shipped pattern |
| 3 | Status reporter (footer) | always | `ReportFooterLink` (shipped) | unchanged from today |

---

## §9. Unknowns / verification needed

1. **State #11 (sold-out, no resale, no primary link)** — design open Q #1: if `ticketLinks` is fully empty, does `FaceValueCard` render at all? Design says it degrades to "available, above face value" with no number — but if no resale link exists either, there's no resale row to anchor.
2. **State #13 (no-price, no ticket links)** — same uncertainty.
3. **Browse #3 (resale-only list chip)** — mock doesn't include a coral chip; verify intent.
4. **Submit-success #2/#4 (add-another-tier picker drive)** — verify whether client tracks "which tiers I just submitted" via local state or re-fetches `priceByTier` after each success.
5. **State #17 dispute-affordance replacement copy** — README doesn't carry the copy; memory note suggests "Confirm this challenge" pointing at the existing `PendingCardB`. Eng locks in plan if README doesn't update.
6. **Engagement pill (#18)** — comes from `#697` admin contest-review track. PR 4 ships the passive consumer surfacing.

These are flagged for plan-time decisions or user approval. None are merge-blocking design ambiguities — implementation defaults are obvious.

---

## §10. File metadata

- Path: `docs/superpowers/design-tables/price-source-consumer-ui.md` (repo-relative)
- Source files (enumerated):
  - `design/design_handoff_price_source_discoverability/price-source-mocks.jsx` — §1, §2, §3, primitives
  - `design/design_handoff_price_source_discoverability/multi-tier-mocks.jsx` — §4, §5, §6
- Source files (reference only, not re-enumerated):
  - `multi-tier.jsx`, `pending-card.jsx`, `design-canvas.jsx`, `theme-context.jsx`, `README.md`, `READINESS.md`
- Section count: 10 (8 visual property sections + 1 state coverage table + 1 unknowns + metadata)
- State coverage: 19 event-detail states + 7 submit-form states + 6 submit-success states + 7 browse states + 3 cross-cutting

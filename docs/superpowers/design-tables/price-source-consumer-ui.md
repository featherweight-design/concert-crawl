# Design Property Table — Price-Source Consumer UI (PR 4 of price-source-discoverability cycle)

Source-of-truth enumeration of every visual + state claim for the consumer-side surfaces shipping in PR 4. Built from `design/design_handoff_price_source_discoverability/` (price-source-mocks.jsx, multi-tier-mocks.jsx, multi-tier.jsx, pending-card.jsx, design-canvas.jsx, theme-context.jsx, README.md, READINESS.md). Closes #641 (price source discoverability) + #644 (multi-tier pricing).

**Scope note:** The shipped components from prior PRs (`MultiTierLiveCard`, `MixedTierCard`, `TierAlternateRow`, `PendingCardB`, `TwoPendingStack`, `PendingTrustPill`, `PendingStarGlyph`, `PendingCheckGlyph`) are NOT re-enumerated here — they live in `multi-tier.jsx` + `pending-card.jsx` from prior cycle. PR 4 reuses them with two kinds of additive extensions: (a) the existing `kind: 'community' | 'boxoffice' | null` enum on `MultiTierLiveCard`, `MixedTierCard`, and `TierAlternateRow` is extended to include `'resale'` so state #3 (resale-headline) can route through `MultiTierLiveCard` with a coral headline; (b) `PendingCardB`, `DisputedPriceCard`, and `SoldOutPriceCard` receive optional additive props (`counterPointer`, `lastAdminActionKind`, `variant`) per the §9 locks in Appendix A — see Task 9 + Task 12. No existing props are removed, renamed, or repurposed.

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

Browse chips reserve tier chrome (dot, tint, accent border) for *marked* tiers only — `boxoffice` (gold) and `resale` (coral, see Appendix A.3). `community` and the default fall back to neutral text; the chrome budget is spent where the source distinction changes how the fan reads the number. Community keeps full azure on the **detail** page (PendingTrustPill) where there's no competing chrome — this is intentional asymmetry, not a bug.

| kind | Browse chip (this component) | Detail surface |
|------|------------------------------|----------------|
| `'boxoffice'` | `GOLD_T` (`oklch(0.66 0.14 78)`) — dot + label | gold pill (PendingTrustPill / FaceValueCard) |
| `'resale'` | coral (`oklch(0.65 0.20 25)`) — see Appendix A.3 for full chrome | coral caption + chrome (PriceBlockB / FaceValueCard) |
| `'community'` | neutral — label `var(--fg)`, no dot, no tinted bg/border (shared with default) | `AZ_T` (`oklch(0.62 0.12 240)`) — PendingTrustPill on detail |
| (default — incl. `'standard'`, `null`) | label `var(--fg-muted)`, no dot, no tinted bg/border | — |

(See PR4-ADDENDUM.md §"Q2" for the markedness rationale and the rejected "tint everything" alternative.)

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
| 11 | Sold-out with no resale or primary link | `event.status='soldout'` AND `ticketLinks` empty | `SoldOutPriceCard` `variant='no-listing'` (degraded — see Appendix A.2) + `ContributeFaceValueCard` (Appendix A.1, replaces `FaceValueCard`) | `SoldOutPriceCard variant='no-listing'`; `ContributeFaceValueCard` (single ghost box-office row + signal CTA, NO resale row, NO outbound ProvenanceCTA) | Locked: Appendix A.1 + A.2 |
| 12 | No-price (community handoff) — resale link exists | `priceByTier === null \|\| priceByTier.length === 0` AND `event.status !== 'soldout'` AND `ticketLinks` has resale | `NoPriceCard` (shipped) + new `FaceValueCard` (alt headline + CTA) + `ProvenanceCTA kind='resale' outline` + `ReportFooter` | FaceValueCard `headline='All we can see is resale.'`, `ctaLabel='Add a price you've seen'` | `AfterNoPrice`; README §"The fix — no price" |
| 13 | No-price (community handoff) — no ticket links at all | priceByTier empty AND `ticketLinks` empty | `NoPriceCard` only + community-handoff CTA wired to submit-price modal | NO `FaceValueCard` / `ContributeFaceValueCard` — pedagogy collapses without a resale anchor | Locked: Appendix A.5 (Q2-eng) |
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
| 4 | All tiers submitted | every tier the user has submitted in this session is in client-side state (no re-fetch); `remainingTiers` array is empty | `MTAddTierSuccess` collapses to `"Done"` only | Locked: Appendix A.5 (Q4-eng — client session state, not API re-fetch) |
| 5 | Submit error — duplicate (tier, source) | API 409 | inline error state in modal | Copy eng-owned per READINESS — not a design ambiguity; resolved via plan copy keys |
| 6 | Submit error — counter race | API 409 because counter filed between page-load and POST | toast: `"Another challenge was just filed — refresh to see it."` | READINESS §"Defensive 409 handling" |

### Browse / search — states

| # | State | Trigger | Components | Notes |
|---|---|---|---|---|
| 1 | List chip — boxoffice headline | event list response cheapest tier `sourceCategory='boxoffice'` | `MT_ListChip kind='boxoffice'` — gold StarGlyph + gold `"from $X"` | `price, kind='boxoffice', from=true` |
| 2 | List chip — community headline | cheapest tier `sourceCategory='standard'` | `MT_ListChip kind='community'` — neutral (label `var(--fg)`, NO azure dot/tint on browse chip; azure reserved for detail surfaces like PendingTrustPill) | `price, kind='community', from=true` — see §4 Resolved color table for markedness rationale |
| 3 | List chip — resale-only | cheapest tier `sourceCategory='resale'` AND no boxoffice/standard | `MT_ListChip kind='resale'` — coral (Appendix A.3) with always-present mono "resale" tag | `price, kind='resale', from=true` — locked per Appendix A.3; tap-through to detail teaches the rest |
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

## §9. Verification status (formerly "Unknowns") — all resolved 2026-06-24

Every open question on this list now has a locked answer. Kept here as a paper trail; the live answer lives in Appendix A.

1. **State #11 (sold-out, no resale, no primary link)** — ✅ Resolved by Appendix A.1 + A.2: `SoldOutPriceCard variant='no-listing'` (price renders as `—`, no strikethrough) + `ContributeFaceValueCard` (single ghost box-office row + signal CTA, no resale row, no outbound ProvenanceCTA).
2. **State #13 (no-price, no ticket links)** — ✅ Resolved by Appendix A.5 (Q2-eng): NO `FaceValueCard` / `ContributeFaceValueCard`. Fall through to legacy `NoPriceCard` only; pedagogy collapses without a resale anchor.
3. **Browse #3 (resale-only list chip)** — ✅ Resolved by Appendix A.3: `MT_ListChip kind='resale'` with always-present mono "resale" tag. Never bare, never hidden.
4. **Submit-success #2/#4 (add-another-tier picker drive)** — ✅ Resolved by Appendix A.5 (Q4-eng): client-side React session state of "tiers I just submitted." Avoids flicker; rare cross-device race is recoverable on next load.
5. **State #17 dispute-affordance replacement copy** — ✅ Resolved by Appendix A.4: pointer link replaces the suppressed dispute link in the same footer slot, mono coral `oklch(0.65 0.20 25)`, copy `"Someone's contesting this — see the counter"` followed by an 11×11 arrow SVG (modeled as separate chrome, NOT embedded in the copy string).
6. **Engagement pill (#18)** — Out of scope, pointer only: passive consumer surfacing of the `#697` admin contest-review engagement signal. PR 4 reads `lastAdminActionKind` and `lastAdminActionAt` from the API; no design decision needed here.

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

---

## Appendix A — Addendum specs (2026-06-24)

Design addendum delivered three targeted answers to the §9 unknowns (Q1 state #11, Q2 browse #3, Q3 state #17). Source files committed in this branch:

- `design/design_handoff_price_source_discoverability/PR4-ADDENDUM.md` — verdicts + rationale
- `design/design_handoff_price_source_discoverability/pr4-addendum-mocks.jsx` — full visual specs (every CSS value)
- `design/design_handoff_price_source_discoverability/PR4 Addendum - 3 open states.html` — HTML preview

Every addition below is a net-new variant of an existing shape — same gold/coral/azure tier vocabulary, same tokens, no new typefaces or tier colors. The shipped components from §1–§7 above are NOT modified.

---

### A.1 — `ContributeFaceValueCard` (NEW component — Q1 verdict)

**Replaces `FaceValueCard` in the §8 state #11 slot** (sold-out + no resale + no primary + no boxoffice). Per the addendum: *"it is NOT a FaceValueCard anymore — what survives is the contribution half."* Modeled as a sibling component, NOT a variant of `FaceValueCard`. Same chrome family (12px border, surface-1, border 1px var(--border)) but only ONE ghost box-office row (no resale row, no outbound CTA).

Source: `pr4-addendum-mocks.jsx:42-113`.

#### Outer container (line 45-48)
| Property | Value |
|----------|-------|
| border-radius | `12px` |
| overflow | `hidden` |
| background | `var(--surface-1)` |
| border | `1px solid var(--border)` |

#### Head block (line 49)
| Property | Value |
|----------|-------|
| padding | `14px 14px 10px` |

#### Eyebrow (line 50)
Inherits Eyebrow primitive styling. Copy: `"Face value"`.

**Note:** differs from `FaceValueCard` which uses `"Face value ≠ resale"`. The comparison framing is dropped because there's nothing to compare to.

#### Headline (lines 51-54)
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

Copy: `"No price to show — yet."`.

#### Subline (lines 55-58)
| Property | Value |
|----------|-------|
| margin-top | `5px` |
| font-family | `Inter, system-ui` |
| font-size | `12.5px` |
| font-weight | `500` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |
| line-height | `1.5` |

Copy: `"Sold out, nothing listed. Know the box-office number? Add it."`.

#### Ladder wrapper (line 62)
| Property | Value |
|----------|-------|
| margin | `2px 0` |
| border-top | `1px solid var(--border)` |
| border-bottom | `1px solid var(--border)` |

#### Box-office ghost row (lines 63-89)
IDENTICAL to the box-office (ghost) `LadderRow` enumerated in §1 of this table (lines 121–172 above):

- **Row container:** `display: flex`, `align-items: center`, `gap: 11px`, `padding: 12px 14px`
- **Tier glyph wrapper:** width 18px, height 18px, border-radius 5px, background `color-mix(in oklab, gold 10%, transparent)`, border `1px dashed color-mix(in oklab, gold 55%, transparent)`, inline-flex centered
- **Inner star SVG:** width 9, height 9, viewBox `0 0 12 12`, fill=gold, path d=`M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z`
- **Label:** Inter 13.5px, font-weight 700, color `var(--fg-muted)`, letter-spacing `-0.005em`. Copy: `"Box office"`
- **Sub:** Inter 11.5px, font-weight 500, color `var(--fg-subtle)`, letter-spacing `-0.005em`. Copy: `"the printed price · no fees"`
- **Right value:** mono 9.5px, font-weight 700, letter-spacing 0.07em, uppercase, color `color-mix(in oklab, gold 90%, var(--fg-subtle))`, text-align right, white-space nowrap, flex-shrink 0. Copy: `"not reported"`

**No resale row.** `FaceValueCard`'s resale row is dropped entirely.

#### CTA wrapper (line 92)
| Property | Value |
|----------|-------|
| padding | `12px 14px 14px` |

#### CTA button (lines 93-105)
IDENTICAL to `FaceValueCard` CTA enumerated in §1 (lines 176–195 above):

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

Label: `"Add the box-office price"`.

#### CTA arrow SVG (lines 102-104)
width=13, height=13, viewBox=`0 0 16 16`, path d=`M3 8h9M9 4l4 4-4 4`, stroke=`currentColor`, stroke-width=2, stroke-linecap=round, stroke-linejoin=round. Same as §1.

#### Caption row under CTA (lines 106-109)
| Property | Value |
|----------|-------|
| margin-top | `9px` |
| text-align | `center` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9px` |
| color | `var(--fg-subtle)` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |

Copy: `"Goes live once one more fan confirms"`.

#### NO outbound `ProvenanceCTA`
`FaceValueCard`'s normal path includes a `ProvenanceCTA` underneath; this state explicitly drops it because there's no link to point at.

---

### A.2 — `SoldOutPriceCard` degraded variant (Q1 sister card — no listing)

Sister component in the Q1 state. The shipped `SoldOutPriceCard` sits ABOVE the new `ContributeFaceValueCard`. In the no-listing scenario the existing card renders a degraded form. Source: `pr4-addendum-mocks.jsx:132-155`.

| Property | Value |
|----------|-------|
| Eyebrow copy | `"Tickets"` (same as shipped) |
| Container | same as shipped — border-radius 12, background `var(--surface-1)`, border 1px `var(--border)`, padding `14px 14px 13px` |

#### Price value (lines 140-143)
Shows `"—"` (em-dash) instead of strikethrough number.

| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `26px` (slightly smaller than shipped's 28px — addendum-specified) |
| color | `var(--fg-subtle)` |
| letter-spacing | `-0.025em` |
| line-height | `1.05` |

#### Sold-out pill (lines 144-148)
Same as shipped — no change:

| Property | Value |
|----------|-------|
| padding | `2px 7px` |
| border-radius | `4px` |
| background | `var(--warning)` |
| color | `var(--fg-on-accent)` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `9px` |
| font-weight | `700` |
| letter-spacing | `0.06em` |
| text-transform | `uppercase` |

Copy: `"Sold out"`.

#### Caption (lines 150-152)
| Property | Value |
|----------|-------|
| margin-top | `9px` |
| font-family | `Inter, system-ui` |
| font-size | `12px` |
| color | `var(--fg-muted)` |
| letter-spacing | `-0.005em` |

Copy: `"No tickets listed anywhere we can see — not even resale."`.

**Implementation note:** best handled as a `variant: 'has-listing' | 'no-listing'` prop on `SoldOutPriceCard` (or `showStrikethrough: boolean` — eng's call). The shipped `SoldOutPriceCard` doesn't currently handle the no-listing case; this is a small additive prop, NOT a separate component.

---

### A.3 — `MT_ListChip kind='resale'` (NEW variant — Q2 verdict)

NEW variant on the existing `MT_ListChip` component enumerated in §4 above. Per the addendum: *"a coral resale chip that ALWAYS carries an explicit 'resale' tag. Never bare, never hidden."*

Source: `pr4-addendum-mocks.jsx:214-234`.

Differs from the §4 `kind='boxoffice'` and `kind='community'` variants in three ways:

1. **Background is coral-tinted** (not generic `var(--surface-1)`)
2. **Border is coral-tinted** (not generic `var(--border)`)
3. **A mono `"resale"` tag is appended after the price** (NON-NEGOTIABLE per the addendum — color alone is too quiet to decode at scan speed)

#### Container (lines 217-222)
| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `7px` (NOTE: 7px, not the 6px used by boxoffice/community variants — addendum tightened the gap to fit the trailing tag) |
| padding | `5px 10px` (same as other variants) |
| border-radius | `8px` (same) |
| background | `color-mix(in oklab, oklch(0.65 0.20 25) 8%, var(--surface-1))` (coral 8% over surface-1) |
| border | `1px solid color-mix(in oklab, oklch(0.65 0.20 25) 34%, var(--border))` (coral-tinted border) |

#### Inner content (in order)

**1. Coral dot** (line 223):
| Property | Value |
|----------|-------|
| width | `6px` |
| height | `6px` |
| border-radius | `50%` |
| background | `oklch(0.65 0.20 25)` (coral) |
| flex-shrink | `0` |

**2. Price label** (lines 224-227):
| Property | Value |
|----------|-------|
| font-family | `Inter, system-ui` |
| font-weight | `800` |
| font-size | `14px` |
| color | `oklch(0.65 0.20 25)` (coral) |
| letter-spacing | `-0.01em` |
| white-space | `nowrap` |

Format: `from $${price}` (when `from=true`) or `$${price}` (when `from=false`).

**3. `"resale"` tag** (lines 228-231) — **NON-NEGOTIABLE; always present on this variant**:
| Property | Value |
|----------|-------|
| font-family | `'JetBrains Mono', monospace` |
| font-size | `8.5px` |
| font-weight | `700` |
| color | `oklch(0.65 0.20 25)` (coral) |
| letter-spacing | `0.08em` |
| text-transform | `uppercase` |
| opacity | `0.95` |

Text: `"resale"`.

**Other variants** (kind='boxoffice', kind='community') keep their existing spec from §4 above — no change.

---

### A.4 — `DisputedPriceCard` footer pointer (Q3 verdict)

Replaces the shipped `"Saw a different number?"` footer link when `counterSubmission !== null` against this price. Per the addendum: *"replace the suppressed link in the same footer slot with a quiet pointer to the live counter."* `Confirm price` button stays UNCHANGED. Net-new chrome = zero — it's a copy swap in the footer slot the dispute link already owned.

Source: `pr4-addendum-mocks.jsx:299-365` (full `DisputedPriceCard withPointer={true}` variant), specifically `:337-345` (the pointer link).

#### Pointer link `<a>` (lines 337-345)
| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `6px` |
| text-decoration | `none` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `10px` |
| color | `oklch(0.65 0.20 25)` (coral — `PR4_TIER.resale`) |
| letter-spacing | `0.04em` |
| text-transform | `uppercase` |
| font-weight | `700` |

**The color is coral** — `PR4_TIER.resale` = `oklch(0.65 0.20 25)`. NOT muted, NOT `var(--fg-subtle)`.

#### Coral dot prefix (line 342)
| Property | Value |
|----------|-------|
| width | `5px` |
| height | `5px` |
| border-radius | `50%` |
| background | `oklch(0.65 0.20 25)` (coral) |

#### Label text (line 343)
`"Someone's contesting this — see the counter"`.

#### Arrow SVG (line 344)
width=11, height=11, viewBox=`0 0 12 12`, path d=`M2.5 6h7M6 2.5l3.5 3.5L6 9.5`, stroke=`currentColor`, stroke-width=1.8, stroke-linecap=round, stroke-linejoin=round.

#### `href` semantics
Points at the counter card on the same page. Implementation can be a fragment anchor (`#counter-<id>`) or an in-page `scrollIntoView` handler. Design did not specify the routing mechanic; eng's call.

#### Confirm price button (lines 352-360)
**UNCHANGED** from the shipped/existing button — same kind background, same Check glyph, same copy.

---

### A.5 — Eng-owned defaults locked in this addendum cycle

Two unknowns from §9 that design does NOT need to specify; eng-owned defaults are locked here for the record:

- **Q2-eng (browse: no-price + no ticket links at all):** fall through to the legacy community-handoff card (existing `NoPriceCard`); NO `FaceValueCard`. Pedagogy collapses without a resale anchor — same logic as Q1.
- **Q4-eng (submit-success add-another-tier picker drive):** client-side session state of "tiers I just submitted in this session." Re-fetching `priceByTier` after each tier-success creates flicker; the rare race (two devices submitting simultaneously) is recoverable on next load. → `MT_AddTierSuccess` uses local React state.

These defaults inform the locked decisions in the plan §9 section.

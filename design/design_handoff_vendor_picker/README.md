# Handoff: Vendor picker — "Where it's listed"

> **⚠️ Read `REVIEW.md` alongside this file.** It carries the engineering verdict and the
> reasoning behind two corrections now folded in here: the stored enum is **PascalCase**
> (no re-case migration), and **SeatGeek sits under Resale**. Every pixel is unchanged.

Issue: vendor list expansion for Submit a Price. Supersedes the 6-chip vendor group in
`design_handoff_phase8_submit_a_price/`. Everything else in that handoff is unchanged.

Canvas: **`Vendor Picker.html`**. Spec artboard at the top of the canvas is the short version of this file.

## The problem

`Where'd you buy it?` is required and offers six presets. For a large share of shows none is true —
**Etix alone covers 107 upcoming shows and isn't in the list**. Fans either abandon the submission or
name a vendor they didn't use, which poisons the vendor field.

## The shape

Closed set of **12**, no free text and no URLs (phishing surface). Vendor stays required.

```
row:      [Venue box office] [AXS] [Ticketmaster] [More… ⌄]
                                                     │
dropdown:  PRIMARY  sold at face value
             Etix · Eventbrite · DICE
           RESALE   priced above face value
             StubHub · SeatGeek · Vivid Seats · viagogo · TicketNetwork
           ─────────────────────────────────────
             Somewhere else            → vendor: "Other"
```

Ordering inside Primary is frequency-first from prod link counts — Etix leads by a wide margin, then
Eventbrite, then DICE (see REVIEW.md §4 for the counts and their denominator). **Resale ordering is
unverified** — no prod frequency behind it; treat as provisional.

## Files

| File | Role |
|---|---|
| `Vendor Picker.html` | Canvas — spec, box-office label table, 320 states, desktop states |
| `vendor-picker.jsx` | **The spec.** Taxonomy, enum map, `SPVendorField`, `VendorListbox`, sheet + popover shells |
| `submit-price-screens.jsx` | Phase 8 form, patched at the vendor field only — diff against the Phase 8 copy |
| `theme-context.jsx` · `landing-screens.jsx` | Tokens + brand marks, unchanged copies |
| `design-canvas.jsx` · `tweaks-panel.jsx` | Canvas scaffolding — **not product** |

## Design decisions

**The fourth control is a chip, not a select.** The form already carries three chip groups; a fourth
labelled field with its own border and 44px height is the thing that breaks it at 320. A chip inherits the
row's shape and wrap behaviour — 320 gets two lines and nothing else changes.

**Selection lands in place.** Picking Etix turns the More… chip into an active `Etix ✕` chip at position
four. The row never grows, and the answer sits with its siblings rather than in a summary line below.
Tapping the label re-opens the list; ✕ clears back to `More…`. At 320 the row is two lines closed and two
lines for most vendors; the longest value (`Somewhere else ✕`) wraps to three. That's the ceiling — and the
reason the fourth control is a chip rather than a fourth labelled field.

**Resale is marked once, in words.** Group header in `--warning` plus a plain-language caption
(*priced above face value*). No per-row pill: five rows under one header don't need it repeated, and pills
would compete with the selected checkmark. This is the only place in the product where we can teach the
face-value/resale distinction at the moment it matters.

**No search.** Nine items, two labelled groups. A filter input costs a keyboard on mobile and buys nothing
at this length. Typeahead covers power users.

**`Other` renders as "Somewhere else"** and does nothing else — selects, closes, submits `vendor: "Other"`.
No prompt, no nudge. An unnamed vendor is a better data outcome than a wrong named one, and the voice
stays ours.

**Surface by width.** Bottom sheet under 520px, anchored popover at or above it. Same `VendorListbox` body
in both — one component, two shells.

## Accessibility

The three pinned chips are a real `role="radiogroup"` labelled by the "Where it's listed" label, each chip
`role="radio"` + `aria-checked`.

The fourth control sits **outside** the radiogroup as a disclosure button — a button can't be a radio.
It carries `aria-haspopup="listbox"` and `aria-expanded`. When it holds a value, its accessible name
carries the state: *"Where it's listed: Etix. Change vendor."* The ✕ is a separate button, *"Clear Etix."*

Dropdown: `role="listbox"` labelled by the sheet title / popover title; each group is a named
`role="group"` so SR announces **"Resale, priced above face value"** on entry; options are `role="option"`
with `aria-selected`.

Keyboard: roving tabindex, ↑ ↓, Home / End, type-to-jump (700ms buffer), Enter or Space commits and closes,
Esc closes and returns focus to the trigger. Sheet is `role="dialog"` `aria-modal="true"` — trap focus in
production; the prototype does not.

Popover **must flip above the trigger on collision** — the vendor field sits low in the desktop form.
The prototype exposes this as a `placement` prop rather than measuring; production should measure.
The popover anchors to the **More… chip**, right-aligned to it so a 268px panel stays inside the 520px
form column; left-align it only if the trigger has room.

## Box-office label

The vendor string renders three ways today: `Venue`, `Venue box office`, `{venue} Box Office`.
Unified to **`Venue box office`**, everywhere a *vendor* is named — submit chip, submission list, dispute
form, price block rail label, price block alternates. Interpolating the venue name made one vendor look
like four and broke truncation at 320.

**One exception.** The TrustMark pill on Event Detail keeps its lowercase `box office`. That pill names a
*tier*, not a vendor — same word, different job. Only the vendor string unifies.

## Data contract

`vendor` is an enum. The display string is copy and can be re-worded without a migration.

| Display | Stored | Group |
|---|---|---|
| Venue box office | `VenueBoxOffice` | pinned |
| AXS | `AXS` | pinned |
| Ticketmaster | `Ticketmaster` | pinned |
| Etix | `Etix` | primary |
| Eventbrite | `Eventbrite` | primary |
| DICE | `DICE` | primary |
| StubHub | `StubHub` | resale |
| SeatGeek | `SeatGeek` | resale |
| Vivid Seats | `VividSeats` | resale |
| viagogo | `Viagogo` | resale |
| TicketNetwork | `TicketNetwork` | resale |
| Somewhere else | `Other` | catch-all |

`vp_isResale(name)` is scoped to the picker's own group rendering — the price block derives its trust mark
from `sourceCategory`, not from the vendor string (REVIEW.md §2). Server validates against the enum;
anything else is a 422. Validation copy is unchanged:
**"Pick where it's listed."**

No migration of existing values: the six shipped values keep their casing, and the six new ones are a pure
`ALTER TYPE ... ADD VALUE` expansion.

## Open / flagged

- Resale group ordering is unverified. Revisit once submissions land.
- The dispute form's vendor chip group still renders the flat list. It should adopt `SPVendorField`
  verbatim — same component, `surface="sheet"` — but wasn't in this pass's scope.

# Engineering review — Vendor picker handoff

Reviewed 2026-07-25 against `packages/db/src/schema/prices.ts`, `packages/types/src/index.ts`,
prod `price_submissions` / `events.ticket_url`, and in-flight PR #1200.

**Verdict: build it.** The interaction design, a11y spec, and 320px reasoning are all sound and
need no further design round. Four corrections below are engineering-side; none change the shape,
the taxonomy, or any pixel.

Every correction below has been folded back into `README.md`, `vendor-picker.jsx` and the canvas, so
those files now read as the corrected spec. This document is the record of *why* they read that way.

---

## 1. Don't re-case the enum — blocking, but cheap to drop

`vendor-picker.jsx`'s `VENDOR_ENUM` mapped every display string to a snake_case slug (`AXS` → `axs`,
`Ticketmaster` → `ticketmaster`, `DICE` → `dice`, …). The README frames this as free —
*"the display string is copy and can be re-worded without a migration"* and *"Migration: existing
rows storing `Venue` map to `venue_box_office`. No other value changes."*

Both claims are inaccurate against the shipped schema:

- The stored enum is PascalCase — `submissionVendorEnum` is
  `['AXS','Ticketmaster','SeatGeek','DICE','Eventbrite','VenueBoxOffice']`. The proposed map
  changes **all six**, not one.
- **No row has ever stored `Venue`.** `Venue` was only ever a display label; the stored value is
  `VenueBoxOffice`. The named migration is a no-op against a value that doesn't exist.

Prod has 14 price submissions total (`AXS` 11, `Ticketmaster` 3) and zero `VenueBoxOffice` rows,
so the data migration itself is trivial. The cost isn't the rows — it's that re-casing touches the
Postgres enum type, the `Vendor` TS union, `KNOWN_VENDOR_HOSTS`, the legacy `kindFromVendor`
fallback, both submit forms, and the admin surfaces, and delivers nothing a fan can see.

**Resolution:** keep the existing convention and add the six new values as
`Etix`, `StubHub`, `VividSeats`, `Viagogo`, `TicketNetwork`, `Other`. Display strings stay exactly
as designed — `Vivid Seats`, `viagogo`, `Somewhere else` are copy and map cleanly. No migration.

## 2. `vp_isResale` must not reach the price block — blocking

README's *Data contract* section stated: *"`vp_isResale(name)` is exported so the price block can tag a resale submission
without re-deriving the set."*

This would reintroduce the exact bug PR #1200 is open to fix. The trust mark on the price card is
derived from `sourceCategory` — the submitter's own "Where's the price from?" answer — precisely
because the vendor string never carried that meaning. Deriving it from the vendor again means a
fan who picks `StubHub` + *box office* gets overridden by the vendor name, and #1200 ships a test
asserting the opposite.

**Resolution:** `vp_isResale` stays scoped to the picker's own group rendering. The price block
keeps reading `sourceCategory`. The two axes stay separate.

## 3. Move SeatGeek to Resale

Design flagged this themselves as *"the one placement that will read wrong to a fan who knows the
market."* Agreed, and the price-kind logic already takes that position: `kindFromVendor` maps
`SeatGeek → 'resale'`, and `resolveSourceKind` returns `'resale'` for a `seatgeek` source. Leaving it
under *Primary · sold at face value* puts the picker in direct contradiction with the fallback logic
behind it.

Link classification disagrees — `host-rules.ts` files `seatgeek.com` under `KNOWN_VENDOR_HOSTS`,
not `KNOWN_RESALE_HOSTS` — so the codebase is genuinely split on this. The picker follows the
price-kind side, because that's the axis a fan reads a trust mark from. Worth noting that the four
hosts in `KNOWN_RESALE_HOSTS` are exactly StubHub, Vivid Seats, viagogo, and TicketNetwork, which
independently confirms the rest of the Resale group.

It's a copy change, no migration, and it resolves the flag rather than shipping it.

## 4. Link-count figures are directionally right, denominators differ

README cites Etix 107 / Eventbrite 33 / DICE 22. A fresh sweep of `events.ticket_url` gives
Etix 237, Ticketmaster 245, AXS 448 (three subdomains), Eventbrite 2, DICE 0. Different
denominator — upcoming-only vs. all rows, ticket links vs. the flat URL column.

Doesn't change the ordering decision (Etix first under either), but the specific counts shouldn't
be quoted forward as-is. **Etix outranking Eventbrite by ~100:1 rather than ~3:1 makes the case
for this ticket stronger, not weaker.**

---

## 5. The "Where'd you buy it?" flag is already stale

README's Open/flagged list asks us to settle *"the live question reads 'Where'd you buy it?'; the
design label is 'Where it's listed.'"* That's resolved — `copy.ts` already reads
`"Where it's listed *"`, with the error string `"Pick where it's listed."` to match. Nothing to
decide; the design label and the shipped label are the same string.

---

## Accepted as designed

- **"Where it's listed" replacing "Where'd you buy it?"** — correct. The old question only works
  for a fan who actually bought, which collides with the existing `saw_listing` source option.
- **Text-free `Other`.** Consistent with the Phase-8 anti-abuse decision; an unnamed vendor beats a
  wrong named one.
- **Chip-not-select for the fourth control**, selection landing in place, resale marked once in
  words, no search, sheet-under-520 / popover-at-or-above.
- **Box-office label unified to `Venue box office`**, with the TrustMark pill keeping lowercase
  `box office` as a tier name. PR #1200 already landed this half.

## Implementation notes

- `display: contents` on the `role="radiogroup"` wrapper in `SPVendorField` — verify the
  radiogroup survives in the a11y tree. Browsers historically dropped `display:contents` nodes;
  fixed in current Chrome/Safari/Firefox, but assert it in the component test rather than assume.
- Sheet needs a real focus trap and a portal; the prototype has neither by its own admission.
- Popover must **measure** for collision and flip, not take `placement` as a prop.
- The dispute form (`CounterSubmitSheet`) still renders the flat six. Two forms writing the same
  column from different vendor sets is a data-quality problem, not just an inconsistency —
  filed as a follow-up rather than folded into this build.

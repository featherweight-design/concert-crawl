# Ticket Pricing Strategy

**Status:** Scoping — not yet scheduled into a phase

---

## Problem

Venue websites rarely display ticket prices — they redirect to ticket sellers (Ticketmaster, AXS, Eventbrite, etc.). Price visibility is part of Concert Crawl's value proposition, so we need a reliable, ethical way to surface it.

Complication: prices fluctuate over time. This is both a problem (accuracy) and an opportunity (price movement as a signal).

---

## Recommended Approach

### Primary: Ticketmaster Discovery API

- Free tier: 5,000 calls/day
- Returns structured `priceRanges` (min/max) per event
- After the crawler finds an event, make a secondary lookup by name + date + venue
- Store min price + timestamp with the event record
- Re-fetch daily to track drift

**Coverage gap:** TM Discovery only covers Ticketmaster/Live Nation inventory. It does **not** cover AXS.

### AXS Gap — Critical for Denver

AXS is a direct competitor to Ticketmaster (owned by Oak View Group). **Red Rocks and Ball Arena both use AXS**, so TM-only would miss two of Denver's highest-profile venues.

- AXS has a partner API but it requires application and approval — not publicly accessible
- Fallback for AXS events: show no price rather than wrong data; link directly to AXS event page

### Long tail (small/independent venues)

~20–30% of smaller venues use Eventbrite, See Tickets, or sell at the door. Fall back to showing no price for these — honesty over false precision.

Songkick's partner API covers some of this tail but requires approval and isn't free.

---

## Price Movement Signal (Differentiator)

Store price snapshots from day one even before displaying history. Once enough data accumulates, surface:

- "Started at $35, now $55" — price drift
- "Price up" / "Price down" badge
- "On sale" when `priceRanges` first appears

This is signal no other Denver calendar shows.

---

## Implementation Notes

- Store `price_min`, `price_max`, `price_currency`, `price_source` (enum: `ticketmaster | axs | eventbrite | none`), `price_fetched_at` on the events table
- Separate price-fetch job from the main crawler — different cadence, different failure modes
- Price fetch failures should not fail the event record; price is enrichment, not core data

---

## Open Questions

1. Can we get AXS partner API access? Worth applying once we have a live product.
2. Should price polling be a separate scheduled job or piggyback on the daily crawl?
3. What's the display treatment for "no price available"? (Hide the field vs. "Check tickets"?)

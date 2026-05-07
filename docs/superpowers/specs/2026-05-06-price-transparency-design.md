# Price Transparency Design

**Date:** 2026-05-06
**Status:** Approved
**Scope:** Tiered price retrieval pipeline, UX transparency layer, community cred system, admin price dashboard

---

## Problem

Concert Crawl's `ticketPriceMin` / `ticketPriceMax` fields exist in the DB but are never populated. Users see "tba" for every event. AXS — the dominant Denver ticketing platform — has no public API and uses active bot detection, creating a structural gap for the most common event type. This feature closes that gap through a tiered pipeline, honest UX, and a community fallback system.

---

## Goals

1. Populate price data for as many events as possible without paying for data.
2. Be transparent with users about where prices come from and why gaps exist.
3. Build community trust by naming constraints (AXS) rather than hiding them.
4. Create a traceable, admin-visible system so pipeline health is always knowable.
5. Lay the architectural groundwork for a community rep program post-beta.

---

## Non-Goals

- Real-time price tracking or price-drop alerts (future feature).
- AXS scraping or API reverse engineering (ToS violation, brittle, legal risk).
- Automated box office calling (considered and rejected — see Appendix).
- Rep tier implementation (architecture only; built post-beta with real cred data).

---

## Data Model Changes

### `venues` table

Add `price_url` (text, nullable): the venue's own ticketing/event page where structured price data (JSON-LD, microdata) may be embedded — distinct from `ticket_url`, which points to the purchase page. Example: Red Rocks uses an RMPCO page with JSON-LD before handing off to AXS.

### `events` table

Add `price_source` (enum, nullable): tracks which pipeline tier populated the price fields.

```sql
CREATE TYPE price_source AS ENUM (
  'structured_data',   -- JSON-LD/microdata from venue's priceUrl
  'ticketmaster',
  'eventbrite',
  'dice',
  'songkick',
  'bandsintown',
  'seatgeek',          -- secondary/resale market
  'community'          -- user-submitted, corroborated
);
```

Existing fields `ticket_price_min` / `ticket_price_max` (numeric 10,2) are populated by the pipeline. No schema change needed there.

### `price_retrieval_log` table (new)

Logs every pipeline attempt for traceability and source health monitoring.

```
event_id         uuid references events
venue_id         uuid references venues
source           price_source
outcome          enum: hit | miss | error
latency_ms       integer
error_message    text nullable
attempted_at     timestamptz default now()
```

Indexed on `(venue_id, source, attempted_at)` for per-venue success rate queries.

### `price_submissions` table (new)

Stores community-submitted prices.

```
id               uuid pk
event_id         uuid references events
user_id          text (Clerk user ID)
price_min        numeric(10,2)
price_max        numeric(10,2) nullable
tier_label       text nullable  -- e.g. "GA", "Reserved"
source_note      text nullable  -- e.g. "box office", "just bought"
status           enum: pending | corroborated | disputed | stale
corroboration_count  integer default 0
created_at       timestamptz default now()
updated_at       timestamptz default now()
```

---

## Price Retrieval Pipeline

Runs during the nightly crawl (3 AM MT) and on-demand when a new event is created. Executes in order, stops on first hit. Cheapest tier first.

### Tier 1 — Venue structured data (free)

Fetch `venue.price_url`. Parse JSON-LD (`application/ld+json`) and microdata for `schema.org/Offer` price fields. This runs before any external API call. Expected hit rate: moderate for venues that control their own pages (e.g. Bluebird, Ogden); low for full AXS-managed venues.

### Tier 2 — Ticketmaster Discovery API (free, 5,000 req/day)

Query by event name + date + venue. Map `priceRanges[].min` / `max`. Free tier is sufficient for daily crawl volume. Source: `ticketmaster`.

### Tier 3 — Eventbrite + Dice.fm APIs (free tiers)

Run in parallel. Eventbrite covers independent and mid-tier shows well. Dice.fm covers electronic/DJ events. Both have public search APIs. Source: `eventbrite` or `dice`.

### Tier 4 — Songkick + Bandsintown APIs (free, sparse)

Run in parallel. Coverage is inconsistent but occasionally returns AXS event prices. Worth including for marginal wins at zero cost. Source: `songkick` or `bandsintown`.

### Tier 5 — SeatGeek API (free, 5,000 req/day; secondary market)

Last automated tier. SeatGeek aggregates resale listings. Always labeled as resale in the UI — never presented as face value. Source: `seatgeek`.

### Tier 6 — Community submissions

If no tier returns a price and corroborated community submissions exist, surface the community median. Source: `community`.

### Pipeline behavior

- Each tier's attempt is logged to `price_retrieval_log` regardless of outcome.
- A source that has missed every attempt for a given venue for 30+ days is auto-flagged in admin.
- Rate limiting: Ticketmaster and SeatGeek are capped at their free tier limits; pipeline respects per-domain delays consistent with crawl ethics rules.

---

## UX / Transparency Layer

UI implementation details are intentionally left for Claude Design to mock. This section captures intent and constraints.

### Price display with attribution

When a price is available, the source is labeled beneath the price — small, muted, secondary. Label format per source:

| Source            | Label                                               |
| ----------------- | --------------------------------------------------- |
| `structured_data` | "From [venue name]"                                 |
| `ticketmaster`    | "From Ticketmaster"                                 |
| `eventbrite`      | "From Eventbrite"                                   |
| `dice`            | "From Dice.fm"                                      |
| `songkick`        | "From Songkick"                                     |
| `bandsintown`     | "From Bandsintown"                                  |
| `seatgeek`        | "From SeatGeek · resale prices"                     |
| `community`       | "Community reported · [N] submissions · [time ago]" |

SeatGeek always carries the "resale prices" qualifier. Community submissions include a tooltip: "Prices submitted by Concert Crawl community members. Not verified by venue."

### No-price states (brand transparency)

| Situation                     | Display message                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Generic miss (no price found) | "Price not yet available"                                                                   |
| AXS venue, no price found     | "AXS doesn't share pricing publicly — check back closer to the show or call the box office" |
| AXS venue + SeatGeek result   | "[price] · From SeatGeek (resale) — AXS doesn't list face value publicly"                   |

The AXS messaging is intentional brand personality: name the constraint, don't hide it, position Concert Crawl as the user's advocate. This is not a failure state — it's honest communication.

### Community price submission

When no authoritative price exists, users see a submission prompt on the event detail page. For AXS events the prompt is directed: "AXS doesn't publish pricing. Know what face value tickets cost? Submit a price →"

Submission form: floor price (required), ceiling price (optional), tier label (optional), source note (optional).

---

## Community Cred System

### Earning cred

- Submitting a price: no cred awarded at submission time.
- First corroboration (another user independently submits within ±15% within 7 days): +10 cred.
- Each additional corroboration on the same submission: +2 cred (diminishing returns).
- Disputed submissions (conflicts with majority range): flagged, no cred until resolved.

Cred accumulates over account lifetime and never resets. It is a single integer score — no tiers, no badges during beta.

### Corroboration and dispute logic

- **Corroborated:** ≥2 independent submissions within ±15% of each other within 7 days.
- **Disputed:** majority of submissions conflict with a submission's range. Admin can resolve manually or majority-rule kicks in at 5+ submissions.
- **Stale:** any submission older than 30 days past the event date is auto-marked stale.

### Cred visibility

- Cred score shown on user profiles (public).
- Shown in the admin submission queue alongside each submission.
- Leaderboard in admin for identifying high-cred users (future rep candidates).

### Rep tier (architecture only — not built until post-beta)

A configurable cred threshold (initial estimate: 500) will unlock "Rep" status. Reps receive free Concert Crawl access, a "Rep" profile label, and optional manual assignment to venues as native promoters. The `user_roles` table already supports this via permission scoping — no schema changes needed. Rep tier is not implemented during beta; the threshold should be calibrated against real cred accumulation data.

---

## Admin Price Dashboard

Lives as a dedicated tab within the existing admin section. Designed for a power user (the admin) with multi-admin access in mind. Should be cohesive with the rest of the application — structured, intuitive, no fluff.

### Views

**Pipeline health**

- Per-source × per-venue success rate table (hit %, last attempt, streak of failures)
- Auto-flagged sources (30+ day miss streak) with disable action

**Retrieval log**

- Last 100 attempts: source, outcome (hit/miss/error), latency, event ID, timestamp
- Filterable by source and outcome

**Coverage summary**

- "X% of upcoming events have price data" broken down by source
- Trend over time (last 30 days)

**Community submissions**

- Queue: new submissions with corroboration counts and dispute flags
- Bulk actions: approve, dispute, mark stale
- Top contributors: leaderboard of highest-cred users

---

## Appendix: Automated Box Office Calling (Considered, Rejected)

**Idea:** Use Bland.ai or Twilio + voice LLM to call venue box offices and ask for ticket prices.

**Why rejected:**

1. Box office hours (10 AM–6 PM) conflict with the 3 AM crawl schedule — requires a separate daytime job.
2. Hold times are unpredictable; automated calls can't wait 20 minutes.
3. IVR menus vary by venue and are brittle to automate reliably.
4. Cost per call (Twilio + LLM inference) is high relative to a community submission.
5. Repeated automated calls are legally gray and get numbers blocked.
6. Quality equivalent to a single corroborated community submission.

**Redirect:** The cred system's directed prompt ("AXS doesn't publish pricing. Call [box office number] and submit the price.") achieves the same outcome with zero infrastructure cost and human judgment in the loop.

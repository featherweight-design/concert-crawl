# Design Handoff — Price Transparency UI

**Date:** 2026-05-07  
**Feature:** Price Transparency (PR #32)  
**Scope:** Consumer-facing price display + community submission, EventCard price badge, Admin price dashboard  
**Status:** API/pipeline complete. UI awaits design sign-off before implementation is finalized.

---

## Context

Concert Crawl runs a 6-tier price pipeline (structured data → Ticketmaster → Eventbrite/Dice → Songkick/Bandsintown → SeatGeek → community corroboration). We store `ticketPriceMin`, `ticketPriceMax`, and `priceSource` on every event. The source matters because:

- SeatGeek prices are **resale** (always higher than face value)
- AXS venues **never publish pricing** publicly — we need to surface that gracefully and invite community submissions
- Community submissions are **unverified** — trust level must be communicated

The PR #32 implementation is functionally correct but was built without a design handoff. The four areas below need design treatment to match the design system before merging.

---

## Design System Reference

| Token                 | Value (Electric theme)                     |
| --------------------- | ------------------------------------------ |
| `--color-fg`          | `#f5f5f5` (primary text)                   |
| `--color-fg-muted`    | `#a1a1aa` (secondary/meta text)            |
| `--color-signal`      | `#f97316` (orange — primary action/accent) |
| `--color-bg`          | `#0a0a0a`                                  |
| `--color-bg-raised`   | `#141414` (card surfaces)                  |
| `--color-border`      | `#27272a`                                  |
| `--color-destructive` | red-ish (error states)                     |
| `--radius`            | `0.5rem`                                   |

Typography: Inter. JetBrains Mono for numeric/monospace values.  
Component library: shadcn/ui (Radix primitives).  
Icon set: Lucide.

---

## Area 1 — `PriceDisplay` (Event Detail Page)

### Location

`apps/web/src/components/consumer/PriceDisplay.tsx`  
Rendered on `/events/[id]` — the main event detail page.

### Current behaviour (functional, unstyled)

- If price available: renders `$35–$75` in medium-weight text with a small source attribution line below (`From Ticketmaster`, `Community reported`, etc.)
- If SeatGeek + AXS venue: adds `(resale)` inline and a second line: "AXS doesn't list face value publicly"
- If AXS, no price: renders a muted paragraph explaining AXS doesn't share pricing and to call the box office
- If no price at all: renders "Price not yet available" in muted text

### Design intent

1. **Price range** — should be prominent but not overwhelming. Not an `<h1>`, more like a secondary metric. Suggest: `text-2xl font-bold font-mono` with `--color-fg`.
2. **Source attribution** — very low visual weight. `text-xs text-fg-muted`. Should NOT link anywhere.
3. **Resale callout** (SeatGeek) — an inline badge or subtle chip reading "resale" in `--color-signal` or a muted amber. Do NOT use `--color-destructive` (not an error). Suggest: small rounded badge, amber/warning tone.
4. **AXS no-price explanation** — should feel like a helpful note, not an error. Muted italic or a light info box (no red). Could include a small `Info` icon from Lucide.
5. **Community reported** — needs a trust signal. Current code just says "Community reported" in muted text. Could add a `Users` or `HelpingHand` Lucide icon inline. Consider a tooltip on hover: "Prices submitted by Concert Crawl community members. Not verified by venue."

### States to design

| State                           | Content                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| Has price, verified source      | `$35–$75` + `From Ticketmaster`                             |
| Has price, SeatGeek (non-AXS)   | `$35–$75` + `From SeatGeek` + resale badge                  |
| Has price, SeatGeek + AXS venue | `$35–$75` + resale badge + AXS explanation note             |
| Has price, community            | `$35–$75` + community icon + "Community reported" + tooltip |
| AXS venue, no price             | Explanation note (helpfully phrased, no price shown)        |
| No price available              | "Price not yet available" muted                             |

### Deliverables

- Component spec or annotated mockup for all 6 states above
- Exact Tailwind/token class assignments for each text node
- Decision on resale badge color/style

---

## Area 2 — `PriceSubmissionForm` (Event Detail Page)

### Location

`apps/web/src/components/consumer/PriceSubmissionForm.tsx`  
Rendered below `PriceDisplay` on `/events/[id]`.

### Current behaviour (functional, unstyled)

- **Unauthenticated:** renders "Sign in to submit a price." with underlined sign-in link — collapses to a one-liner.
- **AXS prompt:** "AXS doesn't publish pricing. Know what face value tickets cost? Submit a price →"
- **Default prompt:** "Know the ticket price? Help the community."
- Form fields: Floor price (required, number), Ceiling price (optional, number), Tier label (e.g. "GA"), Source note (e.g. "box office")
- Submit states: idle → submitting → success ("Thanks! Your submission is pending corroboration.") / error ("Something went wrong. Try again.")

### Design intent

This form should feel **community-adjacent** — inviting, not bureaucratic. Think: a small inline widget, not a full form panel.

1. **Prompt text** — should read as an invite, slightly warmer tone than body copy. Suggest pairing with a small `MessageCircle` or `DollarSign` Lucide icon.
2. **AXS prompt** — deserves slightly more emphasis since AXS is a known coverage gap. Could be a callout box with an `AlertCircle` icon rather than inline text.
3. **Form layout** — Floor/Ceiling prices in a two-column row (equal width). Tier + Source below, stacked. Fields are compact (`h-8`).
4. **Submit button** — full-width or right-aligned? Suggest right-aligned with `variant="default"` (signal color fill on Electric theme).
5. **Success state** — positive confirmation. Could add a `CheckCircle` icon in green. Currently just muted text.
6. **Auth gate** — the "Sign in to submit" one-liner is fine but should feel cohesive with the surrounding section. Make the sign-in link `--color-signal`.

### States to design

| State                         | Content                                     |
| ----------------------------- | ------------------------------------------- |
| Unauthenticated               | "Sign in to submit a price." (sign-in link) |
| AXS event, authenticated      | AXS callout prompt + form                   |
| Standard event, authenticated | Default prompt + form                       |
| Submitting                    | Button disabled/loading                     |
| Success                       | Confirmation message + icon                 |
| Error                         | Error message, form remains editable        |

### Deliverables

- Annotated mockup or component spec for all 6 states
- Exact field layout and spacing (gap, padding)
- Decision on button placement and variant
- AXS prompt treatment (inline vs callout box)

---

## Area 3 — EventCard Price Badge

### Location

`apps/web/src/components/consumer/event-card/EventCard.tsx`  
Appears in the main event list (`/events` browse page). EventCards are compact list rows.

### Current behaviour (functional, unstyled)

When an event has price data, the card renders:

- A price string `$35` (floor only) using `text-fg-muted text-sm` — **same style as venue/time meta**
- Optionally a small badge: `resale` (SeatGeek) or `community` (community source) using shadcn `Badge`

### Design intent

The price in a card is **secondary information** — venue, artist, and date are primary. Price should not dominate.

1. **Price text** — keep `text-sm text-fg-muted` or differentiate slightly with a lighter weight monospaced format (JetBrains Mono `text-xs`). Should NOT be the same style as the artist name.
2. **Resale badge** — needs a visual style distinct from `cancelled` (destructive) and `postponed` (secondary). Suggest: amber/warning variant — not built into shadcn by default. Possible: `bg-amber-500/15 text-amber-400 border-amber-500/30` or use `--color-signal` at reduced opacity.
3. **Community badge** — should feel softer/lighter than resale. Suggest: `bg-fg-muted/10 text-fg-muted border-fg-muted/20`.
4. **No price** — nothing is shown. This is correct — don't add a placeholder.
5. **Layout slot** — where does the price live in the card row? Currently appended to the meta line (venue · time · price). Is this the right slot, or should price get a dedicated trailing column?

### States to design

| State                  | Badge                                |
| ---------------------- | ------------------------------------ |
| No price data          | Nothing rendered                     |
| Verified price (`$35`) | Price text only, no badge            |
| SeatGeek price         | Price text + amber `resale` badge    |
| Community price        | Price text + muted `community` badge |

### Deliverables

- Annotated EventCard showing price slot position
- Badge color/style spec for `resale` and `community` variants
- Typography spec for price text (font family, size, weight, color)

---

## Area 4 — Admin Price Dashboard (`/admin/prices`)

### Location

`apps/web/src/app/(protected)/admin/prices/page.tsx`  
Admin-only. Accessible from admin sidebar via "Prices" nav link.

### Current behaviour (functional, unstyled)

Four-tab layout using shadcn Tabs:

**Tab 1 — Pipeline Health**

- Alert banner when sources are auto-flagged (no hits in 30+ days)
- Table: Venue ID | Source | Hit Rate (e.g. "72% (36/50)") | Last Attempt

**Tab 2 — Retrieval Log**

- Table: Source | Outcome (`hit` / `miss` / `error`) | Latency (ms) | Attempted (MT timestamp) | Error message

**Tab 3 — Coverage**

- Large percentage: `XX%`
- Subtitle: "N of M upcoming events have price data"

**Tab 4 — Submissions**

- Table: Event ID | Price | Status (`pending` / `accepted` / `rejected`) | Corroborations | Submitted (timestamp)

### Design intent

This is an **internal admin tool** — dense data is acceptable. But it should still feel coherent with the rest of the admin UI.

1. **Tab bar** — shadcn Tabs is already in use. Keep the shadcn `TabsList` + `TabsTrigger` pattern. Style consistent with admin pages.
2. **Alert banner** — the auto-flagged sources banner should use a warning/amber tone (not destructive red — these aren't errors, just gaps). Suggest `bg-amber-500/10 border-amber-500/30 text-amber-400`.
3. **Tables** — all four tabs use raw `<table>` elements. Migrate to shadcn `Table` components (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`). Match the Venues and Events admin pages for consistency.
4. **Outcome column (Retrieval Log)** — color-code outcomes:
   - `hit` → `text-green-400` (success)
   - `miss` → `text-fg-muted` (neutral)
   - `error` → `text-destructive` (failure)
5. **Coverage tab** — the `XX%` metric should be large and prominent. Consider pairing with a simple progress bar. If coverage is below a threshold (e.g. <50%), color the percentage amber or red.
6. **Submissions status column** — use Badge variants:
   - `pending` → secondary/muted
   - `accepted` → green/success
   - `rejected` → destructive
7. **Page header** — "Price Dashboard" as `<h1>`. Could add a subtitle: "Monitor price pipeline health and community submissions."

### Reference pages

These admin pages are already designed and can be used as style reference:

- `/admin/venues` — venue management table
- `/admin/events` — event review queue (Phase 7, designed in `design/design_handoff_admin_ui/README.md`)

### Deliverables

- Annotated mockup or component spec for all four tabs
- Badge variants for submission status (`pending`, `accepted`, `rejected`)
- Color treatment for the auto-flagged alert banner
- Coverage tab layout (percentage + optional progress bar)
- Outcome color coding spec

---

## What's NOT in scope

- The price pipeline itself (6-tier API logic) — this is pure backend and is already merged/reviewed
- Cred scoring and award logic — backend only, no UI
- Price-specific crawl scheduling — handled by Phase 7
- Any new page routes — all four areas above are additions to existing pages/components

---

## Files to deliver

After Claude Design produces prototypes, update these files:

| File                                                        | Change                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/src/components/consumer/PriceDisplay.tsx`         | Apply token classes, badge variants, icon choices            |
| `apps/web/src/components/consumer/PriceSubmissionForm.tsx`  | Apply layout, spacing, button placement, state designs       |
| `apps/web/src/components/consumer/event-card/EventCard.tsx` | Apply price slot position, badge styles                      |
| `apps/web/src/app/(protected)/admin/prices/page.tsx`        | Migrate to shadcn Table, apply badge variants, alert styling |

All other PR #32 files (API routes, schema, migrations, tests) are approved and unchanged.

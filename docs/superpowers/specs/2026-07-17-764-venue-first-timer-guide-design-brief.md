# Venue first-timer guide — Design brief

**Ticket:** [#764](https://github.com/HartiganHM/concert-crawl/issues/764) — *Venue first-timer guide surface*
**Phase / priority:** Beta · Normal
**Brainstorm:** 2026-07-17 (Hugh + design agent, 9 questions locked)
**Follow-ups filed:** [#981](https://github.com/HartiganHM/concert-crawl/issues/981) (community-submitted tips, v2), [#996](https://github.com/HartiganHM/concert-crawl/issues/996) (draft-generation automation, v2), [#997](https://github.com/HartiganHM/concert-crawl/issues/997) (chip pool expansion, v2)

---

## Problem (recap from ticket)

A user is going to a venue they've never visited before. They have practical questions — where to park, what the age policy is, will-call vs. printed tickets, whether the venue searches bags, whether there's coat check, where the food is, how loud the room actually gets — and the venue's own website often buries these or doesn't surface them clearly. Today Concert Crawl gives the event details but nothing about the venue experience.

**Real scenario:** a user has bought tickets to a 9pm show at Roxy Music Hall (their first time), is leaving work at 6:30pm with 30 minutes to drive there, and is googling *"Roxy Music Hall parking"* on their phone because the venue page just says *"in the LoDo district."* They want a confidence-builder, not a brochure.

---

## Locked decisions (from brainstorm)

### Surface pattern (Q1)

**Persistent section + first-timer callout.** The section always lives on the venue detail page (visible to everyone at all authentication states). The callout is a warm inline card that layers over the top of the page for first-timer detection.

- ✅ Ship the section immediately with no query dependency
- ✅ Callout progressively enhances when Concert History is ready
- ✅ Return-visitor UX resolves naturally — callout suppresses, section stays

### Content shape (Q2)

**Structured essentials + one free-form vibe line.**

- **Chips** are decision-support content: short, scannable, factual-but-voiced (parking, age, bag check, etc.).
- **Vibe line** is a single free-form concert-goer voice line — one sentence, personality-driven (loudness, food quality signals, room feel).

Chips are NOT `"Parking: paid lot"` — they're **short concert-goer prose** like *"Paid lot on Blake, $15 cash. Street's usually open a block over."* The chip is the surface for one voice-passed tip, not a form field.

### Callout treatment (Q3)

**Warm inline card at the top of the venue detail page.** Sits below the venue hero, above everything else. First thing a first-timer sees. Carries voice + a *"jump to the guide ↓"* anchor link.

Example copy shape (final wording is Design's call):

> *"First time at Roxy? Two minutes of stuff worth knowing before you walk in."*

### Chip set (Q4)

**Per-venue curated + accessibility always present.**

- Admin picks which chips are relevant per venue (Red Rocks doesn't need coat check; The Marquis doesn't need weather).
- **Accessibility is the one always-present chip** on every venue guide. Either voice-passed content or an honest *"not documented yet — reach out to the venue"* placeholder. No invisible third state.

### Event detail placement (Q5)

**Compressed chip on event detail → anchor to venue page callout.**

- Event detail carries a thin chip in the sub-hero row: *"First time at Roxy? Guide →"* linking to the venue page anchor.
- Full warm inline card only lives on the venue page.
- Event detail chip fires under the same first-timer detection rules as the venue-page callout.

### Empty state (Q6)

**Callout adapts honestly; guide always surfaces.**

- Guide always renders on the venue page (accessibility guarantees a minimum floor).
- When the guide is thin (accessibility + zero or few other chips + no vibe line), the callout copy softens: *"First time at Roxy? Here's what we've got so far."*
- Honest > absent. Matches the voice authenticity principle.

### First-timer detection (Q7)

- **Anonymous users:** callout fires. We default to helpful when we don't know the user's history. Copy reads identically to signed-in first-timers because it's a question, not an assertion.
- **Signed-in first-timer:** callout fires.
- **Signed-in returner** (any prior attendance at this venue): callout suppresses. Uses the schema locked in the concert-history handoff — `attending_at IS NOT NULL` for any event at this venue → suppress. No staleness heuristics in v1.

### Returner state (Q7')

**Guide persists for returners in a compact / collapsed state.** Never suppressed, just less obtrusive. Returners still want to check parking or accessibility on the fly; hiding the guide would break that.

**Exact treatment (accordion with preview strip vs. compressed inline row vs. small anchor link) is Design's call in the hi-fi handoff.** Constraint: the guide must be discoverable and reachable in one gesture for returners.

### Admin authoring shape (Q8)

**Pool + blank slate.**

- Fixed pool of chip types (see next section). Admin picks which apply per venue.
- Each picked chip gets an empty text field. Admin writes concert-goer voice from scratch.
- Automation is passive in v1: good pool defaults + venue basics (address, capacity, neighborhood) already exist and stay pre-populated so admin doesn't touch them. **Draft-generation from scraped venue data is deferred to v2 ([#996](https://github.com/HartiganHM/concert-crawl/issues/996)).**
- Accessibility is a required slot in the form — publishing the guide with a truly blank accessibility field is prevented via validation; admin must either author content or explicitly mark it "not documented yet."

### v1 chip pool (Q9)

**8 chip types total. Accessibility locked always-on; 7 admin-selectable.**

| # | Chip type | Notes |
|---|---|---|
| ★ | **Accessibility** | Always-on. Two possible states: voice-passed content OR honest placeholder ("not documented yet"). Required-field validation on save. |
| 1 | **Parking** | Local knowledge, unscrapeable. |
| 2 | **Age policy** | Practical safety-net. |
| 3 | **Bag check** | Practical; venues vary widely. |
| 4 | **Coat check** | Practical, winter-relevant. |
| 5 | **Will-call / ticket entry** | Practical; *where's the door?* |
| 6 | **Food + drink** | Practical; are we eating before or during? |
| 7 | **Transit + getting there** | Ride-share pickup zones, transit walk-time. |

**Plus the free-form vibe line** — separate from chips. One short concert-goer voice paragraph for personality: loudness, room feel, food quality signals, insider heads-up. This is where *"Roxy runs loud — earplugs at the bar if you forgot"* and *"line's bad after 8:30"* live.

**Deferred to v2 chip pool expansion ([#997](https://github.com/HartiganHM/concert-crawl/issues/997)):** weather / outdoor, restrooms, ATMs / cash-only, cell service, ride-share pickup zone.

---

## Design principles (bind every hi-fi decision)

### 🎙️ Voice authenticity is the primary quality bar

Concert-goers spot fake copy instantly. Every displayed chip and the vibe line read as though a concert-goer wrote it. Nothing on the display reads as scraped, brochure-style, or generated content. If a chip can't be authored in an authentic voice, it doesn't ship in that state — it stays in the honest "not documented yet" placeholder.

### 🤖 Automation lives on the admin side, never on the display side

Automation reduces admin friction (v1: good pool + pre-populated venue basics; v2 per **#996**: draft-generation from scraped data). Automation never publishes to display. Every chip must be voice-passed by an admin before it renders on the venue page. This is a hard rule — the "concert-goers wrote this" trust signal collapses if a single chip smells generated.

### 📱 Mobile-first, in-transit reader

The primary reader is on a phone at 6:37pm, driving somewhere they've never been. Every chip earns its space on a 320px baseline. Above-the-fold real estate is precious.

---

## Deliverables (hi-fi handoff)

### Consumer surface

- **Venue detail page — first-timer, populated guide:** warm inline card at top + expanded section below with chips + vibe line
- **Venue detail page — first-timer, thin guide:** softened callout copy (*"here's what we've got so far"*), section shows accessibility + honest placeholders for missing chips
- **Venue detail page — returner:** collapsed / compact section, no callout, discoverable in one gesture (accordion preview strip vs. compressed inline row vs. anchor link — Design's call)
- **Venue detail page — anonymous:** identical to signed-in first-timer (callout fires; guide expanded)
- **Event detail page — first-timer:** compressed *"First time at Roxy? Guide →"* chip in the sub-hero row, anchoring to venue-page callout
- **Event detail page — returner:** no chip; standard event detail unchanged
- **Mobile + desktop** for every state above

### Admin surface

- **Admin venue edit page — first-timer guide block:** chip picker (7 selectable + accessibility locked), text field per selected chip, vibe line field
- **Empty state:** what admin sees when they open a venue with zero guide content
- **Validation:** how the required accessibility field is surfaced
- **Preview:** whether the admin sees a live preview of the consumer surface (Design's call)

### Content & tokens

- **Component handoff with `var(--*)` token references** (consumer surface uses tokens; admin shares the same system)
- **Copy examples** for the callout in populated and thin states, the event detail chip, section headers, empty-state placeholders (final wording is Design's; brief provides shape)
- **Decisions log** covering everything in this brief

---

## Scope

### In scope for v1

Everything above.

### Out of scope for v1 (documented follow-ups)

- 🗣️ **Community-submitted tips** ([#981](https://github.com/HartiganHM/concert-crawl/issues/981)) — user reviews, ratings, trust signals. v1 is admin-authored only.
- 🤖 **Draft-generation from scraped venue data** ([#996](https://github.com/HartiganHM/concert-crawl/issues/996)) — v1 automation is passive (pool + basics); draft-generation deferred until we've seen which chips would actually benefit.
- 🌦️ **Chip pool expansion** ([#997](https://github.com/HartiganHM/concert-crawl/issues/997)) — weather, restrooms, ATMs, cell service. Add once admin usage data shows demand.

### Out of scope permanently (from ticket)

- Photo galleries — surface stays text-first.
- Live conditions (current parking availability, weather adjustments).
- Integration with mapping apps — just show address; user uses their own map app.

---

## Dependencies + sequencing

- **Concert History query** ([#55](https://github.com/HartiganHM/concert-crawl/issues/55), 🟢 Ready for eng-planning): first-timer detection depends on `attending_at IS NOT NULL` for any event at this venue. The section can ship without this query (renders for everyone); the callout waits for Concert History to be plumbed.
- **Section can ship independent of callout** — the two decouple cleanly. Progressive enhancement pattern.

---

## Data model (informational, eng-side)

- **Chip content:** structured per-venue (chip_type enum, chip_body text, sort_order). Accessibility chip is required-on-publish; others are opt-in.
- **Vibe line:** one text field per venue, nullable.
- **Chip type enum (v1):** `accessibility`, `parking`, `age_policy`, `bag_check`, `coat_check`, `will_call`, `food_drink`, `transit`
- **Chip states in admin:** `blank`, `authored` (has content), `honest_placeholder` (only valid for accessibility). Only `authored` and `honest_placeholder` publish to display.

---

## Voice guardrails (Sour Patch bar #782)

- Every chip and the vibe line read as if a concert-goer friend told the user
- Honest > cheerful ("here's what we've got so far" beats "we've got tons of tips!")
- Specific > generic ("Paid lot on Blake, $15 cash" beats "Paid parking available")
- Never brochure-y ("18+ show, they check IDs on the sidewalk if the line's long" beats "Age policy: 18+")
- Callout copy is a question, never an assertion (works for anonymous + signed-in first-timers)
- No "we miss you"–style saccharine; no false urgency

---

## Open handoff questions for Design

Small decisions the brief leaves open for Design's hi-fi pass:

1. **Returner section treatment** — accordion with preview strip, compressed inline row, or subtle anchor link near hero. Constraint: reachable in one gesture, non-obtrusive.
2. **Callout dismissibility** — does tapping "jump to guide" count as dismissal? What if the user scrolls past without tapping?
3. **Admin preview** — live-preview panel or save-and-view pattern.
4. **Empty state visuals** — what accessibility's honest placeholder actually looks like on-screen; icon + copy pattern.
5. **Icon system** — one glyph per chip type, or icon-less rows.

None of these block brief-lock. They land during hi-fi handoff.

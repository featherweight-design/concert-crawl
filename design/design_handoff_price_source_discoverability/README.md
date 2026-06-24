# Price-Source Discoverability — design pass

> **Eng review sign-off (2026-06-17).** Reviewed against the codebase with Claude Code; direction aligned. Decisions and the resulting mock changes are logged in **[Eng review — sign-off & changes](#eng-review--sign-off--changes)** at the bottom. Tickets: **#641** (price-source discoverability) + **#644** (multi-tier pricing). #639 (more-in-genre) pulled out of this cycle.

**Branch context.** Concert Crawl, private Beta. Response to beta feedback (friend beta-feedback doc, 2026-06-17): a fan hit a **sold-out** show, saw only **resale** on Ticketmaster, and had no way to understand that resale ≠ face value — nor any prompt to contribute the box-office number.

Open this: **`Price Source Discoverability.html`**

---

## The finding (why this isn't what the feedback said)

The feedback claimed *"the resale-vs-box-office control already exists at the bottom of the event page, but they didn't find it."* That's mislabeled. The element at the bottom of the page is **`ReportFooterLink`** (from `design_handoff_phase8_5_corroboration/`) — an **event-status** reporter (sold out / cancelled / postponed). It has nothing to do with price source.

The resale/box-office distinction actually lives in two places, **neither present in the state the friend was in**:
- On the **price card** trust marks (gold box-office / coral resale / azure community) — but only *when a price exists*. On a sold-out show the price card collapses and that vocabulary disappears.
- Inside the **submit-a-price form** — several steps deep.

So the gap is real but it's an **absence**, not a misplaced control: the source distinction is missing from the sold-out / no-price states, which is exactly where the comprehension failure happens.

---

## What's in the file

A design canvas (pan/zoom; bottom-right theme switcher — electric / jade / light), five sections:

| Section | Shows |
|---|---|
| **The gap** | `Before` — today's sold-out state: dead "Sold out" button, no source vocabulary, only the status reporter. Annotated with where the friend got stuck. |
| **The fix — sold-out** | `After` — honest outbound CTA + the new **FaceValueCard**. |
| **The fix — no price** | `After` — same ladder folded under the existing community-handoff card. |
| **Q2(a) — provenance CTA** | The outbound "Get Tickets" button in 3 source variants + FaceValueCard standalone. |
| **Q1 — submit form** | Provenance-first reorder, before/after. |

---

## New components (all in `price-source-mocks.jsx`)

### `<FaceValueCard/>` — the centerpiece
Teaches resale ≠ face value **and** invites the box-office number, in the same slot the fan was stuck in. A two-row ladder:
- **Resale** (coral dot) · vendor · marked-up range — the number the fan *can* see.
- **Box office** (gold star) · "the printed price" · **`NOT REPORTED`** — a deliberately **empty/ghost row** so the gap is visible.

A `--signal` CTA ("Add the box-office price →") fills the gap. Voice stays deadpan + clear; no apology. The empty box-office row is the whole idea — it makes the missing data legible and turns comprehension into contribution in one move.

### `<ProvenanceCTA kind vendor/>` — honest outbound button (Q2a)
Same 48px button bounds as the shipped `PrimaryCTA`; a **mono caption row beneath** names the source so resale never launders as "official":
- `boxoffice` → "{venue} · face value, no fees"
- `primary` → "Official vendor · {vendor} · face + fees"
- `resale` → coral dot + "{vendor} resale · usually above face value" (rendered as an **outline** button so it doesn't read as the recommended path)

On the sold-out state this **replaces the dead disabled "Sold out" button** — primary may be gone, but resale exists, so give the fan honesty + agency instead of a dead end.

---

## Q1 — submit form, provenance-first (supporting change)

Tier is *derived* from source (only a venue purchase earns the gold box-office tier), so **source should lead, not trail below the number**. The reorder opens with "Where's this price from? → Box office (face value) / Standard ticket / Resale", and the number field inherits its framing ("Face value" vs "Resale price"). This is the secondary fix — it only helps fans who already made it into the form; the detail-page surfacing (Q2) is higher-leverage.

---

## Tokens / system

No new tokens, typefaces, or tier colors. Reuses the shipped `theme-context.jsx` token set, Inter + JetBrains Mono, the gold/coral/azure tier vocabulary from `price-block.jsx` `TrustMark`, and the `ios-frame.jsx` device frame. CTAs use `var(--signal)` per the CTA-color rule; `--accent` stays reserved for brand presence.

## Status

Exploratory — **not shipped**. Built for Hugh to react to. Recommended priority: **Q2(a) + FaceValueCard on the sold-out/no-price states first** (the actual scene of the crime), Q1 form reorder second.

---

# Multi-tier pricing (#644) — folded onto the same card

Beta feedback (friend): submitted a price for a show with both GA and reserved, but the UX only captured/displayed one tier. Bundled into this cycle because it touches the same price-region real estate — reworking the card once instead of twice.

## The model (agreed with Hugh)

- **Access tiers, not seat locations.** Canonical taxonomy: **GA / Reserved / VIP + a constrained "Other"** (short required label). Red Rocks-style zone granularity (front/center/back) collapses to one access tier shown as "Reserved, from $X" — we're a price-transparency app, not a seat-map. No Lawn/Pit as first-class tiers.
- **One card, tier rows.** The **cheapest tier leads** the headline (entry price); other tiers render as compact rows. Browse/search **collapse to "from $X"** — the full breakdown only lives on detail.
- **Box-office-first within a tier.** The displayed price per tier prefers the box-office number when *fresh* (gold ★) — strategic (drives to box office / community), honest (face value), and usually cheapest. Inherits the existing >24h-stale guardrail so a thin/stale box-office number doesn't headline over a well-confirmed alternative. **Source is a per-row mark, not a second axis** — no tiers×sources grid.
- **Submission stays single-tier + atomic.** No heavier multi-tier form. After a tier posts, the success state offers a frictionless "add another tier" (sequential). The *display* composes multiple atomic submissions — which the show already does in `SubmissionList`.
- **Per-tier corroboration falls out for free.** Each tier price is its own claim → its own pending/confirmed count (existing `PendingPill` / `ConfirmedPill` idiom per row). Cleaner than corroborating a bundled multi-tier submission. **Fragmentation argument:** broad tiers keep submissions-per-tier dense enough to actually hit the 2-confirm threshold; seat-zone granularity would starve corroboration and leave everything "pending" forever.

## Components — reuses the SHIPPED multi-tier vocabulary

> **Revised 2026-06-19 (review round 2).** The first pass rebuilt the multi-tier card from scratch — wrong call. It now reuses the existing components verbatim: `pending-card.jsx` + `multi-tier.jsx` were copied in from `design_handoff_phase8_5_corroboration/`, and the mocks render the shipped `MultiTierLiveCard` / `MixedTierCard` / `TierAlternateRow` riding the shipped `PendingTrustPill` (gold box-office / azure community), the "from $X · GA" headline, the "Other tiers" alternates, and the "pending · 1/2" tell. No reinvented card chrome, no invented pills, no "all reports" footer.

- **Display = `MultiTierLiveCard` / `MixedTierCard`** (shipped, unchanged) — the only fold-in is setting the headline tier's `cheapestKind="boxoffice"` so box office leads with the gold pill (eng #5). `MixedTierCard` demonstrates per-tier corroboration via the shipped "pending · 1/2" tell.
- **Ask #3 within-tier cue = one optional `reports` prop** added to `MultiTierLiveCard` — appends "· N reports" to the existing "seen on X" meta line when >1. Not a new element, no expand affordance (the shipped card's philosophy is "see all prices at a glance without expanding" — which is also why there's **no "all reports" link**; that was invented chrome and has been removed).
- **`<MT_ListChip price kind/>`** — browse/search collapsed state ("from $25", shipped gold `StarGlyph` when box-office).
- **`<MT_AddTierSuccess/>`** — submission success with the sequential "add another tier" fold-in (net-new affordance; uses the shipped check glyph + "pending · 1/2" idiom).
- **`<MT_ConfirmContestFork/>`** — ask #4 (net-new); built on the shipped check glyph + `PendingTrustPill`. See ask #4 below.

## How #641 and #644 interact

The `no box office yet` variant shows the honest mixed state: a tier whose only number is resale headlines in coral, and the show-level **#641 FaceValueCard** still applies (invite the box-office number). A v2 could make the box-office ghost per-tier ("GA face value ✓ / Reserved face value: not reported") — noted, not built.

## Scoping

- **In-page cycle (rework the card once):** #641 source legibility + #644 multi-tier *display* + #639 more-in-genre.
- **Submission cycle (separate, lighter, modal):** #641 form reorder + #644 "add another tier".

## Open question for next pass

- **Per-tier sold-out / availability.** Sold-out is show-level today; tiers make "GA sold out, reserved available" possible. Kept show-level for v1 — flag for a data-model conversation.

## Open questions for next pass

1. **Resale price source.** The FaceValueCard's resale range needs a number. We don't pull ticketing APIs — is resale range itself community-submitted, or scraped at deep-link time? If we can't show a range, the row degrades to "available, above face value" with no number.
2. **Sold-out + resale-available** isn't a state the current model distinguishes (`status: "soldout"` kills the CTA entirely). Surfacing an honest resale link implies tracking "primary sold out **but** resale exists" as a distinct state. Worth a data-model conversation.
3. **Status reporter labeling.** "SPOT SOMETHING OFF? → Report a status change" is the page's universal "something's wrong" magnet and will keep catching pricing complaints it can't resolve. Possible sibling affordance for "the price/source looks wrong" — flagged, not designed here.

---

## Eng review — sign-off & changes

Reviewed against the codebase (Claude Code, 2026-06-17). **All 9 eng decisions accepted.** Substantive notes:

- **#3 — drop `howFound` / new model `{source-category, vendor, tier, price}`.** Accepted, and it's an *upgrade*. `howFound` ("How'd you find out?" → evolved to "What did you do?") existed mainly to **derive tier** (bought→gold box-office, saw→community; see `event-detail-v2/phase8-addendum.md`). The new top-of-form `source-category` captures that provenance *directly and less ambiguously* — picking "Box office" is a cleaner gold signal than inferring it from "bought it myself." Net UX gain. **One thing to confirm before deleting:** the `method` sub-signal (in-person / by-phone, only under Box office) fed **admin review signal-quality** scoring, not promotion logic. If admins don't lean on it, drop cleanly; if they do, preserve it as a conditional micro-field under the Box-office source-category. Submit-form mock (`FormAfter`) updated: source-category leads, **vendor demoted + marked optional**, `howFound` removed.
- **#5 — box office exempt from staleness.** Accepted; footer copy updated to "Box office leads · each tier confirmed on its own" (dropped "when fresh"). **On the gold-star visual:** do **not** add a separate "doesn't decay" badge. The star means "face value, from the source" — and face value is essentially immutable for an event, so non-decay is *implied by what the mark already means*, not a new property to signal. Badging it would over-explain and imply the other marks carry a visible "stale" state (they don't — staleness only affects pick order silently). The honest cue for "why is this number chosen" lives in the **within-tier pick caption** (ask #3), not on the star.
- **#7 + #8 — 1/2 confirmation model + handle reframe.** Accepted. Per follow-up review, the **"no handle needed" line was dropped** (users aren't anxious about an unset handle); the FaceValueCard caption is now the neutral **"Goes live once one more fan confirms."** The per-tier tell uses the **shipped "pending · 1/2"** idiom (submitter = observation #1, one more promotes) rather than any invented "needs 1 confirm" pill. `MTAddTierSuccess` → "sits pending · 1/2 until one more fan confirms."
- **#9 — contest scope price-only.** Accepted; breaks nothing — there was no change-tier/change-source flow planned. "Change tier or source = new submission" is correct and *protects* per-(tier, source) corroboration integrity (you can't mutate a slot's identity and keep its confirm history). The shrunk 2-field DisputeForm is yours; only note is the new **Confirm/Contest fork** (ask #4) re-states the fixed (tier, source) slot in its header so the price-only scope is legible.
- **#4 — tier enum deferred.** Accepted. Mocks now render against the **current enum (GA / Reserved / VIP / Pit / Lawn)**; the `Other(label)` escape hatch is removed from v1 (component still accepts an `other` prop, unused — revisit when beta produces real "doesn't fit" feedback).

### Asks delivered

- **Ask #2 — copy revisions:** done (see #5/#7/#8 above).
- **Ask #3 — within-tier pick cue:** delivered as a single optional `reports` prop on the shipped `MultiTierLiveCard` — appends "· N reports" to the existing meta line ("seen on Larimer Lounge · observed yesterday · 4 reports"). Hints the shown number is the consensus without a new element or an expand affordance.
- **Ask #4 — Confirm / Let-us-know fork:** `MT_ConfirmContestFork` + in-context `MT_ConfirmContestScreen`. Confirm is the recommended path (full-width filled `--signal`, shipped check glyph); the escape hatch is a quiet text link — **"Saw a different number? Let us know →"** (renamed from "Contest" per review; softer, not an error). Header re-states the `$25 · GA · ★ box office · confirmed` slot so the price-only scope is legible.

### Review round 2 — the five follow-up points

1. **"No handle needed" copy dropped** — replaced with neutral "Goes live once one more fan confirms."
2. **Divergence corrected** — the multi-tier card now reuses the shipped `MultiTierLiveCard` / `MixedTierCard` / `TierAlternateRow` / `PendingTrustPill` verbatim (see Components above). The earlier from-scratch rebuild is gone.
3. **"Contest →" → "Let us know →"** — done.
4. **"All reports →" removed** — it was invented chrome with no visualized destination; the shipped card deliberately shows all tiers at a glance without an expand. Per-price confirm/contest happens through the fork (live) and the shipped pending-card Confirm (pending), so no separate "all reports" entry is needed.
5. **Vendor is required, not optional** — that was an error in the first pass. The shipped Phase 8 form requires vendor ("Pick where it's listed."); eng #3 said "vendor stays but demoted," not optional. Corrected to required + demoted. *Open nuance for eng:* when source-category = Box office, vendor is the venue itself (already known from the event) — could be auto-filled rather than a required separate pick. Flagged, not implemented.

### Out of scope (per eng): admin contest-review UI (#697), DisputeForm redesign, #639 more-in-genre, price-history drawer (admin-only v1), tier-taxonomy change.

### Review round 3 — beta-feedback follow-up

1. **Resale examples now use Ticketmaster** in all design mocks (SeatGeek references removed from illustrations). The shipped vendor enum and UI surfaces still include SeatGeek — this round is about which vendor design picks for *illustrative* purposes, not about the supported set.
2. **Vendor shows "Venue"**, never the venue's name, anywhere it's a *vendor* value (submit form chip, card "seen on Venue"). The event header still shows the real venue + date ("Larimer Lounge · Fri, Jun 26") — that's the show's location, not a vendor.
3. **Face Value card copy trimmed** — body is now "Only resale tickets left. Know the box-office price? Add it." (9 words, down from 33).
4. **Multi-source × multi-tier** (`MT_MultiSourceScreen` / `MultiSourceMultiTierCard`): the answer to "Box office GA+VIP + Resale GA+VIP — too busy?" is **no grid**. Tier is the only surface axis. The entry tier leads at its box-office price; its cross-source resale price folds into the shipped **"Or pay for convenience"** row (mirrors `PriceBlockB`'s `AlternateSourceRow`). Other tiers are one row each; their own alternates stay collapsed until tapped. 2 sources × 2 tiers → a flat, scannable card.
5. **Confirmations** (`confirm-stack`, shipped `PendingCardB`): the answer to "does every source/tier get a confirm button?" is **no**. Confirm is a property of a *pending* submission — the shipped `PendingCardB` footer ("Saw a different number?" + one "Confirm price"). Independent pending tiers stack as focused cards, each with one confirm; the live combined card has zero per-row confirms (just the single "Saw a different price?" entry). **This retired my custom Confirm/Let-us-know fork from round 2** — `PendingCardB` already *is* that affordance, so building a parallel one was reinvention. 1/2 model throughout ("1 OF 2 · 1 TO GO").
6. **Process note taken:** find the *current implementation* first each pass (here: `pending-card.jsx` `PendingCardB` was the real card all along) rather than building on the nearest older handoff.

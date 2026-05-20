# Phase 8 form addendum — capturing box-office tier

**Status:** spec, not yet implemented. Lives here because it's a Phase 7.2 strategy consequence; merge into `design_handoff_phase8_submit_a_price/README.md` when you're ready.

---

## What's changing

Phase 8 today asks "How'd you find out?" with three chips: `Bought it myself`, `Saw the listing`, `At the venue`. That's enough to flag a community submission, but not enough to derive **box-office tier** — the new top of the trust hierarchy as of May 13, 2026.

Box-office tier requires two pieces of information that today's form conflates or omits:

1. **Action** — did the fan _see_ the price, or _buy_ a ticket? (the existing chips mix these — "At the venue" could be either)
2. **Method** — for a box-office source, did the fan visit _in person_ or call by _phone_? (today's form has no concept of this)

Those two booleans give us four cells in a 2×2; three are gold tier and one drops to community. The form must capture the four cells distinctly.

---

## Form changes

### 1. Rename "How'd you find out?" → "What did you do?"

Same chip group, two chips instead of three.

| Chip              | Maps to            |
| ----------------- | ------------------ |
| `Bought a ticket` | `action: "bought"` |
| `Saw the price`   | `action: "saw"`    |

Drop the existing `Bought it myself` / `Saw the listing` / `At the venue` chips — that question is being split across the next two.

### 2. Replace the implicit "where" by the explicit Vendor chip group

Already in Phase 8 — `Where it's listed`: AXS, Ticketmaster, SeatGeek, DICE, Eventbrite, Venue box office.

No change here, just calling it out: **the vendor chip is what flags a submission as box-office-eligible.** `Venue box office` selected → the next question appears. Anything else → tier is community, no method question shown.

### 3. NEW: conditional "How?" question

Only appears when `vendor === "Venue box office"`. Two chips:

| Chip        | Maps to               |
| ----------- | --------------------- |
| `In person` | `method: "in-person"` |
| `By phone`  | `method: "phone"`     |

Label copy suggestion: **"How'd you check?"** with subtitle "We score box-office prices higher when a fan actually visited the venue."

This is the _only_ spot in the submission flow that uses progressive disclosure. The 2×2 is small enough that it's tempting to show both questions always, but doing so for every submission makes the form noisier for the 80% non-box-office case. Conditional wins.

### 4. Update validation

Add a rule: when `vendor === "Venue box office"`, `method` is required (same severity as Tier / Vendor / Source — synchronous client + server check).

---

## Tier derivation (server side)

Two inputs → one outcome. **Action is what determines tier; method is metadata.**

| action   | vendor             | Resulting `sourceKind` | Tier                                                                                                                                                                             |
| -------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bought` | `Venue box office` | `boxoffice`            | **Gold (top)** — a fan bought a ticket from the venue                                                                                                                            |
| `saw`    | `Venue box office` | `community`            | **Community** — box-office observation, no purchase. Stored with `boxOfficeAction: "saw"` + `boxOfficeMethod` so the display can surface the box-office origin as a context line |
| `bought` | (other vendor)     | `community`            | Community — the venue box-office tier doesn't apply to TM/AXS purchases                                                                                                          |
| `saw`    | (other vendor)     | `community`            | Community — standard fan submission, no special context                                                                                                                          |

The **method** field (`in-person` / `phone`) is stored but doesn't affect tier. It flavors the attribution line:

- `bought` + `in-person` → "Bought at {Venue} box office by @hugh"
- `bought` + `phone` → "Bought from {Venue} box office by @hugh · by phone"
- `saw` + `in-person` → (community card) + "Saw at {Venue} box office · in person" context
- `saw` + `phone` → (community card) + "Called the {Venue} box office · by phone" context

The verb is the trust signal. We don't conflate "I called" with "I bought" — those are different operations and the UI says so.

### Why bought-only is gold

Hugh's May-13 feedback called this out directly: "Seen at Gothic box office and Called the Mission box office — what's the difference? These are effectively the same means of determining the price." He's right. Both are passive observations of a posted number. The thing that earns gold tier is the **act of purchasing** — a fan put money down and got a ticket back. That's the strongest possible signal that the number is real.

---

## Submission payload

The POST body for `/shows/:id/submissions` grows two optional fields:

```json
{
  "floor": 42,
  "ceiling": null,
  "tier": "GA",
  "vendor": "Venue box office",
  "action": "bought", // NEW — "bought" | "saw"
  "method": "in-person" // NEW — "in-person" | "phone" — required iff vendor === "Venue box office"
}
```

When `vendor !== "Venue box office"`, `method` MUST be omitted. (Server validation: reject if present.)

Returned object grows the matching fields:

```json
{
  "id": "sub_…",
  "sourceKind": "boxoffice",       // derived per table above
  "boxOfficeAction": "bought",     // null when vendor !== "Venue box office"
  "boxOfficeMethod": "in-person",  // null when vendor !== "Venue box office"
  "submitter": { "handle": "@hugh", "url": "/u/hugh" },
  ...
}
```

`boxOfficeAction` + `boxOfficeMethod` survive even when the submission is community-tier (the `saw + box office` rows) so the display can render the appropriate context line ("Saw at …" / "Called the …").

---

## Anti-abuse considerations

The box-office tier is the most valuable submission a fan can make. It will be a target for false claims (someone wants to make a show look like a deal to drive their resale).

Two soft mitigations, both backend:

1. **Box-office submissions still need 2 confirms to leave pending** — same gate as every other submission. The gold tier is _visible_ in pending state (so the display still wins the headline), but the `pending` chip stays attached until two peer confirms land.
2. **Suspicion flag** — flag any box-office submission where the price is more than 50% below the average resale price for the same show. Doesn't reject, but routes to a slower verification path (admin review or 3 confirms instead of 2). Spec lives in the admin handoff, not here.

No additional friction in the submit flow itself. The form treats box-office as just-another-option; the trust math happens server-side.

---

## Edit/withdraw

Same rules as today's `alreadySubmitted` state. A user editing their box-office submission can change `action` and `method`; doing so may downgrade them out of gold tier, which is fine — the display reacts on next fetch.

---

## Open questions for engineering

1. **Migration of existing community submissions.** Pre-7.2 submissions tagged `Bought it myself` + `Venue box office` should retroactively become `action: bought, method: in-person` and tier-promote to gold. Confirm we have enough data to do that. Submissions tagged `Saw the listing` or `At the venue` without an explicit "bought" signal should stay community.
2. **Pending-state visual for box-office.** Today pending = warning yellow `pending` pill. Box-office in pending state needs to feel "vouched, awaiting confirmation" — not "we don't trust this yet". Suggest a softer treatment; happy to spec if you want.
3. **One submission per show per 24h.** Today's rate limit applies per-user. If a fan submitted box-office at $42 and then wants to add a TM alternate at $58 the same day, that's two submissions of two different prices — should that be allowed, or treated as one update? My read: allow both, they describe different sources for the same show.
4. **Sold-out as community claim** (new in May-13 round). The display now surfaces `soldOutBy` + `soldOutConfirms` instead of treating sold-out as a fact. We need a form path for reporting a show sold out — and an inverse "still available?" affordance to dispute a stale flag. Not specced this round; flagging it.
5. **Submission form anti-abuse on bought-claim.** A fan claiming `bought` is making a stronger trust claim than `saw`. We may want to require a receipt-photo upload or rate-limit `bought` more aggressively than `saw`. Out of scope for the initial spec but worth considering before we ship.

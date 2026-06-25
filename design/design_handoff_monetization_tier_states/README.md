# Monetization · Tier States + Entitlements (Round 5)

> Extends `design/design_handoff_monetization/` with the new surfaces the
> 2026-06-24 brief (#781) locks. **Nothing already locked was redesigned** —
> tone shells, badges, scarcity rail, mono rails, and voice are lifted verbatim
> from the original handoff's `<TierCard>` and `monetization-shared.jsx`.
> Status: **first pass, ready for Hugh's review.**

Open `Tier States + Entitlements.html` and toggle **Tweaks** in the toolbar to
drive state · theme (all 9) · Founder window live.

---

## What's here

| File | What it does |
|---|---|
| `Tier States + Entitlements.html` | The canvas. 8 sections, mobile + desktop throughout. |
| `monetization-tier-states.jsx` | `R5_TIERS` (feature bullets re-cut to §6), `<TierStateCard>`, `<TierPicker state variant/>` (all 6 states), `<GiftedThankYou>`. |
| `monetization-founder-gifted.jsx` | `<FounderRaceLoser>` (§3.2), `<FounderClaimTakeover>` (§3.3), `<GiftedPlanCardDesktop/Mobile>` (§4), `<SeatMeter>`. |
| `monetization-entitlements.jsx` | `<EntitlementsMatrix variant/>` — the §6 table, desktop full + mobile compact, with legend. |
| `theme-context.jsx` | **All 9 themes** merged (base 3 + 5 genre + drip's `accent-2`). Lets Tweaks verify cross-theme parity on every new surface. |
| `monetization-shared.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Verbatim copies of the canonical deps. |

---

## Sections in the canvas

0. **Live preview** — mobile + desktop picker wired to Tweaks (state, all 9 themes, window).
1. **Tier picker · 6 states · mobile** — logged-out, free, supporter, premium, founder, gifted.
2. **Tier picker · 6 states · desktop** — same six as a centered modal over Settings · Plan.
3. **Founder · claim-race loser** (§3.2) — mobile + desktop.
4. **Founder · post-claim takeover** (§3.3) — mobile (#37 + #03) + desktop.
5. **Gifted · Plan card** (§4) — desktop + mobile in Settings context.
6. **Entitlements matrix** (§6) — desktop full table + mobile compact grid.
7. **Theme parity** — Free-state picker across Light / Drip / Forge / Pulse + the matrix in Light.

---

## Locked decisions, honored

- **Six states.** `free` / `supporter` / `premium` / `founder` render as columns with the current one stamped; `logged-out` sees the same picker as the paywall surface; `gifted` replaces the whole surface with a thank-you panel (no cards).
- **Founder race loser** → honest "Founder filled up. You were seconds away." → **regular Premium at $5/mo**, no charge, **no consolation pricing** (stated on-surface). Founder flips to closed after.
- **Founder post-claim** → dedicated takeover with **seat-number reveal**, $3/mo locked-forever stamp, Founder badge preview, single "Take me in." → Settings · Plan. **No confetti.**
- **Gifted Plan card** → gratitude voice, Premium + Beta badges, **no Manage subscription, no Cancel** microcopy; one discovery affordance, never a billing one.
- **Hybrid gating** in the matrix — active affordances render visible-locked; background features stay hidden.
- **Token-only colors** — every value reads from `var(--*)`; verified across all 9 themes via Tweaks. `CCMark` (shipped as `MMark` in shared) untouched.

---

## Open questions — answers Design took

The brief left these to Design. Calls made:

1. **Gifted thank-you copy** → "You're already in." / "Lifetime Premium — on us… that's the whole price." / "Seriously. We owe you one." (Sour-Patch gratitude.)
2. **Race-loser copy** → headline "Founder filled up." + emphasis "You were seconds away." + honesty rail "No consolation pricing. Same Premium, regular price — we don't do fake discounts."
3. **Post-claim seat rendering** → giant `#37` + "of 100", mono "Your seat" eyebrow, "Founder. Locked in." headline. Two seat numbers shown (#37, #03) to prove the format scales.
4. **Gifted dropdown/badge** → **Premium badge + a "Beta" sub-chip.** Reads as Premium, the chip explains the comp. Used on the plan card eyebrow and the thank-you panel.
5. **Feature-anchored header** → mono eyebrow naming the locked feature (`WATCHING · LOCKED`) + benefit headline + one-line sub. Same treatment is the logged-out picker header, with an inline "Already have an account? Sign in →".
6. **Mobile Founder column count** → open = 4 stacked cards, closed = 3. Founder simply isn't rendered when the window's closed (no placeholder).
7. **"Premium" chip consistency** → **one chip** across surfaces. In the matrix the lock-chip is identical everywhere; the only differentiator is the route hint ("→ sheet" vs "→ picker"), which is UX routing, not a per-feature variant.

---

## ⚠️ Reconciliation note — needs Hugh's eyes

The §6 matrix is the canonical entitlements truth, and it is **stricter than the
original tier cards implied.** Per the matrix + §4 ("the Watching heart… exists
on the page even for Free users… visible-locked"):

- **Watching, Concert history, Calendar export, Following are all Premium-and-up.**
  Free/Supporter see them visible-locked, not active.
- **Free is core-only** — browse / search / filter / see + submit community prices.
  (Watching was dropped from the Free card to match the matrix.)
- **Supporter is badge-only** — no Premium unlocks (the brief explicitly moves
  History + Calendar export off Supporter; the card now says so out loud).

So the picker cards in this round encode the matrix, which means the **Free card
no longer lists "Save shows you're watching."** If Watching-on-Free was meant to
survive, that's the one place to flag — it's a deliberate read of §6, not an
oversight. Taglines / prices / CTAs stay exactly as the locked copy table.

---

## Out of scope (owned elsewhere, per brief)

Cancel / downgrade / upgrade flows (#780), payment-failure + a11y (#782), email
(#783), Stripe/schema/counter plumbing (#775), logged-out broader nav (#794).
The picker's downgrade/switch CTAs are shown for completeness but their flows
belong to #780.

## Dev notes

- Tier-detail "See what's included" sheets were intentionally **not** carried
  into the new picker cards — the locked `<TierDetailSheet>` reads stale
  Supporter feature data. Reuse it once `R5_TIERS` feature bullets land in
  `monetization-shared.jsx`. The §6 matrix covers full per-tier detail meanwhile.
- `accent-2` (Drip only) is defined in the merged `theme-context.jsx`; consumers
  that want it use `var(--accent-2, var(--accent))`. None of these surfaces
  depend on it.

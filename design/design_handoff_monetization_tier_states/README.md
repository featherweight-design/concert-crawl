# Monetization · Tier States + Entitlements (Round 6)

> Extends `design/design_handoff_monetization/`. **Nothing already locked was
> redesigned** — tone shells, badges, scarcity rail, mono rails, and voice are
> lifted verbatim from the original handoff. R5 surfaces Hugh accepted as the
> visual baseline are untouched except where R6 items require it.
> Status: **R6 iteration — addressing the Track 2 Orange readiness items.**

Open `Tier States + Entitlements.html` and toggle **Tweaks** in the toolbar to
drive state · theme (all 9) · Founder window live (the panel now drives the
Section 0 live preview — singleton `useTweaks`).

---

## What's here

| File | What it does |
|---|---|
| `Tier States + Entitlements.html` | The canvas. 9 sections, mobile + desktop throughout. |
| `monetization-tier-states.jsx` | `R5_TIERS`, `<TierStateCard>` (desktop card), `<TierCtaButton>`, `<TierComparisonMobile>` + `<TierRowMobile>` (R6 mobile tap-to-expand), `<TierPicker state variant/>` (all 6 states), `<GiftedThankYou>`. |
| `monetization-paywall.jsx` | **R6** — `<MiniPaywall variant anchor/>` (§5.1 Free→Premium mini sheet/modal) + `MINI_PAYWALL_ANCHORS`. |
| `monetization-founder-gifted.jsx` | `<FounderRaceLoser>` (§3.2), `<FounderClaimTakeover>` (§3.3), `<GiftedPlanCardDesktop/Mobile>` (§4), `<SeatMeter>`. |
| `monetization-entitlements.jsx` | `<EntitlementsMatrix variant/>` — the §6 table (Watching amendment applied), desktop full + mobile compact, with legend. |
| `theme-context.jsx` | **All 9 themes** merged (base 3 + 6 genre + drip's `accent-2`). Lets Tweaks verify cross-theme parity on every surface. |
| `monetization-shared.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Canonical deps. `tweaks-panel.jsx` got the R6 singleton + origin-gate fixes. |

---

## Round 6 changes

**Matrix amendment (applied first).** Watching (the heart) is now a **Free
feature for every signed-in state** — `visible-active` for free/supporter/
premium/founder/gifted; logged-out still routes to the picker (saving needs an
account). Rationale: it's just tracking a show in a DB, cheap to operate, and
the framing fits the Sour Patch honesty rail. All other rows stay Premium-only.
Applied in `monetization-entitlements.jsx` (`entCell` + a `freeForSignedIn`
flag on Watching), the Free tier card ("Save shows you're watching" is back),
and the source brief §6 table (`uploads/…-design.md`, with a dated rationale note).

1. **§5.1 Free→Premium mini paywall** — `monetization-paywall.jsx`. Mobile
   bottom sheet + desktop centered modal, feature-anchored, "Go Premium" →
   Settings · Plan, "Maybe later" dismisses. Single upgrade path, not signup.
   The default anchor leans on the now-free Watching ("You've watched it. Want
   to know when the price drops?"); `MINI_PAYWALL_ANCHORS` carries history /
   export / following variants for eng to fan out. Canvas section 3.
2. **Mobile picker comparison mechanic** — replaced the R5 vertical stack of 4
   fully-expanded cards (Hugh: "squished / unclear if it expands") with a
   **collapsed-summary + tap-to-expand accordion** (`<TierComparisonMobile>`).
   Every row shows name · badge · price · tagline for at-a-glance comparison;
   one row is expanded inline (current plan, else Premium); tapping a header
   opens it and collapses the previous. No nested modal, no truncation. Desktop
   picker unchanged (locked).
3. **Founder current-plan card when window closed** — `r5VisibleTiers` now takes
   `state`; Founder stays visible if `state === "founder"` even after the launch
   window closes, so a Founder keeps their stamped card + Manage CTA. New
   artboards in sections 1 & 2 ("Founder · window CLOSED · still your plan").
4. **`useTweaks` singleton** — `tweaks-panel.jsx` now shares one module-level
   store across all hook callers, so the Tweaks panel drives the Section 0 live
   preview (previously each caller had isolated state).
5. **postMessage origin gate** — `tweaks-panel.jsx` ignores protocol messages
   whose `event.source !== window.parent`.

**Confirmed:** the "★ More coming" line stays on Premium + Founder cards — it's
a meta-statement about ongoing development, not a per-feature "coming soon"
eyebrow (which §7 outlaws).

---

## Sections in the canvas

0. **Live preview** — mobile + desktop picker wired to Tweaks (state, all 9 themes, window).
1. **Tier picker · 6 states · mobile** — tap-to-expand accordion + a Founder-window-closed case.
2. **Tier picker · 6 states · desktop** — centered modal over Settings · Plan + Founder-closed case.
3. **Free→Premium mini paywall** (§5.1) — mobile sheet + desktop modal + a copy variant.
4. **Founder · claim-race loser** (§3.2) — mobile + desktop.
5. **Founder · post-claim takeover** (§3.3) — mobile (#37 + #03) + desktop.
6. **Gifted · Plan card** (§4) — desktop + mobile in Settings context.
7. **Entitlements matrix** (§6, amended) — desktop full table + mobile compact grid.
8. **Theme parity** — Free-state picker across Light / Drip / Forge / Pulse + the matrix in Light.

---

## Locked decisions, honored

- **Six states.** `free` / `supporter` / `premium` / `founder` render with the current one stamped; `logged-out` sees the picker as paywall; `gifted` replaces the surface with a thank-you panel.
- **Founder race loser** → honest "Founder filled up. You were seconds away." → regular Premium $5/mo, no charge, no consolation pricing. Founder flips to closed after.
- **Founder post-claim** → dedicated takeover, seat-number reveal, $3/mo locked stamp, badge preview, single "Take me in." → Settings · Plan. No confetti.
- **Gifted Plan card** → gratitude voice, Premium + Beta badges, no Manage/Cancel; one discovery affordance, never billing.
- **Hybrid gating** in the matrix — active affordances render visible-locked; background features hidden.
- **Token-only colors** — verified across all 9 themes via Tweaks. `CCMark` (`MMark` in shared) untouched.

---

## Open questions — answers Design took

1. **Gifted thank-you copy** → "You're already in." / "Lifetime Premium — on us…" / "Seriously. We owe you one."
2. **Race-loser copy** → "Founder filled up." + "You were seconds away." + honesty rail "No consolation pricing. Same Premium, regular price."
3. **Post-claim seat rendering** → giant `#37` + "of 100", "Founder. Locked in." Two seat numbers shown (#37, #03) to prove the format scales.
4. **Gifted dropdown/badge** → Premium badge + a "Beta" sub-chip.
5. **Feature-anchored headers** → mono eyebrow + benefit headline + one-line sub. The logged-out picker frames Watching as "Save a show · sign in" (Watching is free, you just need an account); the mini paywall anchors on a Premium feature (price-drop alerts).
6. **Mobile comparison** → collapsed summary rows + tap-to-expand accordion (see R6 #2).
7. **"Premium" chip consistency** → one chip across surfaces; the only differentiator is the route hint ("→ sheet" vs "→ picker"), which is UX routing.

---

## Out of scope (owned elsewhere, per brief)

Cancel / downgrade / upgrade flows (#780), payment-failure + a11y (#782), email
(#783), Stripe/schema/counter plumbing (#775), logged-out broader nav (#794).
The picker's downgrade/switch CTAs are shown for completeness but their flows
belong to #780.

## Dev notes

- The mini paywall ships **one** feature-anchored variant as the pattern;
  `MINI_PAYWALL_ANCHORS` holds the other anchors. Eng picks the anchor per gated
  feature at integration.
- Tier-detail "See what's included" modals were intentionally not added — the
  mobile accordion's inline expand now covers per-tier detail, and the §6 matrix
  covers cross-tier comparison. The locked `<TierDetailSheet>` from the original
  handoff still reads stale feature data; rebuild it against `R5_TIERS` only if a
  modal detail view is later wanted.
- `accent-2` (Drip only) is defined in the merged `theme-context.jsx`; consumers
  use `var(--accent-2, var(--accent))`. None of these surfaces depend on it.

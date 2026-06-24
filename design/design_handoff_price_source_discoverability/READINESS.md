# Readiness Review — Price Source Discoverability + Multi-tier (#641, #644)

**Verdict:** 🟡 Yellow — eng sign-off still holds; only one design-side commitment is outstanding (the `PriceChip` selection-parity note the README still doesn't carry), and the four "shipped since 2026-06-17" PRs all implement exactly what the handoff inherited as locked decisions.
**Audited:** 2026-06-23
**Auditor:** Claude (autonomous Readiness Review)
**Related ticket(s):** #641 (open), #644 (open)
**Prior eng sign-off:** 2026-06-17 (logged inline in README, plus three follow-up rounds — round 3 captured 2026-06-19/20 with the SeatGeek correction inline)
**Plan PR target:** TBD — Consumer UI PR (PR 4 of 4) per `project_price_source_discoverability` Claude memory note.

## Summary

The 2026-06-17 eng sign-off still holds. In the six days since, three of the four price-source PRs in the cycle have shipped (PR 1 schema #705, PR 2 crawler #722, PR 3 API aggregation #723), plus PR #731 as post-merge audit fixes. None of them changed the design intent — they implemented exactly the locked decisions in the README's "Eng review — sign-off & changes" section. The Consumer UI PR (PR 4) has not started; the UI surface it targets (the dead "Sold out" button at `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx:216-241`, plus the existing multi-tier components at `apps/web/src/components/consumer/multi-tier/`) is untouched and matches the "before" assumptions in the mocks. The data contract `priceByTier: TierPriceBlock[]` is fully in place in `packages/types/src/index.ts`. The only outstanding design-side commitment is the `PriceChip` selection-parity note that the README still doesn't carry (already tracked as a Consumer UI PR requirement in the memory note, so it's caught either way). One additional interaction lock arrived after sign-off and is captured in memory but not in the README: the dispute-affordance hiding rule for tiers that already have a pending counter. PR 4 plan must reflect it; flagging here so eng knows to fold it in.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary between #641 (source discoverability) and #644 (multi-tier) is cleanly demarcated in the README — `# Price-Source Discoverability` and `# Multi-tier pricing (#644)` are separate H1-level sections with their own components and interaction note (`How #641 and #644 interact`).
- ✅ Both tickets addressed in this handoff and confirmed in the memory note as a single Consumer UI PR.
- ✅ #639 (more-in-genre) explicitly de-scoped at the top of the README and reaffirmed in the locked decisions.

### 🎭 State coverage
- ✅ Sold-out: `FaceValueCard` + `ProvenanceCTA` (3 variants: boxoffice, primary, resale) — replaces today's dead disabled button. Mocks present in `price-source-mocks.jsx`.
- ✅ No-price: same ladder folded under existing community-handoff card (per "The fix — no price" section).
- ✅ Empty box-office row: the centerpiece "NOT REPORTED" ghost row is the deliberate visualization, not a missing state.
- ✅ Multi-tier display: shipped `MultiTierLiveCard` / `MixedTierCard` / `TierAlternateRow` reused verbatim; only fold-in is the `cheapestKind="boxoffice"` headline pick + optional `reports` prop.
- ✅ Multi-tier submission: `MTAddTierSuccess` for the sequential "add another tier" affordance — net-new but small.
- ✅ Multi-source × multi-tier: `MultiSourceMultiTierCard` (no grid, tier-only surface axis, cross-source falls into shipped `AlternateSourceRow` pattern).
- ✅ Mobile + desktop parity: every mock renders inside `ios-frame.jsx` at mobile width; the components themselves are 100%-width cards that already work in the shipped desktop layout. No grid breakpoints to translate.

### 🔌 Data contract
- ✅ `priceByTier: TierPriceBlock[]` shipped on `EventDetailResponse` (`packages/types/src/index.ts:479`).
- ✅ `TierPriceBlock` carries everything the UI needs: `headline` (with `sourceCategory`, `vendor`, `confirmsCount`, `approvalKind`), `alternates`, `pending` (with `confirmsCount` / `confirmsNeeded` / `isSubmitter`), `counterSubmission`, `reports` (`types/src/index.ts:400-407`).
- ✅ `sourceCategoryEnum` (`boxoffice` | `standard` | `resale`) shipped in `packages/db/src/schema/prices.ts:56-60`.
- ✅ Multi-tier representation in DB: per-(tier, source) partial unique index lives on `price_submissions` (per PR #705), so per-tier corroboration "falls out for free" as the design intends.
- ✅ `ticketLinks` jsonb shipped on `events` with `kind: boxoffice | primary | resale` and vendor classification — directly feeds `ProvenanceCTA` (`primary` = "Official vendor", `resale` = "Resale", `boxoffice` = "{venue} · face value, no fees").
- 🟡 **PR 4 dispute-affordance hiding interaction** (Claude memory note: `project_pr4_dispute_affordance_hiding.md`): when `priceByTier[tier].counterSubmission !== null`, the UI MUST hide the dispute entry for that tier (schema enforces 1 counter per parent via partial unique index; second submit hits a 409). This was pre-decided 2026-06-23 (today) but is **not in the README "Eng review — sign-off & changes"** section. The handoff's `MT_ConfirmContestFork` was retired in round 3 (replaced by `PendingCardB`), so the natural place for this rule is wherever the consumer UI renders "Saw a different number? Let us know →". Replacement copy/CTA is TBD with design (memory note says "likely point users at the existing counter card with 'Confirm this challenge' affordance"). Flagging as the single clarification eng will need to nail down in the plan PR — either by surfacing it to design for a tiny copy update, or by eng owning the conditional rendering and the eventual race-case toast.

### 🧱 Codebase fit
- ✅ All mock components use `var(--*)` tokens (`var(--bg)`, `var(--fg-subtle)`, `var(--surface-1)`, `var(--border)`, `var(--signal)`, etc.) — same token system the shipped event detail page uses.
- ✅ Shipped multi-tier components (`apps/web/src/components/consumer/multi-tier/MixedTierCard.tsx`, `MultiTierLiveCard.tsx`, `TierAlternateRow.tsx`, `TwoPendingStack.tsx`) are exactly the ones the mock filenames reference — reuse path is clean.
- ✅ `ProvenanceCTA` reuses 48px button bounds + `--signal` per CTA-color rule. Same height/radius/font as existing `PrimaryCTA` block in `page.tsx:216-281`. Drop-in replacement.
- ✅ Submit form reorder lands in `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx` (single existing modal, contained scope).
- 🟡 `FaceValueCard`, `ProvenanceCTA`, `MTAddTierSuccess`, `MultiSourceMultiTierCard` are net-new components — eng will need to land them under `apps/web/src/components/consumer/price-source/` (or similar) per the codebase's directory conventions. Not a design concern, just a placement note.

### ♿ Cross-cutting
- ✅ Outbound CTA: `ProvenanceCTA` uses real `<a target="_blank" rel="noopener noreferrer">` semantics (consistent with the shipped pattern at `page.tsx:243-260`).
- ✅ Multi-tier disclosure pattern: shipped `MultiTierLiveCard` philosophy is "see all prices at a glance without expanding" — no new disclosure pattern to accessibility-test; the reports caption ("· N reports") is text-on-text, not an interactive widget.
- ✅ Performance: net-new components are pure presentational; no new data fetches (everything composes from the already-shipped `EventDetailResponse.priceByTier`).
- 🟡 `aria-label` parity for the `ProvenanceCTA` resale variant: today's sold-out button uses `copy.soldOutAriaLabel` (`page.tsx:220`). The mocks don't specify what announces to a screen reader when "Sold out → Resale on Ticketmaster" replaces it — eng's call in the plan PR. Suggest: `aria-label="Buy resale on Ticketmaster — usually above face value"` to keep the resale caveat audible.

### ⏰ Drift from reality
- ✅ Three of four cycle PRs shipped since sign-off (#705, #722, #723) and **all implement exactly the locked decisions** in the README. No silent supersession.
- ✅ PR #731 (post-merge audit fixes to #722 + #723) is the kind of detail nobody designs around — empty-string `ticketUrl` normalization, keyset pagination on backfill, JSDoc cleanup. Doesn't touch design intent.
- ✅ #739 (admin contest-review spec/plan) is the #697 track flagged in the memory note as a separate, parallel cycle — not a price-source UI superseder; in fact the consumer Confirm/Contest path explicitly depends on it.
- ✅ No new beta feedback has reshuffled the design's underlying problem statement (sold-out → only-resale comprehension gap).
- ✅ Event detail page (`apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`) is unchanged from the "before" state in the mocks — dead sold-out button still rendered at lines 216-241.

### 📝 Decision log
- ✅ Sign-off block + three follow-up rounds present in README's "Eng review — sign-off & changes" section.
- ✅ Memory `project_price_source_discoverability.md` carries the consolidated locked-decision list (24 bullets); README has the design-side rationale. They agree.
- 🟡 **One un-locked thread:** the open design-side dependency at the bottom of the memory ("Design committed to adding a `PriceChip` selection-parity note to the handoff README") is still not in the README. Doesn't gate eng — the memory note already captures the requirement and PR 4 will catch it — but design should land the note before PR 4 opens so the README is the canonical reference future Claudes read.
- 🟡 **One new locked decision, not yet in README:** the dispute-affordance hiding rule (`project_pr4_dispute_affordance_hiding.md`, dated today). See Data contract dimension above — eng plan PR needs to fold this in, and a one-line addition to the README's "Eng review — sign-off & changes" section closing it off would be ideal.

## Eng-side clarifications

Plan PR for the Consumer UI PR will need to decide these:

1. **Dispute-affordance hiding (per `project_pr4_dispute_affordance_hiding.md`):** when `priceByTier[tier].counterSubmission !== null`, what replaces "Saw a different number? Let us know →" on that tier? Memory note suggests "Confirm this challenge" affordance pointing at the existing `PendingCardB`. Lock this in plan PR; coordinate one-line copy with design if needed.
2. **Defensive 409 handling for the race case** (same memory note): toast copy when a counter is filed between page load and submit — suggested "Another challenge was just filed — refresh to see it." Plan PR owns this.
3. **`aria-label` for the resale variant of `ProvenanceCTA`** when it replaces the sold-out button. Mocks don't specify; suggest the resale caveat carry through to the assistive label.
4. **Component placement** — likely `apps/web/src/components/consumer/price-source/` (or absorbed into the existing `multi-tier/` folder for the multi-tier-flavored components). Plan PR's call.
5. **`PriceChip` browse-card selection parity** — memory explicitly lists this as a PR 4 requirement. Plan PR needs a sub-task that hunts down the chip's current best-price selection logic and aligns it with `MultiTierLiveCard`'s headline-pick rules (`pickTierHeadline` / `compareTierRows` already exist in `apps/api/src/lib/price-aggregation/`; UI consumer needs to mirror, not re-derive).

## Decisions inherited

From the 2026-06-17 eng sign-off (all 9 decisions accepted), plus rounds 2/3 corrections:

- `source_category` directly replaces `how_found`'s tier-derivation role (eng #3) — locked, shipped in PR #705.
- Box office exempt from staleness; no separate "doesn't decay" badge (eng #5) — locked.
- 1/2 confirmation model with "Goes live once one more fan confirms." caption (eng #7+#8, round 2 #1) — locked.
- Contest scope price-only; `(tier, source)` slot fixed (eng #9) — locked.
- Tier enum unchanged (`GA / Reserved / VIP / Pit / Lawn`) (eng #4) — locked; revisit only when beta produces "doesn't fit" feedback.
- Vendor is required + demoted (round 2 #5) — locked.
- SeatGeek stays in the vendor enum and UI (round 3 #1 with eng follow-up correction) — locked.
- Vendor displays "Venue" (generic) when source-category = boxoffice (round 3 #2) — locked.
- Multi-source × multi-tier = no grid; tier-only surface axis; cross-source folds into `AlternateSourceRow` (round 3 #4) — locked.
- Confirm is property of pending submissions only; `PendingCardB` is the affordance — `MT_ConfirmContestFork` retired (round 3 #5) — locked.
- Multi-tier card reuses shipped `MultiTierLiveCard` / `MixedTierCard` / `TierAlternateRow` verbatim (round 2 #2) — locked.
- Resale = community-submitted (same pipeline as box-office) — locked.
- "Anonymous works" copy dropped (auth always required; handle optional) — locked.
- "All reports" link removed (round 2 #4) — locked.

From memory (post-sign-off):

- Dispute affordance hidden when `counterSubmission !== null` (`project_pr4_dispute_affordance_hiding.md`, 2026-06-23) — applies to PR 4 plan.

## Recent activity (since 2026-06-17)

| PR | Title | Merged | Assessment |
|---|---|---|---|
| #705 | feat: price-source schema — source_category + ticket_links + 1/2 corroboration | 2026-06-20 | ✅ Implements exactly the locked decisions. No design impact. |
| #706 | fix(crawler): expand isConcert prompt rules for false-negative patterns | 2026-06-20 | ✅ Unrelated (non-concert classification). No design impact. |
| #722 | feat: crawler emits ticketLinks for every event upsert | 2026-06-22 | ✅ Implements `ticketLinks` exactly as designed (kind: boxoffice / primary / resale; SeatGeek stays primary). Directly feeds `ProvenanceCTA`. |
| #723 | feat(api): per-tier price aggregation + dispute scope shrink | 2026-06-22 | ✅ Ships `priceByTier: TierPriceBlock[]` per the locked contract. Dispute scope shrunk to price-only per eng #9. No design impact — this is the supply side of PR 4's data needs. |
| #731 | fix(api,crawler): post-merge audit fixes for price-source PR 722 + 723 | 2026-06-22 | ✅ Defensive fixes (empty-string normalization, counter-visibility regression). No design impact. |
| #739 | docs(spec,plan): admin contest-review (#697) | 2026-06-24 | ✅ Parallel track called out in memory as a hard dependency before consumer Confirm/Contest elevation. No design impact on this handoff. |
| #733, #730, #729, #728, #719, #718, #717, #715 | Assorted admin / crawler fixes | 2026-06-20 → 2026-06-22 | ✅ Not in scope. No design impact. |

**Verdict on drift:** zero supersession. The three shipped PRs are exactly the supply side the Consumer UI PR needs — they didn't bake any UI choices that would conflict with the mocks.

# Gap Report — Price-Source Consumer UI

Generated 2026-06-24 via `design-review` skill — Agent 2 verification + Agent 3 confirmation pass on the implementation branch `feat/price-source-consumer-ui-impl`. Property table source-of-truth: `docs/superpowers/design-tables/price-source-consumer-ui.md` (merged via PR #778).

## Verification flow

1. **Agent 2 (verify)** — two passes against the property table + state coverage table. Returned 4 visual gaps + 6 state-reachability gaps.
2. **User triage** — explicit directive: NO DEFERRALS. Finalize the feature in totality. All 9 gaps slated for fix in this PR.
3. **Implementation** — fixes landed across 7 commits (530a2e0b → 4eaffd81). One judgment call surfaced: `lastAdminActionKind` pill was already on `DisputedPriceCard` (Task 12), so Fix 2 extended the same surface to `PendingCardB` for per-tier counter pending.
4. **Agent 3 (confirm)** — checked only the previously-flagged items. Verdict: **0 gaps remain.**

## IMPLEMENTED — Visual gaps (Pass A)

- **SubmitPriceModal number row layout** — was `display: grid` with `gridTemplateColumns: '1fr 1fr'`; now `display: flex` with `gap: 12` and `flex: 1; minWidth: 0` on each child. (`SubmitPriceModal.tsx:638`)
- **VENDOR_OPTIONS — 6 vendors locked** — user directive: keep all 6 shipped vendors (`Venue, AXS, Ticketmaster, SeatGeek, DICE, Eventbrite`). Property table §3 updated with a "Locked 2026-06-24" callout superseding the original 3-chip enumeration. (`docs/superpowers/design-tables/price-source-consumer-ui.md:349-355`)
- **Vendor label required asterisk** — vendor `ChipGroup` was missing the `req` prop. Added. The shipped `FormLabel` primitive renders the `var(--accent)`-colored asterisk separately per the property table §3 convention. (`SubmitPriceModal.tsx:702`)
- **EventCard `from={true}`** — was hardcoded `from={false}`; now `from={true}` to match property table §4 chip default and browse states #1–#4. (`EventCard.tsx:161`)

## IMPLEMENTED — State reachability gaps (Pass B)

- **State #6 — live tier headline + per-tier pending** — added `mixed-tier` decision kind. Triggers when blocks have headlines AND blocks have pending-only state. Routes through shipped `MixedTierCard` per property table §8. (`decision-tree.ts:54`, `EventDetailClient.tsx:799-871`, test `decision-tree.test.ts:241-272`)
- **State #7 — all tiers pending** — added `all-tiers-pending` decision kind. Triggers when no block has a headline AND at least one block has pending submissions. Routes through shipped `TwoPendingStack`. (`decision-tree.ts:61`, `EventDetailClient.tsx:891-945`, test `decision-tree.test.ts:278-323`)
- **State #18 — admin deferred engagement pill** — DisputedPriceCard already rendered the pill from Task 12. Extended the same surface to `PendingCardB` for per-tier counter pending. Pill renders when `view === 'other' && lastAdminActionKind === 'defer'`. (`PendingCardB.tsx:147,167,239-242`)
- **State #19 — `reports` caption** — `MultiTierLiveCard` now accepts `reports?: number` and renders `· ${reports} reports` when `reports > 1`. Both invocation sites in EventDetailClient pass `reports={block.reports}`. (`MultiTierLiveCard.tsx:42,55,132`, `EventDetailClient.tsx:702-704, 1023`)
- **Submit-success #1 — MTAddTierSuccess in all branches** — was branch-local to `multi-tier-shipped`. Hoisted to a `submitSuccessSurface` variable rendered in 7 modal-owning branches: `sold-out-resale`, `sold-out-contribute`, `no-price-resale`, `resale-headline`, `mixed-tier`, `all-tiers-pending`, `multi-tier-shipped`. (`EventDetailClient.tsx:444-462,522,550,607,723,871,945,1035`)
- **Browse #7 — `priceByTier` on list endpoint** — `GET /v1/events` now populates `priceByTier` per row (server uses `aggregateByTier` with empty pending/counter arrays since browse chips only read `block.headline`). `EventWithVenue` carries `priceByTier?: TierPriceBlock[] | null`. `EventCard` uses `pickBrowseHeadline(event.priceByTier)` with the legacy `resolveListChipKindLegacy` fallback only when `priceByTier` is null. Closes #787. (`apps/api/src/routes/events.ts:229-312`, `packages/types/src/index.ts:375,521`, `EventCard.tsx:59,67-69`, integration test `events.integration.test.ts:133,182`)

## DEFERRED

None. Per user directive — feature finalized in totality.

## Quality gate

- typecheck: clean (14/14 packages)
- lint: 0 errors (pre-existing warnings only)
- web tests: 722 passing across 80 files
- api unit: 203 passing across 20 files
- api integration: 331 passing across 19 files

Ready for PR.

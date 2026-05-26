# Phase 8.5 Consumer UI

Issues: #566 (price corroboration surfaces), #567 (event status reporting surfaces)
Design: design/design_handoff_phase8_5_corroboration/
Branch: feat/phase-8-5-consumer-ui

> Admin UI (#568) is a separate PR — not in scope here.

---

## Context

PR #569 (merged 2026-05-26) delivered the DB + API layer:
- `POST /v1/events/:id/price-submissions/:submissionId/confirm` (with method enum)
- `POST /v1/events/:id/reports` / `GET` / `POST .../confirm` / `DELETE` (withdraw)
- `PATCH /v1/admin/events/reports/:reportId/resolve`
- `ER_POLICY` constants in `@concert-crawl/types`

Consumer UI builds on top of these endpoints. All components live in
`apps/web/src/components/consumer/`.

Key integration file: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`

### API shape notes (actual vs design README)
The design README uses schema field names that differ slightly from what was built:
- Design `evidenceType` values ("email", "social", etc.) → API `evidenceMethod` values ("bought_myself", "saw_listing", "venue_site", "other")
- Design has separate `kind` + `status` fields → API uses `status` for the report type ("sold-out", "cancelled", "postponed")
- Design mentions `corroborationCount` on `eventReports` → not in current migration; omit for now

UI must match the actual API contract, not the design README schema literally.

---

## Tasks

### 1. API client additions

- [ ] 1a. Add `fetchEventReports(eventId, token?)` → `GET /v1/events/:id/reports`
- [ ] 1b. Add `confirmPriceSubmission(eventId, submissionId, method, token)` → `POST /v1/events/:id/price-submissions/:submissionId/confirm`
- [ ] 1c. Add `fileEventReport(eventId, body, token)` → `POST /v1/events/:id/reports`
- [ ] 1d. Add `confirmEventReport(eventId, reportId, token)` → `POST /v1/events/:id/reports/:reportId/confirm`
- [ ] 1e. Add `withdrawEventReport(eventId, reportId, token)` → `DELETE /v1/events/:id/reports/:reportId`

### 2. PendingCardB — pending price card (Direction B)

- [ ] 2. `components/consumer/PendingCardB.tsx`
  - Props: `floor`, `ceiling`, `tier`, `vendor`, `kind` ("community"|"boxoffice"), `submitter` (handle+url|null), `submittedAt`, `confirms`, `needed`, `view` ("other"|"submitter"|"self-locked"), `note?`, `onConfirm`, `onWithdraw`, `onEdit`
  - Renders: pending strip (azure/gold by kind) + eyebrow + headline + vendor line + attribution + optional note + footer CTA
  - "Face value · no fees" eyebrow only for `kind==="boxoffice"`
  - Footer states: Confirm button (other), dashed waiting badge (self-locked), Edit/Withdraw row (submitter)

### 3. CorroborationSheet — confirm with friction

- [ ] 3. `components/consumer/CorroborationSheet.tsx`
  - Props: `submission` (detail card data), `open`, `onClose`, `onConfirm(method)`, `onSubmitUpdate`
  - States: `fresh` (radio: same-vendor / other-vendor / box-office-saw / box-office-bought) and `self-locked`
  - Box-office "bought" path: fires confirm first, then opens `SubmitPriceModal` pre-filled with `kind=boxoffice` on confirm success
  - Bottom escape link: "Saw a different tier or a different price? Submit an update instead."
  - Accent follows submission kind (azure for community, gold for box-office)

### 4. DisputedPriceCard — update indicator

- [ ] 4. `components/consumer/DisputedPriceCard.tsx`
  - Wraps existing `PriceBlockB`-style live card
  - Adds dashed strip above headline: "[update pending] @kel saw $65–80 · 1h ago"
  - Strip uses `--fg-muted` neutral (NOT warning/danger)
  - Footer: "Got a different number? [Submit an update →]" → opens `CounterSubmitSheet`
  - Visible to all users (logged-in + anonymous)

### 5. CounterSubmitSheet — update form (Phase 8 form, update framing)

- [ ] 5. `components/consumer/CounterSubmitSheet.tsx`
  - Same fields as SubmitForm: floor (required), ceiling (optional), tier chips, vendor chips
  - CTA: "Submit update" with `--signal` color (NOT `--danger`)
  - Header copy: "Update the price."
  - Subtext: "Currently listed: $X–Y on {vendor}. Your update goes pending until another fan confirms."
  - POSTs to `POST /v1/events/:id/price-submissions` with `disputedSubmissionId` set

### 6. Multi-tier price display

- [ ] 6. `components/consumer/multi-tier/` folder with:
  - `TwoPendingStack.tsx` — two `PendingCardB`s stacked in the price-card slot
  - `MultiTierLiveCard.tsx` — cheapest tier as headline ("from $40 · GA") + `TierAlternateRow`s for higher tiers
  - `MixedTierCard.tsx` — handles mixed-trust state (box-office GA + community Reserved)
  - `TierAlternateRow.tsx` — single tier row used inside `MultiTierLiveCard`

### 7. Event reporting — ReportFooterLink + ReportSheet + EvidenceForm

- [ ] 7a. `components/consumer/reporting/ReportFooterLink.tsx`
  - Label: "Report a status change"
  - Subtext: "Sold out, cancelled, postponed — or back on."
  - Opens `ReportSheet`
- [ ] 7b. `components/consumer/reporting/ReportSheet.tsx`
  - Conditional options based on `liveStatus` prop (null | "sold-out" | "cancelled" | "postponed")
  - null → Sold out / Postponed / Cancelled
  - "sold-out" → Tickets available / Postponed / Cancelled
  - "postponed" → Tickets available / Cancelled
  - "cancelled" → Tickets available only
  - On pick → opens `EvidenceForm`
- [ ] 7c. `components/consumer/reporting/EvidenceForm.tsx`
  - Radio: Got an email / Saw it on social / Venue posted / I was at/called the venue / Something else
  - Optional URL field
  - Optional notes (280 char)
  - Submit CTA colored by report type (cancelled → `--danger`, postponed → `--warning`, sold-out → `--warning`, tickets-available → `--success`)
  - Imminent show (< 7 days) warning panel: "This show is in N days — we need 3 confirms instead of 2."

### 8. Event reporting — pending state banners + cards

- [ ] 8a. `components/consumer/reporting/PendingSoldOutCard.tsx`
  - Renders in the price-card slot (NOT above title)
  - Strikethrough price + pending strip + reporter's evidence as clickable row
  - Three views: other fan (Confirm CTA), reporter (Add evidence / Withdraw), self-locked
- [ ] 8b. `components/consumer/reporting/PendingReportBanner.tsx`
  - Props: `kind` ("cancelled"|"postponed"), `confirms`, `needed`, `view`, `reportedAt`, `evidenceMethod`
  - Renders **above the title** for cancelled/postponed
  - Cancelled: `--danger`, price card hidden
  - Postponed: `--warning`, price card still visible
  - Dot progress: `needed` prop drives count
  - Three views: other fan (Confirm CTA), reporter (Add evidence / Withdraw), self-locked

### 9. Event reporting — ConfirmReportSheet + LiveReportBanner

- [ ] 9a. `components/consumer/reporting/ConfirmReportSheet.tsx`
  - Radio options: "I saw the same source" / "I have my own evidence" / "I heard from someone at the venue"
  - Escape hatch at bottom: routes to conditional `ReportSheet` with liveStatus set
  - POSTs to `POST /v1/events/:id/reports/:reportId/confirm`
- [ ] 9b. `components/consumer/reporting/LiveReportBanner.tsx`
  - Rendered once a report has been promoted (resolvedAt set, resolution="promoted")
  - Props: `status` ("sold-out"|"cancelled"|"postponed"), `promotedAt`, `confirmCount`
  - Uses same color tokens as pending banners but without the progress strip
- [ ] 9c. `components/consumer/reporting/ReportTypeMark.tsx`
  - Small inline badge component — shared pill used in banner headers

### 10. Event detail page integration

- [ ] 10a. Fetch event reports on server (`GET /v1/events/:id/reports`) alongside existing event fetch; pass to client
- [ ] 10b. Wire `PendingCardB` + `CorroborationSheet` into the price block area (replaces current `VerifySheet` / `SubmissionList` pending card rendering)
- [ ] 10c. Wire `DisputedPriceCard` when a pending submission has `disputedSubmissionId` set
- [ ] 10d. Wire `TwoPendingStack` / `MultiTierLiveCard` / `MixedTierCard` when multiple pending or live submissions exist
- [ ] 10e. Wire `PendingReportBanner` above title when an unresolved cancelled/postponed report exists
- [ ] 10f. Wire `PendingSoldOutCard` in price slot when an unresolved sold-out report exists
- [ ] 10g. Wire `LiveReportBanner` when a promoted report exists
- [ ] 10h. Wire `ReportFooterLink` at bottom of event detail, beneath related shows
- [ ] 10i. Update `SubmissionList` confirm action to use new `/v1/events/:id/price-submissions/:submissionId/confirm` endpoint

### 11. Seed data for local testing

- [ ] 11. Update `packages/db/src/seed.ts` (or equivalent seed script) with:
  - Event A: two pending community price submissions at different tiers (TwoPendingStack flow)
  - Event B: corroborated community price + pending counter-submission (DisputedPriceCard flow)
  - Event C: box-office pending price (gold pending card)
  - Event D: pending sold-out report (PendingSoldOutCard flow)
  - Event E: pending cancelled report (PendingReportBanner --danger, price hidden)
  - Event F: pending postponed report (PendingReportBanner --warning, price visible)
  - Event G: promoted/live sold-out (LiveReportBanner, price strikethrough)
  - Event H: promoted/live cancelled (LiveReportBanner, event status=cancelled)
  - Event I: imminent show (date within 7 days) with pending cancelled report (3-confirm threshold)
  - All seeded with realistic prices, venues, and submission metadata

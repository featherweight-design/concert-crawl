# Multi-Tier Price Submission — Design Spec

**Issue:** #832
**Date:** 2026-07-10
**Status:** Approved (brainstorm complete, all sections reviewed)

---

## Problem

A user standing at the box office sees prices for multiple tiers at once — GA $45, VIP $120 — but the submit-a-price flow only accepts one tier per submission, and the per-user rate limit plus the pending-submission check block a second submission immediately after the first. The result: users can only contribute one tier's price per event, and multi-tier events end up with incomplete community pricing.

Beta feedback (2026-06-26 prod test): "no multi-tier price submission (GA+VIP)."

## Locked Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Product shape | Single-form **bundle** submission is the primary flow; the existing one-tier "trickle" flow stays clean and unchanged |
| 2 | Corroboration | **Per-tier confirms** — each tier row corroborates independently, exactly as single submissions do today |
| 3 | UI pattern | **Single form with "Add another tier"** — one modal, repeatable tier panels |
| 4 | API shape | **New atomic batch endpoint** — one request, one atomic insert, all rows or none |

---

## Section 1 — Data Model

**No schema change.** A bundle of N tiers is persisted as N ordinary `price_submissions` rows, one per tier. Each row is indistinguishable from a single-tier submission downstream — corroboration, staleness expiry, disputes, admin review, and price display all operate per-row with zero changes.

Constraints that already exist and continue to hold:

- `submission_tier` enum: `GA | Reserved | VIP | Pit | Lawn` — a bundle can contain at most 5 tiers in practice (API caps at 10 for forward headroom, but the tier-uniqueness rule binds first).
- One pending submission per `(event, user, tier)` — enforced by the duplicate check in the batch handler (same check the single-row POST performs today).
- `price_submissions_event_tier_boxoffice_uniq` partial unique index (one corroborated box-office row per event+tier) is unaffected — batch rows insert as `status = 'pending'`.

No bundle/group ID column. Rows in a bundle are not linked after insert; the bundle is an ephemeral submission-time concept only. If a future feature needs bundle grouping (e.g. "edit whole bundle"), that is a new expand-phase column then — not now (KISS).

## Section 2 — API Contract

### New endpoint

```
POST /v1/events/:eventId/price-submissions/batch
```

- **Auth:** same as single POST — `clerkAuth` (+ `requireAuth` when `REQUIRE_BETA_AUTH=true`).
- **Body:** bundle-level fields + per-tier rows:

```jsonc
{
  "vendor": "VenueBoxOffice",          // shared across all rows
  "howFound": "at_the_venue",          // shared; API accepts any HowFound value — the web client derives 'bought_myself' for boxoffice via howFoundForSource
  "sourceCategory": "boxoffice",       // shared, optional (derived when absent, same as single POST)
  "note": "posted at the window",      // shared, optional, max 280, moderated once
  "tiers": [
    { "tier": "GA", "priceMin": 45 },
    { "tier": "VIP", "priceMin": 120, "priceMax": 150 }
  ]
}
```

- **Validation (Zod):**
  - `tiers`: array, min 1, max 10, tiers must be unique within the request.
  - Each row reuses the existing per-row field rules from `submissionBodySchema` (price floor/ceiling ranges, `priceMax >= priceMin` refinement).
  - Bundle-level fields reuse the existing enums. `disputedSubmissionId` is **not** accepted — counters stay single-row through the existing endpoint.
- **Atomicity:** all rows insert via a single multi-row INSERT — one statement is inherently atomic (all rows land or none), so no explicit `db.transaction` wrapper is needed. Any per-row failure (duplicate pending tier, moderation reject, price out of range) rejects the whole batch before the insert runs.
- **Errors:** `422` with a per-row error list so the UI can annotate the exact panel:

```jsonc
{
  "success": false,
  "errors": [
    { "index": 1, "tier": "VIP", "error": "already_submitted" }
  ]
}
```

- **Success:** `201` returning the full inserted submission rows (same shape as the GET list items) so the client can push them into local state without a refetch.
- **Rate limiting:** one batch = **one** rate-limit hit (it is one act of contribution). The existing per-user recent-submission window applies to the batch as a unit; a batch is blocked if the user is inside the window, and a successful batch starts the window.

### Existing endpoints unchanged

`POST /v1/events/:id/price-submissions` (single), PATCH (edit), confirms, disputes/counters — all untouched. The single POST gains a `@deprecated`-style comment pointing at the batch endpoint but is not removed (old clients, counter flow depends on it).

## Section 3 — UI

`SubmitPriceModal` (apps/web/src/components/consumer/submit-price/) becomes the bundle form:

- **Bundle-level fields** (asked once, top of form): where the price is from (`sourceCategory`), vendor, how found, optional note.
- **Per-tier panels**: each panel = tier picker + price (min, optional max).
  - "Add another tier" button appends a panel (cap 10; realistically capped at 5 by tier uniqueness).
  - The tier picker in each panel **disables tiers already selected** in other panels.
  - Each panel has a ✕ remove control — hidden when only one panel exists.
- **Submit button label**: "Submit price" for 1 panel, "Submit N tiers" for N > 1.
- **Errors:** a 422 response maps `errors[].index` onto the matching panel and renders the message inline (e.g. "You already submitted a GA price — edit it from the event page"). The form stays fully intact — atomic rejection never wipes input.
- **Success:** the 201 rows are pushed into `EventDetailClient`'s `localSubmissions` (its `onSuccess` signature changes from a single submission to an array), so all tiers appear immediately without refetch.
- **Parity:** identical behavior mobile and desktop (per project rule); layout may differ, behavior may not.
- All customer-facing strings live in the component's `definitions/copy.ts` (project copy rule).

The single-tier "trickle" experience is just the same form with one panel — no separate code path.

## Section 4 — Edge Cases & Rollout

- **Edit mode:** editing an existing submission opens the same modal **constrained**: tier locked (picker disabled), no "Add another tier", submit label "Save changes". It calls the existing PATCH endpoint. Editing never converts a single into a bundle or vice versa.
- **Withdraw / disputes / counters:** unchanged. Counters (CounterSubmitSheet) continue through the single POST with `disputedSubmissionId`; a counter is inherently single-tier.
- **Corroboration:** per-tier, unchanged. Each row in a bundle collects confirms independently and corroborates/expires on its own schedule.
- **Modal is a replacement, not net-new:** the existing SubmitPriceModal is refactored in place; no parallel component.
- **Rollout:** single PR (API batch endpoint + modal refactor + tests + release note). Expand/contract not needed — no schema change. Old single POST endpoint stays; deprecation is a comment only.

## Section 5 — Testing

### API integration — new `apps/api/src/routes/price-submissions-batch.integration.test.ts`

1. Happy path: 2-tier batch → 201, two pending rows, correct fields on both.
2. Single-tier batch (N=1) → behaves identically to the single endpoint's insert.
3. Duplicate tier within the request → 422 before any insert.
4. Tier already pending for this user+event → 422 with `{index, tier, error: "already_submitted"}`, zero rows inserted (atomicity).
5. One row's price out of range → 422 per-row error, zero rows inserted.
6. Note moderation reject → 422, zero rows inserted.
7. `sourceCategory` absent → derived from (vendor, howFound), persisted non-null on every row.
8. Rate-limit window active → batch blocked as a unit.
9. Successful batch starts the rate-limit window (immediate second batch blocked).
10. Unauthenticated (when `REQUIRE_BETA_AUTH=true`) → 401.
11. `tiers` empty array / > 10 entries → 422 from Zod.

### Web unit — `SubmitPriceModal.test.tsx` (extended)

- Add-another-tier appends a panel; cap enforced.
- Tier picker disables tiers chosen in other panels.
- ✕ hidden at one panel; removing a panel re-enables its tier elsewhere.
- Submit label switches "Submit price" ↔ "Submit N tiers".
- 422 per-row errors render inline on the right panel; form values preserved.
- 201 response calls `onSuccess` with the full row array.
- Edit mode: tier locked, no add-tier, "Save changes", PATCH called.

### Web unit — `EventDetailClient.test.tsx`

- `onSuccess` array signature: multiple rows land in `localSubmissions` and render.

### Not covered

- **No new E2E** — flow is exercised by API integration + component tests; E2E suite already covers modal open/submit plumbing.
- **Manual smoke** (post-merge, staging): 2-tier bundle at box office source; single-tier trickle; duplicate-tier rejection keeps form intact.

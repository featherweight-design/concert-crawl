# Price Transparency v2 — Design Spec

**Date:** 2026-05-08  
**Phase:** Price Transparency v2 (sub-phase after 7.5)  
**Status:** Approved for implementation

---

## Overview

Price Transparency v2 replaces the inline freeform price submission form on the event detail page with a structured, community-driven flow. Fans submit prices they actually saw; two peer confirms move a submission from *pending* to *corroborated*. Disputes require an alternate price + vendor, not a simple flag.

This phase ships:

1. **Submit Route** — `/events/[id]/submit-price`, dedicated full-screen page
2. **SubmitForm** — structured form (no freeform inputs; tier/vendor/source are enum chips)
3. **CommunityPriceChip** — replaces the current `PriceSubmissionForm` inline block on event detail
4. **Verify Sheet** — bottom sheet listing all submissions with confirm/dispute actions
5. **Dispute Page** — `/events/[id]/submissions/[submissionId]/dispute`, dedicated route
6. **`alreadySubmitted` state** — shown on Submit Route when the user already has a pending submission

---

## Architecture Decisions

Four decisions were made before spec was written:

| # | Topic | Decision |
|---|-------|----------|
| 1 | Corroboration model | Explicit confirms only (`submission_confirms` join table). Auto-corroboration on POST removed. Price-tolerance check kept as a **soft outlier warning** only (yellow, not an error, does not block submit or change status). |
| 2 | Schema migration style | **Clean-cut** — no expand/contract needed. No production data exists. Drop `tierLabel`/`sourceNote` (freeform text); add `tier`, `vendor`, `howFound` enums; add `disputedSubmissionId` nullable self-ref FK; new `submission_confirms` table. |
| 3 | Dispute storage | Disputes are stored as rows in `priceSubmissions` with a non-null `disputedSubmissionId` FK pointing to the submission being disputed. Not a separate table. |
| 4 | Confirm idempotency | `submission_confirms` join table: `{ submissionId, userId, confirmedAt }`, unique constraint on `(submissionId, userId)`. Insert-or-ignore on confirm. |

---

## Database Schema

### `priceSubmissions` table changes

**Remove:**
- `tierLabel` (text) — replaced by `tier` enum
- `sourceNote` (text) — replaced by `howFound` enum

**Add:**
- `tier` — enum `('GA', 'Reserved', 'VIP', 'Pit', 'Lawn')`, not null
- `vendor` — enum `('AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite', 'VenueBoxOffice')`, not null
- `howFound` — enum `('bought_myself', 'saw_listing', 'at_the_venue')`, not null
- `disputedSubmissionId` — `uuid` nullable FK → `priceSubmissions.id` (self-referential; null = original, non-null = dispute)

**Keep unchanged:**
- `id`, `eventId`, `userId`, `priceMin`, `priceMax`, `status`, `corroborationCount`, `createdAt`, `updatedAt`

**Status enum stays as-is:** `pending | corroborated | disputed | stale`

A submission becomes `corroborated` when its `corroborationCount` reaches 2 (set by a DB trigger or by the confirm endpoint incrementing and checking). A submission becomes `disputed` when any dispute row is filed against it (dispute endpoint sets the parent's status).

### New: `submission_confirms` table

```
id              uuid PK
submissionId    uuid FK → priceSubmissions.id (CASCADE DELETE)
userId          text (Clerk user ID)
confirmedAt     timestamptz DEFAULT now()

UNIQUE (submissionId, userId)
```

### Migration strategy

Single migration file. Drop old columns, add new columns + enums, create `submission_confirms` table. Safe because no production data.

---

## API Changes

### Existing endpoints — changes

**`POST /v1/events/:id/price-submissions`**
- Request body changes: replace `tierLabel`/`sourceNote` with `tier`/`vendor`/`howFound` (all required)
- Remove auto-corroboration logic on POST
- Add server-side validation matching `SP_POLICY` (see Validation section)
- Rate-limit: 1 submission per user per event per 24h (return `429` if violated)
- New `alreadySubmitted` check: if the user has an existing pending submission for this event, return `409` with the existing submission in the body

**`GET /v1/events/:id/price-submissions`**
- Response shape: include `confirms` count, `byYou` boolean, `disputedSubmissionId`, `howFound`, `tier`, `vendor`
- Add `alreadySubmitted` top-level boolean + `userSubmission` object (null if none)

### New endpoints

**`POST /v1/submissions/:id/confirm`**
- Auth: required
- Insert into `submission_confirms`; on unique conflict do nothing (idempotent)
- Increment `priceSubmissions.corroborationCount`
- If `corroborationCount >= 2`, set `status = 'corroborated'`
- Cannot confirm your own submission (403)
- Response: `{ confirms: number, status: SubmissionStatus }`

**`GET /v1/submissions/:id`**
- Auth: required
- Returns a single submission by ID (used by `DisputePage` to load the disputed submission)
- Response: full submission row including `eventId`, `tier`, `vendor`, `howFound`, `priceMin`, `priceMax`, `status`, `createdAt`

**`POST /v1/submissions/:id/dispute`**
- Auth: required
- Body: `{ floor: number, ceiling?: number, vendor: Vendor }`
- Validates `floor` (required, 1–2000), `ceiling` (optional, ≤ 2000), `vendor` (required)
- Creates a new `priceSubmissions` row with `disputedSubmissionId = :id`, `tier` + `howFound` inherited from parent (or accepted as optional overrides)
- Sets parent submission `status = 'disputed'`
- Cannot dispute your own submission (403)
- Response: the newly created dispute row

**`PATCH /v1/submissions/:id`**
- Auth: required, own submission only
- Body: partial `{ floor?, ceiling?, tier?, vendor?, howFound? }`
- Only allowed while `status = 'pending'` (400 if corroborated or disputed)
- Response: updated submission row

**`DELETE /v1/submissions/:id`**
- Auth: required, own submission only
- Soft-delete or hard-delete (hard delete is fine; no production audit required yet)
- Response: 204

---

## Validation Rules (`SP_POLICY`)

Server enforces canonically; client mirrors for UX feedback.

| Rule | Value | Error / Behavior |
|------|-------|-----------------|
| `floorMin` | 1 | "Has to be at least $1." (error, blocks submit) |
| `floorMax` | 2000 | "Cap is $2000 — pick a number that exists." (error) |
| `ceilingMax` | 2000 | "Cap is $2000." (error) |
| Ceiling < floor | — | "Ceiling can't be below floor." (error) |
| `tier` required | — | "Pick a tier." (error) |
| `vendor` required | — | "Pick where it's listed." (error) |
| `howFound` required | — | "Pick how you found out." (error) |
| Outlier low | floor < 0.4 × avg of peer submissions for event | **Soft warning** (yellow border + "Other fans reported around $X. Sure about this one?") — does not block submit |
| Outlier high | floor > 2.5 × avg | Same soft warning |
| `confirmsRequired` | 2 | Pending → corroborated after 2 unique user confirms |
| `rateLimitHours` | 24 | 1 submission per user per event per 24h (429 on violation) |

No freeform inputs. Tier, vendor, and howFound are all enum chips. No "Other…" option.

---

## Web Routes

| Route | Component | Notes |
|-------|-----------|-------|
| `/events/[id]/submit-price` | `SubmitPricePage` | Full-screen submit route; shows `alreadySubmitted` state if applicable |
| `/events/[id]/submissions/[submissionId]/dispute` | `DisputePage` | Receives `submissionId` as a route param; loads submission via API |

Both routes are under `(protected)` — require auth.

---

## UI Components

### `SubmitPricePage` (`app/(protected)/events/[id]/submit-price/page.tsx`)

Server component shell. Fetches event + checks `alreadySubmitted` via `GET /v1/events/:id/price-submissions`. Passes data to `SubmitForm`.

**Mobile layout (default):**
- Header: `← Back` (JetBrains Mono 11/700 uppercase, `--fg-muted`), CC cluster mark + wordmark right
- Scrollable body, `12px 20px 16px` padding

**Desktop layout (≥ 640px):**
- Header: logo left, `← Back to {artist}` right
- Centered `max-w-[520px]` column, `padding: 32px 32px 40px`

### `SubmitForm` (`components/consumer/SubmitForm.tsx`)

Client component. Internal state:
```ts
type FormState = { floor: string; ceiling: string; tier: Tier | null; vendor: Vendor | null; howFound: HowFound | null }
type Phase = 'empty' | 'submitting' | 'success' | 'error' | 'alreadySubmitted'
```

Sections (vertical stack, gap 18px):
1. `DetailContextHeader` — "Submit a price" label, artist name, venue · date
2. Anti-abuse banner — shield icon, copy about $2000 cap and 2-confirm rule
3. Floor + Ceiling row — two `SPNumberField` side by side
4. Tier chip group — GA / Reserved / VIP / Pit / Lawn (single-select, no deselect)
5. Vendor chip group — AXS / Ticketmaster / SeatGeek / DICE / Eventbrite / Venue box office
6. HowFound chip group — Bought it myself / Saw the listing / At the venue
7. Submit button — full-width, 50px, `--signal` bg + glow
8. Footer hint — anonymous, pending, rate-limit copy

**`alreadySubmitted` phase:** Replace form with a card showing the user's existing submission (PendingPill, price line, vendor + source mono line) + Edit + Withdraw buttons.

**`success` phase:** Replace form with success card (green bg tint, checkmark, "Got it. Thanks.", body copy about pending status).

### `SPNumberField` (`components/consumer/SPNumberField.tsx`)

Controlled input. Props: `value`, `onChange`, `placeholder`, `hint`, `required`, `error?: string`, `warning?: string`. Strips non-digits on input. Shows `$` prefix (JetBrains Mono 14/700, `--fg-muted`). Border: default `--border-strong`, error `--danger`, warning `--warning`.

### `ChipGroup` (`components/consumer/ChipGroup.tsx`)

Props: `label`, `options: { value, label }[]`, `value`, `onChange`, `error?: string`. Single-select. Active chip: `--signal` border/text + tinted bg. Inactive: `--border-strong` + `--fg`.

### `CommunityPriceChip` (`components/consumer/CommunityPriceChip.tsx`)

Replaces the current `PriceSubmissionForm` inline block on the event detail page. Shown whenever there is at least one community submission for the event (regardless of status).

Card structure (`--surface-1` bg, 1px `--border`, 12px radius, 14/14 padding, gap 10):
- Pill row: `community` pill + ConfirmedPill or PendingPill
- Price line: `$floor` (Inter 28/900) optionally `– $ceiling`, tier label (mono uppercase)
- Vendor line: "seen on {vendor}" (mono 11)
- Attribution line: "Submitted by N fans · most recent X ago" (or `@handle` if attribution = handle)
- Action row (dashed border top): "Saw the same" quick-confirm button (left) + "{N} reports →" link (right, opens Verify Sheet)

The "Saw the same" button calls `POST /v1/submissions/:id/confirm` optimistically.

### `VerifySheet` (`components/consumer/VerifySheet.tsx`)

Bottom sheet triggered by the "{N} reports →" link. Client component.

- Pinned to bottom, scrim backdrop, 20px top radius, `--bg-elevated` bg
- Max-height 82vh, scrollable content
- Grabber bar at top
- Content: `DetailContextHeader` (dense), lead copy, `SubmissionList`, Close button
- Opens via local state (`verifyOpen: boolean`) in the parent event detail page

### `SubmissionList` + `SubmissionCard` (`components/consumer/SubmissionList.tsx`)

List of submissions fetched from `GET /v1/events/:id/price-submissions`.

Per card:
- Pill row: ConfirmedPill or PendingPill + optional `you` pill + timestamp right-aligned
- Price line: `$floor` / `– $ceiling` / tier
- Vendor + source line (mono)
- Actions (peer submissions only): Confirm button (calls confirm endpoint, optimistic) + Dispute button (navigates to dispute page)
- Own submission: highlighted card (`--accent` border tint), no action buttons

### `DisputePage` (`app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx`)

Loads the disputed submission via `GET /v1/submissions/:submissionId`.

Layout:
- Header: "← Cancel" left, "Dispute price" centered, 60px spacer right
- Body: `DetailContextHeader`, "You're disputing" card, explanatory copy, `DisputeForm`

### `DisputeForm` (`components/consumer/DisputeForm.tsx`)

- `--danger` border container
- "What did *you* see instead?" title
- Floor + Ceiling row
- Vendor chip group
- Cancel + "File dispute" buttons
- On success: replace form with "Logged. Your alternate price will show up alongside this one." card

---

## Event Detail Page Integration

`apps/web/src/app/(protected)/events/[id]/page.tsx` changes:

- Remove `PriceSubmissionForm` (existing inline form)
- Add `CommunityPriceChip` — shown when there is at least one community submission for the event
- Add `VerifySheet` — rendered in the page, opened by `CommunityPriceChip`'s "{N} reports →" link
- "Submit a price you saw" CTA links to `/events/${id}/submit-price` — **always shown** (even when a primary price exists; the CTA is how fans corroborate or challenge it)

---

## Copy (locked)

All copy strings are final from the design handoff. Key strings:

- Anti-abuse banner: "Prices are capped at **$2000**. Submissions stay *pending* until 2 fans confirm."
- Footer hint: "Anonymous to other fans. Goes out as *pending* until 2 confirm. We rate-limit at 1 per show per 24h."
- Success body: "Your price is in. It'll show up tagged **pending** until 2 other fans corroborate it. We'll let you know if anyone confirms or disputes."
- `alreadySubmitted` hint: "You can submit one price per show every 24h."
- Verify sheet lead: "Confirm what you saw, dispute what looks off. Two confirms move a price out of *pending*."
- Dispute explainer: "A dispute needs an alternate price + vendor. If you saw something different, log it — that's how we find the truth."
- Dispute form sub: "Disputes have to come with a price and a vendor. Keeps it honest."
- Dispute success: "Logged. Your alternate price will show up alongside this one."

---

## Design Tokens Mapping

Electric theme (default dark). All tokens already exist in the codebase's theme system:

| Design token | Tailwind / CSS var equivalent |
|---|---|
| `--bg` | `bg` |
| `--bg-elevated` | `bg-elevated` |
| `--surface-1` | `surface-1` |
| `--surface-2` | `surface-2` |
| `--surface-3` | `surface-3` |
| `--border` | `border` |
| `--border-strong` | `border-strong` |
| `--fg` | `fg` |
| `--fg-muted` | `fg-muted` |
| `--fg-subtle` | `fg-subtle` |
| `--accent` | `accent` (pink) |
| `--signal` | `signal` (cyan) |
| `--success` | `success` |
| `--warning` | `warning` |
| `--danger` | `danger` |
| `--fg-on-accent` | `fg-on-accent` |

---

## Testing

### Unit tests (Vitest)
- `SP_POLICY` validation rules — cover all error + warning branches
- Confirm idempotency — same `userId` + `submissionId` should not double-count
- Dispute logic — parent status transitions to `disputed` on dispute creation

### Integration tests (Vitest + real Postgres)
- `POST /v1/events/:id/price-submissions` — creates row, enforces rate limit, returns 409 on duplicate
- `POST /v1/submissions/:id/confirm` — increments count, transitions to `corroborated` at 2, blocks own-submission confirm
- `POST /v1/submissions/:id/dispute` — creates dispute row, sets parent `disputed`, validates required fields
- `PATCH /v1/submissions/:id` — updates own submission, rejects on wrong owner or wrong status
- `DELETE /v1/submissions/:id` — deletes own, rejects on wrong owner

### E2E tests (Playwright, staging)
- Submit flow: fill form → submit → see success state
- `alreadySubmitted` state: submit → navigate back → see existing submission card
- Confirm flow: peer confirms a submission → confirm count increments
- Dispute flow: tap Dispute → fill dispute form → see success state

---

## Out of Scope

- Multiple disputes per submission by the same user
- Edit / Withdraw page flows (stubbed in `alreadySubmitted` state, not specced as full pages — inline handlers are sufficient for MVP)
- Desktop verify sheet (mobile bottom sheet only for now)
- Push notifications for confirm/dispute events (Phase 8+)
- "Yell if it drops" wiring (deferred — already noted as local state only)

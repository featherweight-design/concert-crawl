# Gap Report — Admin Contest-Review UI

Generated 2026-06-24 via design-review Agent 2 across 4 parallel verification passes (PriceDisputesQueue, AdminEntry, AdminDisputePanel, state reachability).

---

## IMPLEMENTED — Visual properties (verified by Agent 2)

- **PriceDisputesQueue** (§1 + §2) — 89/90 rows ✅ MATCH. Container/header/badge/columns/rows/cells all pinned to the property table.
- **AdminEntry** (§3b) — 34/36 rows ✅ MATCH. Container, winner border + badge, price typography, tier, metadata grid, note section all pinned.
- **AdminDisputePanel** (§3) — 88/91 rows ✅ MATCH. Container, eyebrow, title, status pill, guidance, two-up grid, vs divider, reason field, all three action buttons (text/bg/border/color/font) pinned.
- **AdminDisputePanel** (§6 edge cases) — 6/7 rows ✅ MATCH. Read-only mode, deferred chip, mutation error display, loading + error states implemented.
- **AdminDisputePanel** (§7 accessibility) — 4/4 rows ✅ MATCH. ESC keybind, first-button focus on mount, aria-label on reason, mobile carve-out at parent route level.

## IMPLEMENTED — State reachability (Agent 2 Pass 2)

- **Empty queue** — type ✅, route ✅, branch ✅, props ✅
- **Queue with N contests** — type ✅, route ✅, branch ✅, props ✅
- **Detail: pending (actionable)** — type ✅, route ✅, branch ✅, props ✅
- **Detail: deferred chip** — type ✅, route ✅, branch ✅, props ✅
- **Detail: stale** — type ✅, route ✅, branch ✅, props ✅
- **Sidebar badge** — counts.priceContests in pendingReview sum ✅
- **Tab pill** — ReviewTabs descriptor with kind='warning' ✅

---

## IMPLEMENTED — Gap fixes (G1–G9)

All nine gaps surfaced by the design-review Agent 2 verification pass were
addressed in the same branch before opening the PR. Each fix landed with
matching test coverage; full quality gate (typecheck, lint, web tests, contest
integration tests) passes after the bundle.

### G1. archivedReason surfaced through detail endpoint + read-only banner ✅

- API: `apps/api/src/routes/admin/contests.ts` detail handler SELECTs
  `priceSubmissions.archivedReason` on both parent and counter rows and projects
  them onto the response.
- Type: `ContestDetailData` in `apps/web/src/lib/queries/admin-contests.ts` adds
  `archivedReason: string | null` to both `parent` and `counter` shapes.
- UI: `AdminDisputePanel` read-only banner now appends an "Admin reason" label +
  blockquote with the archived side's reason text when present.
- Copy: `panel.archivedReason = 'Admin reason'` added to `definitions/copy.ts`.
- Tests: extended `AdminDisputePanel.test.tsx` with two cases (parent-archived
  and counter-archived). Extended `contests.integration.test.ts` resolved-detail
  case to assert `counter.archivedReason` round-trips and `parent.archivedReason`
  stays null when parent corroborated.

### G2. Precondition error message surfaced inline ✅

- `ApiError` in `apps/web/src/lib/api.ts` gained an optional `code` field
  (parameter-property style — additive, no breakage). The request body type
  threads through `body.code`.
- `AdminDisputePanel` now stores the latest mutation error message in state
  (string | null) and falls back to the generic copy only when the error has no
  readable message. `mutationErrorMessage(err)` helper centralizes the precedence
  (ApiError.message → Error.message → generic copy).
- Tests: extended `AdminDisputePanel.test.tsx` with a case asserting the
  server's specific message ("Parent tier GA does not match challenger tier VIP")
  surfaces from an ApiError(409, …, 'precondition_failed') and the generic copy
  is NOT shown when a specific message is available.

### G3. Flat EventDetailResponse.counterSubmission carries engagement-signal fields ✅

- `packages/types/src/index.ts` flat `counterSubmission` shape adds
  `lastAdminActionAt: string | null` and `lastAdminActionKind: 'defer' | null`.
- No API change required — the route already writes both fields on the wire
  (events.ts:666–675). Pre-existing integration assertions at
  `events.integration.test.ts:500–501, 575–576` already cover the wire
  shape; this fix closes the type-layer gap.

### G4. Mutation error alert moved below the textarea, above the action row ✅

- `AdminDisputePanel` reorders the JSX so the inline error renders between the
  reason char-count row and the action button row.
- Tests: extended `AdminDisputePanel.test.tsx` with a case using
  `Node.compareDocumentPosition` to assert the alert appears AFTER the textarea
  and BEFORE the "Keep original" button in document order.
- Copy comment in `definitions/copy.ts` updated to reflect the new placement.

### G5. 404 differentiation wired to notFound copy ✅

- `AdminDisputePanel` error branch checks `detail.error instanceof ApiError &&
status === 404` first; when true, renders the contest-specific `notFound`
  copy in a neutral panel with no retry affordance. Any other error keeps the
  generic banner + retry button.
- Tests: extended `AdminDisputePanel.test.tsx` with two cases — one asserting
  404 renders `notFound` copy with no retry button, another asserting non-404
  (500) renders the generic banner with retry.

### G6. Header layout — eyebrow + title left, status pill + chip right ✅

- `AdminDisputePanel` header restructured to `display: flex; justifyContent:
space-between; alignItems: flex-start; gap: 12`. Left container holds eyebrow
  - title; right container holds the status pill + optional deferred chip with
    `flexShrink: 0`. Mirrors design source dispute-surfaces.jsx:753–776 (single
    horizontal flex row).

### G7. Header bottom margin standardized to 16px ✅

- Header now carries a fixed `marginBottom: 16` regardless of read-only vs.
  active state. The conditional 12 (active) / 18 (read-only) marginTop on the
  next block was removed so the header owns the spacing rhythm.

### G8. Title margin set to top-only ✅

- Title `margin` changed from `'4px 0'` (top + bottom) to `'4px 0 0'` (top
  only). Matches design source dispute-surfaces.jsx:764.

### G9. AdminEntry renders the trust pill in the headline row ✅

- `AdminEntry.tsx` now renders the trust pill beside the price + tier in the
  headline row. Maps `sourceCategory` ('boxoffice' | 'standard' | 'resale') →
  gold/azure pill with the appropriate label. Style values pulled from
  `pending-card.jsx:108–124` so the pill matches the design source 1:1. Pill
  is skipped when `sourceCategory === null` (older rows pre-PR #696).
- Copy: `adminEntry.trustPill = { boxoffice, standard, resale }` added to
  `definitions/copy.ts`.
- Tests: extended `AdminEntry.test.tsx` with four cases — one per
  SourceCategory variant + a null-skip case.

---

## DEFERRED — Documented in spec / out of scope

### D1. PriceDisputesQueue filed cell — relative time formatting

**Status:** Deferred per spec §7.8 and inline code comment at `PriceDisputesQueue.tsx:397`. v1 ships the raw ISO timestamp; relative-time formatting is a follow-up. Typography is pinned so a `RelTime` component swap will be invisible.

### D2. Queue sort + filter controls

**Status:** Deferred per spec §7.8. Property table mentions `Sort: filed-at` and `All disputes` ghost buttons; spec §7.8 locks v1 sort to `filedAt asc` and defers filter/sort UI to a follow-up. Placeholder reserved in the markup at `PriceDisputesQueue.tsx:176–181`.

### D3. Queue pagination UI

**Status:** Server-side fields wired (`total`, `limit`, `offset`); client-side pagination UI deferred per spec §7.8. Default page size 20 covers v1 expected volume (4 contests across history per recon).

### D4. AdminEntry note quoting style

**Status:** Cosmetic — typographic curly quotes (U+201C/U+201D) vs ASCII straight quotes. The curly quotes are an upgrade. Skipping.

### D5. AdminDisputePanel guidance element semantics

**Status:** `<p>` vs `<div>` — the implementation choice (`<p>`) is semantically correct for the content shown. Design source uses `<div>` but that was demo wiring, not a contract. Skipping.

### D6. Custom loading + error visuals

**Status:** Design source does not specify loading or error visuals; the property table noted "NOT SPECIFIED in design" for these rows. Implementation provides minimal accessible affordances (`role="status"` for loading, `role="alert"` for error, inline retry button for error). Acceptable v1.

### D7. AdminEntry container borderRadius enumeration

**Status:** Property table does not enumerate `borderRadius: 12` for AdminEntry. Implementation includes it (matches design source `dispute-surfaces.jsx:682`). Not a gap — table omission, implementation correct per design source.

---

## Action plan

G1–G9 fixed in this PR (see "IMPLEMENTED — Gap fixes" section above). Quality
gate re-ran clean: typecheck + lint pass on api + web, 593 web tests pass, 36
contests integration tests pass with archivedReason round-trip assertion. Ready
for design-review Agent 3 (confirm) → env scan → PR open.

Deferred items D1–D7 land in the PR body's "Deferred" section so reviewers see them.

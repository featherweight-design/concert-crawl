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

## GAPS — Fix in this PR

### G1. archivedReason not surfaced on detail endpoint or in read-only banner (state reachability)

**Severity:** Medium. Spec §4 line 245 says "reason shown to both submitters." When an admin re-visits a resolved contest, the panel renders a read-only banner with a generic lead string. The actual archive reason (the rationale they typed at resolution time) is never re-surfaced.

**Root cause:** Two-layer gap:

- `apps/api/src/routes/admin/contests.ts` detail endpoint does NOT SELECT `parent.archived_reason` or `counter.archived_reason`
- `ContestDetailData` type in `apps/web/src/lib/queries/admin-contests.ts` does not declare `parent.archivedReason` or `counter.archivedReason`
- `AdminDisputePanel.tsx` read-only banner uses a generic copy string

**Fix:** Add `archivedReason` to the response shape (both parent + counter), select it in the route, surface it in the read-only banner when present.

### G2. Precondition error message lost in transit (state reachability)

**Severity:** Medium. When the resolve/defer transaction's same-slot assertions or counter-status guard fires (409 with `error.code='precondition_failed'`), the server returns the specific reason (e.g., "Parent tier GA does not match challenger tier VIP"). But:

- `ApiError` at `apps/web/src/lib/api.ts:6-14` strips the `code` discriminator and only forwards `message`
- `AdminDisputePanel.tsx` renders a static generic copy string (`REVIEW_CONTEST_COPY.panel.mutationError`) instead of the server-supplied message

**Result:** Admin sees "Something went wrong, please try again" with no clue whether it's a tier mismatch, a race with another admin, or an actual server fault.

**Fix:** Surface the server error message in the inline alert when it's available; keep the generic copy as fallback.

### G3. Flat EventDetailResponse.counterSubmission missing engagement-signal fields (state reachability)

**Severity:** Low–Medium. The per-tier `TierCounter` shape at `packages/types/src/index.ts:415-416` correctly declares `lastAdminActionAt` and `lastAdminActionKind`. But the FLAT `counterSubmission` at `packages/types/src/index.ts:455-462` does NOT — even though `apps/api/src/routes/events.ts:666-675` writes them on the wire.

**Result:** Any consumer code that reads `event.counterSubmission` (not `event.priceByTier[].counterSubmission`) will not see the engagement pill data at the type layer.

**Fix:** Add `lastAdminActionAt: string | null` and `lastAdminActionKind: 'defer' | null` to the flat `counterSubmission` type. Already on the wire — no API change needed.

### G4. AdminDisputePanel mutation error banner placement (visual)

**Severity:** Low. Currently the inline error banner renders ABOVE the reason field. Copy comment in `copy.ts` (lines 184–187) says "Surfaced inline above the action row." Move the banner below the reason field, directly above the action buttons.

### G5. AdminDisputePanel 404 differentiation (visual / dead code)

**Severity:** Low. The `panel.notFound` copy string exists but the implementation never routes to it. Any error (404, 500, network) renders the generic error block. Either wire the 404 path (`detail.error.status === 404` → notFound copy) or remove the dead copy string.

### G6. AdminDisputePanel header layout (visual)

**Severity:** Low. Design source `dispute-surfaces.jsx:753–776` puts eyebrow + title in a left flex container and the status pill on the right (`justifyContent: space-between` row). Implementation stacks eyebrow → title → status pill vertically. Visual outcome is acceptable but design intent is single horizontal row.

### G7. AdminDisputePanel header bottom margin (visual)

**Severity:** Trivial. Property table specifies 16px margin below header before guidance. Implementation uses 12px (active) / 18px (read-only). Pick a single value matching the table.

### G8. AdminDisputePanel title margin (visual)

**Severity:** Trivial. Design has `margin: '4px 0 0'` (top only). Implementation has `margin: '4px 0'` (top + bottom). One-character fix.

### G9. AdminEntry trust pill placement (design table vs implementation)

**Severity:** Low. Property table §3b line 214 lists `trustPill` as a property of AdminEntry (rendered via `window.PendingTrustPill` with a `kind` prop in the design source). Implementation defers the trust pill to AdminDisputePanel (parent) and omits it from AdminEntry. This is a documented intentional deferral in the JSX comments but contradicts the property table.

**Fix:** Either render the trust pill inside AdminEntry (faithful to design table) OR document the deferral by adding a note in §3b that the trust pill rendering moved to the parent panel. Simpler: render it in AdminEntry — the prop is already passed through (sourceCategory).

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

Fix G1–G9 in this PR before opening the PR. Re-run quality gate, then design-review Agent 3 (confirm), then proceed to env scan + PR open.

Deferred items D1–D7 land in the PR body's "Deferred" section so reviewers see them.

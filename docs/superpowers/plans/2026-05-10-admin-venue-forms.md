# Admin Venue Forms — Add Venue Modal + Venue Details/Edit Page

**Issue:** #187
**Branch:** feat/admin-venue-forms
**Design handoff:** `design/design_handoff_admin_venues/`
**Spec:** Issue body + `design/design_handoff_admin_venues/README.md`

---

## Context

Implements two admin screens per the design handoff:

1. **Add Venue modal** — inline overlay on the Venues table (replaces the existing separate `/admin/venues/new` page)
2. **Venue Details/Edit full page** — complete redesign of `/admin/venues/[id]/page.tsx`

### Key findings from codebase audit

- `DELETE /v1/admin/venues/:id` is a soft delete (`active = false`) — design requires hard delete with `venue_id` nulled on events
- `crawl_runs.venue_id` has `onDelete: 'cascade'` so crawl history deletes automatically on venue hard delete
- No slug uniqueness check on `POST` or `PATCH`
- `GET /v1/admin/venues/:id` does not return crawl health stats needed for the 7-day sparkline
- VenueForm has old fields (`websiteUrl` label, `contactEmail`, `crawlNotes`) — design removes last two, renames label to "Source URL" (DB field stays `websiteUrl`)
- Venues page links to `/admin/venues/new` — needs to be converted to open a modal
- `venue-status.ts` utilities (`deriveVenueStatus`, `venueHealthPercent`) already exist

---

## Tasks

- [ ] **Task 1: API — Hard delete with event detachment**
  - Update `DELETE /v1/admin/venues/:id` to null `venue_id` on events (hard delete, not soft)
  - Count affected events before delete; return `{ success: true, data: { eventsDetached: N } }`
  - Audit log entry includes pre-delete row snapshot (store in `auditMeta` or existing mechanism)
  - Update integration tests (add: events are detached, count is returned; remove: venue is gone, not just inactive)

- [ ] **Task 2: API — Slug uniqueness on POST/PATCH**
  - `POST /v1/admin/venues`: check slug not already taken → 409 `{ success: false, error: 'Slug already in use', field: 'slug' }`
  - `PATCH /v1/admin/venues/:id`: check slug not taken by *another* venue → same 409 response
  - Add integration tests for both 409 paths

- [ ] **Task 3: API — Crawl health stats in GET /:id**
  - Extend `GET /v1/admin/venues/:id` response to include `crawlHealth`:
    ```ts
    {
      sevenDayPercent: number,         // % of runs in last 7 days that succeeded
      sparkline: { date: string; success: boolean }[],  // last 7 days, one entry per day
      lastCrawledAt: string | null,
      avgDurationMs: number | null,
      eventsTracked: number,           // total events with this venue_id
      consecutiveFails: number,
    }
    ```
  - Query `crawl_runs` for last 7 days grouped by day; query events count
  - Add integration test: crawl health included in GET /:id response

- [ ] **Task 4: API — Robots.txt advisory endpoint**
  - `GET /v1/admin/venues/robots-check?url=<encoded>` — fetch robots.txt for the given URL, check `ConcertCrawl` user agent disallow
  - Returns `{ allowed: boolean, checkedAt: string }` or `{ allowed: null, error: string }` on fetch failure
  - Non-blocking: never returns 4xx for a disallowed result; only 4xx for bad/missing `url` param
  - No auth needed (public check), but keep under admin router for consistency

- [ ] **Task 5: Web — AddVenueModal component**
  - New `apps/web/src/components/admin/AddVenueModal.tsx` (client component)
  - Fields: Name, Slug (auto-generated from name via `slugify`, regenerate icon button, `concertcrawl.app/v/` prefix shown inline), Source URL (advisory robots.txt chip + favicon chip), City, Initial status toggle (active/inactive)
  - Footer: `Cancel` (left) / `Save venue` / `Save & crawl now` (right, `⌘↵` hint inside button)
  - Keyboard: `Esc` dismisses, `↵` advances to next required field, `⌘↵` triggers primary action
  - Submission states: idle → validating (slug uniqueness + robots check in parallel, per-field chips) → submitting (fields disabled, spinner in primary button) → failure (error banner + field error state) → success (✓ flash ~400ms → dismiss → toast on venues page)
  - Slug validation pattern: `/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/`, 2–60 chars
  - On 409 from API: banner "Slug already in use" + slug field error state
  - `contactEmail` and `crawlNotes` omitted from form (removed per design decision)
  - Wire `createVenue` server action; add separate `createVenueAndCrawl` action that calls POST then triggers crawl
  - 8 field states per design: default, hover, focused, filled, success, error, disabled, read-only (use CSS token classes; apply programmatically)

- [ ] **Task 6: Web — Venues table page: open modal instead of navigating to /new**
  - Update `apps/web/src/app/(protected)/admin/venues/page.tsx`:
    - Replace `<Link href="/admin/venues/new">` with a button that opens `AddVenueModal`
    - Convert page to use client interactivity or keep RSC + pass modal open state via client boundary
    - After successful modal create, revalidate venues list (router.refresh or revalidatePath)
  - Keep `/admin/venues/new/page.tsx` as a redirect to `/admin/venues` (or remove it — choose based on whether any other link references it)

- [ ] **Task 7: Web — Venue Details/Edit page redesign**
  - Full redesign of `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx`
  - **Header**: venue name + `Verified` pill inline · city · source host as clickable link · last-crawled (relative time) · `View public page` button · `Trigger crawl` button
  - **Two-column layout**: form (flex-grow) + meta column (360px, right)
  - **Left form**: same fields as Add Venue (Name, Slug, Source URL, City, status toggle), edit-in-place; existing `VenueForm` replaced with new field components matching 8-state design
  - **Right meta column:**
    - *Health · 7 days*: % + sparkline SVG (7 bars, colored by success/fail) + 4 stat tiles (last crawl, avg duration, events tracked, consecutive fails)
    - *Verification*: verified badge with `verifiedAt` (if available) or "Unverified" + `Verify` action; `Unverify` ghost-sm button
    - *Recent runs*: last 3 crawl runs (compact: date, status dot, duration); "View all →" links to `/admin/crawls?venue=<id>`
    - *Danger zone*: `Pause` outline-sm button (sets active = false via PATCH) + `Delete…` danger-sm button (opens delete dialog)
  - **Sticky save bar**: fixed at viewport bottom, appears when form is dirty; inverse-color pill with `Discard` / `Save changes`
  - Wire existing `updateVenue` action (updated in Task 8)

- [ ] **Task 8: Web — Delete double-confirmation dialog**
  - New `apps/web/src/components/admin/DeleteVenueDialog.tsx` (client component, Radix Dialog)
  - Impact summary: "1 venue deleted · {N} events have venue removed but remain published · crawls stop · public URL returns 404"
  - Type venue name verbatim to arm (case-sensitive, whitespace-trimmed, compares against `venue.name`)
  - Three stages: empty (disabled) → mismatch (error helper text + disabled) → exact match (success state + danger button armed)
  - `Esc` and backdrop click cancel safely (no submit on backdrop)
  - On confirm: call `deleteVenue` server action → loading state → redirect to `/admin/venues` with success toast "Venue deleted. {N} events detached."
  - No delete on backdrop click; no single-click delete path

- [ ] **Task 9: Web — Server actions update**
  - Update `createVenue` in `apps/web/src/lib/actions/venues.ts`:
    - Remove `contactEmail`, `crawlNotes` from payload
    - Add `active` from initial status toggle (default `true`)
    - Field name stays `websiteUrl` (maps to "Source URL" label in UI)
  - Add `createVenueAndCrawl`: creates venue then POSTs to trigger crawl for that venue
  - Update `updateVenue`: remove `contactEmail`, `crawlNotes`; keep `active`, `verified`
  - Add `deleteVenue(id)`: calls `DELETE /v1/admin/venues/:id`, returns `{ eventsDetached: N }`
  - Existing `deactivateVenue` → keep as `pauseVenue` alias (or rename) — this becomes the "Pause" action in danger zone

- [ ] **Task 10: Tests — Integration tests for new/changed API behavior**
  - `DELETE /:id` hard delete: venue gone, events have null `venue_id`, response includes `eventsDetached` count
  - `POST /` slug conflict: 409 with correct error shape
  - `PATCH /:id` slug conflict against other venue: 409; same slug on self: succeeds
  - `GET /:id` crawl health: response includes `crawlHealth` field with correct shape

---

## Deferred (out of scope for this PR)

- Bulk import of venues (CSV) — flagged in design README
- Venue merge on duplicate detection — 409 error banner is the handling; merge UI is future
- Verification flow itself (how a venue becomes verified) — assumes existing admin process

---

## Resume

Last completed: — (not started)
Next action: Task 1 — hard delete API

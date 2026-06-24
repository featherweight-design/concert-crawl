# Readiness Review — Admin Venue Form API fields (#506)

**Verdict:** 🟡 Yellow
**Audited:** 2026-06-23
**Auditor:** Claude (autonomous Readiness Review)
**Related ticket(s):** #506 (blocks #505)
**Plan PR target:** TBD

## Summary

The parent `design_handoff_admin_venues/` package is a thorough, current handoff for the Add Venue modal (`AddVenueModal.tsx`) and Venue Details / Edit page (`VenueDetailsClient.tsx`) — both shipped and on screen today. #506 adds **two new fields** (API Provider select + API Account ID text input with conditional visibility) to those same two surfaces. No design exists for the new fields yet, and the existing handoff does not establish a conditional-field-reveal pattern. However, every primitive eng needs is already in the codebase (`VDSelect` for the dropdown, `VDInput` / `Field` for the text input, the hint/error treatments, dirty-tracking, validation conventions, copy structure in `definitions/copy.ts`). The conditional show/hide of API Account ID when provider is None is a straightforward `{providerVal && ...}` block (consistent with the locked decision below that the empty-string select value maps to `null` in the DB) that mirrors the way `priceUrl`'s open-link affordance already shows conditionally. Engineering can pattern-match this addition cleanly without a Design round-trip — provided the decisions listed below are surfaced explicitly in the plan PR so a future Design pass can revise them if needed.

If Hugh wants Design to weigh in on (a) whether API Provider belongs in its own "Integration" section vs. tacked onto the existing **Crawl config** section, (b) micro-copy / hint text for the new fields, or (c) a "this venue is API-backed — Source URL is informational only" affordance on the Source URL field, then upgrade to 🟠 Orange and open a small addendum ticket. None of those are blockers for shipping #505; they're polish.

## Per-dimension findings

### 🗺️ Scope clarity
- 🟡 #506 specifies the two fields clearly: API Provider (select; `None` default, `VenuePilot`) and API Account ID (text; shown/required when a provider is selected). Behavior is well-defined.
- 🟡 #505 names one concrete first user (Levitt Pavilion, VenuePilot ID `1105`) so the field shape is grounded in reality.
- 🟠 #506 does **not** specify *where on the form* the new fields live (their own section? appended to **Crawl config**? a new **Integration** section?). Existing handoff has 3 sections in the Edit page: Identity, Ticketing, Crawl config. Eng will need to make a placement call.
- 🟠 #506 doesn't address whether Add Venue (modal) gets the new fields too, or only the Edit page. The modal copy talks about robots.txt and "we'll crawl daily" — language that doesn't apply to API-backed venues. For a first user (Levitt) being added today, the field needs to be reachable from somewhere; if not the modal, then someone has to add the venue and then immediately edit it to set the provider. Worth a decision.
- ✅ Non-goal: this design does **not** touch the actual crawl dispatching, secret/auth handling, or any provider beyond VenuePilot — those live in #505 and future tickets.

### 🎭 State coverage
- 🟡 Field states (default/hover/focused/filled/success/error/disabled/read-only — 8 total per the handoff README) are documented exhaustively for the existing text inputs. The new text input (API Account ID) inherits these directly via `VDInput` / `inputStyle()`.
- 🟠 Select-specific states are *not* fully enumerated in the handoff README — the README documents text-input states. `VDSelect` exists in code with focus/hover/disabled handled, but error state on the select (e.g., "API Account ID is required when Provider is set") will need a treatment decision: red border on the select itself, or only inline error under the Account ID field? Eng will pick one; design may want to weigh in.
- 🟠 Conditional show/hide animation/transition — none specified. Eng will default to no animation (instant show/hide on provider change). Acceptable risk, but worth flagging.
- 🟡 Mobile + desktop parity — Edit page already handles `isMobile ? '1fr' : '1fr 1fr'` grid; the new fields fit the same pattern. Add Venue modal is single-column on all viewports.
- 🟠 Validation states: required-when-provider-set isn't a pattern that exists yet. Eng will add a `errors.apiAccountId` entry to mirror the `errors.slug` shape.

### 🔌 Data contract
- 🔴 Schema does **not** exist yet. `packages/db/src/schema/venues.ts` has no `apiProvider` / `apiAccountId` columns. #505 spells out the exact migration: new `api_provider` pgEnum (`['venuepilot']`) and two columns. Plan PR must include the Drizzle schema delta + Postgres migration.
- 🟡 `Venue` type exported from `packages/db` would need re-export through `@concert-crawl/types` (the consumer-facing type). Existing pattern: see how `ticketVendor` / `platform` flow through.
- 🟡 API contract: `/v1/admin/venues/:id` PATCH endpoint (the `updateVenue` server action) needs Zod additions for the two fields. `createVenue` server action similarly — modal and edit both call into action functions in `@/lib/actions/venues`.
- 🟢 Read-side: `VenueWithCrawlHealth` already returns the full venue row; once columns exist they flow through automatically. UI only needs to read `venue.apiProvider` / `venue.apiAccountId`.
- 🟡 #505's enum has exactly **one value** (`'venuepilot'`). The UI select shows `None` (= null in DB) + `VenuePilot`. Eng must ensure the empty string from the select maps to `null` in the DB, not to a string `'none'` — mirrors how `ticketVendor` handles `''` → `null` in the existing code (line ~1254).

### 🧱 Codebase fit
- ✅ `VDSelect` (Edit page) and the in-line `Field` + `inputStyle()` helpers (Add modal) cover the new field rendering. No new primitives needed.
- ✅ `definitions/copy.ts` has clear slots for both surfaces (`addVenueModal.fields.*` at line 854, `venueDetailsClient.fields.*` at line 583). Eng adds `apiProvider` and `apiAccountId` entries with `label`, `placeholder`, `hint`, and validation messages — mirrors existing entries exactly.
- ✅ `var(--*)` tokens used everywhere; the new fields will inherit `--signal` / `--danger` / `--border` / `--fg` / `--fg-muted` etc.
- ✅ Dirty-tracking pattern in `VenueDetailsClient` (`dirtyFields` array at line ~519) — eng appends `'API provider'` and `'API account ID'` strings the same way.
- ✅ Arrow-function / 2-char-min ESLint rules don't constrain anything new; both fields are conventional form inputs.
- 🟡 The conditional render is one new `{apiProviderVal && ...}` block in each form — trivial. No precedent in either form today (all current fields render unconditionally), but the pattern is idiomatic React and matches the conditional `{priceUrlVal && ...}` open-link icon already in the file (line ~1302).

### ♿ Cross-cutting
- 🟠 **A11y for conditional reveal** — when API Account ID appears after Provider changes from None to VenuePilot, screen readers need to be told. Recommended pattern: render the field with `aria-hidden` when collapsed and announce via `aria-live="polite"` on a wrapper when it appears. Eng will need to pick a pattern; not documented in the existing handoff.
- 🟢 Focus management — selecting VenuePilot from the provider dropdown should *not* steal focus to the new Account ID field (the user is still navigating the form). Default behavior is fine.
- 🟢 Label + required indicator — when provider is set, Account ID becomes required. Eng will add a `*` indicator or "Required" badge matching existing required-field convention (Name, Slug, Source URL).
- 🟢 Color contrast — fields use the audited token set; no new color pairs introduced.

### ⏰ Drift from reality
- 🟡 Handoff README dates itself "May 2026" (line 6). Since then: the Edit page added price / ticket-vendor / extraction-strategy / crawl-mode / wait-until / wait-for-selector / about / capacity / neighborhood / venueType fields. The form is *substantially* denser than the original handoff anticipated. New fields still fit because the **patterns** are preserved (VDSection / VDField / VDSelect / VDInput) — but the spatial layout of "section 03 · crawl config" is much fuller than the artboard shows.
- 🟢 No data-model upheaval since the handoff that would change how the form works — `platform` + `platformVenueId` columns landed in #623 as the analogous "per-platform fetcher" concept, but those don't have UI yet either. The form's conventions are still the same conventions the handoff documented.
- 🟡 Add Venue modal is unchanged from the artboard.

### 📝 Decision log
- 🟢 Existing handoff has clear decision log: meta-column layout chosen, sticky save bar pattern locked, double-confirm delete locked, slug auto-generation behavior locked. These are inherited and not affected by #506.
- 🟠 No locked decision yet on: **VenuePilot vs. Venue Pilot** as the display label (DB enum value is `venuepilot`, #506 uses `VenuePilot` in the UI). Eng will default to `VenuePilot` (single word, capitalized) — matches how #505 writes it.
- 🟠 No locked decision on whether the API Provider field is editable after first-set (vs. one-time on creation). Defaulting to editable matches every other field on the page.
- 🟠 No locked decision on whether "Source URL" remains required when a provider is set (it's still shown to users per #506 but not crawled). Recommend: keep required (consumer-facing link is non-negotiable) — eng will do this unless told otherwise.

## Gaps requiring Design round-trip

Not required for Yellow. Listed only as polish options if Hugh wants Design to weigh in:

- Placement of the two fields (own "Integration" section vs. appended to Crawl config vs. own block above Crawl config).
- Treatment of the Source URL field when a provider is set — gray it out? Add a "informational only — not crawled" badge?
- Micro-copy: hint text for both fields, error messages, the relationship between Provider and Account ID surfaced visually.
- Add Venue modal: do the new fields appear there at all, or only in Edit?

## Eng-side clarifications (decisions plan PR will lock)

1. **Placement**: append both fields to **Crawl config** section as a new "Integration" subsection, above Extraction strategy. Mirrors how Ticketing precedes Crawl config — provider concerns precede crawl concerns.
2. **Conditional reveal**: render `<VDField>` for API Account ID only when `apiProviderVal` is non-null. Plain conditional render, no animation, with `aria-live="polite"` on the wrapper for screen-reader announcement.
3. **Add Venue modal scope**: **omit** new fields from the modal in the first pass. New venues get created, then edited to set the provider. Levitt is one venue; the extra click is acceptable. This keeps the modal scope-free of API-provider concepts and the new affordances stay in one place. If user demand emerges for in-modal provider configuration, follow-up ticket.
4. **Empty-state mapping**: select with empty option value `""` maps to `null` in the DB (same pattern as `ticketVendor`).
5. **Label**: `VenuePilot` (single word) for the option label. `'venuepilot'` for the enum value.
6. **Validation**: when `apiProvider !== null`, `apiAccountId` is required and must be non-empty trimmed string. Error message: `"API account ID is required when an API provider is selected"`.
7. **Source URL stays required** even when a provider is set. The crawler bypasses it; the consumer surface still uses it.
8. **Editability**: `apiProvider` is freely editable post-create (matches every other field's behavior). Plan PR notes that flipping a venue from None → VenuePilot mid-life will cause the next crawl to switch strategies; #505 handles that gracefully via the `crawlVenue()` early branch.

## Decisions inherited

From `design_handoff_admin_venues/README.md` (must respect):

- Edit screen uses **Form + meta column** layout (`editLayout: "meta"`).
- Section primitive is **VDSection** with eyebrow + title + optional subtitle; all new fields live inside one.
- Field primitive is **VDField** (label + optional hint + optional error + children).
- Inputs use the 8-state spec (default / hover / focused / filled / success / error / disabled / read-only); new fields inherit via `VDInput` / `inputStyle()`.
- Sticky save bar surfaces when the form is dirty; new fields participate in dirty-tracking.
- All copy via `definitions/copy.ts`; no hardcoded strings in JSX.
- `var(--*)` tokens only.
- A11y: 3px signal-tinted focus ring via `:focus-visible`.

From #506 (must respect):

- API Provider options: exactly `None` (default) and `VenuePilot`.
- API Account ID is text input.
- API Account ID shown/required only when provider is selected.

From #505 (must respect):

- Postgres enum name: `api_provider`. Enum value: `'venuepilot'`.
- Column names: `api_provider`, `api_account_id`. Drizzle field names: `apiProvider`, `apiAccountId`.
- Levitt Pavilion seed: `apiProvider: 'venuepilot'`, `apiAccountId: '1105'`, `active: true`.

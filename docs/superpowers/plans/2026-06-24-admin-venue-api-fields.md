# Plan — Admin Venue API Provider fields (#506)

**Tracks:** GitHub issue [#506](https://github.com/HartiganHM/concert-crawl/issues/506) — `chore(admin-venues): API Provider + Account ID fields on Edit page`
**Unblocks:** [#505](https://github.com/HartiganHM/concert-crawl/issues/505) — VenuePilot adapter ships behind this UI
**Design handoff:** `design/design_handoff_admin_venues/`
**Readiness review:** `design/design_handoff_admin_venues/READINESS_506.md` — 🟡 Yellow (8 eng-side decisions, 0 design round-trip)
**Author:** Claude (autonomous design pipeline session, 2026-06-24)

---

## Summary

Add two new fields — **API Provider** (select: `None` / `VenuePilot`) and **API Account ID** (text, conditional) — to the admin Venue Edit page (`apps/web/src/components/admin/VenueDetailsClient.tsx`). Edit page only; Add Venue modal scope is explicitly out per Hugh's locked decision. Schema delta lands in this PR (Drizzle + Postgres migration); server actions get Zod additions; UI uses existing `VDSelect` + `VDField` + `VDInput` primitives so no new design tokens or component primitives are required.

This plan resolves the 8 eng-side decisions enumerated in `READINESS_506.md` and locks the implementation contract for the build PR.

---

## Inherited decisions (must respect)

### From `design_handoff_admin_venues/README.md`

- Edit screen uses **Form + meta column** layout (`editLayout: "meta"`).
- Section primitive is `VDSection` (eyebrow + title + optional subtitle); all new fields live inside one.
- Field primitive is `VDField` (label + optional hint + optional error + children).
- Inputs use the 8-state spec (default/hover/focused/filled/success/error/disabled/read-only); new fields inherit via `VDInput` / `inputStyle()`.
- Sticky save bar surfaces when the form is dirty; new fields participate in dirty-tracking.
- All copy via `apps/web/src/components/admin/definitions/copy.ts` — no hardcoded strings in JSX.
- `var(--*)` tokens only.
- A11y: 3px signal-tinted focus ring via `:focus-visible`.

### From #506

- API Provider options: exactly `None` (default) and `VenuePilot`.
- API Account ID is a text input.
- API Account ID shown/required only when a provider is selected.

### From #505 (downstream consumer)

- Postgres enum name: `api_provider`. Enum value: `'venuepilot'`.
- Column names: `api_provider`, `api_account_id`. Drizzle field names: `apiProvider`, `apiAccountId`.
- Levitt Pavilion seed (post-#506-merge): `apiProvider: 'venuepilot'`, `apiAccountId: '1105'`, `active: true`.

### From Hugh (locked in session 1, 2026-06-23)

- **Edit page only**, no Add Venue modal in this PR.

---

## Eng-side decisions (resolving READINESS_506.md clarifications)

Each item below corresponds 1:1 to "Eng-side clarifications" #1–#8 in the readiness review.

### 1. Placement — append to **Crawl config**, above Extraction strategy

**Decision:** The two new fields land at the top of the existing **Crawl config** `VDSection`, before the Extraction strategy field. No new section; no "Integration" header.

**Rationale:** They're crawl concerns (which path the crawler takes for this venue). Keeping them inside Crawl config avoids fragmenting an already-dense form. Placing them at the top of the section signals "this field affects everything below it" — the provider choice controls whether the rest of the Crawl config fields (extraction strategy, crawl mode, wait selectors, etc.) are even relevant for the venue.

Visual order inside Crawl config:

1. API Provider (NEW)
2. API Account ID (NEW, conditional)
3. Source URL (existing)
4. Extraction strategy (existing)
5. … (existing remainder)

### 2. Conditional reveal — plain `{apiProviderVal && <VDField>...}`, `aria-live="polite"`

**Decision:** Render the API Account ID `<VDField>` only when `apiProviderVal !== null`. No animation. Wrap the conditional region in a `<div aria-live="polite">` so screen readers announce the field's appearance when the provider is set from None to VenuePilot.

**Rationale:** Pattern matches the existing `{priceUrlVal && ...}` conditional in the same file. No animation is the simplest behavior and matches the rest of the form's interaction model. `aria-live="polite"` is the lightest a11y treatment that satisfies the appearance-announcement requirement without stealing focus.

### 3. Add Venue modal scope — **omitted in v1**

**Decision:** Do NOT add the new fields to `apps/web/src/components/admin/AddVenueModal.tsx`. New venues go through the existing create flow, then the admin opens the Edit page to set the provider.

**Rationale:** Locked by Hugh. Add Venue modal copy assumes a crawled venue ("we'll crawl daily", robots.txt context) — those framings don't apply to API-backed venues, and adding the provider field to the modal would force a re-design of the modal's information hierarchy. Levitt is the first user; a one-time extra click is acceptable. If user demand for in-modal provider configuration emerges, a follow-up ticket scopes the modal redesign.

### 4. Empty-state mapping — `""` (select) → `null` (DB)

**Decision:** The select's `None` option has value `""`. In `updateVenue` server action, an empty `apiProvider` string maps to `null` before write. Mirrors the existing `ticketVendor` pattern (line ~1254 in `VenueDetailsClient.tsx`).

**Rationale:** Native HTML `<select>` doesn't have a true null option; convention in this codebase is empty-string-in-form → null-in-DB. Reusing the pattern keeps the form action shape consistent.

### 5. Label — `VenuePilot` (single word) UI, `'venuepilot'` enum

**Decision:** The dropdown option text reads `VenuePilot`. The Postgres enum value is `'venuepilot'`. Matches #505's wire format and Levitt seed.

**Rationale:** No design call exists for camelCase vs. two-word labeling; both are defensible. Aligning to #505 prevents downstream churn.

### 6. Validation — required + non-empty trimmed when provider is set

**Decision:** Zod validation: when `apiProvider !== null`, `apiAccountId` must be a string that is non-empty after `trim()`. Error message (in `copy.ts`):

```
"API account ID is required when an API provider is selected"
```

Rendered as an error under the API Account ID field (red border + `:focus-visible` signal ring per the 8-state spec). No error rendered on the API Provider select itself — the error belongs to the field whose value is missing.

### 7. Source URL — stays required

**Decision:** `sourceUrl` remains required for all venues regardless of `apiProvider`. The crawler bypasses Source URL when a provider is set (per #505's `crawlVenue()` early branch), but the field is still consumer-facing on the venue detail page as a "Visit venue website" link.

**Rationale:** Decoupling crawler input from consumer-facing surface. The consumer link is the primary use of `sourceUrl`; removing the required constraint here would break a non-trivial number of consumer surfaces. No "informational only" badge in v1 (deferred to design polish if Hugh wants it).

### 8. Editability — freely editable post-create

**Decision:** `apiProvider` and `apiAccountId` are freely editable on the Edit page after the venue is created. Matches every other field.

**Rationale:** Behaviour consistency. The downstream effect of flipping `None` → `VenuePilot` is that the next scheduled crawl picks up the new strategy via `crawlVenue()`'s early branch in #505. No data migration needed; no manual re-crawl required.

---

## Schema + migration

### Drizzle delta

`packages/db/src/schema/venues.ts`:

```ts
export const apiProviderEnum = pgEnum('api_provider', ['venuepilot'])

export const venues = pgTable('venues', {
  // ... existing columns
  apiProvider: apiProviderEnum('api_provider'),                  // nullable, default null
  apiAccountId: text('api_account_id'),                          // nullable
})
```

Both columns are nullable. Default is `null` for existing venues — no backfill needed.

### Postgres migration

New migration `packages/db/migrations/00XX_admin_venue_api_provider.sql`:

```sql
CREATE TYPE "api_provider" AS ENUM ('venuepilot');

ALTER TABLE "venues" ADD COLUMN "api_provider" "api_provider";
ALTER TABLE "venues" ADD COLUMN "api_account_id" text;
```

Per `feedback_migration_timestamps.md`, the migration `when` value must be > all prior entries — confirm at PR time and bump if a parallel migration lands between plan PR merge and impl PR open.

### Type re-export

`packages/types/src/venue.ts` (or equivalent): re-export `apiProviderEnum` values + the `Venue.apiProvider` / `Venue.apiAccountId` fields so consumer surfaces can read them. Pattern: see `ticketVendor` / `platform` precedent.

---

## Server actions

`apps/web/src/lib/actions/venues.ts` (or wherever `updateVenue` / `createVenue` live):

### `updateVenueSchema` (Zod) additions

```ts
{
  // ... existing fields
  apiProvider: z.union([z.literal(''), z.literal('venuepilot')]).optional(),
  apiAccountId: z.string().optional(),
}
.refine(
  (data) => {
    if (!data.apiProvider || data.apiProvider === '') return true
    return typeof data.apiAccountId === 'string' && data.apiAccountId.trim().length > 0
  },
  {
    message: 'API account ID is required when an API provider is selected',
    path: ['apiAccountId'],
  },
)
```

### Pre-write normalization

In the action body, before writing to DB:

```ts
const apiProvider = formValues.apiProvider === '' ? null : formValues.apiProvider
const apiAccountId = apiProvider === null ? null : formValues.apiAccountId?.trim() ?? null
```

If `apiProvider` is null, `apiAccountId` is forced to null on write (defensive — prevents an orphaned account ID lingering in the DB after the admin sets provider back to None).

### `createVenueSchema` — unchanged

No new fields. The Add Venue modal does not surface them in v1.

---

## UI changes

### `apps/web/src/components/admin/VenueDetailsClient.tsx`

State additions (mirror `ticketVendorVal` shape):

```ts
const [apiProviderVal, setApiProviderVal] = useState<string | null>(
  venue.apiProvider ?? null,
)
const [apiAccountIdVal, setApiAccountIdVal] = useState(venue.apiAccountId ?? '')
```

Dirty-tracking appends:

```ts
...(apiProviderVal !== (venue.apiProvider ?? null) ? ['API provider'] : []),
...(apiAccountIdVal !== (venue.apiAccountId ?? '') ? ['API account ID'] : []),
```

Reset on cancel:

```ts
setApiProviderVal(venue.apiProvider ?? null)
setApiAccountIdVal(venue.apiAccountId ?? '')
```

FormData on save:

```ts
if (apiProviderVal !== null) {
  formData.set('apiProvider', apiProviderVal)
}
formData.set('apiAccountId', apiAccountIdVal.trim())
```

JSX inside the Crawl config `VDSection`, above the Extraction strategy field:

```tsx
<VDField
  id="apiProvider"
  label={ADMIN_COPY.venueDetailsClient.fields.apiProvider.label}
  hint={ADMIN_COPY.venueDetailsClient.fields.apiProvider.hint}
>
  <VDSelect
    id="apiProvider"
    value={apiProviderVal ?? ''}
    onChange={(value) => setApiProviderVal(value === '' ? null : value)}
  >
    <option value="">{ADMIN_COPY.venueDetailsClient.fields.apiProvider.optionNone}</option>
    <option value="venuepilot">{ADMIN_COPY.venueDetailsClient.fields.apiProvider.optionVenuePilot}</option>
  </VDSelect>
</VDField>

<div aria-live="polite">
  {apiProviderVal !== null && (
    <VDField
      id="apiAccountId"
      label={ADMIN_COPY.venueDetailsClient.fields.apiAccountId.label}
      hint={ADMIN_COPY.venueDetailsClient.fields.apiAccountId.hint}
      error={errors.apiAccountId}
    >
      <VDInput
        id="apiAccountId"
        value={apiAccountIdVal}
        onChange={(event) => setApiAccountIdVal(event.target.value)}
        required
      />
    </VDField>
  )}
</div>
```

### `apps/web/src/components/admin/AddVenueModal.tsx`

**No changes.** Per Hugh's locked decision.

### `apps/web/src/components/admin/definitions/copy.ts`

Add under `venueDetailsClient.fields`:

```ts
apiProvider: {
  label: 'API provider',
  hint: 'If this venue exposes a calendar API, pick the provider — we’ll skip crawling and pull events directly.',
  optionNone: 'None',
  optionVenuePilot: 'VenuePilot',
},
apiAccountId: {
  label: 'API account ID',
  hint: 'The venue’s identifier with the provider (e.g. VenuePilot venue ID).',
  errorRequired: 'API account ID is required when an API provider is selected',
},
```

Exact micro-copy is not design-locked; the implementation PR can refine voice per `feedback_user_voice.md` — but the keys above are stable.

---

## Test plan

**Unit (Vitest)**

- `apps/web/src/lib/actions/venues.test.ts` (or extend existing):
  - `updateVenueSchema` accepts `{ apiProvider: '', apiAccountId: '' }`.
  - `updateVenueSchema` accepts `{ apiProvider: 'venuepilot', apiAccountId: '1105' }`.
  - `updateVenueSchema` rejects `{ apiProvider: 'venuepilot', apiAccountId: '   ' }` (whitespace-only).
  - `updateVenueSchema` rejects `{ apiProvider: 'venuepilot', apiAccountId: '' }`.
  - Pre-write normalization: `apiProvider: ''` → DB `null`; `apiProvider: 'venuepilot', apiAccountId: '  1105  '` → DB `'1105'`.

**Integration (Vitest + Drizzle)**

- Server action `updateVenue` end-to-end:
  - Setting provider to VenuePilot with a valid Account ID writes both columns.
  - Setting provider back to None clears `apiAccountId` (forced to null per pre-write normalization).
  - Validation error surfaces on `apiAccountId` field path when account ID missing.

**E2E (Playwright, optional)**

- New spec `apps/e2e/src/e2e/admin-venue-api-fields.spec.ts`:
  - Admin opens Levitt Pavilion edit page.
  - Selects VenuePilot from the API Provider dropdown.
  - The API Account ID field appears.
  - Submits with empty Account ID → error shows.
  - Fills `1105`, saves, refreshes → fields persist.

Not strictly required for merge; smoke is sufficient if e2e is omitted. Recommendation: include the e2e spec — Levitt is the v1 user and the admin flow should be exercised.

**Manual**

- Mobile + desktop breakpoints render the new fields correctly.
- All themes (Electric / Jade / Light) render correctly.
- Dirty-bar appears when fields are changed; cancel reverts.
- A11y: screen reader announces the conditional field appearing.

**Regression sweep**

- `pnpm test`, `pnpm typecheck`, `pnpm lint` clean before push.
- Existing venue Edit page tests still pass — the only change to the form action shape is two new optional fields.

---

## Release notes plan

Per `feedback_release_notes_on_major_pr.md`, the implementation PR adds an entry to `apps/web/src/lib/definitions/releases.ts`.

**Judgment call:** this is an admin-only field addition with no direct consumer surface. Release notes are consumer-facing. Recommendation: **skip the release-notes entry**. If Hugh disagrees during plan PR review, the entry would read something like:

```ts
{
  version: 'X.Y.Z',
  date: 'YYYY-MM-DD',
  title: "Better data from API-backed venues.",
  body: "Some venues hand us their schedule directly — no scraping needed. We rolled out the plumbing this week, starting with Levitt Pavilion. You'll see fresher, more accurate listings from venues that opt in.",
}
```

The "skip" path matches `progress.md`'s substantive-only rule for admin chores.

---

## Implementation order

1. **Schema + migration** — Drizzle delta + SQL migration. Run locally, confirm `\d venues` shows the new columns.
2. **Type re-exports** — `packages/types/src/venue.ts` (or equivalent) ships the new fields.
3. **Server actions** — `updateVenue` Zod schema + pre-write normalization. Unit tests.
4. **Copy** — add the new keys to `admin/definitions/copy.ts`.
5. **UI** — `VenueDetailsClient.tsx` state + dirty-tracking + JSX + reset/save wiring.
6. **Integration test** — server action end-to-end with the new fields.
7. **(optional) E2E spec** — Playwright admin flow.
8. **Manual QA** — three themes × two breakpoints; a11y announce check.
9. **Lint + typecheck + test sweep**.
10. **Open follow-up tickets if needed** (none expected — design polish items are deliberately deferred).

---

## Out of scope / explicit follow-ups

| Item | Why deferred | Follow-up |
|------|--------------|-----------|
| Add Venue modal getting the new fields | Locked by Hugh — keeps modal scope clean | Open ticket if user demand emerges |
| "Informational only" badge on Source URL when provider set | Design polish — needs design call | Optional design addendum ticket |
| Own "Integration" section vs. tacked onto Crawl config | Decided: tacked onto Crawl config | If form density gets uncomfortable later, restructure ticket |
| Provider-specific account-ID hint text ("e.g. VenuePilot venue ID") | Generic hint is fine for v1 (one provider) | Add per-provider hints when 2nd provider lands |
| Add `read_only` treatment when API Provider is set | Source URL stays editable | Revisit when 2nd provider lands |
| Source URL required-bypass for API-backed venues | Source URL is consumer-facing, not just crawler input | Not changing — kept as-is |

---

## Acceptance gates

Before this plan PR merges:

- Plan PR through Copilot review loop (min 2 successful reviews, no Crit/High/Med — per `feedback_copilot_review_multi_round.md`).

Before the implementation PR merges:

- Migration applied locally and confirmed against `packages/db` types.
- Unit + integration tests green.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` clean.
- Manual QA across themes × breakpoints.
- Levitt Pavilion seed applied (or seeded post-merge) per #505.

---

## Related

- Design pipeline workflow: `docs/superpowers/design-pipeline.md`
- Handoff folder: `design/design_handoff_admin_venues/`
- Readiness review (this addendum): `design/design_handoff_admin_venues/READINESS_506.md`
- Downstream consumer: `#505` (VenuePilot adapter)
- Memory: `feedback_definitions_copy_rule.md`, `feedback_mobile_desktop_parity.md`, `feedback_migration_timestamps.md`, `feedback_release_notes_on_major_pr.md`, `feedback_copilot_review_multi_round.md`, `feedback_user_voice.md`

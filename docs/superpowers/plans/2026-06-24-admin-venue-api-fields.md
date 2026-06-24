# Plan — Admin Venue API Provider fields (#506)

**Tracks:** GitHub issue [#506](https://github.com/HartiganHM/concert-crawl/issues/506) — `chore(admin-venues): API Provider + Account ID fields on Edit page`
**Unblocks:** [#505](https://github.com/HartiganHM/concert-crawl/issues/505) — VenuePilot adapter ships behind this UI
**Design handoff:** `design/design_handoff_admin_venues/`
**Readiness review:** `design/design_handoff_admin_venues/READINESS_506.md` — 🟡 Yellow (8 eng-side decisions, 0 design round-trip)
**Author:** Claude (autonomous design pipeline session, 2026-06-24)

---

## Summary

Add two new fields — **API Provider** (select: `None` / `VenuePilot`) and **API Account ID** (text, conditional) — to the admin Venue Edit page (`apps/web/src/components/admin/VenueDetailsClient.tsx`). Edit page only; Add Venue modal scope is explicitly out per Hugh's locked decision. The **implementation PR** will land the schema delta (Drizzle + Postgres migration), API Zod additions on `apps/api/src/routes/admin/venues.ts` (`updateVenueSchema`), web-action FormData→JSON normalization in `apps/web/src/lib/actions/venues.ts`, and the UI delta on `VenueDetailsClient.tsx`. UI uses the existing `VDSelect` + `VDField` + `VDInput` primitives — no new design tokens or component primitives are required. **This PR is docs-only**; everything described here ships in the follow-up implementation PR.

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

### 1. Placement — top of **Crawl config**, above Extraction strategy

**Decision:** The two new fields land at the top of the existing **Crawl config** `VDSection` (section `03 · crawl config` in `VenueDetailsClient.tsx`, around line 1325–1326), immediately before the Extraction strategy field. No new section; no "Integration" header.

**Rationale:** They're crawl concerns (which path the crawler takes for this venue). Keeping them inside Crawl config avoids fragmenting an already-dense form. Placing them at the top of the section signals "this field affects everything below it" — the provider choice controls whether the rest of the Crawl config fields (extraction strategy, crawl mode, wait selectors, etc.) are even relevant for the venue.

**Note on what stays put:** The Source URL field (label = `sourceUrl`, value = `venue.websiteUrl`) lives in the **Identity** section, not Crawl config. This plan does NOT move it. The new fields go into Crawl config above Extraction strategy; Source URL stays in Identity.

Order inside Crawl config (after this PR):

1. API Provider (NEW — at top)
2. API Account ID (NEW, conditional — directly below API Provider)
3. Extraction strategy (existing — was previously first)
4. … (existing remainder of Crawl config: crawl mode, wait selectors, etc.)

### 2. Conditional reveal — plain `{apiProviderVal && <VDField>...}`, `aria-live="polite"`

**Decision:** Render the API Account ID `<VDField>` only when `apiProviderVal !== null`. No animation. Wrap the conditional region in a `<div aria-live="polite">` so screen readers announce the field's appearance when the provider is set from None to VenuePilot.

**Rationale:** Pattern matches the existing `{priceUrlVal && ...}` conditional in the same file. No animation is the simplest behavior and matches the rest of the form's interaction model. `aria-live="polite"` is the lightest a11y treatment that satisfies the appearance-announcement requirement without stealing focus.

### 3. Add Venue modal scope — **omitted in v1**

**Decision:** Do NOT add the new fields to `apps/web/src/components/admin/AddVenueModal.tsx`. New venues go through the existing create flow, then the admin opens the Edit page to set the provider.

**Rationale:** Locked by Hugh. Add Venue modal copy assumes a crawled venue ("we'll crawl daily", robots.txt context) — those framings don't apply to API-backed venues, and adding the provider field to the modal would force a re-design of the modal's information hierarchy. Levitt is the first user; a one-time extra click is acceptable. If user demand for in-modal provider configuration emerges, a follow-up ticket scopes the modal redesign.

### 4. Empty-state mapping — `""` (select) → `null` (web action) → `null` (API/DB)

**Decision:** The select's `None` option has value `""`. The mapping happens in two hops: (a) `updateVenue` web action in `apps/web/src/lib/actions/venues.ts` converts the empty-string FormData value to `null` before assembling the JSON body; (b) the API receives `apiProvider: null` and writes null. Mirrors how `ticketVendor` already round-trips (see line ~1254 in `VenueDetailsClient.tsx` for the form side, and the existing `ticketVendor` Zod definition in `apps/api/src/routes/admin/venues.ts` for the API side).

**Rationale:** Native HTML `<select>` doesn't have a true null option. The web/API split means empty-string lives on the form, JSON `null` lives on the wire, DB `NULL` lives in storage. Each layer's contract is consistent with how every other optional venue field already works.

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

`packages/types/src/index.ts` (the single source of truth for shared types — `venue.ts` does not exist in this repo): re-export the `apiProvider` enum values + extend the `Venue` type so the new `apiProvider` and `apiAccountId` fields surface through `@concert-crawl/types`. Pattern: see how `ticketVendor` / `platform` already flow through `index.ts`.

---

## Validation + write path

The codebase splits validation and persistence across two layers — this plan respects that split rather than collapsing them.

| Layer | File | Role |
|-------|------|------|
| Web server action | `apps/web/src/lib/actions/venues.ts` (`updateVenue`) | Receives FormData from the Edit page, normalizes to a JSON body, forwards to API via `apiClient.patch(...)`. No Zod here today. |
| API route | `apps/api/src/routes/admin/venues.ts` (`updateVenueSchema`) | Zod-validates the JSON body via `zValidator('json', updateVenueSchema)`. This is the single source of truth for the venue update contract. |

### API Zod additions (`apps/api/src/routes/admin/venues.ts`)

The existing `createVenueSchema` and `updateVenueSchema` already use the `.nullable().optional()` + transform pattern for cleared fields (see `ticketVendor` lines ~35–46 and `priceUrl` lines ~96–101). The new fields follow the same shape — `null` is the "None" / cleared value over the wire (not `""`), because the body arrives as JSON.

Add to `createVenueSchema` (or extend on `updateVenueSchema` if we keep create scope clean — see "Add Venue modal scope" below):

```ts
apiProvider: z
  .enum(['venuepilot'])
  .nullable()
  .optional(),
apiAccountId: z
  .string()
  .max(200)
  .nullable()
  .optional()
  .transform((val) => {
    if (val == null) return val
    const trimmed = val.trim()
    return trimmed === '' ? null : trimmed
  }),
```

Cross-field validation via `.superRefine()` (or chained `.refine()` on the extended schema) after the `.partial().extend({ ... })` for `updateVenueSchema`:

```ts
updateVenueSchema.superRefine((data, ctx) => {
  if (data.apiProvider != null && (data.apiAccountId == null || data.apiAccountId === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['apiAccountId'],
      message: 'API account ID is required when an API provider is selected',
    })
  }
})
```

Notes:

- `apiProvider` is `.enum(['venuepilot']).nullable().optional()` — `null` = None, `'venuepilot'` = VenuePilot. The wire shape matches the column's nullable enum.
- `apiAccountId` uses the same `.nullable().optional().transform(trim → null-if-empty)` pattern as the other free-text optional fields. Trimming happens in the schema itself.
- The cross-field check uses `null` (not `''`) because the transform has already collapsed empty-string to null by the time `.superRefine()` runs.
- `apiAccountId.nullable()` is essential — without it, clearing the field (when admin sets provider back to None) wouldn't be representable in the body and the column would never get nulled out.

### Web action FormData → JSON normalization (`apps/web/src/lib/actions/venues.ts`)

`updateVenue` already collects FormData from `VenueDetailsClient` and forwards JSON to the API. Extend the JSON body with the two new fields, mapping the empty-select-value `""` → `null` per the existing pattern for `ticketVendor`:

```ts
// inside updateVenue, building the body:
const apiProviderRaw = formData.get('apiProvider')
const apiProvider =
  typeof apiProviderRaw === 'string' && apiProviderRaw !== ''
    ? apiProviderRaw
    : null

const apiAccountIdRaw = formData.get('apiAccountId')
const apiAccountIdStr =
  typeof apiAccountIdRaw === 'string' ? apiAccountIdRaw.trim() : ''
const apiAccountId =
  apiProvider === null
    ? null
    : apiAccountIdStr === ''
      ? null
      : apiAccountIdStr

// ... include both in the apiClient.patch body
```

When `apiProvider` is null, `apiAccountId` is forced to null in the body — defensive against an orphaned account ID lingering after the admin sets provider back to None. The API Zod `.superRefine()` independently rejects the inverse (provider set, account ID missing).

### `createVenueSchema` / Add Venue modal — unchanged

Per Hugh's locked decision (Add Venue modal scope out of v1), the impl PR leaves `createVenueSchema` and the modal unchanged. If we later want create-time provider configuration, the API additions above are non-breaking — `createVenueSchema` can adopt them in a future PR.

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

**Extending `fieldErrors`:** the current `fieldErrors` state in `VenueDetailsClient.tsx` (line ~554) only tracks `slug`. Extend its type to include `apiAccountId`:

```ts
const [fieldErrors, setFieldErrors] = useState<{
  slug?: string | undefined
  apiAccountId?: string | undefined
}>({})
```

The submit handler (around line 685 today) already sets `fieldErrors` from API error responses — extend the same `setFieldErrors({ ... })` call to include `apiAccountId` when the API returns a Zod issue with `path: ['apiAccountId']`.

**JSX inside the Crawl config `VDSection`, above the Extraction strategy field.** The actual primitive shapes (verified in the file): `VDField` takes `htmlFor` (not `id`), `VDSelect.onChange` receives a `ChangeEvent<HTMLSelectElement>` (not a raw value), `VDInput` exposes `hasError` (boolean) and pairs with `VDField.error` for the message — no `required` prop. IDs follow the `edit-venue-*` convention used elsewhere in the file (e.g. `edit-venue-ticket-vendor`, `edit-venue-price-url`).

```tsx
<VDField
  label={ADMIN_COPY.venueDetailsClient.fields.apiProvider.label}
  htmlFor="edit-venue-api-provider"
  hint={ADMIN_COPY.venueDetailsClient.fields.apiProvider.hint}
>
  <VDSelect
    id="edit-venue-api-provider"
    value={apiProviderVal ?? ''}
    disabled={isDisabled}
    onChange={(evt) =>
      setApiProviderVal(evt.target.value === '' ? null : evt.target.value)
    }
  >
    <option value="">
      {ADMIN_COPY.venueDetailsClient.fields.apiProvider.optionNone}
    </option>
    <option value="venuepilot">
      {ADMIN_COPY.venueDetailsClient.fields.apiProvider.optionVenuePilot}
    </option>
  </VDSelect>
</VDField>

<div aria-live="polite">
  {apiProviderVal !== null && (
    <VDField
      label={ADMIN_COPY.venueDetailsClient.fields.apiAccountId.label}
      htmlFor="edit-venue-api-account-id"
      hint={ADMIN_COPY.venueDetailsClient.fields.apiAccountId.hint}
      {...(fieldErrors.apiAccountId ? { error: fieldErrors.apiAccountId } : {})}
    >
      <VDInput
        id="edit-venue-api-account-id"
        value={apiAccountIdVal}
        disabled={isDisabled}
        hasError={Boolean(fieldErrors.apiAccountId)}
        onChange={(evt) => {
          setApiAccountIdVal(evt.target.value)
          if (fieldErrors.apiAccountId) {
            setFieldErrors((prev) => ({ ...prev, apiAccountId: undefined }))
          }
        }}
      />
    </VDField>
  )}
</div>
```

The clear-error-on-change pattern mirrors how `slug` is handled today (line ~1040 in `VenueDetailsClient.tsx`).

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

**API Zod tests (`apps/api/src/routes/admin/venues.test.ts` — existing)**

This file already exists and covers the `createVenue` / `updateVenue` HTTP routes. Extend it with the new cases — `updateVenueSchema` is the schema under test (not the web action):

  - JSON `{ apiProvider: null, apiAccountId: null }` accepted.
  - JSON `{ apiProvider: null }` accepted (both fields can be omitted entirely).
  - JSON `{ apiProvider: 'venuepilot', apiAccountId: '1105' }` accepted.
  - JSON `{ apiProvider: 'venuepilot', apiAccountId: '   ' }` rejected with Zod issue `path: ['apiAccountId']` (whitespace-only after transform → null → cross-field check fails).
  - JSON `{ apiProvider: 'venuepilot', apiAccountId: '' }` rejected with the same Zod issue.
  - JSON `{ apiProvider: 'venuepilot', apiAccountId: '  1105  ' }` accepted; transform trims to `'1105'`.
  - Persistence sanity (already an integration-style pattern in `venues.integration.test.ts`): updating from `apiProvider: 'venuepilot'` to `apiProvider: null` writes `apiAccountId = null` to the DB (defensive — verified against the route handler, not just the schema).

**Web action FormData normalization (new — `apps/web/src/lib/actions/venues.test.ts`)**

No web action test file exists today (web actions are tested via integration today). Add this file with focused unit coverage of the FormData→JSON normalization logic in `updateVenue`:

  - FormData `apiProvider=""` produces JSON body `{ apiProvider: null, apiAccountId: null }` (no API Account ID written when provider is None).
  - FormData `apiProvider="venuepilot", apiAccountId="  1105  "` produces JSON body `{ apiProvider: 'venuepilot', apiAccountId: '1105' }` (trimmed before send).
  - FormData `apiProvider="venuepilot", apiAccountId=""` produces JSON body with `apiAccountId: null` — the API-side `superRefine` then rejects this, which is the desired single-point-of-truth behaviour.

To make `updateVenue` unit-testable, the FormData→body assembly should be extracted into a pure helper (e.g. `buildUpdateVenueBody(formData)`) — the helper is what these tests call. The wrapping `updateVenue` server action stays untested at this layer; its happy path is covered by the API integration tests above.

**E2E (Playwright, recommended)**

- New spec `apps/e2e/src/e2e/admin-venue-api-fields.spec.ts`:
  - Admin opens Levitt Pavilion edit page.
  - Selects VenuePilot from the API Provider dropdown.
  - The API Account ID field appears.
  - Submits with empty Account ID → error shows (`fieldErrors.apiAccountId` surfaces under the field).
  - Fills `1105`, saves, refreshes → both fields persist.
  - Setting provider back to None and saving clears `apiAccountId` server-side.

Recommendation: include the e2e spec — Levitt is the v1 user and the admin flow should be exercised.

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

**Judgment call:** this is an admin-only field addition with no direct consumer surface. Release notes are consumer-facing. Recommendation: **skip the release-notes entry**. If Hugh disagrees during plan PR review, the entry should match the actual `Release` interface in `apps/web/src/lib/definitions/releases.ts` (`{ version, date, headline?, items: ReleaseItem[], spotlight? }`, versions prefixed `v`):

```ts
{
  version: 'vX.Y.Z',
  date: 'Month D, YYYY',
  headline: 'Better data from API-backed venues.',
  items: [
    {
      kind: 'added',
      text: "Some venues hand us their schedule directly — no scraping needed. We rolled out the plumbing this week, starting with Levitt Pavilion. You'll see fresher, more accurate listings from venues that opt in.",
    },
  ],
}
```

The "skip" path matches `progress.md`'s substantive-only rule for admin chores.

---

## Implementation order

1. **Schema + migration** — Drizzle delta in `packages/db/src/schema/venues.ts` + SQL migration. Run locally, confirm `\d venues` shows the new columns.
2. **Type re-exports** — extend the `Venue` type and re-export the enum values from `packages/types/src/index.ts` (single source of truth for shared types).
3. **API Zod** — extend `createVenueSchema` + `updateVenueSchema` in `apps/api/src/routes/admin/venues.ts` per the snippets above. Add unit tests in `apps/api/src/routes/admin/venues.test.ts`.
4. **Web action FormData → JSON** — update `updateVenue` in `apps/web/src/lib/actions/venues.ts` to map the two FormData entries into the JSON body. Extract `buildUpdateVenueBody(formData)` so the mapping is unit-testable; add the new test file `apps/web/src/lib/actions/venues.test.ts`.
5. **Copy** — add the new keys to `apps/web/src/components/admin/definitions/copy.ts`.
6. **UI** — `VenueDetailsClient.tsx` state + dirty-tracking + `fieldErrors` extension + JSX + reset/save wiring.
7. **API integration test** — extend `apps/api/src/routes/admin/venues.integration.test.ts` (or `venues.test.ts`) with the end-to-end persistence case (set → save → re-read; unset → save → re-read).
8. **E2E spec** — `apps/e2e/src/e2e/admin-venue-api-fields.spec.ts`.
9. **Manual QA** — three themes × two breakpoints; a11y announce check (screen reader should announce the new field appearing when provider flips from None to VenuePilot).
10. **Lint + typecheck + test sweep**.
11. **Open follow-up tickets if needed** (none expected — design polish items are deliberately deferred).

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

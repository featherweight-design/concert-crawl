# Design Property Table — Admin Venue API Fields (#506)

Ground-truth checklist for the two new fields on the Venue Edit page
(`apps/web/src/components/admin/VenueDetailsClient.tsx`). Both reuse the
existing `VDField` / `VDSelect` / `VDInput` primitives — no new tokens or
component primitives. Source: `design/design_handoff_admin_venues/README.md`
(§03 Field states, §Accessibility) + plan `2026-06-24-admin-venue-api-fields.md`.

## API Provider (select)

| #   | Property       | Expected                                                                                      |
| --- | -------------- | --------------------------------------------------------------------------------------------- |
| 1   | Primitive      | `VDField` wrapping `VDSelect`                                                                 |
| 2   | Placement      | Top of `03 · crawl config` section, above Extraction strategy, under an `Integration` eyebrow |
| 3   | Label          | "API provider" (from `ADMIN_COPY.venueDetailsClient.fields.apiProvider.label`)                |
| 4   | Hint           | Present (provider-picking guidance), from copy definitions                                    |
| 5   | Options        | Exactly two: `None` (value `""`, default) and `VenuePilot` (value `venuepilot`)               |
| 6   | Value binding  | `apiProviderVal ?? ''`; `''` → `null` on change                                               |
| 7   | Disabled state | Inherits `isDisabled` (form-submitting) — 66% opacity per §03                                 |
| 8   | Tokens         | `var(--*)` only (inherited via `VDSelect`)                                                    |
| 9   | ID convention  | `edit-venue-api-provider` (matches `edit-venue-*` siblings)                                   |

## API Account ID (text input, conditional)

| #   | Property              | Expected                                                                                                    |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| 10  | Primitive             | `VDField` wrapping `VDInput`                                                                                |
| 11  | Conditional reveal    | Rendered only when `apiProviderVal !== null`                                                                |
| 12  | a11y announce         | Wrapper `<div aria-live="polite">` so SR announces appearance                                               |
| 13  | Label                 | "API account ID" from copy definitions                                                                      |
| 14  | Hint                  | Present (provider identifier guidance)                                                                      |
| 15  | Field states          | 8-state spec via `VDInput` (default/hover/focused/filled/success/error/disabled/read-only)                  |
| 16  | Focus ring            | 3px signal-tinted (React focus-state driven, per shipped `VDInput` pattern — NOT `:focus-visible` retrofit) |
| 17  | Error state           | `hasError` on `VDInput` + `error` message on `VDField`; danger-tinted border + ring                         |
| 18  | Error message         | "API account ID is required when an API provider is selected"                                               |
| 19  | Clear-error-on-change | Typing clears `fieldErrors.apiAccountId` (mirrors `slug` pattern)                                           |
| 20  | Disabled state        | Inherits `isDisabled`                                                                                       |
| 21  | ID convention         | `edit-venue-api-account-id`                                                                                 |

## Form-level

| #   | Property                | Expected                                                                 |
| --- | ----------------------- | ------------------------------------------------------------------------ |
| 22  | Dirty tracking          | Both fields participate; sticky save bar surfaces when changed           |
| 23  | Cancel/reset            | Reverts both to `venue.apiProvider ?? null` / `venue.apiAccountId ?? ''` |
| 24  | Theme parity            | Electric / Jade / Light all render (inherited via tokens)                |
| 25  | Mobile + desktop parity | Both breakpoints render the fields; no behavioural asymmetry             |
| 26  | Add Venue modal         | UNCHANGED — out of scope per Hugh's locked decision                      |

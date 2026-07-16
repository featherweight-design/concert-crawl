# Gap Report — Admin Venue API Fields (#506)

Verified the shipped implementation against the design property table
(`docs/superpowers/design-tables/admin-venue-api-fields.md`, 26 items),
the design handoff (`design/design_handoff_admin_venues/README.md`), and the
execution plan (`docs/superpowers/plans/2026-06-24-admin-venue-api-fields.md`).

## IMPLEMENTED (26)

### API Provider select (items 1–9)

- Primitive `VDField` → `VDSelect` — VenueDetailsClient.tsx:1629
- Placement: crawl-config section, above Extraction strategy — VenueDetailsClient.tsx:1627
- Label + hint from `ADMIN_COPY.venueDetailsClient.fields.apiProvider` — copy.ts
- Exactly two options: `None` (`""`, default) + `VenuePilot` (`venuepilot`) — VenueDetailsClient.tsx:1651
- Value binding `apiProviderVal ?? ''`; `''` → `null` on change — VenueDetailsClient.tsx:1636
- Disabled inherits `isDisabled` — VenueDetailsClient.tsx:1637
- Tokens inherited via `VDSelect`
- ID `edit-venue-api-provider` — VenueDetailsClient.tsx:1635

### API Account ID input (items 10–21)

- Primitive `VDField` → `VDInput` — VenueDetailsClient.tsx:1668
- Conditional reveal `apiProviderVal !== null` — VenueDetailsClient.tsx:1667
- `aria-live="polite"` wrapper announces appearance — VenueDetailsClient.tsx:1666
- Label + hint from copy definitions — VenueDetailsClient.tsx:1669
- `VDInput` 8-state + focus ring inherited from shipped primitive
- Error: `hasError` on input + `error` on field — VenueDetailsClient.tsx:1676
- Error message "API account ID is required when an API provider is selected" — copy.ts
- Clear-error-on-change mirrors `slug` — VenueDetailsClient.tsx:1687
- Disabled inherits `isDisabled` — VenueDetailsClient.tsx:1683
- ID `edit-venue-api-account-id` — VenueDetailsClient.tsx:1681

### Form-level (items 22–26)

- Dirty tracking: both fields feed `dirtyFields` — VenueDetailsClient.tsx:577
- Cancel/reset reverts both — VenueDetailsClient.tsx:729
- Theme parity via tokens (inherited)
- Mobile + desktop parity: single JSX path, no breakpoint branching
- Add Venue modal UNCHANGED — per Hugh's locked decision

## GAPS (0)

None.

## DEFERRED (0)

None.

## Notes

- Property-table item #2's "under an `Integration` eyebrow" was an aspirational
  detail in the property table, not a requirement in the design handoff. The
  handoff does not add a sub-heading for these fields. The shipped placement —
  above Extraction strategy in the crawl-config section, with an inline comment
  explaining a provider bypasses the crawl cascade — conforms to the plan's
  placement spec. Not a gap; no separate eyebrow warranted.

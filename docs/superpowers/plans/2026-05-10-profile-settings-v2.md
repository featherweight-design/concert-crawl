# Profile & Settings v2 — Implementation Plan

**Issue:** #196
**Branch:** `feat/profile-v2`
**Worktree:** `.worktrees/feat/profile-v2`
**Design reference:** `design/design_handoff_profile_settings_v2/`
**Spec file:** `design/design_handoff_profile_settings_v2/README.md`

---

## Context

Most of the Profile & Settings UI shipped in PR #49 (v1). This plan covers:

1. **What's missing** — identified gaps between the v2 design handoff and current implementation
2. **What needs wiring** — backend logic not yet connected (cred increment)
3. **What's deferred** — items explicitly out of scope with reasons

### Architectural decisions settled before implementation

| Question                      | Decision                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Handle availability check     | On save only (debounce already wired in EditProfileForm is for live hint, not required)                                   |
| Going anonymous reattribution | Atomic on save — submissions store user_id, not handle; going anonymous is just `handle = null`, no data migration needed |
| Stripe portal link            | Omit for now; open GH issue #196-stripe to track it                                                                       |
| `SettingsScrollVariant`       | Defer — spec marks it "for future A/B"; builds no new patterns                                                            |
| `RoleBadge` / `RoleCard`      | Defer — spec says "fan is default, crew/artist/staff are stubbed"; no role surfaces in v2 UI                              |

---

## Gap audit (pre-implementation)

| Gap                                                                                                              | Severity     | Task                              |
| ---------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------- |
| `PATCH /admin/prices/submissions/:id` does not increment `userRoles.priceCredScore` when status → `corroborated` | **Critical** | Task 1                            |
| No integration test for cred increment on submission confirmation                                                | High         | Task 1                            |
| Edit profile page header has placeholder `<div>` where Save button should be                                     | High         | Task 2                            |
| `PlanCard` `paid`/`past-due` show "Manage subscription" text with no link target                                 | Low          | Task 3 (omit link, open GH issue) |
| GH issue for Stripe customer portal not yet created                                                              | Low          | Task 3                            |
| Full design comparison not yet done                                                                              | —            | Task 4                            |

---

## Tasks

### Task 1 — Wire cred increment on submission confirmation

- [ ] In `apps/api/src/routes/admin/prices.ts`, find the `PATCH /submissions/:id` handler
- [ ] After updating `priceSubmissions` to `corroborated`, check if the submission has a non-null `userId`
- [ ] If yes, atomically increment `userRoles.priceCredScore` by 1 for that user using a single `UPDATE … SET price_cred_score = price_cred_score + 1` where `userId = submission.userId`
- [ ] Handle the case where a `userRoles` row doesn't exist for that user (upsert or no-op — use no-op since user_roles is admin-provisioned)
- [ ] Add an integration test in `apps/api/src/routes/price-submissions.integration.test.ts` (or create `admin/prices.integration.test.ts`) that:
  - Creates a user profile + submission in `pending` status
  - Calls `PATCH /v1/admin/prices/submissions/:id` with `{ status: "corroborated" }`
  - Asserts `userRoles.priceCredScore` incremented by 1
  - Asserts a second call (already corroborated → corroborated) does **not** double-increment
- [ ] Commit: `feat(api): atomically increment cred on submission confirmation`

### Task 2 — Fix Edit profile header Save button

- [ ] In `apps/web/src/app/(protected)/me/edit/page.tsx`, the header has a placeholder `<div className="w-16" />` where the Save button should appear
- [ ] The Save action lives inside `EditProfileForm`. Add a `formRef` or use the native form `id` pattern: give the `<form>` (or submit trigger) an `id`, and wire the header button to submit it via `form="edit-profile-form"`
- [ ] Alternatively: lift the save trigger up via a callback prop — `EditProfileForm` accepts `onSaveReady(fn: () => void)` and the page wires it to the header button. Choose whichever is cleaner given the existing component structure.
- [ ] The Save button in the header should be disabled when the form save is disabled (same `isSaveDisabled` logic)
- [ ] Remove the placeholder `<div className="w-16" />` and replace with the functional Save button
- [ ] Commit: `fix(web): add Save button to edit profile page header`

### Task 3 — PlanCard Stripe stub + GH issue

- [ ] Open GH issue: `gh issue create --title "feat: Stripe customer portal — Manage subscription link in PlanCard" --label "type: feature,phase: launch,priority: normal,source: internal"` — record the issue number
- [ ] In `PlanCard`, the `paid` and `past-due` variants show CTA text (`SETTINGS_COPY.planCard.paid.subline`, `SETTINGS_COPY.planCard.pastDue.cta`) — confirm these are static text, not `<a>` tags pointing to nowhere
- [ ] If any are already rendered as links, convert to `<span>` with a `title="Billing management coming soon"` until the Stripe portal ships
- [ ] Commit: `chore(web): stub Stripe portal link in PlanCard until billing lands (issue #<N>)`

### Task 4 — Full design comparison and gap implementation

- [ ] Read `design/design_handoff_profile_settings_v2/profile-settings-screens.jsx` and `README.md` top-to-bottom
- [ ] Compare every artboard section against the live implementation:
  - **Section 1** — State matrix mobile: anonymous/0, anonymous/3, @handle/3, @handle/8 (overflow "See all")
  - **Section 2** — PlanCard: founder, paid, trial (days remaining), past-due
  - **Section 3** — EditProfileRoute: handle + city + avatar color; four error states (taken, reserved, invalid chars, too short); "going anonymous" callout
  - **Section 4** — DeleteAccountConfirm: empty input state, DELETE-typed armed state
  - **Section 5** — All three themes: Electric / Jade / Light — CredChip retints correctly
  - **Section 6** — Desktop sidebar+panel: all six nav sections wired
  - **Section 7** — Edit profile desktop behavior
  - **Section 8** — CredChip: zero state (nudge copy), typical (247), power-user (2,480 comma-formatted)
  - **Section 9** — Entry points: top-bar anonymous, top-bar @handle, bottom-nav Me tab, desktop top-right avatar
- [ ] Implement every gap found (no silently skipping)
- [ ] Commit any gap fixes: `fix(web): <specific gap description>`

### Task 5 — Quality gate

- [ ] `pnpm --filter @concert-crawl/api typecheck`
- [ ] `pnpm --filter @concert-crawl/web typecheck`
- [ ] `pnpm --filter @concert-crawl/api lint`
- [ ] `pnpm --filter @concert-crawl/web lint`
- [ ] `pnpm --filter @concert-crawl/api test` (confirm new integration tests pass)
- [ ] Fix any errors before proceeding

---

## Deferred items (with reasons)

| Item                                    | Reason                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `SettingsScrollVariant`                 | Spec marks "for future A/B"; no new patterns; deferred by design                          |
| `RoleBadge` / `RoleCard`                | Spec says "fan is default, crew/artist/staff stubbed"; no role surfaces in v2 UI          |
| Stripe customer portal link             | No billing system yet; GH issue opened in Task 3 to track                                 |
| Cred on other fans' rows (event detail) | Spec explicitly out of scope for v2                                                       |
| Cred history page                       | Spec explicitly out of scope; confirmed rows in `<MySubmissionsList>` are implicit ledger |
| Animated cred counter increment         | Spec explicitly out of scope                                                              |

---

## File map

### Modified

| Path                                            | Change                                      |
| ----------------------------------------------- | ------------------------------------------- |
| `apps/api/src/routes/admin/prices.ts`           | Cred increment on `corroborated` transition |
| `apps/web/src/app/(protected)/me/edit/page.tsx` | Header Save button wired                    |

### New

| Path                                                                | Change                          |
| ------------------------------------------------------------------- | ------------------------------- |
| `apps/api/src/routes/admin/prices.integration.test.ts` (or similar) | Cred increment integration test |

### Potentially modified (design comparison may surface gaps)

| Path                                                   | Likely change                         |
| ------------------------------------------------------ | ------------------------------------- |
| `apps/web/src/components/settings/EditProfileForm.tsx` | Expose save trigger for header button |
| `apps/web/src/components/settings/PlanCard.tsx`        | Convert CTA links to spans if needed  |
| Any settings component                                 | Per design comparison findings        |

---

## Resume

Last completed task: _(none yet)_
Next action: Start Task 1 — wire cred increment in admin prices route

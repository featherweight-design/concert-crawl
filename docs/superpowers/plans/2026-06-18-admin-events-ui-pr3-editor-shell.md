# Admin Events UI — PR 3 (Editor Read-Only Page) Implementation Plan

**Goal:** Add `/admin/events/[id]/edit` page rendering all 5 numbered sections read-only. Wire `Edit…` button in `EventFlagInspector` to navigate to it. Mobile shell included. No mutation actions, no SaveBar (PR 7), no DangerZone (PR 9).

**Architecture:** Server component (`page.tsx`) fetches event by id via new `GET /v1/admin/events/:id` endpoint; suspense-wrapped; renders `EventEditorClient` (client component) with read-only props. Client component picks layout based on `useMediaQuery('(min-width: 1280px)')`. Sections render via shared `EditField` primitive (read-only mode = view-only chip-styled display).

**Tech Stack:** Hono + Drizzle (single-event GET) · Next.js 14 App Router (`[id]/edit/page.tsx`, `loading.tsx`) · React 18 · Vitest jsdom · CSS variables via admin.css

## Global Constraints

- TypeScript strict; no `as` casts
- Min identifier length 2
- All customer-facing strings in `definitions/copy.ts`
- Mobile + desktop parity (per `feedback_mobile_desktop_parity.md`)
- Pre-push: typecheck + lint + tests clean
- Pre-PR: design-review skill against `admin-event-editor.jsx`
- Auto-merge after Copilot clean (per overnight run approval)

## File Structure

**Create:**

- `apps/api/src/routes/admin/events.ts` — modify (add `GET /:id`)
- `apps/api/src/routes/admin/events.integration.test.ts` — new test cases for `GET /:id` (success, 404, auth)
- `apps/web/src/app/(protected)/admin/events/[id]/edit/page.tsx` — server component
- `apps/web/src/app/(protected)/admin/events/[id]/edit/loading.tsx` — skeleton
- `apps/web/src/components/admin/events/editor/EventEditorClient.tsx` — desktop+mobile orchestrator (parity pattern)
- `apps/web/src/components/admin/events/editor/EventEditorDesktop.tsx`
- `apps/web/src/components/admin/events/editor/EventEditorMobile.tsx`
- `apps/web/src/components/admin/events/editor/EditField.tsx` — read-only primitive (text, number, time, select, tags, mono, readonly variants)
- `apps/web/src/components/admin/events/editor/EditLabel.tsx`
- `apps/web/src/components/admin/events/editor/EditSection.tsx` — numbered Panel wrapper
- `apps/web/src/components/admin/events/editor/SrcTag.tsx` — extraction-source tag
- `apps/web/src/components/admin/events/editor/LifecycleBadge.tsx` — status pill (upcoming/postponed/cancelled)
- `apps/web/src/components/admin/events/editor/VerifyMark.tsx` — verified/unverified mark
- `apps/web/src/components/admin/events/editor/EditorHeader.tsx`
- `apps/web/src/components/admin/events/editor/sections/IdentitySection.tsx`
- `apps/web/src/components/admin/events/editor/sections/PricingSection.tsx`
- `apps/web/src/components/admin/events/editor/sections/ClassificationSection.tsx`
- `apps/web/src/components/admin/events/editor/sections/StatusSection.tsx` (read-only PR 3, mutations PR 7)
- `apps/web/src/components/admin/events/editor/sections/ArtSection.tsx`
- `apps/web/src/components/admin/events/editor/EventEditorClient.test.tsx` — renders all 5 sections, header shows title/venue/badges
- `apps/web/src/components/admin/events/editor/EditField.test.tsx` — read-only rendering for each variant
- `apps/web/src/lib/admin/edit-event-link.ts` — `editEventHref(id: string): string` helper

**Modify:**

- `apps/web/src/components/admin/review/ReviewPageClient.tsx` — wire `onEdit` handler on `EventFlagInspector` to push `/admin/events/:id/edit`
- `apps/web/src/components/admin/definitions/copy.ts` — `editor.*` block

## Task Order

1. **Backend `GET /v1/admin/events/:id`** + 3 integration tests (200, 404, 401/403)
2. **Copy strings** for editor labels + section titles + section eyebrows
3. **EditLabel** primitive (TDD: renders label + changed dot if `changed` prop)
4. **EditField** primitive (TDD: renders each variant; readonly is the default for PR 3)
5. **EditSection** primitive (TDD: numbered eyebrow + title + body slot)
6. **SrcTag** primitive (TDD: maps source enum to kind)
7. **LifecycleBadge** primitive (status pill with correct kind per status)
8. **VerifyMark** primitive (verified/unverified mark)
9. **EditorHeader** composition
10. **5 section components** (IdentitySection, PricingSection, ClassificationSection, StatusSection-read-only, ArtSection)
11. **EventEditorDesktop** + **EventEditorMobile** + **EventEditorClient** orchestrator
12. **Server page + loading.tsx**
13. **edit-event-link helper** + **wire EventFlagInspector onEdit** in ReviewPageClient
14. **Final integration test:** EventEditorClient renders all sections with sample event data

Then pre-PR pipeline: rebase + checks + design-review + push + PR + Copilot + auto-merge.

## Self-Review

PR 3 row checklist:

- ✅ `/admin/events/[id]/edit/page.tsx` (task 12)
- ✅ `EventEditorClient.tsx` (task 11)
- ✅ 5 numbered sections read-only (task 10)
- ✅ EditField primitive read-only (task 4)
- ✅ Wire `Edit…` link from `EventFlagInspector` (task 13)
- ✅ Mobile shell (task 11)
- ✅ Vitest: page renders all 5 sections, status pill + verification mark (task 14)
- ✅ Integration: GET /:id for verified/unverified/missing (task 1)

Mobile parity confirmed: `EventEditorClient` is the orchestrator; renders desktop/mobile branches with the same prop bag and the same primitive components underneath.

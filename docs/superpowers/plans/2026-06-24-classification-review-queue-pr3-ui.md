# Classification Review Queue — PR 3: Admin UI + API filter + audit

> **Sub-plan of:** [`2026-06-24-classification-review-queue.md`](2026-06-24-classification-review-queue.md) — read the index first for Goal, Architecture, Global Constraints, and File Structure.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**What this PR ships:** `GET /v1/admin/events?view=hidden-flagged-for-review` API filter + `isConcertReviewNeeded` in list/detail projections; `ClassificationSection` becomes interactive (absorbs Mark-non-concert from Danger Zone, adds Mark-as-concert, renders "LLM flagged for review" pill); `DangerZoneSection` slim (Merge + Delete only); `EventConfirmModal` gains `mark-as-concert` kind; new filter chip "Hidden — flagged for review" on All Events tab with content-aware empty state.

**Dependencies:** PR 1 deployed (column exists). Can be developed in parallel with PR 2.

---

# PR 3 — Admin UI + API filter + audit

PR 3 can open in parallel with PR 2 (only the column from PR 1 is required). Same worktree conventions.

### Task 3.1: Create worktree + branch + env files

**Files:**
- Create: `.worktrees/feat-classification-review-ui/`

**Interfaces:**
- Produces: clean worktree on branch `feat/classification-review-ui`.

- [ ] **Step 1: Create worktree**

```bash
git worktree add .worktrees/feat-classification-review-ui -b feat/classification-review-ui
```

- [ ] **Step 2: Copy env files**

```bash
cp apps/web/.env.local .worktrees/feat-classification-review-ui/apps/web/.env.local
cp apps/api/.env.local .worktrees/feat-classification-review-ui/apps/api/.env.local
cp apps/crawler/.env.local .worktrees/feat-classification-review-ui/apps/crawler/.env.local
```

- [ ] **Step 3: Install**

```bash
cd .worktrees/feat-classification-review-ui
pnpm install
```

All remaining tasks for PR 3 run inside this worktree.

---

### Task 3.2: API — extend list query with `view` enum + projection

**Files:**
- Modify: `apps/api/src/routes/admin/events.ts:96-130` (listQuerySchema — add `view`)
- Modify: `apps/api/src/routes/admin/events.ts:255-280` (baseSelect — add `isConcertReviewNeeded`)
- Modify: `apps/api/src/routes/admin/events.ts:332-346` (whereClause — branch on view)
- Modify: `apps/api/src/routes/admin/events.ts:453-480` (GET /:id projection — add `isConcertReviewNeeded`)
- Modify: `apps/api/src/routes/admin/events.integration.test.ts`

**Interfaces:**
- Consumes: `events.isConcertReviewNeeded` from PR 1.
- Produces: `GET /v1/admin/events?view=hidden-flagged-for-review` returns only rows where `hidden_from_consumer=true AND is_concert_review_needed=true`. Every list + detail response includes `isConcertReviewNeeded: boolean`.

- [ ] **Step 1: Write failing integration tests**

In `apps/api/src/routes/admin/events.integration.test.ts`, add a new `describe` block after the existing `PR 6 — DELETE loosened + PATCH hiddenFromConsumer` block (around line 1009):

```typescript
describe('GET /v1/admin/events — view=hidden-flagged-for-review (#788)', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns only events where hidden_from_consumer=true AND is_concert_review_needed=true', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Visible Concert',
      date: futureDate(7),
      hiddenFromConsumer: false,
      isConcertReviewNeeded: true,
    })
    await seedEvent(venue.id, {
      title: 'Hidden Unflagged',
      date: futureDate(8),
      hiddenFromConsumer: true,
      isConcertReviewNeeded: false,
    })
    await seedEvent(venue.id, {
      title: 'Hidden Flagged Borderline',
      date: futureDate(9),
      hiddenFromConsumer: true,
      isConcertReviewNeeded: true,
    })

    const res = await app.request(
      '/v1/admin/events?view=hidden-flagged-for-review',
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Hidden Flagged Borderline')
  })

  it('GET /:id projection includes isConcertReviewNeeded', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: futureDate(7),
      hiddenFromConsumer: true,
      isConcertReviewNeeded: true,
    })

    const res = await app.request(`/v1/admin/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { isConcertReviewNeeded: boolean }
    }
    expect(body.data.isConcertReviewNeeded).toBe(true)
  })

  it('list projection includes isConcertReviewNeeded', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: futureDate(7),
      hiddenFromConsumer: true,
      isConcertReviewNeeded: true,
    })

    const res = await app.request(
      '/v1/admin/events?view=hidden-flagged-for-review',
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { isConcertReviewNeeded: boolean }[]
    }
    expect(body.data[0]?.isConcertReviewNeeded).toBe(true)
  })
})
```

Also extend `apps/api/src/test/helpers/seed.ts` `seedEvent` defaults to accept `isConcertReviewNeeded` (likely already passes through via `...overrides`; verify and add if needed).

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter @concert-crawl/api test events.integration
```

Expected: FAIL — `view` param not recognized, `isConcertReviewNeeded` not in projection.

- [ ] **Step 3: Add `view` to the query schema**

In `apps/api/src/routes/admin/events.ts`, modify `listQuerySchema` around line 96. After the `missing` field, add:

```typescript
  // Composite view enum (#788). When 'hidden-flagged-for-review',
  // scopes the list to hidden_from_consumer=true AND
  // is_concert_review_needed=true — the admin classification review
  // queue. Single combined param (rather than two orthogonal
  // hiddenFromConsumer + reviewNeeded params) keeps the API surface
  // narrow until a second use case demands the orthogonal shape.
  view: z.enum(['hidden-flagged-for-review']).optional(),
```

- [ ] **Step 4: Destructure `view` + branch the where clause**

In `apps/api/src/routes/admin/events.ts` (the GET handler around line 234-246), add `view` to the destructure:

```typescript
    const {
      count,
      verified,
      missing,
      view,
      query,
      dateFrom,
      dateTo,
      genre,
      missingData,
      limit,
      offset,
    } = ctx.req.valid('query')
```

Then around line 332, branch the where clause:

```typescript
    const whereClause = missing
      ? and(
          isNotNull(events.firstMissingAt),
          eq(events.status, 'upcoming'),
          gte(events.date, today),
          eq(events.hiddenFromConsumer, false),
        )
      : view === 'hidden-flagged-for-review'
        ? and(
            eq(events.hiddenFromConsumer, true),
            eq(events.isConcertReviewNeeded, true),
            verified === undefined ? undefined : eq(events.verified, verified),
            dateFromClause,
            dateToClause,
            searchClause,
            genreClause,
            ...missingDataClauses,
          )
        : and(
            verified === undefined ? undefined : eq(events.verified, verified),
            dateFromClause,
            dateToClause,
            searchClause,
            genreClause,
            ...missingDataClauses,
          )
```

- [ ] **Step 5: Add `isConcertReviewNeeded` to both projections**

In `apps/api/src/routes/admin/events.ts`, find the list `baseSelect` (around line 256) and the GET `/:id` select (around line 453). Add to both:

```typescript
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
```

- [ ] **Step 6: Run tests, verify they pass**

```bash
pnpm --filter @concert-crawl/api test events.integration
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/admin/events.ts \
        apps/api/src/routes/admin/events.integration.test.ts \
        apps/api/src/test/helpers/seed.ts
git commit -m "feat(api): view=hidden-flagged-for-review + isConcertReviewNeeded projection"
```

---

### Task 3.3: Web — extend `AllEvent` type + filters round-trip

**Files:**
- Modify: `apps/web/src/components/admin/review/all/types.ts`
- Modify: `apps/web/src/components/admin/review/all/filters.ts`
- Modify: `apps/web/src/components/admin/review/all/filters.test.ts`

**Interfaces:**
- Consumes: API projection from task 3.2 (`hiddenFromConsumer`, `isConcertReviewNeeded`).
- Produces: `AllEvent.hiddenFromConsumer: boolean`, `AllEvent.isConcertReviewNeeded: boolean`. `AllEventsFilters.flagged: boolean` round-trips through URL via `view=hidden-flagged-for-review` and through fetch query via the same name. `countActiveFilters` counts `flagged === true`.

- [ ] **Step 1: Write failing filter round-trip tests**

Add to `apps/web/src/components/admin/review/all/filters.test.ts`:

```typescript
describe('AllEventsFilters — flagged chip round-trip', () => {
  it('parses view=hidden-flagged-for-review into flagged=true', () => {
    const params = new URLSearchParams('view=hidden-flagged-for-review')
    const filters = parseFiltersFromParams(params)
    expect(filters.flagged).toBe(true)
  })

  it('serializes flagged=true to view=hidden-flagged-for-review', () => {
    const params = serializeFiltersToParams({
      ...EMPTY_FILTERS,
      flagged: true,
    })
    expect(params.get('view')).toBe('hidden-flagged-for-review')
  })

  it('filtersToFetchQuery includes view when flagged is true', () => {
    const out = filtersToFetchQuery({ ...EMPTY_FILTERS, flagged: true })
    expect(out).toContain('view=hidden-flagged-for-review')
  })

  it('countActiveFilters counts flagged=true', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, flagged: true })).toBe(1)
  })

  it('EMPTY_FILTERS has flagged=false', () => {
    expect(EMPTY_FILTERS.flagged).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm --filter web test filters.test
```

Expected: FAIL — `flagged` not in `AllEventsFilters`.

- [ ] **Step 3: Extend `AllEvent`**

In `apps/web/src/components/admin/review/all/types.ts`, add two new fields:

```typescript
import { type LifecycleStatus } from '@/components/admin/events/editor/LifecycleBadge'

export interface AllEvent {
  id: string
  title: string
  artist: string | null
  venueId: string
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  verified: boolean
  status: LifecycleStatus
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  isSoldOut: boolean
  hiddenFromConsumer: boolean
  isConcertReviewNeeded: boolean
}
```

- [ ] **Step 4: Extend `AllEventsFilters` + serialization**

In `apps/web/src/components/admin/review/all/filters.ts`:

```typescript
export interface AllEventsFilters {
  query: string
  verified: VerificationFilter
  dateFrom: string
  dateTo: string
  genre: string[]
  missingData: MissingDataFlag[]
  flagged: boolean
}

export const EMPTY_FILTERS: AllEventsFilters = {
  query: '',
  verified: 'all',
  dateFrom: '',
  dateTo: '',
  genre: [],
  missingData: [],
  flagged: false,
}
```

In `parseFiltersFromParams`, after the existing fields:

```typescript
  const flagged = params.get('view') === 'hidden-flagged-for-review'

  return {
    query: params.get('query') ?? '',
    verified,
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    genre,
    missingData,
    flagged,
  }
```

In `serializeFiltersToParams`, add `'view'` to the strip-first array, and after the existing if-blocks:

```typescript
  for (const key of [
    'query',
    'verified',
    'dateFrom',
    'dateTo',
    'genre',
    'missingData',
    'view',
  ]) {
    next.delete(key)
  }
  // ... existing if-blocks ...
  if (filters.flagged) next.set('view', 'hidden-flagged-for-review')
  return next
}
```

In `filtersToFetchQuery`, add after the existing fields:

```typescript
  if (filters.flagged) params.set('view', 'hidden-flagged-for-review')
  return params.toString()
}
```

In `countActiveFilters`:

```typescript
  if (filters.flagged) count++
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
pnpm --filter web test filters.test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/all/types.ts \
        apps/web/src/components/admin/review/all/filters.ts \
        apps/web/src/components/admin/review/all/filters.test.ts
git commit -m "feat(web): AllEventsFilters flagged round-trip + AllEvent isConcertReviewNeeded"
```

---

### Task 3.4: Web — add copy for new editor + chip + confirm modal

**Files:**
- Modify: `apps/web/src/components/admin/definitions/copy.ts`

**Interfaces:**
- Produces: new copy keys under `editor.classification` (markAsConcertTitle, markAsConcertBody, markAsConcertButton, markNonConcertButton, reviewNeededPillLabel, markAsConcertConfirm, markNonConcertConfirm), under `editor.dangerZone` (`markNonConcert` removed; verify it's not used elsewhere first), and under `review.allEvents.filters` (`flaggedChip*`).

- [ ] **Step 1: Locate the existing `editor.classification` block**

It's at `apps/web/src/components/admin/definitions/copy.ts:1226-1233`.

- [ ] **Step 2: Replace it with the expanded shape**

```typescript
    classification: {
      reviewNeededPillLabel: 'LLM flagged for review',
      reviewNeededPillTooltip:
        'The classifier had reasonable doubt about whether this is a concert.',
      visibilityTitle: 'Visible to consumers',
      // Mark non-concert (shown when hiddenFromConsumer=false)
      markNonConcertTitle: 'Mark as non-concert',
      markNonConcertBodyBefore: 'Adds the ',
      markNonConcertTag: 'non-concert',
      markNonConcertBodyAfter:
        ' tag and unpublishes from the consumer app. Stays in the system.',
      markNonConcertButton: 'Mark non-concert',
      // Mark as concert (shown when hiddenFromConsumer=true)
      markAsConcertTitle: 'Mark as concert',
      markAsConcertBody:
        'Republishes this event to every consumer-facing surface. Use this when the classifier wrongly hid a real concert.',
      markAsConcertButton: 'Mark as concert',
      // Confirm-modal copy
      markAsConcertConfirm: {
        heading: 'Mark as concert?',
        body: 'The event re-appears on every consumer-facing surface within one router refresh cycle. You can flip it back later if the classification was wrong.',
        confirm: 'Mark as concert',
        cancel: 'Cancel',
        eyebrow: 'classification',
      },
      markNonConcertConfirm: {
        heading: 'Mark as non-concert?',
        body: 'The event stays in the catalog but is hidden from every consumer-facing surface. You can flip this back later if the classification was wrong.',
        confirm: 'Mark non-concert',
        cancel: 'Cancel',
        eyebrow: 'classification',
      },
    },
```

**Note:** `editor.dangerZone.markNonConcert` is intentionally LEFT IN PLACE in this task. It's still referenced by `DangerZoneSection.tsx`, and we want every commit to leave the tree green. The key gets removed inside task 3.7 (the same commit that drops the consumer in `DangerZoneSection.tsx`).

- [ ] **Step 3: Add the filter chip copy**

In `apps/web/src/components/admin/definitions/copy.ts`, inside `review.allEvents.filters`, after `clearAll: 'Clear all',`:

```typescript
        flaggedChipLabel: 'Hidden — flagged for review',
        flaggedChipAriaLabel: 'Toggle hidden-and-flagged-for-review filter',
        flaggedChipEmpty: 'No hidden events are flagged for review.',
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter web typecheck
```

Expected: PASS. (The new keys are additive; nothing has been removed yet.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(web): admin copy for classification review queue"
```

---

### Task 3.5: Web — extend `EventConfirmModal` with `mark-as-concert` kind

**Files:**
- Modify: `apps/web/src/components/admin/review/all/EventConfirmModal.tsx`

**Interfaces:**
- Consumes: copy keys from task 3.4.
- Produces: `ConfirmKind = 'delete' | 'non-concert' | 'mark-as-concert'`. The 'mark-as-concert' kind routes to `editor.classification.markAsConcertConfirm` copy.

- [ ] **Step 1: Write a failing test**

Add a new test file `apps/web/src/components/admin/review/all/EventConfirmModal.test.tsx` (if one doesn't exist) or extend the existing one. New test:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventConfirmModal } from './EventConfirmModal'

describe('EventConfirmModal — mark-as-concert kind', () => {
  it('renders the Mark as concert confirm copy', () => {
    render(
      <EventConfirmModal
        kind="mark-as-concert"
        event={{ title: 'Borderline', venueName: 'X', date: '2026-08-01', showTime: null }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Mark as concert?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark as concert' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm --filter web test EventConfirmModal.test
```

Expected: FAIL — `'mark-as-concert'` is not assignable to `ConfirmKind`.

- [ ] **Step 3: Extend the modal**

In `apps/web/src/components/admin/review/all/EventConfirmModal.tsx`:

```typescript
type ConfirmKind = 'delete' | 'non-concert' | 'mark-as-concert'

// ... unchanged interfaces ...

const COPY_REVIEW = ADMIN_COPY.review.allEvents
const COPY_CLASSIFICATION = ADMIN_COPY.editor.classification

export const EventConfirmModal = ({
  kind,
  event,
  onCancel,
  onConfirm,
  pending = false,
}: EventConfirmModalProps) => {
  const isDelete = kind === 'delete'
  const isMarkAsConcert = kind === 'mark-as-concert'
  const copy = isDelete
    ? COPY_REVIEW.deleteConfirm
    : isMarkAsConcert
      ? COPY_CLASSIFICATION.markAsConcertConfirm
      : COPY_REVIEW.nonConcertConfirm
  const accent = isDelete
    ? 'var(--danger)'
    : isMarkAsConcert
      ? 'var(--success)'
      : 'var(--warning)'
  // ... rest unchanged, including the confirm button's variant logic:
  // <AdminButton variant={isDelete ? 'danger' : 'outline'} ...>
  // which already works for both 'non-concert' and 'mark-as-concert'.
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter web test EventConfirmModal.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/review/all/EventConfirmModal.tsx \
        apps/web/src/components/admin/review/all/EventConfirmModal.test.tsx
git commit -m "feat(web): EventConfirmModal handles mark-as-concert kind"
```

---

### Task 3.6: Web — make `ClassificationSection` interactive

**Files:**
- Modify: `apps/web/src/components/admin/events/editor/sections/ClassificationSection.tsx`

**Interfaces:**
- Consumes: copy from task 3.4; `EventConfirmModal` kind from task 3.5.
- Produces: `ClassificationSection` now accepts `hiddenFromConsumer: boolean`, `isConcertReviewNeeded: boolean`, `onMarkNonConcert: () => void`, `onMarkAsConcert: () => void`, `disabled?: boolean` props. Renders the review-needed pill when `isConcertReviewNeeded`, and either Mark-non-concert or Mark-as-concert button based on `hiddenFromConsumer`.

- [ ] **Step 1: Write failing tests in `EventEditorClient.test.tsx`**

Modify `apps/web/src/components/admin/events/editor/EventEditorClient.test.tsx`. First, update `SAMPLE` to include the new fields:

```typescript
const SAMPLE: EditorEvent = {
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  date: '2026-06-19',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: '60',
  confidenceScore: 0.82,
  verified: true,
  status: 'upcoming',
  extractionStrategy: 'llm',
  genre: ['indie', 'folk'],
  updatedAt: '2026-06-12T18:14:00Z',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  isSoldOut: false,
  hiddenFromConsumer: false,
  isConcertReviewNeeded: false,
}

const HIDDEN_FLAGGED: EditorEvent = {
  ...SAMPLE,
  hiddenFromConsumer: true,
  isConcertReviewNeeded: true,
}
```

Replace the existing "PATCHes hiddenFromConsumer when confirming Mark non-concert" test (it was inside the Danger zone block; the action moved). Add:

```typescript
describe('EventEditorClient — classification', () => {
  it('renders Mark non-concert in Classification section when visible', () => {
    render(<EventEditorClient event={SAMPLE} />)
    // Button now lives in the Classification section, not Danger zone
    const buttons = screen.getAllByRole('button', { name: 'Mark non-concert' })
    expect(buttons.length).toBe(1)
  })

  it('Danger zone shows only Merge + Delete (no Mark non-concert)', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Danger zone')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete event…' })).toBeTruthy()
    // Verify the Danger zone region itself does NOT contain Mark non-concert
    const dangerHeading = screen.getByText('Danger zone')
    const dangerSection = dangerHeading.closest('[data-section]') ?? dangerHeading.parentElement
    if (dangerSection) {
      expect(
        within(dangerSection as HTMLElement).queryByRole('button', { name: 'Mark non-concert' }),
      ).toBeNull()
    }
  })

  it('PATCHes hiddenFromConsumer=true when confirming Mark non-concert from Classification', async () => {
    render(<EventEditorClient event={SAMPLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mark non-concert' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark non-concert' }))
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1)
    })
    const [url, , body] = mockApiPatch.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1')
    expect(body).toEqual({ hiddenFromConsumer: true })
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
  })

  it('renders Mark as concert + review-needed pill when hidden and flagged', () => {
    render(<EventEditorClient event={HIDDEN_FLAGGED} />)
    expect(screen.getByRole('button', { name: 'Mark as concert' })).toBeTruthy()
    expect(screen.getByText('LLM flagged for review')).toBeTruthy()
    // Mark non-concert should NOT render when already hidden
    expect(screen.queryByRole('button', { name: 'Mark non-concert' })).toBeNull()
  })

  it('PATCHes hiddenFromConsumer=false when confirming Mark as concert', async () => {
    render(<EventEditorClient event={HIDDEN_FLAGGED} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mark as concert' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as concert' }))
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledTimes(1)
    })
    const [url, , body] = mockApiPatch.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events/evt-1')
    expect(body).toEqual({ hiddenFromConsumer: false })
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
  })
})
```

Also update the existing "renders all five numbered sections" + "renders the Danger zone section" tests to drop the "Mark non-concert" lookup from the Danger zone case (the new Danger zone test above replaces it).

- [ ] **Step 2: Run, verify failure**

```bash
pnpm --filter web test EventEditorClient.test
```

Expected: FAIL — `EditorEvent` is missing the new fields; `ClassificationSection` is read-only.

- [ ] **Step 3: Rewrite `ClassificationSection.tsx`**

```typescript
'use client'

import { Eye, EyeOff, Flag } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'

export interface ClassificationSectionProps {
  genre: string[] | null
  hiddenFromConsumer: boolean
  isConcertReviewNeeded: boolean
  onMarkNonConcert: () => void
  onMarkAsConcert: () => void
  disabled?: boolean
}

export const ClassificationSection = ({
  genre,
  hiddenFromConsumer,
  isConcertReviewNeeded,
  onMarkNonConcert,
  onMarkAsConcert,
  disabled = false,
}: ClassificationSectionProps) => {
  const { sections, fields, classification } = ADMIN_COPY.editor
  const tags = genre ?? []
  return (
    <EditSection
      number={sections.classificationNumber}
      title={sections.classificationTitle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <EditField
          label={fields.genreTags}
          type="tags"
          tags={tags}
          help={tags.length === 0 ? fields.genreEmptyHelp : undefined}
        />

        {isConcertReviewNeeded && (
          <div
            title={classification.reviewNeededPillTooltip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              padding: '4px 10px',
              background: 'color-mix(in oklab, var(--warning) 12%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 36%, transparent)',
              borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg)',
            }}
          >
            <Flag size={12} />
            {classification.reviewNeededPillLabel}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 14px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 9,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              {hiddenFromConsumer
                ? classification.markAsConcertTitle
                : classification.markNonConcertTitle}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginTop: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexWrap: 'wrap',
              }}
            >
              {hiddenFromConsumer ? (
                <span>{classification.markAsConcertBody}</span>
              ) : (
                <>
                  <span>{classification.markNonConcertBodyBefore}</span>
                  <StatusBadge kind="neutral" mono>
                    {classification.markNonConcertTag}
                  </StatusBadge>
                  <span>{classification.markNonConcertBodyAfter}</span>
                </>
              )}
            </div>
          </div>
          {hiddenFromConsumer ? (
            <AdminButton
              type="button"
              variant="outline"
              icon={Eye}
              onClick={onMarkAsConcert}
              disabled={disabled}
            >
              {classification.markAsConcertButton}
            </AdminButton>
          ) : (
            <AdminButton
              type="button"
              variant="outline"
              icon={EyeOff}
              onClick={onMarkNonConcert}
              disabled={disabled}
            >
              {classification.markNonConcertButton}
            </AdminButton>
          )}
        </div>
      </div>
    </EditSection>
  )
}
```

- [ ] **Step 4: Commit incrementally before wiring the parent**

```bash
git add apps/web/src/components/admin/events/editor/sections/ClassificationSection.tsx
git commit -m "feat(web): ClassificationSection becomes interactive"
```

(Tests still failing because `EventEditorClient` hasn't been rewired yet — that's task 3.8.)

---

### Task 3.7: Web — slim `DangerZoneSection` (drop Mark non-concert)

**Files:**
- Modify: `apps/web/src/components/admin/events/editor/sections/DangerZoneSection.tsx`

**Interfaces:**
- Produces: `DangerZoneSection` no longer accepts `onMarkNonConcert`. Props become `{ onMerge, onDelete, disabled? }`.

- [ ] **Step 1: Rewrite the section + drop the now-unused copy key**

In `apps/web/src/components/admin/definitions/copy.ts`, remove `markNonConcert: 'Mark non-concert',` from `editor.dangerZone`. After the edit, grep to confirm there are no remaining consumers:

```bash
grep -rn "dangerZone.markNonConcert" apps/web/src/
```

Expected: zero matches (the consumer is about to be deleted in this same step).

Then rewrite `apps/web/src/components/admin/events/editor/sections/DangerZoneSection.tsx`:

```typescript
'use client'

import { GitMerge, Trash2 } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { EditSection } from '../EditSection'

export interface DangerZoneSectionProps {
  onMerge: () => void
  onDelete: () => void
  disabled?: boolean
}

const COPY = ADMIN_COPY.editor.dangerZone

export const DangerZoneSection = ({
  onMerge,
  onDelete,
  disabled = false,
}: DangerZoneSectionProps) => (
  <EditSection
    number={ADMIN_COPY.editor.sections.dangerNumber}
    title={COPY.title}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'color-mix(in oklab, var(--danger) 6%, transparent)',
        border: '1px solid color-mix(in oklab, var(--danger) 22%, transparent)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        {COPY.body}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AdminButton
          type="button"
          variant="outline"
          icon={GitMerge}
          onClick={onMerge}
          disabled={disabled}
        >
          {COPY.mergeIntoAnother}
        </AdminButton>
        <AdminButton
          type="button"
          variant="danger"
          icon={Trash2}
          onClick={onDelete}
          disabled={disabled}
        >
          {COPY.deleteEvent}
        </AdminButton>
      </div>
    </div>
  </EditSection>
)
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/events/editor/sections/DangerZoneSection.tsx \
        apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(web): DangerZoneSection drops Mark non-concert"
```

---

### Task 3.8: Web — wire parent `EventEditorClient` to new section APIs

**Files:**
- Modify: `apps/web/src/components/admin/events/editor/EventEditorClient.tsx`
- Modify: `apps/web/src/components/admin/events/editor/EventEditorClient.test.tsx` (`SAMPLE` already updated in 3.6)

**Interfaces:**
- Consumes: `ClassificationSection` from 3.6, `DangerZoneSection` from 3.7, `EventConfirmModal` from 3.5.
- Produces: a green test run. `EditorEvent` gains `hiddenFromConsumer + isConcertReviewNeeded`. Two separate confirm-state hooks: `pendingClassification: 'mark-non-concert' | 'mark-as-concert' | null` (handled in `ClassificationSection`), `pendingDanger: 'delete' | null` (handled in `DangerZoneSection`).

- [ ] **Step 1: Extend `EditorEvent`**

In `apps/web/src/components/admin/events/editor/EventEditorClient.tsx`:

```typescript
export interface EditorEvent {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  verified: boolean
  status: LifecycleStatus
  extractionStrategy: string | null
  genre: string[] | null
  updatedAt: string | null
  venueId: string | null
  venueName: string | null
  isSoldOut: boolean
  hiddenFromConsumer: boolean
  isConcertReviewNeeded: boolean
}
```

- [ ] **Step 2: Replace `pendingDanger` discriminated union + handler**

Drop `'non-concert'` from `pendingDanger`. Add separate `pendingClassification` state. Add a `pendingClassificationOp` to track the in-flight PATCH:

```typescript
  const [pendingDanger, setPendingDanger] = useState<'delete' | null>(null)
  const [dangerPending, setDangerPending] = useState(false)
  const [pendingClassification, setPendingClassification] = useState<
    'mark-non-concert' | 'mark-as-concert' | null
  >(null)
  const [classificationPending, setClassificationPending] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
```

Replace the `onConfirmDanger` callback. The non-concert branch is removed; only `'delete'` remains:

```typescript
  const onConfirmDanger = useCallback(async () => {
    if (pendingDanger !== 'delete') return
    setDangerPending(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.delete(`/v1/admin/events/${event.id}`, token)
      setPendingDanger(null)
      router.push('/admin/review?tab=all-events')
    } catch (dangerErr) {
      const message =
        dangerErr instanceof ApiError
          ? dangerErr.message
          : ADMIN_COPY.editor.saveBar.saveFailed
      console.error('EventEditorClient danger action error:', dangerErr)
      setError(message)
    } finally {
      setDangerPending(false)
    }
  }, [event.id, getToken, pendingDanger, router])

  const onConfirmClassification = useCallback(async () => {
    if (!pendingClassification) return
    setClassificationPending(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      const hiddenFromConsumer = pendingClassification === 'mark-non-concert'
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
        hiddenFromConsumer,
      })
      setPendingClassification(null)
      router.refresh()
    } catch (classificationErr) {
      const message =
        classificationErr instanceof ApiError
          ? classificationErr.message
          : ADMIN_COPY.editor.saveBar.saveFailed
      console.error('EventEditorClient classification action error:', classificationErr)
      setError(message)
    } finally {
      setClassificationPending(false)
    }
  }, [event.id, getToken, pendingClassification, router])
```

- [ ] **Step 3: Pass the new props to `ClassificationSection` + `DangerZoneSection`**

```typescript
      <ClassificationSection
        genre={event.genre}
        hiddenFromConsumer={event.hiddenFromConsumer}
        isConcertReviewNeeded={event.isConcertReviewNeeded}
        onMarkNonConcert={() => setPendingClassification('mark-non-concert')}
        onMarkAsConcert={() => setPendingClassification('mark-as-concert')}
        disabled={saving || classificationPending}
      />
      {/* ... StatusSection, ArtSection unchanged ... */}
      <DangerZoneSection
        onMerge={() => setMergeOpen(true)}
        onDelete={() => setPendingDanger('delete')}
        disabled={saving || dangerPending}
      />
```

- [ ] **Step 4: Render the two confirm modals separately**

```typescript
      {pendingDanger === 'delete' && (
        <EventConfirmModal
          kind="delete"
          event={{
            title: event.title,
            venueName: event.venueName,
            date: event.date,
            showTime: event.showTime,
          }}
          pending={dangerPending}
          onCancel={() => setPendingDanger(null)}
          onConfirm={onConfirmDanger}
        />
      )}
      {pendingClassification && (
        <EventConfirmModal
          kind={
            pendingClassification === 'mark-as-concert'
              ? 'mark-as-concert'
              : 'non-concert'
          }
          event={{
            title: event.title,
            venueName: event.venueName,
            date: event.date,
            showTime: event.showTime,
          }}
          pending={classificationPending}
          onCancel={() => setPendingClassification(null)}
          onConfirm={onConfirmClassification}
        />
      )}
```

- [ ] **Step 5: Update the `edit/page.tsx` server component to pass through the new fields**

Locate `apps/web/src/app/(protected)/admin/events/[id]/edit/page.tsx`. The server component fetches `GET /v1/admin/events/:id` and maps to `EditorEvent`. Add the new fields to the mapping (they're already present in the API projection from task 3.2):

```bash
grep -n "hiddenFromConsumer\|isConcertReviewNeeded\|EditorEvent" apps/web/src/app/\(protected\)/admin/events/\[id\]/edit/page.tsx
```

Add to the projection / mapping:

```typescript
{
  // ... existing fields ...
  hiddenFromConsumer: row.hiddenFromConsumer,
  isConcertReviewNeeded: row.isConcertReviewNeeded,
}
```

- [ ] **Step 6: Run the test suite**

```bash
pnpm --filter web test EventEditorClient.test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/events/editor/EventEditorClient.tsx \
        apps/web/src/components/admin/events/editor/EventEditorClient.test.tsx \
        apps/web/src/app/\(protected\)/admin/events/\[id\]/edit/page.tsx
git commit -m "feat(web): wire ClassificationSection + DangerZoneSection refactor"
```

---

### Task 3.9: Web — add filter chip to `EventsFilterBar`

**Files:**
- Modify: `apps/web/src/components/admin/review/all/EventsFilterBar.tsx`

**Interfaces:**
- Consumes: copy from task 3.4 (`flaggedChipLabel`, `flaggedChipAriaLabel`).
- Produces: a toggle chip at the top of the filter bar. Sets/clears `filters.flagged`.

- [ ] **Step 1: Write a failing test**

In `apps/web/src/components/admin/review/all/EventsFilterBar.test.tsx`:

```typescript
describe('EventsFilterBar — flagged chip', () => {
  it('renders the Hidden — flagged for review chip', () => {
    const onChange = vi.fn()
    render(<EventsFilterBar filters={EMPTY_FILTERS} onChange={onChange} />)
    expect(
      screen.getByRole('button', { name: 'Toggle hidden-and-flagged-for-review filter' }),
    ).toBeTruthy()
  })

  it('toggles filters.flagged when clicked', () => {
    const onChange = vi.fn()
    render(<EventsFilterBar filters={EMPTY_FILTERS} onChange={onChange} />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle hidden-and-flagged-for-review filter' }),
    )
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      flagged: true,
    })
  })

  it('reflects the active state with aria-pressed=true', () => {
    const onChange = vi.fn()
    render(
      <EventsFilterBar
        filters={{ ...EMPTY_FILTERS, flagged: true }}
        onChange={onChange}
      />,
    )
    const chip = screen.getByRole('button', {
      name: 'Toggle hidden-and-flagged-for-review filter',
    })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
pnpm --filter web test EventsFilterBar.test
```

Expected: FAIL — chip not rendered.

- [ ] **Step 3: Add the chip**

In `apps/web/src/components/admin/review/all/EventsFilterBar.tsx`, add a chip row at the top of the returned JSX (before the search input row):

```typescript
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          aria-pressed={filters.flagged}
          aria-label={COPY.flaggedChipAriaLabel}
          onClick={() => update({ flagged: !filters.flagged })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            height: 28,
            borderRadius: 999,
            border: filters.flagged
              ? '1px solid var(--warning)'
              : '1px solid var(--border-strong)',
            background: filters.flagged
              ? 'color-mix(in oklab, var(--warning) 12%, transparent)'
              : 'var(--surface-1)',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--fg)',
          }}
        >
          {COPY.flaggedChipLabel}
        </button>
      </div>
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter web test EventsFilterBar.test
```

- [ ] **Step 5: Update the empty-state copy in `AllEventsTabContent`**

Locate the empty state in `apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx` (the `<EmptyState />` component). Replace it with a content-aware empty state that picks copy based on `filters.flagged`:

```typescript
const EmptyState = ({ flagged }: { flagged: boolean }) => (
  <div
    style={{
      padding: '48px 32px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--fg)',
        marginBottom: 8,
      }}
    >
      {flagged
        ? ADMIN_COPY.review.allEvents.filters.flaggedChipEmpty
        : ADMIN_COPY.review.allEvents.empty.heading}
    </div>
    {!flagged && (
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
        {ADMIN_COPY.review.allEvents.empty.body}
      </div>
    )}
  </div>
)
```

Update the call site in the same file (search for `<EmptyState />`) to pass `flagged={filters.flagged}`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/all/EventsFilterBar.tsx \
        apps/web/src/components/admin/review/all/EventsFilterBar.test.tsx \
        apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx
git commit -m "feat(web): flagged-for-review filter chip + empty state"
```

---

### Task 3.10: Pre-push + PR

- [ ] **Step 1: Full checks**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: green.

- [ ] **Step 2: Manual UI walk-through**

Start dev server: `pnpm dev`. Walk through:

1. `/admin/review?tab=all-events` — toggle the new chip; URL gains `view=hidden-flagged-for-review`; row list reduces to hidden+flagged rows.
2. Click into a hidden+flagged event → editor → ClassificationSection shows the "LLM flagged for review" pill + Mark-as-concert button. Click → confirm modal → confirm → router refresh → event reappears in consumer surface (`/events`).
3. Click into a visible event → ClassificationSection shows Mark-non-concert button (no pill). Click → confirm → row gets hidden.
4. Verify Danger zone has only Merge + Delete; no Mark non-concert.

- [ ] **Step 3: Rebase + push**

```bash
git fetch origin
git rebase origin/main
git push -u origin feat/classification-review-ui
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "feat: classification review queue — admin UI + API filter (PR 3/3)" --body "$(cat <<'EOF'
## Summary

PR 3 of 3 for the classification review queue (spec: `docs/superpowers/specs/2026-06-24-classification-review-queue-design.md`).

- API: `GET /v1/admin/events?view=hidden-flagged-for-review` scopes to `hidden_from_consumer=true AND is_concert_review_needed=true`
- API: list + detail responses now include `isConcertReviewNeeded`
- Admin editor: `ClassificationSection` becomes interactive — absorbs Mark-non-concert from Danger Zone, adds Mark-as-concert, renders LLM-flagged pill when set
- Admin editor: Danger Zone slim to Merge + Delete only
- All Events tab: new filter chip "Hidden — flagged for review" with content-aware empty state
- Confirm modal: gains `mark-as-concert` kind
- Audit: both Mark-non-concert and Mark-as-concert audit as `event.update` with `{ hiddenFromConsumer: ... }` in meta (existing behavior — distinct keys tracked as follow-up #789)

## Test plan

- [ ] `pnpm --filter web test EventEditorClient.test` — section refactor + both flows
- [ ] `pnpm --filter web test EventConfirmModal.test`
- [ ] `pnpm --filter web test EventsFilterBar.test`
- [ ] `pnpm --filter web test filters.test`
- [ ] `pnpm --filter @concert-crawl/api test events.integration` — view filter + projection
- [ ] Manual walk-through (described in task 3.10): chip toggle → hidden+flagged row → editor → Mark-as-concert → event re-appears in consumer surface

## Env vars

None.

## Risk

Medium. UI surface changes the editor's section semantics (Mark-non-concert moves; Danger Zone slimmer). Test coverage covers both the new home and the absence in Danger Zone. Roll-forward if needed.

## Follow-ups

- #789 — reconcile single-row vs bulk audit action key asymmetry
- #790 — promote chip to tab if queue grows past ~20 active rows
- #791 — build visible-but-flagged UI surface if false positives become operational
EOF
)"
```

- [ ] **Step 5: Request Copilot review + iterate to merge bar**

Same protocol as PR 1 + PR 2.

---


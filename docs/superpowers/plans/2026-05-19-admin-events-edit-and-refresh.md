# Admin Events Edit & Queue Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three admin UX improvements — clickable run history rows in the crawl page (#161), background auto-refresh for the events queue (#415), and editable event fields in the inspector panel (#259).

**Architecture:** #161 is a pure state change in `CrawlSplitView` — a `selectedRunId` that overrides the always-most-recent `activeRun` derivation and resets when the venue changes. #415 adds a `useAdminEvents` TanStack Query hook, wires it into `EventQueueSplit` via `initialData`, and invalidates it on approve/reject so the queue stays fresh across tab switches and mutations. #259 extends the existing `PATCH /v1/admin/events/:id` schema to accept content fields, adds a `useUpdateEvent` mutation, and adds `isEditing`/`editDraft` state to the inspector panel so fields switch from display spans to `<input>` elements.

**Tech Stack:** Next.js 14 App Router (RSC + client components), Hono, Drizzle ORM, TanStack Query v5, Zod, Vitest, TypeScript strict

---

## Files

| Action | Path |
|--------|------|
| Modify | `apps/web/src/components/admin/crawl/CrawlSplitView.tsx` |
| Modify | `apps/web/src/lib/queries/use-admin-events.ts` |
| Modify | `apps/web/src/components/admin/events/EventQueueSplit.tsx` |
| Modify | `apps/api/src/routes/admin/events.ts` |
| Modify | `apps/api/src/routes/admin/events.test.ts` |

---

## Task 1: #161 — Selectable run history rows

The `CrawlRunHistoryTable` already renders `TR` rows with full `active` + `onClick` support — they just aren't wired up. `activeRun` in `CrawlSplitView` is derived as `venueRuns[0]`, so clicking a past run has no effect.

**Files:**
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

---

- [ ] **Step 1: Add `selectedRunId` state and reset it when the selected venue changes**

In `CrawlSplitView`, after the existing state declarations (around line 244), add:

```tsx
const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

// Reset run selection when the user switches venues
useEffect(() => {
  setSelectedRunId(null)
}, [selectedId])
```

---

- [ ] **Step 2: Update `activeRun` derivation to prefer `selectedRunId`**

Replace the existing `activeRun` derivation (currently around line 318):

```tsx
// Before
const activeRun =
  (selectedId ? venueRuns[0] : null) ??
  initialRuns.find((run) => run.venueId === selectedId) ??
  null
```

With:

```tsx
const activeRun =
  (selectedId
    ? (venueRuns.find((run) => run.id === selectedRunId) ?? venueRuns[0])
    : null) ??
  initialRuns.find((run) => run.venueId === selectedId) ??
  null
```

---

- [ ] **Step 3: Pass `selectedRunId` and `onSelectRun` to `CrawlRunHistoryTable`**

Find the `<CrawlRunHistoryTable>` usage (around line 1065) and update:

```tsx
// Before
<CrawlRunHistoryTable
  runs={selectedId ? venueRuns : initialRuns}
  loading={venueRunsLoading}
  selectedVenueName={selected?.venueName ?? null}
/>
```

```tsx
// After
<CrawlRunHistoryTable
  runs={selectedId ? venueRuns : initialRuns}
  loading={venueRunsLoading}
  selectedVenueName={selected?.venueName ?? null}
  selectedRunId={selectedId ? selectedRunId : null}
  onSelectRun={selectedId ? setSelectedRunId : undefined}
/>
```

Rationale: row selection only makes sense when viewing a single venue's history. When showing the global 50-run list, rows stay non-interactive.

---

- [ ] **Step 4: Add `selectedRunId` and `onSelectRun` props to `CrawlRunHistoryTable` and wire them up**

Find the `CrawlRunHistoryTable` component declaration (around line 1074) and update its props interface and row rendering:

```tsx
// Props interface — update from:
export const CrawlRunHistoryTable = ({
  runs: displayRuns,
  loading = false,
  selectedVenueName,
}: {
  runs: CrawlRun[]
  loading?: boolean
  selectedVenueName?: string | null
}) => {
```

```tsx
// To:
export const CrawlRunHistoryTable = ({
  runs: displayRuns,
  loading = false,
  selectedVenueName,
  selectedRunId,
  onSelectRun,
}: {
  runs: CrawlRun[]
  loading?: boolean
  selectedVenueName?: string | null
  selectedRunId?: string | null
  onSelectRun?: (id: string) => void
}) => {
```

Then update the `TR` rendering inside the table body (currently around line 1150):

```tsx
// Before
<TR key={run.id}>
```

```tsx
// After
<TR
  key={run.id}
  active={selectedRunId === run.id}
  onClick={onSelectRun ? () => onSelectRun(run.id) : undefined}
>
```

---

- [ ] **Step 5: Verify the feature works manually**

Run the dev server from the worktree root:
```bash
pnpm dev
```

1. Open `http://localhost:3000/admin/crawl`
2. Click a venue in the left rail — the detail panel shows the most recent run
3. Scroll to the Run history table at the bottom
4. Click a past run row — the detail panel should update to show that run's details with the row highlighted (left accent border, elevated background)
5. Click a different venue in the left rail — the run selection should reset to the most recent run

---

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "feat(admin/crawl): make run history rows selectable (#161)"
```

---

## Task 2: #415 — Background refresh for admin events queue

`EventQueueSplit` currently seeds its `events` state from `initialEvents` (an SSR prop) and never re-fetches. New events that arrive via a crawl run won't appear without a full route refresh, and approve/reject mutations don't update any shared cache.

**Files:**
- Modify: `apps/web/src/lib/queries/use-admin-events.ts`
- Modify: `apps/web/src/components/admin/events/EventQueueSplit.tsx`

---

- [ ] **Step 1: Add `useAdminEvents` query hook to `use-admin-events.ts`**

The file currently only exports `useApproveEvent` and `useRejectEvent`. Replace the entire file with:

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import type { AdminEvent } from '@/app/(protected)/admin/events/page'

export const adminEventsQueryKey = ['admin', 'events'] as const

export function useAdminEvents(initialData: AdminEvent[]) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminEventsQueryKey,
    queryFn: async (): Promise<AdminEvent[]> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.get<AdminEvent[]>(
        '/v1/admin/events?verified=false&limit=500',
        token,
      )
    },
    initialData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useApproveEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}

export function useRejectEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.delete(`/v1/admin/events/${id}`, token)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}
```

---

- [ ] **Step 2: Update `EventQueueSplit` to use the query data**

In `EventQueueSplit.tsx`, the component receives `initialEvents: AdminEvent[]` and feeds it into `useState`. The query replaces that initial state while preserving the optimistic local-removal logic for keyboard navigation.

Find the component's state declarations (near the top of the component function) and update the import and events state:

```tsx
// Add to imports at top of file
import { useAdminEvents, useApproveEvent, useRejectEvent } from '@/lib/queries/use-admin-events'
```

Then find the events state declaration on line 243:

```tsx
// Before (line 243)
const [events, setEvents] = useState(initialEvents)
```

```tsx
// After
const { data: queriedEvents } = useAdminEvents(initialEvents)
const [events, setEvents] = useState<AdminEvent[]>(queriedEvents)

// Keep query data in sync with local state when a background refetch lands
useEffect(() => {
  setEvents(queriedEvents)
}, [queriedEvents])
```

> **Note:** The existing optimistic local-removal (where `setEvents(prev => prev.filter(...))` runs immediately on approve/reject) stays untouched. The `useEffect` above reconciles local state with the server after the invalidation refetch resolves, without fighting the optimistic update.

---

- [ ] **Step 3: Run the type check**

```bash
cd apps/web && pnpm typecheck
```

Expected: no new errors.

---

- [ ] **Step 4: Verify the feature works manually**

1. Open `http://localhost:3000/admin/events` in two browser tabs
2. In Tab A, approve an event — it should disappear from the queue
3. Switch to Tab B — the event should be gone after the window regains focus (no manual refresh needed)
4. Approve an event in Tab B, then switch back to Tab A — same result

---

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/queries/use-admin-events.ts apps/web/src/components/admin/events/EventQueueSplit.tsx
git commit -m "feat(admin/events): background refresh via useAdminEvents query (#415)"
```

---

## Task 3: #259 — Edit event fields in inspector panel

The `PATCH /v1/admin/events/:id` route exists but only accepts `verified` and `status`. The inspector shows fields labeled "extracted (editable)" but they're read-only `FieldRow` display spans. This task extends the API and wires up a full edit mode.

**Files:**
- Modify: `apps/api/src/routes/admin/events.ts`
- Modify: `apps/api/src/routes/admin/events.test.ts`
- Modify: `apps/web/src/lib/queries/use-admin-events.ts`
- Modify: `apps/web/src/components/admin/events/EventQueueSplit.tsx`

---

- [ ] **Step 1: Write failing tests for the extended PATCH schema**

Open `apps/api/src/routes/admin/events.test.ts` and add a new `describe` block after the existing `PATCH /v1/admin/events/:id/verify` block:

```ts
describe('PATCH /v1/admin/events/:id', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      },
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      },
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 and updates content fields', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockEventRow, title: 'Updated Title', artist: 'New Artist' },
    ])
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', artist: 'New Artist' }),
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Updated Title')
    expect(body.data.artist).toBe('New Artist')
  })

  it('returns 200 and accepts nullable price fields', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockEventRow, ticketPriceMin: '25.00', ticketPriceMax: null },
    ])
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketPriceMin: '25.00', ticketPriceMax: null }),
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.ticketPriceMin).toBe('25.00')
    expect(body.data.ticketPriceMax).toBeNull()
  })

  it('returns 400 for invalid date format', async () => {
    adminAuth()
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: 'not-a-date' }),
      },
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      },
    )
    expect(res.status).toBe(404)
  })
})
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd apps/api && pnpm test -- --reporter=verbose events.test
```

Expected: the new `PATCH /v1/admin/events/:id` tests fail (the route only accepts `verified`/`status` right now, so content fields will be stripped and the 400 date test will also fail).

---

- [ ] **Step 3: Extend the PATCH `/:id` route schema in `apps/api/src/routes/admin/events.ts`**

Find the existing `PATCH /:id` route (around line 111) and replace its `zValidator` schema:

```ts
// Before
eventsAdminRouter.patch(
  '/:id',
  zValidator('param', eventIdSchema),
  zValidator(
    'json',
    z.object({
      verified: z.boolean().optional(),
      status: z.enum(['upcoming', 'cancelled', 'postponed']).optional(),
    }),
  ),
```

```ts
// After
eventsAdminRouter.patch(
  '/:id',
  zValidator('param', eventIdSchema),
  zValidator(
    'json',
    z.object({
      verified: z.boolean().optional(),
      status: z.enum(['upcoming', 'cancelled', 'postponed']).optional(),
      title: z.string().min(1).optional(),
      artist: z.string().min(1).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
        .optional(),
      doorsTime: z.string().nullable().optional(),
      showTime: z.string().nullable().optional(),
      ticketPriceMin: z.string().nullable().optional(),
      ticketPriceMax: z.string().nullable().optional(),
      genre: z.array(z.string()).nullable().optional(),
    }),
  ),
```

The `db.update().set({ ...body, updatedAt: new Date() })` call below it already spreads `body`, so no further changes to the handler body are needed.

---

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
cd apps/api && pnpm test -- --reporter=verbose events.test
```

Expected: all tests in the file pass, including the new `PATCH /v1/admin/events/:id` block.

---

- [ ] **Step 5: Commit the API changes**

```bash
git add apps/api/src/routes/admin/events.ts apps/api/src/routes/admin/events.test.ts
git commit -m "feat(api): extend PATCH /admin/events/:id to accept content fields (#259)"
```

---

- [ ] **Step 6: Add `useUpdateEvent` to `use-admin-events.ts`**

Append to the end of `apps/web/src/lib/queries/use-admin-events.ts`:

```ts
interface EventUpdatePayload {
  title?: string
  artist?: string
  date?: string
  doorsTime?: string | null
  showTime?: string | null
  ticketPriceMin?: string | null
  ticketPriceMax?: string | null
  genre?: string[] | null
}

export function useUpdateEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: EventUpdatePayload
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.patch<AdminEvent>(
        `/v1/admin/events/${id}`,
        token,
        payload,
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}
```

---

- [ ] **Step 7: Add edit state to `EventQueueSplit`**

In `EventQueueSplit.tsx`, add the new imports and state. Add to the imports:

```tsx
import { useAdminEvents, useApproveEvent, useRejectEvent, useUpdateEvent } from '@/lib/queries/use-admin-events'
```

Then, inside the component body, after the existing state declarations, add:

```tsx
const updateEvent = useUpdateEvent()
const [isEditing, setIsEditing] = useState(false)
const [editDraft, setEditDraft] = useState<{
  title: string
  artist: string
  date: string
  doorsTime: string
  showTime: string
  ticketPriceMin: string
  ticketPriceMax: string
}>({
  title: '',
  artist: '',
  date: '',
  doorsTime: '',
  showTime: '',
  ticketPriceMin: '',
  ticketPriceMax: '',
})
```

Add a `useEffect` that resets edit mode when the selected event changes:

```tsx
useEffect(() => {
  setIsEditing(false)
}, [selectedId])
```

Add a handler that initializes the draft and enters edit mode when the Edit button is clicked:

```tsx
function handleEditStart() {
  if (!selected) return
  setEditDraft({
    title: selected.title,
    artist: selected.artist,
    date: selected.date,
    doorsTime: selected.doorsTime ?? '',
    showTime: selected.showTime ?? '',
    ticketPriceMin: selected.ticketPriceMin ?? '',
    ticketPriceMax: selected.ticketPriceMax ?? '',
  })
  setIsEditing(true)
}

async function handleEditSave() {
  if (!selected) return
  try {
    await updateEvent.mutateAsync({
      id: selected.id,
      payload: {
        title: editDraft.title || undefined,
        artist: editDraft.artist || undefined,
        date: editDraft.date || undefined,
        doorsTime: editDraft.doorsTime || null,
        showTime: editDraft.showTime || null,
        ticketPriceMin: editDraft.ticketPriceMin || null,
        ticketPriceMax: editDraft.ticketPriceMax || null,
      },
    })
    setIsEditing(false)
  } catch (err) {
    // actionError state already handles display
    console.error('Failed to save event edits', err)
  }
}

function handleEditCancel() {
  setIsEditing(false)
}
```

---

- [ ] **Step 8: Wire the Edit button and replace extracted fields with inputs in edit mode**

Find the existing Edit button in the inspector panel (around line 777):

```tsx
// Before
<AdminButton variant="outline" size="sm" icon={Edit2}>
  Edit
</AdminButton>
```

```tsx
// After
{isEditing ? (
  <>
    <AdminButton
      variant="primary"
      size="sm"
      onClick={() => void handleEditSave()}
      disabled={updateEvent.isPending}
    >
      {updateEvent.isPending ? 'Saving…' : 'Save'}
    </AdminButton>
    <AdminButton variant="ghost" size="sm" onClick={handleEditCancel}>
      Cancel
    </AdminButton>
  </>
) : (
  <AdminButton variant="outline" size="sm" icon={Edit2} onClick={handleEditStart}>
    Edit
  </AdminButton>
)}
```

Then find the extracted fields section (the `{/* Left: extracted (editable) */}` block, around line 881). Replace the inner field list:

```tsx
{/* Left: extracted (editable) */}
<div>
  <MonoLabel>extracted {isEditing ? '· editing' : '(editable)'}</MonoLabel>
  <div
    style={{
      marginTop: 10,
      padding: 16,
      border: `1px solid ${isEditing ? 'var(--signal)' : 'var(--border)'}`,
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: 'var(--surface-1)',
    }}
  >
    {isEditing ? (
      <>
        <EditFieldRow
          label="Title"
          value={editDraft.title}
          onChange={(val) => setEditDraft((prev) => ({ ...prev, title: val }))}
        />
        <EditFieldRow
          label="Artist"
          value={editDraft.artist}
          onChange={(val) => setEditDraft((prev) => ({ ...prev, artist: val }))}
        />
        <EditFieldRow
          label="Date"
          value={editDraft.date}
          type="date"
          mono
          onChange={(val) => setEditDraft((prev) => ({ ...prev, date: val }))}
        />
        <EditFieldRow
          label="Doors"
          value={editDraft.doorsTime}
          type="time"
          mono
          onChange={(val) =>
            setEditDraft((prev) => ({ ...prev, doorsTime: val }))
          }
        />
        <EditFieldRow
          label="Show"
          value={editDraft.showTime}
          type="time"
          mono
          onChange={(val) =>
            setEditDraft((prev) => ({ ...prev, showTime: val }))
          }
        />
        <EditFieldRow
          label="Price low"
          value={editDraft.ticketPriceMin}
          type="number"
          mono
          onChange={(val) =>
            setEditDraft((prev) => ({ ...prev, ticketPriceMin: val }))
          }
        />
        <EditFieldRow
          label="Price high"
          value={editDraft.ticketPriceMax}
          type="number"
          mono
          onChange={(val) =>
            setEditDraft((prev) => ({ ...prev, ticketPriceMax: val }))
          }
        />
        {selected.genre && selected.genre.length > 0 && (
          <FieldRow label="Tags" tags={selected.genre} />
        )}
      </>
    ) : (
      <>
        <FieldRow label="Title" value={selected.title} />
        <FieldRow label="Artist" value={selected.artist} />
        <FieldRow label="Venue" value={selected.venueName} />
        <FieldRow label="Date" value={formatDate(selected.date)} mono />
        <FieldRow label="Doors" value={formatTime(selected.doorsTime)} mono />
        <FieldRow label="Show" value={formatTime(selected.showTime)} mono />
        <FieldRow
          label="Price low"
          value={
            selected.ticketPriceMin
              ? `$${Math.round(parseFloat(selected.ticketPriceMin))}`
              : null
          }
          mono
          warn={!selected.ticketPriceMin}
        />
        <FieldRow
          label="Price high"
          value={
            selected.ticketPriceMax
              ? `$${Math.round(parseFloat(selected.ticketPriceMax))}`
              : null
          }
          mono
          warn={!selected.ticketPriceMax}
        />
        {selected.genre && selected.genre.length > 0 && (
          <FieldRow label="Tags" tags={selected.genre} />
        )}
      </>
    )}
  </div>
</div>
```

---

- [ ] **Step 9: Add the `EditFieldRow` component**

Add this helper component near the existing `FieldRow` component (around line 153):

```tsx
function EditFieldRow({
  label,
  value,
  type = 'text',
  mono,
  onChange,
}: {
  label: string
  value: string
  type?: 'text' | 'date' | 'time' | 'number'
  mono?: boolean
  onChange: (val: string) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--fg)',
          fontSize: 13,
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          outline: 'none',
        }}
        onFocus={(ev) => {
          ev.currentTarget.style.borderColor = 'var(--signal)'
        }}
        onBlur={(ev) => {
          ev.currentTarget.style.borderColor = 'var(--border)'
        }}
      />
    </div>
  )
}
```

---

- [ ] **Step 10: Run the type check**

```bash
cd apps/web && pnpm typecheck
```

Expected: no new errors.

---

- [ ] **Step 11: Verify edit mode works manually**

1. Open `http://localhost:3000/admin/events`
2. Select a pending event in the queue
3. Click **Edit** in the inspector header — the extracted fields section should switch to inputs, the border turns signal-colored, and the label reads "extracted · editing"
4. Modify the artist name and price fields
5. Click **Save** — the button shows "Saving…" then disappears; the panel switches back to display mode showing the updated values
6. Click **Edit** again then **Cancel** — values should revert to the pre-edit state
7. Select a different event — edit mode should exit automatically

---

- [ ] **Step 12: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass.

---

- [ ] **Step 13: Commit the frontend changes**

```bash
git add apps/web/src/lib/queries/use-admin-events.ts apps/web/src/components/admin/events/EventQueueSplit.tsx
git commit -m "feat(admin/events): edit event fields in inspector panel (#259)"
```

---

## Task 4: Open follow-up issues and update progress

- [ ] **Step 1: Confirm the three deferred #259 follow-up issues were opened**

Issues #449, #450, #451 were opened as part of the planning session. Verify they exist:

```bash
gh api repos/HartiganHM/concert-crawl/issues/449 --jq '.title'
gh api repos/HartiganHM/concert-crawl/issues/450 --jq '.title'
gh api repos/HartiganHM/concert-crawl/issues/451 --jq '.title'
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/admin-events-edit-and-refresh
```

Then open the PR using `.github/pull_request_template.md` conventions:

```bash
gh pr create \
  --title "feat(admin): event editing, queue refresh, selectable run history" \
  --body "$(cat <<'EOF'
## What does this PR do?

Three admin UX improvements targeting pre-beta issues.

**#161 — Selectable run history rows**
- Run history table rows are now clickable when a venue is selected
- Clicking a past run updates the detail panel to show that run's data
- Selection state (left accent border + surface highlight) uses the existing \`TR active\` prop
- Selecting a different venue resets the run selection to the most recent

**#415 — Background refresh for admin events queue**
- New \`useAdminEvents\` query hook fetches pending events with \`refetchOnWindowFocus: true\`
- Approve and reject mutations now call \`invalidateQueries\` on success
- \`EventQueueSplit\` switches from \`useState(initialEvents)\` to query data with \`initialData\` for SSR compatibility
- Optimistic local-removal for keyboard navigation is preserved

**#259 — Edit event fields in inspector panel (partial)**
- \`PATCH /v1/admin/events/:id\` extended to accept \`title\`, \`artist\`, \`date\`, \`doorsTime\`, \`showTime\`, \`ticketPriceMin\`, \`ticketPriceMax\`, \`genre\`
- Inspector Edit button now enters edit mode — extracted fields switch to inputs with signal border
- Save calls \`useUpdateEvent\` mutation; Cancel reverts; switching events exits edit mode automatically
- Deferred to separate issues: duplicate banner (#449), raw source panel (#450), footer meta (#451)

## How to test

1. Admin crawl page → select a venue → click a past run in the history table → detail panel updates
2. Admin events → approve an event → switch tabs and come back → approved event is gone
3. Admin events → select a pending event → click Edit → modify artist/price → Save → values update in display mode

## Checklist

- [ ] Tests pass locally (\`pnpm test\`)
- [ ] Types pass (\`pnpm typecheck\`)
- [ ] No new lint errors (\`pnpm lint\`)
- [ ] Relevant documentation updated

Closes #161
Closes #415
Closes #259
EOF
)"
```

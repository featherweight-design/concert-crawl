# Calendar Jump Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tappable month/year cue above the calendar WeekStrip that opens a mini-month grid, letting users jump to any date within a ~12-month forward window in one action instead of 8+ chevron clicks.

**Architecture:** A new lightweight API endpoint `GET /v1/events/availability` returns `date → showCount` pairs for a bounded date window (projection-only `GROUP BY`, backed by `events_date_status_idx`). The web app fetches the entire ~12-month window in ONE small request (counts only, <10KB), caches it in react-query (30 min stale) and SSR-prefetches it to seed `initialData`, so all month-paging inside the picker is client-side with zero further network. A new responsive `JumpPicker` component (Tailwind `sm:` variants for mobile sheet vs. desktop popover — single component, honoring the mobile/desktop parity rule) renders the grid. The existing `WeekStrip` is refactored to grid-only; a new `WeekStripHeader` hosts the cue chip + week-pager chevrons. In-week day selection stays client-side (`window.history.replaceState`); jumping to a date outside the current week triggers a `router.push` that preserves active filters and re-paginates via `weekOffset`.

**Tech Stack:** Next.js 14 (App Router, RSC + client components), Hono REST API, Drizzle ORM (Postgres), `@tanstack/react-query` ^5, Zod, Tailwind CSS with CSS-variable token theming, Vitest (unit + integration), Testing Library.

## Global Constraints

- **Token theming only** — every color is a `var(--*)` token; no hardcoded hex, no Tailwind `dark:` variants. Exact token values are copied verbatim from `docs/superpowers/design-tables/calendar-jump-picker.md`.
- **No `as` casts** — validate cross-boundary data (API responses, params) with Zod `safeParse` or type guards; augment library types rather than casting.
- **All customer-facing strings live in `apps/web/src/components/consumer/definitions/copy.ts`** (`CONSUMER_COPY`). No inline user-facing text in components.
- **Arrow-function components**, no `handle*` handler names, non-trivial logic extracted to `lib/` (`definitions/lib` or a colocated `date-math.ts`), semantic HTML + ARIA in the same PR.
- **Mobile/desktop behavioral parity** in the same PR — same states, same close paths, same keyboard model. Only layout differs.
- **Async catch blocks log**; fire-and-forget promises are `void`-ed async IIFEs.
- **Sunday-first grid display** (`DOW1 = ["S","M","T","W","T","F","S"]`, `startDow = new Date(y,m,1).getDay()`), but **Monday-based week navigation** (existing `currentWeekDays` uses `mondayOffset = dow===0 ? -6 : 1-dow`). Do not conflate the two.
- **Forward window ≈ 12 months** — picker cannot page before the current month (`atMin`) nor past current-month + 12 (`atMax`).
- **API cache layer is out of scope** — tracked separately in issue #976. Client-side react-query caching is in scope.
- Per-worktree test DB: `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/concert_crawl_test__cal_jump_picker`.
- Run `pnpm --filter <app> typecheck && lint && test` before every push; rebase on `origin/main` before pushing.

---

## File Structure

**API (`apps/api`)**

- Modify: `apps/api/src/routes/events.ts` — add `GET /availability` route (after `/genres`, before `/:id`) with a Zod-validated window and a `GROUP BY date` count query.
- Modify: `apps/api/src/routes/events.integration.test.ts` — availability endpoint integration tests.

**Types (`packages/types`)**

- Modify: `packages/types/src/index.ts` — add `EventsAvailabilityResponse` (and its `AvailabilityDay` row shape).

**Web — data layer (`apps/web`)**

- Create: `apps/web/src/lib/queries/use-availability.ts` — react-query hook mirroring `use-watching.ts`, with `initialData` seeding.
- Modify: `apps/web/src/app/(protected)/(main)/events/page.tsx` — SSR-fetch availability for the window and pass as `initialAvailability`.

**Web — picker (`apps/web/src/components/consumer/jump-picker/`)**

- Create: `apps/web/src/components/consumer/jump-picker/date-math.ts` — pure date helpers (`monthMatrix`, `pickerWindow`, `weekOffsetForDate`, `isoOf`, `addMonths`, `ymdKey`).
- Create: `apps/web/src/components/consumer/jump-picker/date-math.test.ts` — unit tests for the helpers.
- Create: `apps/web/src/components/consumer/jump-picker/JumpPicker.tsx` — the responsive picker (cue-anchored dialog, grid, pager, footer, Today reset, full keyboard model).
- Create: `apps/web/src/components/consumer/jump-picker/JumpPicker.test.tsx` — component + a11y/keyboard tests.
- Create: `apps/web/src/components/consumer/jump-picker/index.ts` — barrel.

**Web — week strip refactor (`apps/web/src/components/consumer/week-strip/`)**

- Modify: `apps/web/src/components/consumer/week-strip/WeekStrip.tsx` — strip out the flanking chevrons, becoming grid-only.
- Create: `apps/web/src/components/consumer/week-strip/WeekStripHeader.tsx` — cue chip (opens `JumpPicker`) + week-pager chevrons row.
- Modify: `apps/web/src/components/consumer/week-strip/index.ts` — export `WeekStripHeader`.

**Web — wiring (`apps/web/src/components/consumer/calendar-view/`)**

- Modify: `apps/web/src/components/consumer/calendar-view/CalendarView.tsx` — render `WeekStripHeader` + `WeekStrip`, wire availability + jump navigation (in-week `replaceState` / cross-week `router.push`).

**Copy & release**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts` — jump-picker strings.
- Modify: `apps/web/src/lib/definitions/releases.ts` — release note entry.

---

## Task 1: `EventsAvailabilityResponse` type

**Files:**

- Modify: `packages/types/src/index.ts` (near `EventsListResponse`, ~L646)

**Interfaces:**

- Produces: `AvailabilityDay = { date: string; count: number }` and `EventsAvailabilityResponse = { data: AvailabilityDay[]; from: string; to: string }`. The API route (Task 2) and the react-query hook (Task 5) both consume these exact names/shapes.

- [ ] **Step 1: Add the type**

In `packages/types/src/index.ts`, immediately after the `EventsListResponse` interface, add:

```ts
export interface AvailabilityDay {
  /** ISO date `YYYY-MM-DD` (event-local calendar date). */
  date: string
  /** Number of consumer-visible shows on that date. */
  count: number
}

export interface EventsAvailabilityResponse {
  data: AvailabilityDay[]
  /** Inclusive window start, `YYYY-MM-DD`. */
  from: string
  /** Inclusive window end, `YYYY-MM-DD`. */
  to: string
}
```

- [ ] **Step 2: Typecheck the package**

Run: `pnpm --filter @concert-crawl/types typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add EventsAvailabilityResponse for calendar jump picker"
```

---

## Task 2: Availability API endpoint

**Files:**

- Modify: `apps/api/src/routes/events.ts` (add route after `GET /genres`, before `GET /:id`)
- Test: `apps/api/src/routes/events.integration.test.ts`

**Interfaces:**

- Consumes: Drizzle `events` table (`date`, `status`, `hiddenFromConsumer`, `firstMissingAt`), `events_date_status_idx` on `(date, status)`; `todayInTimezone` from `../lib/time.js`; `EventsAvailabilityResponse`, `AvailabilityDay` from `@concert-crawl/types`.
- Produces: `GET /v1/events/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` → `EventsAvailabilityResponse`. Window is clamped to ≤ 400 days. Consumed by Task 5's hook.

- [ ] **Step 1: Write the failing integration test**

Add to `apps/api/src/routes/events.integration.test.ts` (mirror existing seed/clear patterns in that file):

```ts
describe('GET /v1/events/availability', () => {
  it('returns per-date show counts within the window', async () => {
    const venue = await seedVenue({ slug: 'larimer', name: 'Larimer Lounge' })
    await seedEvent({
      venueId: venue.id,
      date: '2026-04-28',
      status: 'upcoming',
    })
    await seedEvent({
      venueId: venue.id,
      date: '2026-04-28',
      status: 'upcoming',
    })
    await seedEvent({
      venueId: venue.id,
      date: '2026-05-02',
      status: 'upcoming',
    })

    const res = await app.request(
      '/v1/events/availability?from=2026-04-01&to=2026-05-31',
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('2026-04-01')
    expect(body.to).toBe('2026-05-31')
    const byDate = Object.fromEntries(
      body.data.map((d: { date: string; count: number }) => [d.date, d.count]),
    )
    expect(byDate['2026-04-28']).toBe(2)
    expect(byDate['2026-05-02']).toBe(1)
  })

  it('excludes hidden and missing events', async () => {
    const venue = await seedVenue({ slug: 'hi-dive', name: 'Hi-Dive' })
    await seedEvent({
      venueId: venue.id,
      date: '2026-04-28',
      status: 'upcoming',
    })
    await seedEvent({
      venueId: venue.id,
      date: '2026-04-28',
      status: 'upcoming',
      hiddenFromConsumer: true,
    })
    const res = await app.request(
      '/v1/events/availability?from=2026-04-01&to=2026-04-30',
    )
    const body = await res.json()
    const byDate = Object.fromEntries(
      body.data.map((d: { date: string; count: number }) => [d.date, d.count]),
    )
    expect(byDate['2026-04-28']).toBe(1)
  })

  it('rejects a window wider than 400 days', async () => {
    const res = await app.request(
      '/v1/events/availability?from=2026-01-01&to=2027-12-31',
    )
    expect(res.status).toBe(400)
  })

  it('defaults `from` to today when omitted', async () => {
    const res = await app.request('/v1/events/availability?to=2026-12-31')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/concert_crawl_test__cal_jump_picker pnpm --filter @concert-crawl/api test -- events.integration --run`
Expected: FAIL — availability endpoint returns 404 (route not defined).

- [ ] **Step 3: Add the Zod schema + route**

In `apps/api/src/routes/events.ts`, add near `listEventsSchema`:

```ts
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_WINDOW_DAYS = 400

const availabilitySchema = z.object({
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE),
})

function dayCountBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000) + 1
}
```

Then add the route **after `GET '/genres'` and before `GET '/:id'`** (order matters — `/availability` must not be swallowed by `/:id`):

```ts
eventsRouter.get('/availability', async (ctx) => {
  const parsed = availabilitySchema.safeParse({
    from: ctx.req.query('from'),
    to: ctx.req.query('to'),
  })
  if (!parsed.success) {
    return ctx.json({ error: 'Invalid availability window' }, 400)
  }
  const from = parsed.data.from ?? todayInTimezone('UTC')
  const { to } = parsed.data
  if (to < from) {
    return ctx.json({ error: '`to` must be on or after `from`' }, 400)
  }
  const span = dayCountBetween(from, to)
  if (span < 1 || span > MAX_WINDOW_DAYS) {
    return ctx.json({ error: 'Window must be 1–400 days' }, 400)
  }

  const rows = await db
    .select({ date: events.date, count: count() })
    .from(events)
    .where(
      and(
        inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
        gte(events.date, from),
        lte(events.date, to),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )
    .groupBy(events.date)

  const data: AvailabilityDay[] = rows.map((row) => ({
    date: row.date,
    count: Number(row.count),
  }))

  ctx.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  const body: EventsAvailabilityResponse = { data, from, to }
  return ctx.json(body)
})
```

Add `AvailabilityDay` and `EventsAvailabilityResponse` to the `@concert-crawl/types` import at the top of the file. Confirm `count`, `and`, `gte`, `lte`, `eq`, `inArray`, `isNull` are already imported from `drizzle-orm` (they are, per current imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/concert_crawl_test__cal_jump_picker pnpm --filter @concert-crawl/api test -- events.integration --run`
Expected: PASS (all four availability tests green).

- [ ] **Step 5: Verify the index is used (no seq scan)**

Run (against the local dev DB):

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db -c "EXPLAIN SELECT date, count(*) FROM events WHERE status IN ('upcoming','cancelled','postponed') AND date >= '2026-04-01' AND date <= '2027-04-30' AND hidden_from_consumer = false AND first_missing_at IS NULL GROUP BY date;"
```

Expected: plan references `events_date_status_idx` (Index/Bitmap scan), not a bare `Seq Scan` on a full table. If a seq scan appears at current data volume that's acceptable (small table) — note it and move on; the index exists for scale.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): add GET /v1/events/availability date-count endpoint (#642)"
```

---

## Task 3: Picker date-math helpers

**Files:**

- Create: `apps/web/src/components/consumer/jump-picker/date-math.ts`
- Test: `apps/web/src/components/consumer/jump-picker/date-math.test.ts`

**Interfaces:**

- Produces:
  - `type YearMonth = { y: number; m: number }` (m 0-indexed).
  - `type MatrixCell = { y: number; m: number; d: number; iso: string; inMonth: boolean; dow: number }`.
  - `ymdKey(y: number, m: number, d: number): number` — integer compare key `y*10000 + (m+1)*100 + d`.
  - `isoOf(y: number, m: number, d: number): string` — `YYYY-MM-DD` (m 0-indexed input).
  - `addMonths(ym: YearMonth, delta: number): YearMonth`.
  - `monthMatrix(y: number, m: number): MatrixCell[]` — 42 Sunday-first cells with prev/next spill.
  - `pickerWindow(todayISO: string): { from: string; to: string; min: YearMonth; max: YearMonth }` — current month → +12 months.
  - `weekOffsetForDate(targetISO: string, todayISO: string): number` — Monday-based whole-week delta (matches `currentWeekDays`), `0` for the current week, never negative for future dates.
    All consumed by `JumpPicker.tsx` (Task 6) and `CalendarView.tsx` (Task 8).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  ymdKey,
  isoOf,
  addMonths,
  monthMatrix,
  pickerWindow,
  weekOffsetForDate,
} from './date-math'

describe('isoOf / ymdKey', () => {
  it('formats a zero-indexed month to ISO', () => {
    expect(isoOf(2026, 3, 28)).toBe('2026-04-28')
    expect(isoOf(2026, 11, 1)).toBe('2026-12-01')
  })
  it('produces a monotonic integer key', () => {
    expect(ymdKey(2026, 3, 28)).toBe(20260428)
    expect(ymdKey(2026, 4, 1)).toBeGreaterThan(ymdKey(2026, 3, 28))
  })
})

describe('addMonths', () => {
  it('rolls the year forward', () => {
    expect(addMonths({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 })
  })
  it('rolls the year backward', () => {
    expect(addMonths({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 })
  })
})

describe('monthMatrix', () => {
  it('returns 42 cells, Sunday-first', () => {
    const cells = monthMatrix(2026, 3) // April 2026
    expect(cells).toHaveLength(42)
    // April 1 2026 is a Wednesday (dow 3) → first three cells spill from March.
    expect(cells[0].inMonth).toBe(false)
    expect(cells[3]).toMatchObject({ d: 1, inMonth: true, iso: '2026-04-01' })
    expect(cells[0].dow).toBe(0)
    expect(cells[6].dow).toBe(6)
  })
})

describe('pickerWindow', () => {
  it('spans current month through +12 months', () => {
    const win = pickerWindow('2026-04-28')
    expect(win.from).toBe('2026-04-01')
    expect(win.to).toBe('2027-04-30')
    expect(win.min).toEqual({ y: 2026, m: 3 })
    expect(win.max).toEqual({ y: 2027, m: 3 })
  })
})

describe('weekOffsetForDate', () => {
  it('is 0 within the current Monday-based week', () => {
    // 2026-04-28 is a Tuesday; the week runs Mon 2026-04-27 .. Sun 2026-05-03.
    expect(weekOffsetForDate('2026-04-28', '2026-04-28')).toBe(0)
    expect(weekOffsetForDate('2026-05-03', '2026-04-28')).toBe(0)
  })
  it('counts whole weeks forward', () => {
    expect(weekOffsetForDate('2026-05-04', '2026-04-28')).toBe(1)
    expect(weekOffsetForDate('2026-05-11', '2026-04-28')).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- date-math --run`
Expected: FAIL — module `./date-math` not found.

- [ ] **Step 3: Implement the helpers**

```ts
export interface YearMonth {
  y: number
  m: number
}

export interface MatrixCell {
  y: number
  m: number
  d: number
  iso: string
  inMonth: boolean
  dow: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function isoOf(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

export function ymdKey(y: number, m: number, d: number): number {
  return y * 10000 + (m + 1) * 100 + d
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const total = ym.y * 12 + ym.m + delta
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
}

export function monthMatrix(y: number, m: number): MatrixCell[] {
  const startDow = new Date(y, m, 1).getDay() // Sunday-first (0=Sun)
  const gridStart = new Date(y, m, 1 - startDow)
  const cells: MatrixCell[] = []
  for (let i = 0; i < 42; i += 1) {
    const cur = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    )
    const cy = cur.getFullYear()
    const cm = cur.getMonth()
    const cd = cur.getDate()
    cells.push({
      y: cy,
      m: cm,
      d: cd,
      iso: isoOf(cy, cm, cd),
      inMonth: cm === m && cy === y,
      dow: cur.getDay(),
    })
  }
  return cells
}

export function pickerWindow(todayISO: string): {
  from: string
  to: string
  min: YearMonth
  max: YearMonth
} {
  const [ty, tm] = todayISO.split('-').map(Number)
  const min: YearMonth = { y: ty, m: tm - 1 }
  const max = addMonths(min, 12)
  const from = isoOf(min.y, min.m, 1)
  const lastDay = new Date(max.y, max.m + 1, 0).getDate()
  const to = isoOf(max.y, max.m, lastDay)
  return { from, to, min, max }
}

// Monday-based whole-week delta, matching currentWeekDays' week boundaries.
export function weekOffsetForDate(targetISO: string, todayISO: string): number {
  const mondayOf = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number)
    // Use UTC-noon to avoid DST/tz shift, mirroring definitions/lib.
    const base = Date.UTC(y, m - 1, d, 12)
    const dow = new Date(base).getUTCDay() // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return base + mondayOffset * 86_400_000
  }
  const diffMs = mondayOf(targetISO) - mondayOf(todayISO)
  return Math.round(diffMs / (7 * 86_400_000))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- date-math --run`
Expected: PASS (all groups green).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/jump-picker/date-math.ts apps/web/src/components/consumer/jump-picker/date-math.test.ts
git commit -m "feat(web): add jump-picker date-math helpers (#642)"
```

---

## Task 4: Copy strings

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts`

**Interfaces:**

- Produces: `CONSUMER_COPY.jumpPicker*` keys consumed by `WeekStripHeader` (Task 7) and `JumpPicker` (Task 6).

- [ ] **Step 1: Add copy keys**

In the `CONSUMER_COPY` object in `apps/web/src/components/consumer/definitions/copy.ts`, add:

```ts
  // Calendar jump picker (#642)
  jumpPickerCueSuffix: 'Jump to a date',
  jumpPickerDialogPrefix: 'Jump to a date',
  jumpPickerFooterHint: 'Dots = shows on sale',
  jumpPickerEmptyPrefix: 'Crickets in',
  jumpPickerEmptySuffix: 'Try later.',
  jumpPickerToday: 'Today',
  jumpPickerClose: 'Close date picker',
  jumpPickerPrevMonth: 'Previous month',
  jumpPickerNextMonth: 'Next month',
```

(Keep the existing `Previous week` / `Next week` week-strip labels wherever they already live; those stay on the chevrons.)

- [ ] **Step 2: Typecheck web**

Run: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/definitions/copy.ts
git commit -m "feat(web): add jump-picker copy strings (#642)"
```

---

## Task 5: Availability hook + SSR prefetch

**Files:**

- Create: `apps/web/src/lib/queries/use-availability.ts`
- Modify: `apps/web/src/app/(protected)/(main)/events/page.tsx`

**Interfaces:**

- Consumes: `EventsAvailabilityResponse` (Task 1); `apiClient`/`publicApiClient` from `@/lib/api`; `useAuth` from `@clerk/nextjs`; `STALE_30_MIN` from `@/lib/query-client`.
- Produces:
  - `availabilityQueryKey(from: string, to: string): readonly [...]`.
  - `useAvailability({ from, to, initialData }): UseQueryResult<Map<string, number>>` — returns a `date → count` map for O(1) cell lookup.
  - `fetchAvailability(from, to, token): Promise<EventsAvailabilityResponse>`.
    The map is consumed by `CalendarView` → `JumpPicker`.

- [ ] **Step 1: Write the failing hook test**

Create `apps/web/src/lib/queries/use-availability.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAvailability } from './use-availability'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null }),
}))
vi.mock('@/lib/api', () => ({
  publicApiClient: {
    get: async () => ({
      data: [{ date: '2026-04-28', count: 2 }],
      from: '2026-04-01',
      to: '2027-04-30',
    }),
  },
  apiClient: { get: async () => ({ data: [], from: '', to: '' }) },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useAvailability', () => {
  it('exposes a date→count map', async () => {
    const { result } = renderHook(
      () => useAvailability({ from: '2026-04-01', to: '2027-04-30' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.data?.size).toBeGreaterThan(0))
    expect(result.current.data?.get('2026-04-28')).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- use-availability --run`
Expected: FAIL — module `./use-availability` not found.

- [ ] **Step 3: Implement the hook**

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'
import { STALE_30_MIN } from '@/lib/query-client'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

export async function fetchAvailability(
  from: string,
  to: string,
  token: string | null,
): Promise<EventsAvailabilityResponse> {
  const url = `/v1/events/availability?from=${from}&to=${to}`
  return token
    ? apiClient.get<EventsAvailabilityResponse>(url, token)
    : publicApiClient.get<EventsAvailabilityResponse>(url)
}

function toMap(res: EventsAvailabilityResponse): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of res.data) map.set(row.date, row.count)
  return map
}

interface UseAvailabilityArgs {
  from: string
  to: string
  initialData?: EventsAvailabilityResponse
}

export function useAvailability({
  from,
  to,
  initialData,
}: UseAvailabilityArgs) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: availabilityQueryKey(from, to),
    queryFn: async () => {
      const token = await getToken()
      const res = await fetchAvailability(from, to, token)
      return toMap(res)
    },
    staleTime: STALE_30_MIN,
    ...(initialData !== undefined ? { initialData: toMap(initialData) } : {}),
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- use-availability --run`
Expected: PASS.

- [ ] **Step 5: SSR-prefetch on the events page**

In `apps/web/src/app/(protected)/(main)/events/page.tsx`, in the `view === 'cal'` branch, compute the window and fetch availability server-side. Add near the other server fetches (after `token` is resolved):

```ts
import { pickerWindow } from '@/components/consumer/jump-picker/date-math'
import { fetchAvailability } from '@/lib/queries/use-availability'
import type { EventsAvailabilityResponse } from '@concert-crawl/types'

// ...inside BrowsePage, after `token` is available and view === 'cal':
let initialAvailability: EventsAvailabilityResponse | undefined
if (view === 'cal') {
  const window = pickerWindow(today)
  try {
    initialAvailability = await fetchAvailability(window.from, window.to, token)
  } catch (err) {
    console.error('availability prefetch failed', err)
    initialAvailability = undefined
  }
}
```

Pass `initialAvailability` into `<CalendarView … initialAvailability={initialAvailability} />` (the prop is added in Task 8).

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS (may transiently error on the not-yet-added `CalendarView` prop — if so, defer wiring that JSX line until Task 8 and commit the hook + import now).

```bash
git add apps/web/src/lib/queries/use-availability.ts apps/web/src/lib/queries/use-availability.test.tsx apps/web/src/app/\(protected\)/\(main\)/events/page.tsx
git commit -m "feat(web): availability react-query hook + SSR prefetch (#642)"
```

---

## Task 6: JumpPicker component

**Files:**

- Create: `apps/web/src/components/consumer/jump-picker/JumpPicker.tsx`
- Create: `apps/web/src/components/consumer/jump-picker/index.ts`
- Test: `apps/web/src/components/consumer/jump-picker/JumpPicker.test.tsx`

**Interfaces:**

- Consumes: `monthMatrix`, `pickerWindow`, `addMonths`, `isoOf`, `ymdKey`, `YearMonth`, `MatrixCell` from `./date-math`; `CONSUMER_COPY` from the definitions; `availability: Map<string, number>`.
- Produces: `JumpPicker` (default export via barrel) with props:
  ```ts
  interface JumpPickerProps {
    open: boolean
    onClose: () => void
    selectedDate: string
    today: string
    availability: Map<string, number>
    onPick: (iso: string) => void
    variant?: 'mobile' | 'desktop' // layout only; default responsive
  }
  ```
  Consumed by `WeekStripHeader` (Task 7).

All exact visual values (colors, sizes, rings, animation timing) are in `docs/superpowers/design-tables/calendar-jump-picker.md` §2–§9 and MUST be matched verbatim. Key non-negotiables: selected `var(--signal)` + `var(--fg-on-accent)`; today `boxShadow: inset 0 0 0 1.5px var(--accent)` + `var(--accent)` text (ring suppressed when today is also selected); weekend tint `color-mix(in oklch, var(--surface-2) 60%, transparent)`; past `opacity 0.45`, out-of-month `opacity 0.4`, both disabled; dot `4×4 radius 4 var(--accent)` (→ `var(--fg-on-accent)` on selected day) rendered only when `count > 0 && !disabled`; cell height `38`, gap `2`, radius `9`; day number Inter `13.5`, weight `800` if selected-or-today else `600`; container radius `16`, padding `14`, boxShadow `0 20px 50px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.3)`, bg `var(--bg-elevated)`; scale-in animation `transform .13s cubic-bezier(.2,.7,.3,1), opacity .13s ease`, origin `34px -6px`, reduced-motion → end-state.

- [ ] **Step 1: Write the failing component tests**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JumpPicker } from './JumpPicker'

const availability = new Map<string, number>([
  ['2026-04-28', 2],
  ['2026-05-02', 3],
])

function setup(overrides = {}) {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(
    <JumpPicker
      open
      onClose={onClose}
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={availability}
      onPick={onPick}
      {...overrides}
    />,
  )
  return { onPick, onClose }
}

describe('JumpPicker', () => {
  it('renders a dialog labelled by the visible month', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute(
      'aria-label',
      expect.stringContaining('April 2026'),
    )
  })

  it('marks the selected day with aria-selected', () => {
    setup()
    const sel = screen.getByRole('gridcell', {
      name: /Tuesday, April 28, 2 shows, today/,
    })
    expect(sel).toHaveAttribute('aria-selected', 'true')
  })

  it('encodes show count in the aria-label, not just the dot', () => {
    setup()
    expect(
      screen.getByRole('gridcell', { name: /Saturday, May 2/ }),
    ).toBeInTheDocument()
  })

  it('disables past and out-of-month days', () => {
    setup()
    // April 27 is in-month but before today → disabled.
    const past = screen.getByRole('gridcell', { name: /Monday, April 27/ })
    expect(past).toHaveAttribute('aria-disabled', 'true')
  })

  it('calls onPick with the ISO date when a future day is chosen', async () => {
    const user = userEvent.setup()
    const { onPick } = setup()
    await user.click(screen.getByRole('gridcell', { name: /Saturday, May 2/ }))
    expect(onPick).toHaveBeenCalledWith('2026-05-02')
  })

  it('pages to the next month with the pager', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByLabelText('Next month'))
    expect(screen.getByRole('dialog')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('May 2026'),
    )
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('moves focus with arrow keys and skips disabled days', async () => {
    const user = userEvent.setup()
    setup()
    // Selected day (Apr 28) is focused on open; ArrowRight → Apr 29.
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('gridcell', { name: /Wednesday, April 29/ }),
    ).toHaveFocus()
  })

  it('does not page before the current month (atMin)', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByLabelText('Previous month')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- JumpPicker --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `JumpPicker.tsx`**

Port the design mock (`design/design_handoff_calendar_jump_picker/calendar-picker.jsx` + `picker-a11y.jsx`) to a token-themed client component. Structure:

- `'use client'`; local constants `MONTHS`, `MON3`, `DOW1 = ['S','M','T','W','T','F','S']`, `DOWFULL` (Sunday-first).
- State: `view: YearMonth` (init from `selectedDate`'s year/month), `mounted` (for scale-in via `requestAnimationFrame`), `focusIso` (roving-tabindex focus target, init = `selectedDate`).
- `const { min, max } = pickerWindow(today)`; `atMin`/`atMax` from `view` vs `min`/`max`.
- `const cells = monthMatrix(view.y, view.m)`.
- Per cell compute `count = availability.get(cell.iso) ?? 0`, `past = ymdKey(cell.y,cell.m,cell.d) < ymdKey(todayY,todayM,todayD)`, `sel = cell.iso === selectedDate`, `isToday = cell.iso === today`, `disabled = !cell.inMonth || past`, `isWknd = cell.dow === 0 || cell.dow === 6`.
- Background/numColor/opacity/boxShadow precedence exactly per design table §4.
- Dot per §5. Weekday header per §3. Footer per §6 (empty-month copy uses `CONSUMER_COPY.jumpPickerEmptyPrefix + ' ' + MON3[view.m] + '. ' + jumpPickerEmptySuffix` when `[...availability.keys()]` has no in-month future date; else `jumpPickerFooterHint`). "Today" reset chip (uppercase) sets `view` to today's month and pinpoints focus to today.
- Pager: Previous/Next month buttons (`aria-label` from copy), disabled at `atMin`/`atMax`, `PageUp`/`PageDown` mirror them, `Shift+PageUp/Down` = ±year (clamped to window).
- Grid `role="grid"`, single tab-stop via roving `tabIndex` (`tabIndex={cell.iso === focusIso ? 0 : -1}`). Arrow keys move `focusIso` day/week, wrap across weeks, skip disabled; `Home`/`End` = week ends; auto-page when moving off the visible month. `Escape` → `onClose()` and return focus to cue (cue owns focus-return; picker just calls `onClose`). On open, focus the selected day via effect.
- Day button: `role="gridcell"`, `aria-selected={sel}`, `aria-disabled={disabled}`, `aria-label` per §9 format, `onClick` = `!disabled ? () => onPick(cell.iso) : undefined`.
- Dialog: `role="dialog"`, `aria-modal="false"`, `aria-label` = `` `${CONSUMER_COPY.jumpPickerDialogPrefix} — ${MONTHS[view.m]} ${view.y}` ``, className `cjp-pop scale` + `cjp-in` when mounted.
- Inject the `#cjp-styles` CSS block (hover, caret, animation, `prefers-reduced-motion`) once, guarded by an `id` check, exactly per §7.
- `variant` prop only switches width/positioning wrappers (`'100%'` sheet vs `324` popover); default uses Tailwind `sm:` so a single render adapts. Keep all behavior identical.

Return `null` when `!open`.

- [ ] **Step 4: Add the barrel**

`apps/web/src/components/consumer/jump-picker/index.ts`:

```ts
export { JumpPicker } from './JumpPicker'
export type { JumpPickerProps } from './JumpPicker'
```

- [ ] **Step 5: Run to verify tests pass**

Run: `pnpm --filter @concert-crawl/web test -- JumpPicker --run`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/jump-picker/
git commit -m "feat(web): JumpPicker month-grid component (#642)"
```

---

## Task 7: WeekStrip grid-only refactor + WeekStripHeader cue

**Files:**

- Modify: `apps/web/src/components/consumer/week-strip/WeekStrip.tsx`
- Create: `apps/web/src/components/consumer/week-strip/WeekStripHeader.tsx`
- Modify: `apps/web/src/components/consumer/week-strip/index.ts`
- Test: `apps/web/src/components/consumer/week-strip/WeekStripHeader.test.tsx`

**Interfaces:**

- Consumes: `JumpPicker` (Task 6); `CONSUMER_COPY`.
- Produces:
  - `WeekStrip` unchanged props, minus the chevrons (grid-only). `prevWeekHref`/`nextWeekHref` props are removed from `WeekStrip`.
  - `WeekStripHeader` with props:
    ```ts
    interface WeekStripHeaderProps {
      monthLabel: string
      selectedDate: string
      today: string
      availability: Map<string, number>
      onPick: (iso: string) => void
      prevWeekHref: string | null
      nextWeekHref: string
    }
    ```
    Consumed by `CalendarView` (Task 8). Renders the cue chip (opens `JumpPicker`) on the left and the ± week-pager chevrons on the right, per design §1. Cue aria-label `` `${monthLabel}. ${CONSUMER_COPY.jumpPickerCueSuffix}` ``, `aria-haspopup="dialog"`, `aria-expanded={open}`. On close, focus returns to the cue button (via a ref).

- [ ] **Step 1: Write the failing header test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekStripHeader } from './WeekStripHeader'

function setup() {
  const onPick = vi.fn()
  render(
    <WeekStripHeader
      monthLabel="April 2026"
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={new Map([['2026-04-28', 2]])}
      onPick={onPick}
      prevWeekHref={null}
      nextWeekHref="/events?view=cal&weekOffset=1"
    />,
  )
  return { onPick }
}

describe('WeekStripHeader', () => {
  it('shows the month cue with a dialog affordance', () => {
    setup()
    const cue = screen.getByRole('button', {
      name: /April 2026\. Jump to a date/,
    })
    expect(cue).toHaveAttribute('aria-haspopup', 'dialog')
    expect(cue).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the picker on cue click', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /Jump to a date/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('disables the previous-week chevron at the current week', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Next week' })).toBeInTheDocument()
    // prevWeekHref null → rendered as a disabled span, not a link.
    expect(
      screen.queryByRole('link', { name: 'Previous week' }),
    ).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- WeekStripHeader --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Refactor `WeekStrip.tsx` to grid-only**

Remove `IconChevLeft`/`IconChevRight`, the `prevWeekHref`/`nextWeekHref` props, and the flanking chevron JSX. Keep only the 7-day grid (the `<div className="grid … grid-cols-7 …">` block). The outer wrapper becomes just the grid; drop the `flex items-center gap-2` row that hosted the arrows. Preserve all day-cell rendering (past disabled, selected `bg-signal text-fg-on-accent`, dot logic, `onDateSelect`/`buildHref` branches, ARIA).

- [ ] **Step 4: Implement `WeekStripHeader.tsx`**

`'use client'` component. State `open`, `cueRef` (button ref for focus-return). Layout per §1: outer `padding: '2px 12px 10px'`; a `flex items-center justify-between gap-2 mb-2` row with the cue chip left and a `flex gap-1` chevron pair right. Cue = `<button className="cjp-cue" aria-haspopup="dialog" aria-expanded={open} aria-label={…}>` with the month label span + caret svg (11×7, path `M1 1l4.5 4.5L10 1`, `rotate(180deg)` when open, transition `.16s cubic-bezier(.2,.7,.3,1)`), chip chrome tokens per §1 (rest `var(--surface-2)`/`var(--border-strong)`; open `var(--overlay-press)`/`var(--border-focus)`). Chevrons: 34×34, radius 9, border `1px solid var(--border-strong)`, prev = `Link`(prevWeekHref) or disabled `span` when null, next = `Link`(nextWeekHref), aria-labels `Previous week`/`Next week`, glyph svg 14×14 viewBox `0 0 16 16` (left `M10 3L5 8l5 5`, right `M6 3l5 5-5 5`). Render `<JumpPicker open={open} onClose={() => { setOpen(false); cueRef.current?.focus() }} selectedDate today availability onPick={(iso) => { setOpen(false); onPick(iso) }} />`.

- [ ] **Step 5: Update the barrel**

`apps/web/src/components/consumer/week-strip/index.ts`:

```ts
export { WeekStrip, type WeekStripDay } from './WeekStrip'
export { WeekStripHeader } from './WeekStripHeader'
```

- [ ] **Step 6: Run header + week-strip tests**

Run: `pnpm --filter @concert-crawl/web test -- WeekStrip --run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/consumer/week-strip/
git commit -m "feat(web): WeekStripHeader cue + grid-only WeekStrip (#642)"
```

---

## Task 8: CalendarView wiring + API contract gate

**Files:**

- Modify: `apps/web/src/components/consumer/calendar-view/CalendarView.tsx`
- Modify (if deferred in Task 5): `apps/web/src/app/(protected)/(main)/events/page.tsx` (pass `initialAvailability`, compute `monthLabel`)
- Test: `apps/web/src/components/consumer/calendar-view/CalendarView.test.tsx`

**Interfaces:**

- Consumes: `WeekStripHeader`, `WeekStrip` (Task 7); `useAvailability` (Task 5); `weekOffsetForDate`, `pickerWindow` (Task 3); `useRouter` from `next/navigation`.
- Produces: updated `CalendarView` accepting `initialAvailability?: EventsAvailabilityResponse` and `monthLabel: string` props.

**Navigation contract:** picking a date **within the current rendered week** → `setSelectedDate` + `window.history.replaceState` (client-only, no fetch, existing behavior). Picking a date **outside** the current week → `router.push` to `/events?view=cal&weekOffset=<n>&selectedDate=<iso>&…filters`, preserving every active filter param (mirror the existing `calNextWeekHref` param-copy logic: copy all string params except `offset`, then set `view=cal`, `weekOffset`, `selectedDate`). `weekOffsetForDate(iso, today)` yields `<n>`.

- [ ] **Step 1: API contract verification (gate — do before wiring)**

Confirm every JumpPicker visual state is reachable from real API data:

- `count > 0` dot + aria count ← `availability` map from `GET /v1/events/availability` (Task 2, verified by its integration tests). ✅ contract verified.
- `selected` / `today` / `past` / `out-of-month` states ← derived purely from `selectedDate`/`today` props + matrix, no API dependency. ✅.
- Empty-month footer ← `availability` map having no in-month entries. ✅ reachable (endpoint returns only dates with shows; absent months are naturally empty).

All states reachable — proceed. (If any were `⚠`/`❌`, stop per complete-and-ship Step 2.5.)

- [ ] **Step 2: Write the failing wiring test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarView } from './CalendarView'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null }),
}))

const days = [
  { date: '2026-04-27', label: 'MON', dayOfMonth: '27', hasEvents: false },
  { date: '2026-04-28', label: 'TUE', dayOfMonth: '28', hasEvents: true },
  // …fill the week (Mon 04-27 .. Sun 05-03)
]

function setup() {
  render(
    <CalendarView
      days={days}
      events={[]}
      initialSelectedDate="2026-04-28"
      today="2026-04-28"
      monthLabel="April 2026"
      watchedIds={[]}
      prevWeekHref={null}
      nextWeekHref="/events?view=cal&weekOffset=1"
      initialAvailability={{
        data: [{ date: '2026-05-11', count: 3 }],
        from: '2026-04-01',
        to: '2027-04-30',
      }}
    />,
  )
}

describe('CalendarView jump navigation', () => {
  it('router.pushes with weekOffset when jumping outside the current week', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /Jump to a date/ }))
    await user.click(screen.getByRole('gridcell', { name: /Monday, May 11/ }))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('weekOffset=2'))
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining('selectedDate=2026-05-11'),
    )
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- CalendarView --run`
Expected: FAIL — `monthLabel`/`initialAvailability` props + jump logic not present.

- [ ] **Step 4: Wire `CalendarView.tsx`**

Add props `monthLabel: string` and `initialAvailability?: EventsAvailabilityResponse`. Derive the window: `const { from, to } = pickerWindow(today)`; `const { data: availability } = useAvailability({ from, to, initialData: initialAvailability })`. Add `const router = useRouter()`. Compute the current week's date set from `days` (`const weekDates = new Set(days.map(d => d.date))`). New pick handler:

```ts
function onJumpPick(iso: string) {
  if (weekDates.has(iso)) {
    setSelectedDate(iso)
    const url = new URL(window.location.href)
    url.searchParams.set('selectedDate', iso)
    window.history.replaceState(null, '', url.toString())
    return
  }
  const offset = weekOffsetForDate(iso, today)
  const params = new URLSearchParams(window.location.search)
  params.delete('offset')
  params.set('view', 'cal')
  params.set('weekOffset', String(offset))
  params.set('selectedDate', iso)
  router.push(`/events?${params.toString()}`)
}
```

Render `<WeekStripHeader monthLabel={monthLabel} selectedDate={selectedDate} today={today} availability={availability ?? new Map()} onPick={onJumpPick} prevWeekHref={prevWeekHref} nextWeekHref={nextWeekHref} />` above the grid-only `<WeekStrip days selectedDate today onDateSelect={handleDateSelect} />` (WeekStrip no longer takes the href props).

- [ ] **Step 5: Compute `monthLabel` on the page**

In `page.tsx`, derive `monthLabel` from the selected date (or the week's Monday): `const [ly, lm] = selectedDate.split('-').map(Number); const monthLabel = `${MONTHS[lm - 1]} ${ly}`` (add a local `MONTHS` full-name array or import from a shared constant). Pass `monthLabel={monthLabel}` and `initialAvailability={initialAvailability}` to `<CalendarView>`.

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- CalendarView --run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/consumer/calendar-view/CalendarView.tsx apps/web/src/app/\(protected\)/\(main\)/events/page.tsx
git commit -m "feat(web): wire jump picker into CalendarView with cross-week nav (#642)"
```

---

## Task 9: Release note, quality gate, design-review, PR

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts`
- Create: `docs/superpowers/gap-report-calendar-jump-picker.md`

- [ ] **Step 1: Add the release note**

Add an entry to `apps/web/src/lib/definitions/releases.ts` (mirror the existing entry shape) describing the calendar jump picker — one-action jump to any date within the year.

- [ ] **Step 2: Full quality gate**

Run:

```bash
pnpm --filter @concert-crawl/types typecheck
pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/api lint
pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/concert_crawl_test__cal_jump_picker pnpm --filter @concert-crawl/api test --run
pnpm --filter @concert-crawl/web test --run
```

Expected: all PASS. Fix any failures before continuing.

- [ ] **Step 3: design-review verify**

Run the `design-review` skill Agent 2 (verify) using `docs/superpowers/design-tables/calendar-jump-picker.md` as the property table against the implemented `JumpPicker.tsx` + `WeekStripHeader.tsx`. Fix ALL gaps, re-run the quality gate, then run Agent 3 (confirm) until 0 gaps. Write findings to `docs/superpowers/gap-report-calendar-jump-picker.md` and commit it BEFORE opening the PR.

- [ ] **Step 4: progress.md row**

Add a ✅ row to `docs/superpowers/progress.md` (2026-07-16, calendar jump picker — substantive user-facing feature).

- [ ] **Step 5: Commit docs + push**

```bash
git add apps/web/src/lib/definitions/releases.ts docs/superpowers/gap-report-calendar-jump-picker.md docs/superpowers/progress.md
git commit -m "docs: release note + gap report + progress for calendar jump picker (#642)"
git fetch origin && git rebase origin/main
git push -u origin feat/calendar-jump-picker
```

- [ ] **Step 6: Open PR + Copilot loop**

Open the PR with `.github/pull_request_template.md`, body includes `Closes #642`, Summary, Test plan, Spec coverage, and a **New environment variables** section (none for this feature — state "No new env vars"). Then run `./scripts/request-copilot-review.sh <pr-number>`, iterate until no Critical/High/Medium remain, and confirm CI is green.

---

## Self-Review

- **Spec coverage:** Cue chip (Task 7), picker grid + all day states + dots + weekend tint + today ring (Task 6), keyboard model + ARIA (Task 6), empty-month footer (Task 6), Today reset (Task 6), ~12-month window (Task 3 `pickerWindow`), availability data (Tasks 1–2, 5), cross-week jump nav (Task 8), mobile/desktop parity (Task 6 responsive variant), performance (single cached request + SSR prefetch, Tasks 2 & 5). All README sections mapped.
- **Type consistency:** `EventsAvailabilityResponse`/`AvailabilityDay` defined in Task 1, consumed identically in Tasks 2, 5, 8. `Map<string, number>` availability shape consistent from `useAvailability` → `CalendarView` → `WeekStripHeader` → `JumpPicker`. `weekOffsetForDate`/`pickerWindow` signatures stable across Tasks 3 & 8.
- **No placeholders:** every code step carries concrete code; design values reference the committed property table for verbatim tokens.

```

```

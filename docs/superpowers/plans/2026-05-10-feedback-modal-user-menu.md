# Feedback Modal + User Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the in-app feedback surface (floating pill entry point + modal with all states) and replace the bare user avatar dropdown with the fully designed user menu (identity card, theme switcher, admin section, beta channel).

**Architecture:** The feedback modal is self-contained local state — no global store, no context. The floating pill renders in the consumer root layout. The user menu replaces `UserAvatar.tsx` in `AppHeader` and holds the secondary entry point to the feedback modal. Both components reference the same `<FeedbackModal />` via a shared open/close prop.

**Tech Stack:** Next.js 14 App Router, Clerk (`useUser`, `useClerk`), Hono API, Drizzle ORM, Zod, existing `useTheme()` hook, in-memory rate limiter from `apps/api/src/lib/rate-limit.ts`, theme tokens via CSS vars.

**Design reference:** `design/design_handoff_feedback_modal/` and `design/design_handoff_user_menu/`

**Scope decisions (document before you start):**

- Screenshot attachment is **not implemented** — the dashed slot renders but clicking it does nothing. The API does not accept file uploads. Post-MVP.
- Offline detection is **not implemented** — the `offline` UI state exists in the design but is not wired to `navigator.onLine`. Post-MVP.
- The `NEXT_PUBLIC_APP_VERSION` env var defaults to `"dev"` when unset; set it in Render dashboard for real deploys.

---

## Worktree Setup

```bash
git worktree add .worktrees/feat/feedback-modal-user-menu -b feat/feedback-modal-user-menu
cd .worktrees/feat/feedback-modal-user-menu
pnpm install
```

All work below happens inside `.worktrees/feat/feedback-modal-user-menu`.

---

## File Map

**New files:**

- `packages/db/migrations/0012_feedback_category_metadata.sql` — enum update + metadata column
- `apps/api/src/routes/feedback.ts` — `POST /v1/feedback`
- `apps/api/src/routes/__tests__/feedback.test.ts` — integration tests
- `apps/web/src/components/consumer/feedback/FeedbackModal.tsx` — modal component (all states)
- `apps/web/src/components/consumer/feedback/FeedbackPill.tsx` — floating pill entry point
- `apps/web/src/components/consumer/feedback/index.ts` — barrel export
- `apps/web/src/components/consumer/user-menu/UserMenu.tsx` — redesigned menu
- `apps/web/src/components/consumer/user-menu/index.ts` — barrel export

**Modified files:**

- `packages/db/src/schema/social.ts` — update `feedbackCategoryEnum`, add `metadata` column
- `apps/api/src/routes/index.ts` — register feedback router
- `apps/web/src/app/(consumer)/layout.tsx` — render `<FeedbackPill />`
- `apps/web/src/components/consumer/app-header/AppHeader.tsx` — replace `<UserAvatar>` with `<UserMenu>`
- `apps/web/src/components/consumer/app-header/UserAvatar.tsx` — delete entire file
- `apps/web/.env.example` — add `NEXT_PUBLIC_APP_VERSION`

---

## Task 1: DB — Update feedback schema

**Files:**

- Modify: `packages/db/src/schema/social.ts`
- Create: `packages/db/migrations/0012_feedback_category_metadata.sql`

The `feedback_category` enum has `suggestion` where the design uses `idea`, and is missing `other`. No API route has ever existed so there are zero feedback rows in any environment — safe to recreate.

- [ ] **Step 1: Update the Drizzle schema**

In `packages/db/src/schema/social.ts`, update the enum and add `metadata`:

```typescript
export const feedbackCategoryEnum = pgEnum('feedback_category', [
  'bug',
  'idea',
  'praise',
  'other',
])
```

Add `jsonb` to imports:

```typescript
import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
```

Update the `feedback` table definition to add `metadata`:

```typescript
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  pageUrl: text('page_url').notNull(),
  category: feedbackCategoryEnum('category').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
```

- [ ] **Step 2: Write the migration SQL manually**

Drizzle does not generate correct SQL for enum recreation. Create `packages/db/migrations/0012_feedback_category_metadata.sql`:

```sql
-- Recreate feedback_category enum with correct values.
-- Safe: no feedback rows exist (POST /v1/feedback never shipped).
ALTER TABLE "feedback" ALTER COLUMN "category" TYPE text;--> statement-breakpoint
DROP TYPE "feedback_category";--> statement-breakpoint
CREATE TYPE "feedback_category" AS ENUM('bug', 'idea', 'praise', 'other');--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "category" TYPE "feedback_category" USING "category"::"feedback_category";--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "metadata" jsonb;
```

- [ ] **Step 3: Run the migration locally**

```bash
pnpm db:migrate
```

Expected: no errors, migration 0012 applied.

- [ ] **Step 4: Verify the schema**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "\d feedback"
```

Expected output includes `category` typed as `feedback_category` and a `metadata` column of type `jsonb`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/social.ts packages/db/migrations/0012_feedback_category_metadata.sql
git commit -m "feat(db): update feedback_category enum (idea/other) + add metadata column"
```

---

## Task 2: API — POST /v1/feedback route

**Files:**

- Create: `apps/api/src/routes/feedback.ts`
- Modify: `apps/api/src/routes/index.ts`

Pattern: follow `apps/api/src/routes/watching.ts` — `clerkMiddleware()` on the router, `getAuth(ctx)` inside the handler.

Rate limit: 1 submission per userId per hour. Key: `feedback:${userId}`.

- [ ] **Step 1: Write the failing test first** _(see Task 3 — write test file, then come back)_

Skip for now — write the route, then tests in Task 3.

- [ ] **Step 2: Create `apps/api/src/routes/feedback.ts`**

```typescript
// apps/api/src/routes/feedback.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, feedback } from '@concert-crawl/db'
import { checkRateLimit } from '../lib/rate-limit.js'
import { apiLogger } from '../lib/logger.js'

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  message: z.string().min(1, 'Message is required'),
  pageUrl: z.string(),
  metadata: z
    .object({
      theme: z.string().optional(),
      build: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
})

export const feedbackRouter = new Hono()

feedbackRouter.use('*', clerkMiddleware())

feedbackRouter.post('/', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const { allowed, retryAfterMs } = checkRateLimit(
    `feedback:${authInfo.userId}`,
    1,
    60 * 60 * 1000, // 1 per hour
  )
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000)
    ctx.header('Retry-After', String(retryAfterSec))
    return ctx.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      429,
    )
  }

  const body = await ctx.req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return ctx.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      422,
    )
  }

  const { category, message, pageUrl, metadata } = parsed.data

  await db.insert(feedback).values({
    userId: authInfo.userId,
    pageUrl,
    category,
    message,
    metadata: metadata ?? null,
  })

  apiLogger.info(
    { userId: authInfo.userId, category, pageUrl },
    'feedback submitted',
  )

  return ctx.json({ success: true }, 201)
})
```

- [ ] **Step 3: Register the route**

In `apps/api/src/routes/index.ts`, add:

```typescript
import { feedbackRouter } from './feedback.js'
```

And inside `registerRoutes`:

```typescript
app.route('/v1/feedback', feedbackRouter)
```

- [ ] **Step 4: Start the API and smoke-test**

```bash
# In worktree root
pnpm --filter api dev
```

In another terminal:

```bash
curl -s -X POST http://localhost:3001/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{"category":"bug","message":"test","pageUrl":"/events"}'
```

Expected: `401` (no auth token). The route exists and auth middleware is working.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/feedback.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add POST /v1/feedback route with auth + rate limiting"
```

---

## Task 3: API — Integration tests for feedback route

**Files:**

- Create: `apps/api/src/routes/__tests__/feedback.test.ts`

Follow the existing test pattern in `apps/api/src/routes/__tests__/`. Tests hit a real local Postgres.

- [ ] **Step 1: Write the test file**

```typescript
// apps/api/src/routes/__tests__/feedback.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { testApp, mockAuth, clearTable } from '../test-helpers.js'
import { db } from '@concert-crawl/db'
import { sql } from 'drizzle-orm'

beforeEach(async () => {
  await clearTable('feedback')
})

describe('POST /v1/feedback', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'test',
        pageUrl: '/events',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when category is missing', async () => {
    const res = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockAuth('user-1')}`,
      },
      body: JSON.stringify({ message: 'test', pageUrl: '/events' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 when message is empty', async () => {
    const res = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockAuth('user-1')}`,
      },
      body: JSON.stringify({
        category: 'bug',
        message: '',
        pageUrl: '/events',
      }),
    })
    expect(res.status).toBe(422)
  })

  it('inserts feedback and returns 201', async () => {
    const res = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockAuth('user-abc')}`,
      },
      body: JSON.stringify({
        category: 'idea',
        message: 'Love this app.',
        pageUrl: '/events',
        metadata: { theme: 'electric', build: 'dev', device: 'Mac' },
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toEqual({ success: true })

    const rows = await db.execute(
      sql`SELECT * FROM feedback WHERE user_id = 'user-abc'`,
    )
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0]?.category).toBe('idea')
    expect(rows.rows[0]?.message).toBe('Love this app.')
  })

  it('returns 429 on second submission within the hour', async () => {
    const payload = {
      category: 'bug',
      message: 'First report',
      pageUrl: '/events',
    }
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mockAuth('rate-limit-user')}`,
    }

    const first = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    expect(first.status).toBe(201)

    const second = await testApp.request('/v1/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, message: 'Second report' }),
    })
    expect(second.status).toBe(429)
    expect(second.headers.get('Retry-After')).toBeTruthy()
  })
})
```

> **Note:** If `testApp`, `mockAuth`, or `clearTable` don't exist in a `test-helpers.ts` file, look at how other tests in `apps/api/src/routes/__tests__/` set up their test app and replicate the pattern. The key is that `clearTable('feedback')` runs a `TRUNCATE feedback CASCADE` before each test, and `mockAuth` returns a token that makes `clerkMiddleware()` resolve to the given userId.

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter api test src/routes/__tests__/feedback.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/__tests__/feedback.test.ts
git commit -m "test(api): integration tests for POST /v1/feedback"
```

---

## Task 4: Web — FeedbackModal component

**Files:**

- Create: `apps/web/src/components/consumer/feedback/FeedbackModal.tsx`
- Create: `apps/web/src/components/consumer/feedback/index.ts`

The modal manages its own form state. It receives `open` and `onClose` props. The design reference is `design/design_handoff_feedback_modal/feedback-modal.jsx` — read it carefully before implementing. This task translates JSX → TSX with real hooks and API calls.

**States implemented:** `form` → `loading` → `success` | `error`. The `validate` state is inline (errors shown in form without changing state name). The `offline` state is NOT implemented.

- [ ] **Step 1: Create the barrel**

`apps/web/src/components/consumer/feedback/index.ts`:

```typescript
export { FeedbackModal } from './FeedbackModal'
export { FeedbackPill } from './FeedbackPill'
```

- [ ] **Step 2: Create `FeedbackModal.tsx`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/theme/ThemeProvider'
import { CCMark } from '../cc-mark'

type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other'
type ModalState = 'form' | 'loading' | 'success' | 'error'

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug', label: 'Bug' },
  { key: 'idea', label: 'Idea' },
  { key: 'praise', label: 'Praise' },
  { key: 'other', label: 'Other' },
]

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [state, setState] = useState<ModalState>('form')
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [catError, setCatError] = useState(false)
  const [msgError, setMsgError] = useState(false)

  const reset = useCallback(() => {
    setState('form')
    setCategory(null)
    setMessage('')
    setCatError(false)
    setMsgError(false)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    // Delay reset so closing animation doesn't flicker content
    setTimeout(reset, 300)
  }, [onClose, reset])

  const handleSubmit = useCallback(async () => {
    const catInvalid = !category
    const msgInvalid = !message.trim()
    if (catInvalid || msgInvalid) {
      setCatError(catInvalid)
      setMsgError(msgInvalid)
      return
    }

    setState('loading')

    const device =
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown'

    try {
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
          metadata: { theme, build: APP_VERSION, device },
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setState('success')
    } catch {
      setState('error')
    }
  }, [category, message, pathname, theme])

  if (!open) return null

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <>
      {/* Scrim */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'var(--scrim)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
      />

      {/* Sheet (mobile) / Card (desktop) */}
      {isMobile ? (
        <MobileSheet
          state={state}
          category={category}
          setCategory={setCategory}
          message={message}
          setMessage={setMessage}
          catError={catError}
          msgError={msgError}
          onSubmit={handleSubmit}
          onClose={handleClose}
          onReset={reset}
        />
      ) : (
        <DesktopCard
          state={state}
          category={category}
          setCategory={setCategory}
          message={message}
          setMessage={setMessage}
          catError={catError}
          msgError={msgError}
          onSubmit={handleSubmit}
          onClose={handleClose}
          onReset={reset}
        />
      )}
    </>
  )
}

// ── Shared form fields ─────────────────────────────────────────────────────

interface FormProps {
  state: ModalState
  category: FeedbackCategory | null
  setCategory: (c: FeedbackCategory) => void
  message: string
  setMessage: (m: string) => void
  catError: boolean
  msgError: boolean
}

function FormFields({
  state,
  category,
  setCategory,
  message,
  setMessage,
  catError,
  msgError,
}: FormProps) {
  const disabled = state === 'loading'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.035em',
            lineHeight: 1.0,
            color: 'var(--fg)',
          }}
        >
          Holler at us.
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
          }}
        >
          Bug, idea, or praise. We read all of it — usually within a couple
          days.
        </p>
      </div>

      {/* Category chips */}
      <div>
        <Eyebrow error={catError}>What kind?</Eyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                disabled={disabled}
                onClick={() => setCategory(cat.key)}
                style={{
                  all: 'unset',
                  cursor: disabled ? 'default' : 'pointer',
                  padding: '7px 12px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  background: active ? 'var(--signal)' : 'transparent',
                  color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
                  border: `1.5px solid ${
                    active
                      ? 'var(--signal)'
                      : catError
                        ? 'var(--warning)'
                        : 'var(--border-strong)'
                  }`,
                  transition: 'background .12s, color .12s, border-color .12s',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
        {catError && (
          <HelpText tone="error">
            Pick a vibe so we know how to read this.
          </HelpText>
        )}
      </div>

      {/* Message */}
      <div>
        <Eyebrow error={msgError}>What&apos;s up?</Eyebrow>
        <textarea
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          disabled={disabled}
          rows={5}
          placeholder="What did you see? What did you expect? Anything that helps us reproduce it."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            background: 'var(--surface-1)',
            color: 'var(--fg)',
            border: `1px solid ${msgError ? 'var(--warning)' : 'var(--border-strong)'}`,
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
          }}
        />
        {msgError && (
          <HelpText tone="error">
            Don&apos;t leave us hanging — give us a sentence.
          </HelpText>
        )}
      </div>
    </div>
  )
}

// ── Status states (success / error) ───────────────────────────────────────

function SuccessState({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
      <StatusRail tone="success" />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        Loud and clear.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        Your message is in the queue. We read everything — Hugh especially.
        Don&apos;t expect a reply unless we need more from you.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <SubmitButton onClick={onClose}>Back to the show</SubmitButton>
        <SecondaryButton onClick={() => { onReset() }}>Send another</SecondaryButton>
      </div>
    </div>
  )
}

function ErrorState({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
      <StatusRail tone="error" />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        Signal lost.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        We couldn&apos;t push that to the queue just now. Your message is saved on
        this device — try again in a sec, or send it later.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <SubmitButton onClick={onReset}>Try again</SubmitButton>
      </div>
    </div>
  )
}

// ── Mobile sheet ──────────────────────────────────────────────────────────

interface ShellProps extends FormProps {
  onSubmit: () => void
  onClose: () => void
  onReset: () => void
}

function MobileSheet({
  state,
  onSubmit,
  onClose,
  onReset,
  ...formProps
}: ShellProps) {
  const showForm = state === 'form' || state === 'loading'
  const sheetHeight = state === 'success' || state === 'error' ? '62%' : '85%'

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: sheetHeight,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          flexShrink: 0,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      </div>

      {/* Header rail */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 18px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <CCMark size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <HeaderRail state={state} />
        </div>
        <button
          type="button"
          aria-label="Close feedback"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '6px 18px 18px',
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && <SuccessState onClose={onClose} onReset={onReset} />}
        {state === 'error' && <ErrorState onReset={onReset} />}
        {showForm && <FormFields state={state} {...formProps} />}
      </div>

      {/* Sticky footer */}
      {showForm && (
        <div
          style={{
            flexShrink: 0,
            padding: '12px 18px 22px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}
        >
          <SubmitButton loading={state === 'loading'} onClick={onSubmit}>
            Send →
          </SubmitButton>
        </div>
      )}
    </div>
  )
}

// ── Desktop card ──────────────────────────────────────────────────────────

function DesktopCard({
  state,
  onSubmit,
  onClose,
  onReset,
  ...formProps
}: ShellProps) {
  const showForm = state === 'form' || state === 'loading'

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        width: 520,
        maxWidth: 'calc(100% - 64px)',
        maxHeight: 'calc(100% - 80px)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '18px 22px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <CCMark size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <HeaderRail state={state} />
        </div>
        <button
          type="button"
          aria-label="Close feedback"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '18px 22px',
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && <SuccessState onClose={onClose} onReset={onReset} />}
        {state === 'error' && <ErrorState onReset={onReset} />}
        {showForm && <FormFields state={state} {...formProps} />}
      </div>

      {/* Footer */}
      {showForm && (
        <div
          style={{
            flexShrink: 0,
            padding: '14px 22px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <div style={{ width: 180 }}>
            <SubmitButton loading={state === 'loading'} onClick={onSubmit}>
              Send →
            </SubmitButton>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Primitive atoms ───────────────────────────────────────────────────────

function Eyebrow({
  children,
  error = false,
}: {
  children: React.ReactNode
  error?: boolean
}) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: error ? 'var(--warning)' : 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function HelpText({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: tone === 'error' ? 'var(--warning)' : 'var(--fg-subtle)',
        marginTop: 6,
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  )
}

function HeaderRail({ state }: { state: ModalState }) {
  const isError = state === 'error'
  const isSuccess = state === 'success'
  const accent = isError
    ? 'var(--warning)'
    : isSuccess
      ? 'var(--signal)'
      : 'var(--accent)'
  const eyebrow = isError
    ? 'Beta channel · stalled'
    : isSuccess
      ? 'Got it · beta channel'
      : 'Beta channel · always open'
  const code = isError ? 'ERR' : isSuccess ? 'SENT' : 'OPEN'
  const pulse = state === 'form' || state === 'loading'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
          boxShadow: pulse ? `0 0 8px ${accent}` : 'none',
          animation: pulse ? 'fbPulse 1.6s ease-in-out infinite' : 'none',
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {eyebrow}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  )
}

function StatusRail({ tone }: { tone: 'success' | 'error' }) {
  const accent = tone === 'success' ? 'var(--signal)' : 'var(--warning)'
  const label =
    tone === 'success' ? 'Got it · beta channel' : 'Didn\'t send · beta channel'
  const code = tone === 'success' ? '200 · OK' : 'ERR · 503'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span
        style={{ width: 6, height: 6, borderRadius: 6, background: accent, flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  )
}

function SubmitButton({
  children,
  onClick,
  loading = false,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        all: 'unset',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--signal)',
        color: 'var(--fg-on-accent)',
        borderRadius: 10,
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 14.5,
        boxShadow: loading ? 'none' : '0 12px 32px -16px var(--signal)',
        opacity: loading ? 0.55 : 1,
      }}
    >
      {loading && <Spinner />}
      <span>{children}</span>
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        padding: '0 16px',
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1.6px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'fbSpin 0.8s linear infinite',
      }}
    />
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 2l8 8M10 2l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
```

- [ ] **Step 3: Add the animation keyframes**

In `apps/web/src/app/globals.css` (or wherever global CSS lives), add at the end:

```css
@keyframes fbPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@keyframes fbSpin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 4: Verify `CCMark` import path**

Check that `apps/web/src/components/consumer/cc-mark/index.ts` (or similar) exports `CCMark`. If the path differs, update the import in `FeedbackModal.tsx` accordingly. Run:

```bash
find apps/web/src -name "CCMark*" -o -name "cc-mark*" | head -5
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/feedback/ apps/web/src/app/globals.css
git commit -m "feat(web): FeedbackModal component — all states, mobile sheet + desktop card"
```

---

## Task 5: Web — FeedbackPill floating entry point

**Files:**

- Create: `apps/web/src/components/consumer/feedback/FeedbackPill.tsx`

The pill sits `fixed bottom-[72px] right-4 sm:bottom-6` — above the bottom nav on mobile (BottomNav is `h-[52px]` + safe area), floating bottom-right on desktop.

- [ ] **Step 1: Create `FeedbackPill.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { FeedbackModal } from './FeedbackModal'

export function FeedbackPill() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed',
          bottom: 72, // above BottomNav (52px) + spacing
          right: 16,
          zIndex: 80,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          height: 36,
          borderRadius: 999,
          background: 'var(--accent)',
          color: 'var(--fg-on-accent)',
          border: '1.5px solid var(--border-strong)',
          boxShadow: '0 8px 24px -8px var(--accent)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 12.5,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-on-accent)',
            opacity: 0.75,
          }}
        >
          BETA
        </span>
        Feedback
      </button>

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

> On desktop (`sm+`) the pill should shift to `bottom: 24px`. The inline style above hardcodes `72px`. Add a `className` with Tailwind to override: `className="!bottom-[72px] sm:!bottom-6"`. Adjust the `style` to only set non-responsive values, use Tailwind for bottom position.

Revised pill button with Tailwind bottom:

```typescript
<button
  type="button"
  onClick={() => setOpen(true)}
  aria-label="Send feedback"
  className="fixed bottom-[72px] right-4 sm:bottom-6 z-[80]"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    height: 36,
    borderRadius: 999,
    background: 'var(--accent)',
    color: 'var(--fg-on-accent)',
    border: '1.5px solid var(--border-strong)',
    boxShadow: '0 8px 24px -8px var(--accent)',
    fontFamily: 'var(--font-ui)',
    fontWeight: 800,
    fontSize: 12.5,
    letterSpacing: '-0.005em',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }}
>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/feedback/FeedbackPill.tsx apps/web/src/components/consumer/feedback/index.ts
git commit -m "feat(web): FeedbackPill floating entry point"
```

---

## Task 6: Web — Wire FeedbackPill into consumer layout

**Files:**

- Modify: consumer root layout (find with `find apps/web/src/app -name "layout.tsx" | head -5`, look for the one that wraps `AppHeader` and `BottomNav`)

- [ ] **Step 1: Find the consumer layout**

```bash
find apps/web/src/app -name "layout.tsx" | xargs grep -l "AppHeader\|BottomNav"
```

- [ ] **Step 2: Add FeedbackPill**

Import and render `<FeedbackPill />` just before the closing tag of the layout body — after `{children}` and `<BottomNav />`:

```typescript
import { FeedbackPill } from '@/components/consumer/feedback'

// Inside the layout JSX, at the end of the body:
<FeedbackPill />
```

- [ ] **Step 3: Start the web app and verify**

```bash
pnpm --filter web dev
```

Open `http://localhost:3000/events`. Confirm:

- Pill appears bottom-right, above bottom nav on mobile viewport
- Clicking pill opens the feedback modal
- Mobile viewport: bottom sheet, 85% height
- Desktop viewport: centered card, 520px wide
- Category chips select/deselect
- Submitting without filling in fields shows validation errors
- Closing resets the form

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app  # stage only the layout file
git commit -m "feat(web): render FeedbackPill in consumer layout"
```

---

## Task 7: Web — UserMenu component

**Files:**

- Create: `apps/web/src/components/consumer/user-menu/UserMenu.tsx`
- Create: `apps/web/src/components/consumer/user-menu/index.ts`

The design reference is `design/design_handoff_user_menu/user-menu.jsx`. This task translates JSX → TSX with real Clerk hooks.

The menu renders as a popover (desktop) or bottom sheet (mobile) — same responsive logic as `FeedbackModal`. It holds its own `open` state internally (triggered by avatar button) and closes on click-outside (same `useRef` + `mousedown` pattern as the current `UserAvatar.tsx`).

- [ ] **Step 1: Create the barrel**

`apps/web/src/components/consumer/user-menu/index.ts`:

```typescript
export { UserMenu } from './UserMenu'
```

- [ ] **Step 2: Create `UserMenu.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import type { ThemeName } from '@/theme/themes'
import { FeedbackModal } from '../feedback/FeedbackModal'

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'
const THEMES: { key: ThemeName; label: string; gradient: string }[] = [
  {
    key: 'electric',
    label: 'Electric',
    gradient: 'linear-gradient(135deg, #070A1A 50%, #FF7BD4 50%)',
  },
  {
    key: 'jade',
    label: 'Jade',
    gradient: 'linear-gradient(135deg, #06201F 50%, #1FFFC2 50%)',
  },
  {
    key: 'light',
    label: 'Light',
    gradient: 'linear-gradient(135deg, #FAFCFF 50%, #FF7BD4 50%)',
  },
]

export function UserMenu() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = useCallback(() => {
    void signOut().catch((err) => console.error('Sign out failed', err))
  }, [signOut])

  // Derive user display values
  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const initials =
    firstName || lastName
      ? (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
      : (user?.emailAddresses[0]?.emailAddress.charAt(0) ?? '?').toUpperCase()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''
  const imageUrl = user?.imageUrl
  const isAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role === 'admin'

  // Build version display: "v0.4.2-beta · abc1234" or just "dev"
  const buildParts = APP_VERSION.split(' · ')
  const buildLabel = buildParts[0] ?? APP_VERSION
  const commitLabel = buildParts[1] ?? ''

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Avatar trigger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Account menu"
          aria-expanded={open}
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={user?.fullName ?? 'User avatar'}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-[13px] font-bold text-fg-muted"
              style={{ background: 'var(--surface-1)' }}
            >
              {initials}
            </span>
          )}
        </button>

        {/* Menu */}
        {open && !isMobile && (
          <UserMenuPopover
            initials={initials}
            email={email}
            isAdmin={isAdmin}
            theme={theme}
            setTheme={setTheme}
            buildLabel={buildLabel}
            commitLabel={commitLabel}
            onFeedback={() => { setOpen(false); setFeedbackOpen(true) }}
            onSettings={() => { setOpen(false); router.push('/me') }}
            onSignOut={handleSignOut}
          />
        )}
      </div>

      {/* Mobile sheet rendered outside container so it's not clipped */}
      {open && isMobile && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              background: 'var(--scrim)',
            }}
            onClick={() => setOpen(false)}
          />
          <UserMenuSheet
            initials={initials}
            email={email}
            isAdmin={isAdmin}
            theme={theme}
            setTheme={setTheme}
            buildLabel={buildLabel}
            commitLabel={commitLabel}
            onFeedback={() => { setOpen(false); setFeedbackOpen(true) }}
            onSettings={() => { setOpen(false); router.push('/me') }}
            onSignOut={handleSignOut}
          />
        </>
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}

// ── Shared props ──────────────────────────────────────────────────────────

interface MenuBodyProps {
  initials: string
  email: string
  isAdmin: boolean
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  buildLabel: string
  commitLabel: string
  onFeedback: () => void
  onSettings: () => void
  onSignOut: () => void
}

// ── Menu body (shared between popover and sheet) ──────────────────────────

function MenuBody({
  initials,
  email,
  isAdmin,
  theme,
  setTheme,
  buildLabel,
  commitLabel,
  onFeedback,
  onSettings,
  onSignOut,
}: MenuBodyProps) {
  return (
    <>
      {/* Identity card */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            borderRadius: 21,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 17,
            color: 'var(--fg)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 23,
              background:
                'radial-gradient(circle at 30% 30%, var(--accent) 0%, transparent 70%)',
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'relative' }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Beta · founder
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
        </div>
      </div>

      {/* You section */}
      <SectionLabel>You</SectionLabel>
      <MenuRow label="Submitted prices" href="/me/submissions" kbd="P" last />

      {/* App section */}
      <SectionLabel>App</SectionLabel>
      <MenuRow
        label="Theme"
        trailing={
          <div style={{ display: 'flex', gap: 4 }}>
            {THEMES.map((tOpt, idx) => (
              <button
                key={tOpt.key}
                type="button"
                onClick={() => setTheme(tOpt.key)}
                aria-label={`Switch to ${tOpt.label} theme`}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: tOpt.gradient,
                  border: '1px solid var(--border-strong)',
                  boxShadow:
                    theme === tOpt.key ? '0 0 0 1.5px var(--signal)' : 'none',
                }}
              />
            ))}
          </div>
        }
      />
      <MenuRow label="Settings" onClick={onSettings} kbd="⌘," />
      <MenuRow label="Notifications" meta="On" last />

      {/* Admin section */}
      {isAdmin && (
        <>
          <SectionLabel>Operations</SectionLabel>
          <MenuRow
            label="Admin"
            href="/admin"
            meta="⌘⇧A"
            last
            leading={
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--signal)',
                  flexShrink: 0,
                }}
              >
                <ShieldIcon />
              </span>
            }
          />
        </>
      )}

      {/* Beta channel */}
      <SectionLabel>Beta channel</SectionLabel>
      <MenuRow
        label="Send feedback"
        meta="BETA"
        hot
        last
        onClick={onFeedback}
        leading={
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'var(--surface-2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <ChatIcon />
          </span>
        }
      />

      {/* Sign out */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <MenuRow label="Sign out" danger last onClick={onSignOut} />

      {/* Status footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            background: 'var(--signal)',
            boxShadow: '0 0 5px var(--signal)',
            animation: 'umPulse 2.2s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {buildLabel}
        </span>
        <span style={{ flex: 1 }} />
        {commitLabel && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
            }}
          >
            {commitLabel}
          </span>
        )}
      </div>
    </>
  )
}

// ── Popover (desktop) ─────────────────────────────────────────────────────

function UserMenuPopover(props: MenuBodyProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        zIndex: 100,
        width: 280,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      <MenuBody {...props} />
    </div>
  )
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────

function UserMenuSheet(props: MenuBodyProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        border: '1px solid var(--border)',
        borderBottom: 'none',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      </div>
      <MenuBody {...props} />
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 14px 4px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

interface MenuRowProps {
  label: string
  meta?: string
  kbd?: string
  hot?: boolean
  danger?: boolean
  last?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
}

function MenuRow({
  label,
  meta,
  kbd,
  hot = false,
  danger = false,
  last = false,
  leading,
  trailing,
  href,
  onClick,
}: MenuRowProps) {
  const color = danger ? 'var(--warning)' : 'var(--fg)'
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    background: hot ? 'var(--overlay-hover)' : 'transparent',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    color,
  }

  const inner = (
    <>
      {hot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
            animation: 'umPulse 1.6s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      {leading}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: hot ? 800 : 600,
          color,
          letterSpacing: '-0.005em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {trailing}
      {meta != null && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: hot ? 'var(--accent)' : 'var(--fg-subtle)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {meta}
        </span>
      )}
      {kbd && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            letterSpacing: '0.08em',
          }}
        >
          {kbd}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={style}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  )
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-0.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.2l1.8 1.8L10.5 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4h12v7H6.5L4 13.5V11H2V4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="7.5" r="0.8" fill="currentColor" />
      <circle cx="8" cy="7.5" r="0.8" fill="currentColor" />
      <circle cx="10" cy="7.5" r="0.8" fill="currentColor" />
    </svg>
  )
}
```

- [ ] **Step 3: Add `umPulse` keyframe to globals.css**

```css
@keyframes umPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/user-menu/
git commit -m "feat(web): UserMenu component — identity card, theme switcher, admin section, beta channel"
```

---

## Task 8: Web — Replace UserAvatar with UserMenu

**Files:**

- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`
- Delete: `apps/web/src/components/consumer/app-header/UserAvatar.tsx`

- [ ] **Step 1: Update AppHeader**

In `AppHeader.tsx`:

1. Remove the `import { UserAvatar }` line
2. Add `import { UserMenu } from '../user-menu'`
3. Replace every `<UserAvatar />` instance with `<UserMenu />`

Find instances:

```bash
grep -n "UserAvatar" apps/web/src/components/consumer/app-header/AppHeader.tsx
```

- [ ] **Step 2: Check MobileProfileEntry**

```bash
cat apps/web/src/components/consumer/app-header/MobileProfileEntry.tsx
```

If `MobileProfileEntry` renders `<UserAvatar />`, update it to `<UserMenu />` or inline the trigger button directly (since `UserMenu` now manages its own trigger + open state).

The current `MobileProfileEntry.tsx` from the codebase uses `useAuth` for sign-out and shows an avatar. Since `UserMenu` now owns the trigger button too, the simplest approach is to replace `MobileProfileEntry`'s avatar button with `<UserMenu />`:

```typescript
// apps/web/src/components/consumer/app-header/MobileProfileEntry.tsx
'use client'

import { UserMenu } from '../user-menu'

export function MobileProfileEntry() {
  return <UserMenu />
}
```

- [ ] **Step 3: Delete UserAvatar.tsx**

```bash
git rm apps/web/src/components/consumer/app-header/UserAvatar.tsx
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter web typecheck
```

Fix any import errors.

- [ ] **Step 5: Start the web app and verify**

```bash
pnpm --filter web dev
```

Open `http://localhost:3000/events`. Confirm:

- Desktop: clicking avatar opens 280px popover with identity card, theme swatches, sections, sign-out
- Mobile: clicking avatar opens bottom sheet
- Theme swatch changes apply immediately
- Admin section is hidden for non-admin users (test with a non-admin Clerk account)
- "Send feedback" opens the FeedbackModal
- Sign out works

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/app-header/
git commit -m "feat(web): replace UserAvatar dropdown with full UserMenu"
```

---

## Task 9: Web — Add NEXT_PUBLIC_APP_VERSION env var

**Files:**

- Modify: `apps/web/.env.example`

- [ ] **Step 1: Add to .env.example**

Append to `apps/web/.env.example`:

```
# App version shown in user menu status footer.
# Format: "v0.4.2-beta · abc1234" (build label · commit hash)
# Set in Render dashboard under Environment > NEXT_PUBLIC_APP_VERSION
# Defaults to "dev" if unset.
NEXT_PUBLIC_APP_VERSION=
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/.env.example
git commit -m "chore(web): add NEXT_PUBLIC_APP_VERSION env var for user menu status footer"
```

---

## Task 10: Final verification

- [ ] **Run full typecheck + lint + test from worktree root**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Manual test: all themes**

In the running dev app, cycle through Electric → Jade → Light via the user menu theme swatches. Confirm:

- FeedbackPill, FeedbackModal, and UserMenu all render correctly in each theme
- No hardcoded colors (use browser DevTools to verify computed styles reference `var(--...)`)

- [ ] **Manual test: admin vs. non-admin**

Sign in with an admin account → confirm "Operations" section appears in user menu.
Sign in with a non-admin account → confirm "Operations" section is absent.

- [ ] **Manual test: feedback modal all paths**

1. Open modal → submit without filling in → validate errors appear
2. Fill in category + message → submit → loading state → success state
3. "Send another" → form resets
4. Open modal → simulate error (disconnect network or mock a 500) → error state → "Try again" → back to form

- [ ] **Commit any fixes found during manual testing**

---

## PR Checklist

- [ ] Branch: `feat/feedback-modal-user-menu`
- [ ] All tests pass (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Migration 0012 included and tested locally
- [ ] `NEXT_PUBLIC_APP_VERSION` added to `.env.example` and documented in PR body
- [ ] Closes #60 and #132 in PR body
- [ ] CLAUDE.md Current Status updated on the branch before opening PR

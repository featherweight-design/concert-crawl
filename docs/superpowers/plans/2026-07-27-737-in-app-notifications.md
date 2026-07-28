# In-app notification surface — engineering implementation plan (#737)

**Goal:** Give signed-in consumers a place to see the notifications the product already writes. Today `notifications` rows with `type = 'user_notification'` are written by three shipped fan-outs (watch, contest, Spotify) and are readable by nobody — the only bell in the app is admin-only and filters `type = 'admin_alert'` (`apps/api/src/routes/admin/notifications.ts:50`). This plan builds the consumer read path: a `/v1/notifications` router, an unread pip on the existing profile affordance, and a panel that nests inside the shipped user menu on desktop and a sheet on mobile.

**Architecture:** Next.js 14 App Router (`apps/web`) + Hono (`apps/api`) + Drizzle/Postgres (`packages/db`). No new services, no new tables — one additive column and one new router.

**Tech stack:** Hono + `@hono/clerk-auth` + `@hono/zod-validator`, Drizzle, TanStack react-query, Tailwind + CSS-variable theme tokens, Vitest (unit + integration), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-07-21-737-in-app-notification-surface-design-brief.md`

**Design handoff:** `design/design_handoff_in_app_notifications/` — `READINESS.md` verdict **🟢 Green (R2, 2026-07-25)**; authored prototypes `notifications-chrome.jsx`, `notifications-panel.jsx`, `notifications-data.jsx`; `README.md` carries the locked decisions.

**Predecessor:** PWA Tier C web-push (`packages/push`, `push_subscriptions`, `user_notification_preferences`). This plan consumes that infrastructure; it does not duplicate any of it. The category union, the copy templates, and the fan-out writers all already exist and are **not** re-authored here.

**Adjacent — do not build here:** the Submitted-prices screen ships under **#1176**. The seam: `contest.resolved` / `contest.needs_info` rows currently carry `actionUrl = /events/${eventId}` (`apps/api/src/lib/contest-notifications.ts`). When #1176 lands, those two categories should point at the submissions screen instead. This plan changes no `actionUrl` and adds no submissions UI — it only renders whatever `actionUrl` the writer stored.

---

## Global Constraints

Binding for every task below. A PR that violates one of these does not merge.

1. **Worktree discipline.** All work in `.worktrees/<branch>`; the main repo directory stays clean.
2. **Locked vocabulary.** **Watching** (never "Saved"/"Favorites"/"Following"), **Submitted prices**, **price check** (never "dispute"/"contest" in customer-facing copy). The Watching affordance is an **eye** (lucide `Eye`). There is no heart icon in this product: no heart glyph may be rendered, and the string `heart` must not appear in any customer-facing copy, component name, icon import, or CSS class this plan ships. (Prose stating the rule is exempt.)
3. **Copy rule.** Every customer-facing string lives in a `definitions/copy.ts`. No inline literals in components. New panel strings go in `apps/web/src/components/consumer/notifications/definitions/copy.ts`.
4. **Row `title`/`body` come from the shipped writers, never from the prototype fixtures.** The panel renders `notifications.title` and `notifications.body` verbatim. Authoritative sources: `packages/push/src/definitions/copy.ts` (watch.*), `apps/api/src/lib/contest-notifications.ts` (contest.*), `packages/crawler-core/src/lib/spotify-fanout/definitions/copy.ts` (spotify.new_show). The handoff's `watch.pricedrop` fixture ("The price for Geese at Bluebird Theater dropped from $41 to $28.") is **not** the shipped string — the shipped title is `` `${newPrice} tickets for ${artistAtVenue} just went on sale.` ``. Fixtures in tests must be copied from the writers.
5. **No `as` casts.** Zod `safeParse` at every boundary, type guards for union narrowing, declaration merging for library types. `apps/web/src/lib/api.ts` is the model.
6. **Zod at every Hono endpoint.** `zValidator('query'|'json', …)` for bodies/queries; `z.string().uuid().safeParse(ctx.req.param('id'))` for path params (pattern: `apps/api/src/routes/me-push.ts`).
7. **All API routes under `/v1/`.**
8. **Drizzle only; expand/contract migrations only.** The next migration is `0064_*`; its `_journal.json` `when` must exceed `1785628800000` (the `0063_vendor_picker_values` entry).
9. **Mobile/desktop parity in the same PR.** Every panel state, every keyboard behaviour, both surfaces.
10. **Theme tokens only** for foreground, background and ink colours: `var(--token)`, never hex. This does not ban the `rgba(...)` values already baked into existing shadow/elevation declarations (see Task 8) — match the surrounding file rather than converting them. Verified against `apps/web/src/theme/themes.ts`: `--danger`, `--warning`, `--success`, `--signal`, `--accent`, `--fg-muted`, `--fg-subtle`, `--overlay-hover`, `--scrim`, `--focus` are present in **all nine** themes. `--shadow` and `--shadow-soft` are present in **zero** themes — do not introduce them (see Task 8).
11. **A11y in the same PR as the UI.** 44px minimum interactive target, `aria-*` wiring, full keyboard operation. No native `title=` **tooltips** on interactive UI — this bans `title` used to convey hover-only information, not the `title` attribute where ARIA requires it for labelling (e.g. `<iframe title=...>`).
12. **Release notes.** An entry in `apps/web/src/lib/definitions/releases.ts` on the PR-C branch, inserted at the **top of the array** (the file is newest-first). Don't anchor to a version string — `releases.ts` gains entries continuously and any version named here is stale before PR-C is written.
13. **Every `catch` logs.** `apiLogger.warn({ userId, err }, '…')` on the API side.

---

## Sequencing lock

| PR | Scope | Depends on | Can start |
| --- | --- | --- | --- |
| **PR-A** | Migration `0064`, `/v1/notifications` router, retention job, integration tests | — | Immediately |
| **PR-B** | Panel components, category map, copy, time helpers, react-query hook | PR-A merged (contract + fixtures) | After PR-A |
| **PR-C** | Chrome integration, pip, mobile menu mount, keyboard/focus, releases entry | PR-B merged | After PR-B |

PR-B may be authored against the PR-A contract in parallel, but must not merge before PR-A — its react-query hook calls endpoints that do not exist until then. PR-C is strictly last: it mounts PR-B's components into shipped chrome and is the only PR that touches `UserMenu.tsx`, `AppHeader.tsx`, and `BottomNav.tsx`.

**Decisions locked here so no task has to relitigate them:**

- **`last_seen_at` host → `user_profiles`.** Rejected `user_notification_preferences`: its `userId` is the primary key of a row created **lazily, only on PATCH** (`apps/api/src/routes/me-push.ts` — the GET is deliberately side-effect-free), so writing a panel-open timestamp there would fabricate preference rows and destroy the "user has expressed a preference" semantics the push code depends on. `user_profiles` already has `userId text notNull().unique()`, already hosts a marker of exactly this shape (`spotifyNudgeSeenAt`, `packages/db/src/schema/user-profiles.ts:31`), and is already fetched on every page load via `fetchMe`.
- **Retention → 90 days.** Rows older than 90 days are deleted by a daily prune. Rationale: the oldest actionable category (`watch.postponed`) references a rescheduled date that is typically inside 90 days, and unbounded growth on a per-watcher fan-out table is the real risk. Applies to `type = 'user_notification'` only — admin alerts are untouched.
- **Backfill window → 30 days.** The list endpoint never returns rows older than 30 days, and the unread count is computed over the same window. Rationale: the panel's relative-time formatter switches to absolute dates past 7 days (`relTime` in `notifications-data.jsx`), so a 30-day floor keeps every row legible while a 90-day retention keeps the data available for a future digest without widening this surface. The two numbers are deliberately different and both are constants in one file so the gap is visible.
- **Page size → 20** (confirmed with Hugh 2026-07-25), advanced by an "Older notifications" button. No infinite scroll, no virtualization.
- **HTTP verbs.** The consumer router uses **POST** for `/:id/read`, `/read-all`, `/mark-panel-seen`. This diverges from the admin router, which uses `PATCH /:id/read`. The divergence is intentional and stated in the router's doc comment: these are idempotent state-advance commands, not partial resource updates, and the ticket scopes POST. Do not "harmonize" them.

---

## Phase / PR-A — Backend: read path, seen watermark, retention

Branch: `feat/737-notifications-api`

### Task 1: Add `user_profiles.notifications_seen_at`

**Files:**
- modify `packages/db/src/schema/user-profiles.ts`
- create `packages/db/migrations/0064_notifications_seen_at.sql`
- modify `packages/db/migrations/meta/_journal.json`

**Interface:**

```ts
notificationsSeenAt: timestamp('notifications_seen_at', { withTimezone: true }),
```

Nullable, no default. `NULL` means "never opened the panel" — every row in the window is unread.

- [ ] **Step 1: Write the schema column.** Place it adjacent to `spotifyNudgeSeenAt` so the two markers read as a set.
- [ ] **Step 2: Write the migration.** `ALTER TABLE user_profiles ADD COLUMN notifications_seen_at timestamptz;` — additive only, no backfill, no `NOT NULL`. Expand-only.
- [ ] **Step 3: Append the journal entry.** `idx: 64`, `when` strictly greater than `1785628800000`.
  Run: `pnpm db:migrate`
  Expected: clean apply against the local DB; re-running is a no-op.
- [ ] **Step 4: Add a covering index for the list query.**
  `CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC) WHERE type = 'user_notification';`
  Same migration file. The list endpoint's hot path is exactly this predicate + ordering.

### Task 2: Notification window constants

**Files:**
- create `apps/api/src/lib/definitions/notification-windows.ts`

**Interface:**

```ts
export const NOTIFICATION_BACKFILL_DAYS = 30;
export const NOTIFICATION_RETENTION_DAYS = 90;
export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_PAGE_SIZE_MAX = 50;
```

- [ ] **Step 1: Create the file with a doc comment** stating why backfill < retention (list legibility vs. data availability). Every consumer of these numbers imports from here — no literal `30`/`90`/`20` anywhere else in the API.

### Task 3: `GET /v1/notifications` — list + unread count

> **Deliberate divergence from the brief.** The design brief and handoff both say `GET /v1/notifications/me`. This plan ships `GET /v1/notifications` instead, to match `/v1/watching` — the closest shipped analogue, which is likewise an implicitly viewer-scoped collection and carries no `/me` suffix (`apps/api/src/routes/index.ts:43`). The `/v1/me` prefix in this codebase is reserved for the *singular* profile resource (`mePushRouter`, line 47), not for collections. Nothing downstream of the brief depends on the literal path.

**Files:**
- create `apps/api/src/routes/notifications.ts`
- modify `apps/api/src/routes/index.ts`
- create `apps/api/src/routes/notifications.integration.test.ts`

**Interfaces:**

```ts
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(NOTIFICATION_PAGE_SIZE_MAX).default(NOTIFICATION_PAGE_SIZE),
  before: z.string().datetime({ offset: true }).optional(),
});

interface NotificationListResponse {
  success: true;
  data: {
    items: ConsumerNotification[];
    unreadCount: number;
    hasMore: boolean;
    seenAt: string | null;
  };
}

interface ConsumerNotification {
  id: string;
  // Raw DB string, NOT the narrowed union: an unknown/legacy category must
  // survive the response so the client can fall back to CATEGORY_FALLBACK.
  // Narrowing happens at render via UserNotificationCategorySchema.safeParse.
  category: string; // valid values: packages/push/src/notification-categories.ts:16-25
  title: string;
  // `notifications.body` is text().notNull() in the schema and every shipped
  // writer supplies one, so this is non-nullable.
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}
```

- [ ] **Step 1: Write the failing integration test.** Copy the harness shape from `apps/api/src/routes/watching.integration.test.ts:1-50` (`vi.hoisted` auth state, `vi.mock('@hono/clerk-auth')`, `createApp()`, `clearTables()`). Assert: 401 unauthenticated; empty `items` for a user with no rows; only that user's rows returned; `admin_alert` rows excluded; rows older than `NOTIFICATION_BACKFILL_DAYS` excluded; `items` ordered `createdAt DESC`; `hasMore` true when a 21st in-window row exists.
  Run: `pnpm --filter @concert-crawl/api test notifications.integration`
  Expected: FAIL (module not found).
- [ ] **Step 2: Create the router skeleton.** `notificationsRouter.use('*', clerkMiddleware())`, then the `getAuth(ctx)` → `userId ?? null` → 401 guard verbatim from `me-push.ts`.
- [ ] **Step 3: Implement the query.** Drizzle `select` from `notifications` where `userId = $userId and type = 'user_notification' and createdAt > now() - interval`, order by `createdAt desc`, limit `limit + 1` to derive `hasMore`. `before` (when present) adds `createdAt < new Date(before)` for the "Older notifications" page — convert the validated datetime **string** to a `Date` before it reaches the predicate, as `admin/invite-codes.ts:48` does; passing the raw string leaves the comparison at the driver's mercy.
- [ ] **Step 4: Parse `metadata` safely.** The column is a JSON **string** (`packages/db/src/schema/notifications.ts`). Parse inside a `try`/`catch`; on failure log `apiLogger.warn` and return `metadata: null`. Validate the parse result with a `z.record(z.unknown()).safeParse` — no casts.
- [ ] **Step 5: Validate `category` against the shipped union.** `UserNotificationCategorySchema.safeParse(row.category)`; on failure, still return the row but with the raw string, and let the client's `CATEGORY_FALLBACK` handle it. Log once per unknown value.
- [ ] **Step 6: Compute `unreadCount`.** A row is unread when `readAt IS NULL`. Count over the same window and return the **true** count — do not cap it server-side. The pip is a dot, so the number exists only for the `aria-label`, and announcing "99" to someone with 140 unread is simply wrong. Cap at the render layer instead: the visible affordance stays a dot and the label reads the real number. Return `seenAt` from `user_profiles.notificationsSeenAt` so the client can render the "fresh vs. backfill" divider without a second call.
- [ ] **Step 7: Mount at `/v1/notifications`** in `apps/api/src/routes/index.ts`, adjacent to the `/v1/me` mount.
  Run: `pnpm --filter @concert-crawl/api test notifications.integration`
  Expected: PASS.

### Task 4: `POST /v1/notifications/:id/read` and `/read-all`

**Files:**
- modify `apps/api/src/routes/notifications.ts`
- modify `apps/api/src/routes/notifications.integration.test.ts`

- [ ] **Step 1: Write the failing tests.** Per-item: marks only that row, is idempotent (second call still 200, `readAt` unchanged), 404 for another user's id, 400 for a non-UUID id. Mark-all: sets `readAt` on every unread in-window row for that user only, returns the number updated, is idempotent.
  Expected: FAIL.
- [ ] **Step 2: Register `/read-all` BEFORE `/:id/read`.** Hono matches in registration order and will otherwise bind `read-all` to `:id`. The admin router carries this same comment (`apps/api/src/routes/admin/notifications.ts`) — repeat it here so the trap is documented at both sites.
- [ ] **Step 3: Implement `/:id/read`.** `z.string().uuid().safeParse(ctx.req.param('id'))` → 400 on failure. `update … set readAt = coalesce(read_at, now()) where id = $id and user_id = $userId and type = 'user_notification'` and `returning({ id })`; empty result → 404. The `coalesce` is what makes it idempotent.
- [ ] **Step 4: Implement `/read-all`.** Single `update … where user_id = $userId and read_at is null and type = 'user_notification'` plus the backfill-window predicate, `returning({ id })`; respond `{ success: true, data: { updated: rows.length } }`. One statement — no N+1.
  Expected: PASS.

### Task 5: `POST /v1/notifications/mark-panel-seen`

**Files:**
- modify `apps/api/src/routes/notifications.ts`
- modify `apps/api/src/routes/notifications.integration.test.ts`

- [ ] **Step 1: Write the failing tests.** Creates the `user_profiles` row when absent; advances `notificationsSeenAt` when present; never moves the timestamp backwards; does **not** touch `readAt` on any row (seen ≠ read — this is the whole point of the two-level model).
  Expected: FAIL.
- [ ] **Step 2: Implement with `onConflictDoUpdate`.** `insert(userProfiles).values({ userId, notificationsSeenAt: sql\`now()\` }).onConflictDoUpdate({ target: userProfiles.userId, set: { notificationsSeenAt: sql\`greatest(${userProfiles.notificationsSeenAt}, now())\`, updatedAt: sql\`now()\` } })` — the same upsert shape as `me-push.ts`, plus a `greatest(...)` guard. The guard is what actually enforces "never moves backwards": `now()` is transaction-start time, so two concurrent marks can commit out of order and the later writer would otherwise stamp an *earlier* timestamp. A dedicated endpoint (rather than overloading `PATCH /v1/users/me`) keeps pip derivation to a single read and keeps profile PATCH free of a side effect on every save.
  Expected: PASS.

### Task 6: Retention prune

**Files:**
- modify `apps/api/src/routes/admin/…` or the existing daily job entry point (locate the daily cron entry alongside the 3 AM MT crawl job)
- create `apps/api/src/lib/prune-notifications.ts`
- create `apps/api/src/lib/prune-notifications.test.ts`

**Interface:**

```ts
export const pruneNotifications = async (db: Database): Promise<{ deleted: number }> => { … };
```

- [ ] **Step 1: Write the failing unit test.** Deletes `user_notification` rows older than `NOTIFICATION_RETENTION_DAYS`; leaves in-window rows; leaves `admin_alert` rows of any age; returns the count.
  Expected: FAIL.
- [ ] **Step 2: Implement the delete** with an explicit `type = 'user_notification'` predicate. Log the deleted count at info.
- [ ] **Step 3: Wire it into the existing daily cron** rather than adding a new Render cron job. Wrap the call in try/catch; a prune failure must never fail the job that hosts it.
  Expected: PASS.

---

## Phase / PR-B — Panel components, copy, and data hook

Branch: `feat/737-notifications-panel`

All components live under `apps/web/src/components/consumer/notifications/`. They are pure presentation plus one query hook — **nothing in this PR is mounted into shipped chrome.** That keeps PR-B reviewable in isolation and means a revert is a one-directory delete.

### Task 7: Copy, category map, and time helpers

**Files:**
- create `apps/web/src/components/consumer/notifications/definitions/copy.ts`
- create `apps/web/src/components/consumer/notifications/definitions/categories.ts`
- create `apps/web/src/components/consumer/notifications/lib/format-time.ts`
- create `apps/web/src/components/consumer/notifications/lib/format-time.test.ts`

**Interfaces:**

```ts
// categories.ts
interface CategoryPresentation { label: string; ink: string; glyph: GlyphName; }
export const CATEGORY_MAP: Record<UserNotificationCategory, CategoryPresentation>;
export const CATEGORY_FALLBACK: CategoryPresentation;
export const categoryFor = (raw: string): CategoryPresentation => { … };
```

- [ ] **Step 1: Port `CATEGORY_MAP` verbatim** from `notifications-data.jsx:117-126`. All **eight** shipped categories, keyed to `UserNotificationCategorySchema` (`packages/push/src/notification-categories.ts:16-25`):

  | key | label | ink | glyph |
  | --- | --- | --- | --- |
  | `watch.cancelled` | Cancelled | `var(--danger)` | cancelled |
  | `watch.postponed` | Moved | `var(--warning)` | postponed |
  | `watch.soldout` | Sold out | `var(--warning)` | soldout |
  | `watch.backonsale` | Back on | `var(--success)` | backonsale |
  | `watch.pricedrop` | Price drop | `var(--success)` | pricedrop |
  | `contest.resolved` | Price check | `var(--fg-muted)` | resolved |
  | `contest.needs_info` | Needs you | `var(--signal)` | needsinfo |
  | `spotify.new_show` | Spotify | `var(--accent)` | spotify |

  The five `watch.*` categories are deliberately **not** collapsed into one row type: ink encodes valence, glyph encodes event. Do not "simplify" this.
- [ ] **Step 2: Type the map exhaustively.** `Record<UserNotificationCategory, CategoryPresentation>` makes a future ninth category a compile error at this file. `categoryFor` narrows an unknown string via `UserNotificationCategorySchema.safeParse` and returns `CATEGORY_FALLBACK` on failure — no cast.
- [ ] **Step 3: Port `NOTIF_COPY`** from `notifications-data.jsx:139-166` into `definitions/copy.ts` as `NOTIFICATIONS_COPY`. Keys, verbatim: `bellLabel(n)`, `pipLabel`, `panelTitle` ("What you missed"), `panelSub(n)`, `markAll` ("Mark all read"), `markedAll` ("All caught up."), `seeAll(n)`, `menuRow`, `menuBack`, `closeLabel`, `loadMore` ("Older notifications"), `loading` ("Checking what you missed…"), `error` ("Couldn't load your notifications."), `errorBody`, `errorAction` ("Retry"), `emptyTitle` ("All quiet."), `emptyBody`, `emptyAction` ("Find something to watch"), `endOfList`, `today`, `yesterday`, `unreadTag`, `segments`. Every string a component renders comes from here.
- [ ] **Step 4: Write failing tests for the time helpers.** `relTime` boundaries at 55m / 22h / 7d (and the switch to an absolute date past 7d), `relTimeLong`, `dayKey`, `groupByDay` (stable order, today/yesterday labels). Timezone: format in Mountain Time, consistent with the rest of the app.
  Run: `pnpm --filter web test format-time`
  Expected: FAIL, then implement, then PASS.

### Task 8: Panel primitives

**Files:**
- create `apps/web/src/components/consumer/notifications/NotifItem.tsx`
- create `apps/web/src/components/consumer/notifications/NotifTile.tsx`
- create `apps/web/src/components/consumer/notifications/NotifDayDivider.tsx`
- create `apps/web/src/components/consumer/notifications/NotifStates.tsx` (`NotifSkeletonRow`, `NotifLoading`, `NotifEmpty`, `NotifError`)
- create `apps/web/src/components/consumer/notifications/NotifHeader.tsx`
- create `apps/web/src/components/consumer/notifications/NotifBody.tsx`
- create `apps/web/src/components/consumer/notifications/glyphs/index.tsx`

Ported from `notifications-panel.jsx`, converted to TSX with real props. Arrow-function components; no `handle*` names; logic in `lib/`.

- [ ] **Step 1: `NotifTile`** — the category glyph chip, `background` derived from `cat.ink`, `aria-hidden` (the label is in the row's `aria-label`).
- [ ] **Step 2: `NotifItem`** — `role="button"`, `tabIndex={0}`, `aria-label={itemLabel(n)}`, Enter/Space handler (already present at `notifications-panel.jsx:82` — port it, don't reinvent), 2-line clamp on both title and body, `minHeight: 64`, 2px left rail in `cat.ink` when unread. Renders `notification.title` / `notification.body` **verbatim from the API** — the component composes no sentences.
- [ ] **Step 3: `NotifDayDivider`** — sticky, `position: sticky; top: 0`, labels from `NOTIFICATIONS_COPY.today` / `.yesterday` / a formatted date.
- [ ] **Step 4: The four states.** `NotifLoading` (`role="status"`, `aria-busy`, `aria-live="polite"`, visually-hidden loading string, three skeleton rows); `NotifEmpty` (title/body/CTA to `/events`); `NotifError` (`role="alert"`, retry action); the fresh/backfill split is a divider inside `NotifBody`, not a separate state.
- [ ] **Step 5: Fix the five sub-44px targets flagged in READINESS.** `Mark all read` (~31px), `seeAll` (~37px), profile segments (34px), empty CTA (~33px), retry (~31px) all go to a 44px minimum hit area — pad the button, keep the visual size if the design calls for it (padding, not font-size). This is a READINESS open item, not optional polish.
- [ ] **Step 6: Do not add `--shadow` / `--shadow-soft`.** Those tokens exist in zero of the nine themes. The panel gets its elevation from the shipped shell it nests in — `UserMenuPopover` already sets `boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)'` (`apps/web/src/components/consumer/user-menu/UserMenu.tsx:579`). Reuse the shell; add no tokens.
- [ ] **Step 7: `NotifBody`** — groups by day, renders `role="list"` / `role="listitem"`, renders the "Older notifications" button when `hasMore`, and renders the end-of-list line otherwise. Page size 20; no virtualization.
- [ ] **Step 8: `NotifHeader`** — panel title, unread count, `Mark all read`, close (44px).

### Task 9: `useNotifications` query hook

**Files:**
- create `apps/web/src/lib/queries/use-notifications.ts`
- create `apps/web/src/lib/notifications.ts`
- create `apps/web/src/lib/notifications.test.ts`

**Interfaces:**

```ts
// lib/notifications.ts — apiClient wrappers, mirroring apps/web/src/lib/users.ts
export const fetchNotifications = async (token: string, before?: string): Promise<NotificationListResult> => { … };
export const markNotificationRead = async (token: string, id: string): Promise<void> => { … };
export const markAllNotificationsRead = async (token: string): Promise<number> => { … };
export const markPanelSeen = async (token: string): Promise<void> => { … };
```

- [ ] **Step 1: Write failing tests** for the response parser — a Zod schema over the API payload, `safeParse`, `ApiError` on shape mismatch. No casts.
  Expected: FAIL → implement → PASS.
- [ ] **Step 2: Build the hook** on TanStack query, keyed `['notifications']`. Poll on a 60s interval while the panel is open and on window focus; **not** a bare 30s `setInterval` like the admin bell (`apps/web/src/components/admin/notification-bell/NotificationBell.tsx`) — the consumer surface is far higher traffic.
- [ ] **Step 3: Optimistic mutations.** `markRead` flips `readAt` locally and decrements `unreadCount`; `markAllRead` zeroes the count and shows `NOTIFICATIONS_COPY.markedAll`. Roll back and refetch on error.
- [ ] **Step 4: Expose `unreadCount` cheaply** so PR-C's pip can subscribe without mounting the panel.

---

## Phase / PR-C — Chrome integration, keyboard, parity

Branch: `feat/737-notifications-chrome`

This is the only PR that edits shipped chrome. **There is no bell icon in consumer chrome** — the existing profile affordance carries the pip. No new persistent nav slots.

### Task 10: Unread pip on the profile affordance (both surfaces)

**Files:**
- create `apps/web/src/components/consumer/notifications/NotifPip.tsx`
- modify `apps/web/src/components/consumer/user-menu/UserMenu.tsx`
- modify `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`
- modify `apps/web/src/components/consumer/definitions/copy.ts`

- [ ] **Step 1: `NotifPip`** — 8px dot in `var(--signal)` with a 2px ring in the surface colour, `aria-hidden` (per the handoff A11y section). A **dot, not a count.**
- [ ] **Step 2: Desktop.** Overlay the pip on the `<Avatar size={36}>` inside the menu trigger (`UserMenu.tsx:213-227`). The trigger's `aria-label` becomes `NOTIFICATIONS_COPY.bellLabel(unread)` when unread > 0, so the count is announced even though the visual is a dot.
- [ ] **Step 3: Mobile.** Same pip on the 4th bottom-nav slot (`BottomNav.tsx:223-240`) across all three of its render branches (`MeAvatarSkeleton`, `MeAvatar`, `PersonIcon`). Update `bottomNav.nav.profileAriaLabel` (`apps/web/src/components/consumer/definitions/copy.ts:620-630`) to carry the unread count.
- [ ] **Step 4: `aria-live` on the count.** A visually-hidden `aria-live="polite"` region announces the unread count when it changes. READINESS open item.
- [ ] **Step 5: `aria-expanded` on the trigger.** Already present on the desktop trigger (`UserMenu.tsx:213`); the mobile trigger from Task 12 must have it too. READINESS open item.

### Task 11: `InboxStrip` and the nested panel mode

**Files:**
- modify `apps/web/src/components/consumer/user-menu/UserMenu.tsx`
- create `apps/web/src/components/consumer/notifications/InboxStrip.tsx`
- create `apps/web/src/components/consumer/notifications/MenuNotifRow.tsx`

The locked shape (handoff README, Option B): **one anchor, one surface, one Escape.** The panel does not float beside the menu — it **swaps the menu body in place**, behind a `‹ Menu` back row.

- [ ] **Step 1: `InboxStrip`** — the top-of-menu strip showing the newest 1–2 rows plus `seeAll(n)`. Its zero-unread branch is an outer `role="button" tabIndex={0}` (`notifications-chrome.jsx:130`) — see Task 13 for the keyboard handler it currently lacks.
- [ ] **Step 2: Add a `mode` state to `UserMenu`** — `'menu' | 'notifications'`. Ported from the prototype's `strip|row|panel` modes, reduced to the two the product actually ships.
- [ ] **Step 3: Render `NotifBody` in place of `MenuBody`** when `mode === 'notifications'`, with a `‹ Menu` back row above it (`notifications-chrome.jsx:255`). The popover keeps its existing width and shadow; only the body swaps. Panel maxHeight 520 with internal scroll.
- [ ] **Step 4: Fire `markPanelSeen` on entering `'notifications'` mode** — once per open, debounced, fire-and-forget via a `void async` IIFE with a logging catch. This is what clears the pip. Per-item `readAt` still requires a click.
- [ ] **Step 5: Closing the menu resets `mode` to `'menu'`** so the next open starts at the menu, not mid-panel.

### Task 12: Make the mobile `me` affordance a menu

**Files:**
- modify `apps/web/src/components/consumer/app-header/AppHeader.tsx`
- modify `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`
- modify or delete `apps/web/src/components/consumer/app-header/MobileProfileEntry.tsx`

Today `<UserMenu />` is mounted **only** inside the desktop `hidden … sm:flex` block (`AppHeader.tsx:129`), which means `UserMenuSheet` (`UserMenu.tsx:592-633`) — a fully built mobile sheet behind a `matchMedia('(max-width: 639px)')` check (`UserMenu.tsx:116-122`) — is **currently unreachable**. This task mounts what already exists; it does not build a sheet.

- [ ] **Step 1: Decide the `/me` routing.** The 4th bottom-nav slot currently hard-navigates to `/me` (`BottomNav.tsx:223`). It becomes a menu trigger; the menu's "Settings" row keeps `/me` reachable (that row already exists in `MenuBody`). Net: no route is orphaned and no nav slot is added.
- [ ] **Step 2: Mount `UserMenu` on mobile.** Either mount it in the bottom-nav slot or resurrect `MobileProfileEntry.tsx` (which exists with **zero importers** today) as the mount point. If unused after this task, delete it — do not leave a second dead component behind.
- [ ] **Step 3: Sheet-mode panel.** In the sheet, `mode === 'notifications'` swaps the body exactly as on desktop, same `‹ Menu` back row. 88% height, drag handle, `var(--scrim)` overlay — all already in the shipped sheet.
- [ ] **Step 4: Parity assertion in tests.** Every state (loading / empty / error / fresh / backfill / all-read) renders in both the popover and the sheet. Parity is not "it looks similar" — it is a test that runs the same assertions against both.

### Task 13: Keyboard and focus — first-class scope

**Files:**
- modify `apps/web/src/components/consumer/notifications/InboxStrip.tsx`
- modify `apps/web/src/components/consumer/notifications/MenuNotifRow.tsx`
- modify `apps/web/src/components/consumer/user-menu/UserMenu.tsx`
- create `apps/web/src/components/consumer/notifications/lib/use-focus-trap.ts`
- create `apps/web/src/components/consumer/notifications/keyboard.test.tsx`

This is **not** polish. READINESS records it as eng-owned and unfixed in the prototype. Each item below is a test, not a review comment.

- [ ] **Step 1: `onKeyDown` on the four `role="button"` rows that lack it.** Enumerated exactly: (a) `InboxStrip`'s zero-unread outer row (`notifications-chrome.jsx:130`), (b) `MenuNotifRow` (`:170`), (c) the `‹ Menu` back row (`:255`), (d) `MenuRow` (`:202`). Each needs Enter **and** Space, with `preventDefault` on Space so the page does not scroll. `NotifItem` already handles both (`notifications-panel.jsx:82`) — extract that handler into `lib/` and share it across all five call sites rather than copying it four times.
- [ ] **Step 2: Escape closes.** `UserMenu` already binds Escape (`UserMenu.tsx:125-132`). Verify with a test that Escape from `mode === 'notifications'` closes the whole menu (one Escape, per the locked "one Escape" decision) — it must **not** first pop back to the menu body. If the shipped handler is scoped in a way that breaks under the swapped body, fix it here.
- [ ] **Step 3: Focus-in on open.** Entering `'notifications'` mode moves focus to the panel header (or the first row if the header is non-interactive). Tab order after that is header → rows → load-more.
- [ ] **Step 4: Focus restore on close.** Closing the menu returns focus to the trigger that opened it (desktop avatar button or mobile nav slot). Store the trigger ref on open; restore in the close path, including the Escape path.
- [ ] **Step 5: Focus trap in the mobile sheet.** The sheet is modal over a scrim; Tab must cycle within it. `use-focus-trap.ts` — first/last focusable wrap-around, restore on unmount. The desktop popover is **not** trapped (it closes on outside click); only the sheet traps.
- [ ] **Step 6: Write the keyboard test file.** Testing-library, per row type: Enter activates, Space activates without scrolling, Escape closes, focus lands on open, focus restores on close, Tab wraps in the sheet.
  Run: `pnpm --filter web test keyboard`
  Expected: FAIL → implement → PASS.

### Task 14: Release notes

**Files:**
- modify `apps/web/src/lib/definitions/releases.ts`

- [ ] **Step 1: Add the entry** at the top of the array (newest-first — do not anchor to a version string; `releases.ts` gains entries continuously). User-facing framing, Hugh's voice, locked vocabulary — "Watching", never "Saved". No spotlight asset unless one exists in `design/design_handoff_spotlight_heroes/`.

---

## Files

**Created**

| Path | PR |
| --- | --- |
| `packages/db/migrations/0064_notifications_seen_at.sql` | A |
| `apps/api/src/lib/definitions/notification-windows.ts` | A |
| `apps/api/src/routes/notifications.ts` | A |
| `apps/api/src/routes/notifications.integration.test.ts` | A |
| `apps/api/src/lib/prune-notifications.ts` + `.test.ts` | A |
| `apps/web/src/components/consumer/notifications/definitions/copy.ts` | B |
| `apps/web/src/components/consumer/notifications/definitions/categories.ts` | B |
| `apps/web/src/components/consumer/notifications/lib/format-time.ts` + `.test.ts` | B |
| `apps/web/src/components/consumer/notifications/NotifItem.tsx` | B |
| `apps/web/src/components/consumer/notifications/NotifTile.tsx` | B |
| `apps/web/src/components/consumer/notifications/NotifDayDivider.tsx` | B |
| `apps/web/src/components/consumer/notifications/NotifStates.tsx` | B |
| `apps/web/src/components/consumer/notifications/NotifHeader.tsx` | B |
| `apps/web/src/components/consumer/notifications/NotifBody.tsx` | B |
| `apps/web/src/components/consumer/notifications/glyphs/index.tsx` | B |
| `apps/web/src/lib/notifications.ts` + `.test.ts` | B |
| `apps/web/src/lib/queries/use-notifications.ts` | B |
| `apps/web/src/components/consumer/notifications/NotifPip.tsx` | C |
| `apps/web/src/components/consumer/notifications/InboxStrip.tsx` | C |
| `apps/web/src/components/consumer/notifications/MenuNotifRow.tsx` | C |
| `apps/web/src/components/consumer/notifications/lib/use-focus-trap.ts` | C |
| `apps/web/src/components/consumer/notifications/keyboard.test.tsx` | C |

**Modified**

| Path | PR | Why |
| --- | --- | --- |
| `packages/db/src/schema/user-profiles.ts` | A | `notificationsSeenAt` |
| `packages/db/migrations/meta/_journal.json` | A | `idx: 64` |
| `apps/api/src/routes/index.ts` | A | mount `/v1/notifications` |
| `apps/web/src/components/consumer/user-menu/UserMenu.tsx` | C | `mode` state, InboxStrip, pip, focus |
| `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx` | C | pip + menu trigger |
| `apps/web/src/components/consumer/app-header/AppHeader.tsx` | C | mobile `UserMenu` mount |
| `apps/web/src/components/consumer/app-header/MobileProfileEntry.tsx` | C | reuse or delete |
| `apps/web/src/components/consumer/definitions/copy.ts` | C | profile aria-label |
| `apps/web/src/lib/definitions/releases.ts` | C | release entry |

---

## Tests

**PR-A — `apps/api/src/routes/notifications.integration.test.ts`**
401 unauthenticated · own rows only · `admin_alert` excluded · `createdAt DESC` · backfill window excludes >30d · `hasMore` at 21 rows · `before` paging · malformed `metadata` degrades to `null` and logs · unknown `category` returned raw · `unreadCount` correct and capped at 99 · `/:id/read` idempotent, 404 cross-user, 400 non-UUID · `/read-all` single statement, own rows only, idempotent · `/mark-panel-seen` creates the profile row, never regresses the timestamp, does not touch `readAt` · route ordering (`/read-all` is not matched as `:id`).

**PR-A — `apps/api/src/lib/prune-notifications.test.ts`**
Deletes >90d user notifications · retains in-window · retains `admin_alert` at any age · returns the count.

**PR-B — unit**
`format-time` boundaries 55m/22h/7d and the absolute-date cutover · `groupByDay` ordering and today/yesterday labels · `categoryFor` returns the right presentation for all 8 categories and `CATEGORY_FALLBACK` for garbage · the response Zod parser rejects malformed payloads with `ApiError` · `NotifItem` renders API `title`/`body` verbatim with fixtures **copied from the shipped writers** (`packages/push/src/definitions/copy.ts`, `apps/api/src/lib/contest-notifications.ts`, `packages/crawler-core/src/lib/spotify-fanout/definitions/copy.ts`) · all six states render.

**PR-C — component + a11y**
Pip shows/hides on `unreadCount`, is `aria-hidden`, and the count reaches the trigger's `aria-label` · `aria-live` announces count changes · `aria-expanded` on both triggers · entering panel mode fires `markPanelSeen` exactly once per open · Enter and Space activate each of the four `role="button"` rows, Space without scrolling · Escape closes from panel mode in one press · focus lands in the panel on open · focus restores to the trigger on close (including via Escape) · Tab wraps inside the mobile sheet and not in the desktop popover · every interactive target ≥44px · **parity**: the same state assertions run against both the popover and the sheet.

**Manual / staging**
All nine themes: valence inks legible, no text in `--fg-subtle` or in category ink · a real fan-out row from each of the three writers renders correctly end to end.

---

## Out of scope

- **Any bell icon in consumer chrome.** The profile affordance carries the pip. The admin bell (`apps/web/src/components/admin/notification-bell/`) is untouched.
- **Unread-only filter.** Deliberately cut in design.
- **Offline-cached rows.** Deliberately cut in design.
- **A dedicated `/notifications` page.** Panel + sheet only.
- **Submitted-prices screen** — #1176. No `actionUrl` changes here; the contest rows keep pointing at `/events/${eventId}` until #1176 reroutes them.
- **New notification categories, new writers, or copy changes to existing templates.** The three fan-outs are shipped and correct; this surface reads them.
- **Push-notification behaviour, preferences UI, or `push_subscriptions`.** PWA Tier C owns those.
- **Counts on the pip.** Dot only.
- **Virtualization or infinite scroll.** Page size 20 with an explicit "Older notifications" button.
- **`--shadow` / `--shadow-soft` tokens.** Not adding two tokens across nine themes for a surface that already has elevation.
- **Digest email or any cross-channel delivery.**

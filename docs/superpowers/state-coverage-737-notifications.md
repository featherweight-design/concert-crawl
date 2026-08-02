# Gate 1 — State reachability: #737 in-app notifications

Run 2026-08-02, at the API→UI seam, after PR-A (#1309) merged and before any
PR-B code was written. Source of states: the handoff's template inventory
(`design/design_handoff_in_app_notifications/README.md`). Source of truth for
the contract: `apps/api/src/routes/notifications.ts` on `main`.

Three columns, per the gate: **Type** (is the field in the response), **Route**
(does the handler actually compute it, or is it a stub), **Runtime** (given how
the component will be mounted, seeded and cached, can the condition ever be
true). The third column is the one that catches #1169 — a shimmer that was
structurally unreachable because a sibling PR's SSR seed made `isPending` false
on first render.

## The contract PR-B is building against

`GET /v1/notifications` → `{ items, unreadCount, hasMore, nextCursor, seenAt }`,
each item `{ id, category, title, body, actionUrl, readAt, createdAt, metadata }`.
Both timestamp fields are ISO strings; `readAt` and `seenAt` are nullable.

## Coverage

| #   | State (handoff)                                 | Trigger                                               | Type                                         | Route                                                                                                                                  | Runtime                                                                                                                                                                                                                                                                                                   | Verdict          |
| --- | ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Panel · ready                                   | `items.length > 0`                                    | `items`                                      | `:203` maps every row                                                                                                                  | Any user with a row in the 30-day window. Three fan-outs have been writing for months (Gate 6), so this is the _common_ case at launch, not the rare one.                                                                                                                                                 | ✅               |
| 2   | Panel · empty ("All quiet.")                    | `items.length === 0`                                  | same                                         | same                                                                                                                                   | A brand-new user, and any user whose rows have all aged past `NOTIFICATION_BACKFILL_DAYS`.                                                                                                                                                                                                                | ✅               |
| 3   | Panel · loading                                 | react-query `isPending`                               | n/a — client state                           | n/a                                                                                                                                    | **The #1169 question.** Reachable only if the panel fetches client-side with no server prefetch and no `initialData`. PR-B therefore mounts the hook with neither, and PR-C must not add a prefetch in the layout to "speed up" the pip. Recorded as a constraint, not an observation — Gate 2 forces it. | ✅ (constrained) |
| 4   | Panel · poll-failed                             | query `error`                                         | n/a                                          | route 500s as `{ success: false, error: 'Read failed' }` (`:253`)                                                                      | Forceable by mocking a 4xx/5xx; also the real offline case.                                                                                                                                                                                                                                               | ✅               |
| 5   | Panel · backfill + "Older notifications"        | `hasMore === true`                                    | `hasMore`, `nextCursor`                      | `:194–:201`, via the `limit + 1` probe                                                                                                 | Needs >20 rows in 30 days. Realistic for a heavy watcher; seedable locally.                                                                                                                                                                                                                               | ✅               |
| 6   | Panel · all read (header flips, rails drop)     | `unreadCount === 0`                                   | `unreadCount`                                | `:230` — a real `count()`, not a stub                                                                                                  | After `read-all`, or for a user who has opened every row.                                                                                                                                                                                                                                                 | ✅               |
| 7   | Item · unread                                   | `readAt === null`                                     | `readAt`                                     | `:216`                                                                                                                                 | `read_at` was written by nothing before PR-A, so at launch **every** backfilled row is unread. This is the default state, not the edge.                                                                                                                                                                   | ✅               |
| 8   | Item · read                                     | `readAt !== null`                                     | same                                         | `POST /:id/read` sets it via `coalesce(read_at, now())`                                                                                | Only reachable _after_ PR-B ships the row activation that writes it. Within PR-B by construction.                                                                                                                                                                                                         | ✅               |
| 9   | Item · 8 categories + fallback                  | `category`                                            | `category`                                   | `:207` — validated against `UserNotificationCategorySchema`, and an unknown value is **passed through raw with a warn**, never dropped | All eight are live in production data. The fallback branch is reachable by any future writer adding a ninth key before the panel learns it.                                                                                                                                                               | ✅               |
| 10  | Item · whole-row action                         | `actionUrl`                                           | `actionUrl`                                  | `:215`                                                                                                                                 | `/events/<id>` in all three writers, never null in practice (Gate 6) — but it is **nullable in the type**, so PR-B renders a non-navigating row rather than an `href="null"`.                                                                                                                             | ✅               |
| 11  | Day dividers (Today · Yesterday · `Sat Jul 19`) | `createdAt`                                           | `createdAt`                                  | `:217`                                                                                                                                 | Needs rows spanning >1 day; trivially seedable. Note the handoff's own point: grouping starts at "Today" only when a today row exists.                                                                                                                                                                    | ✅               |
| 12  | Pip (unread signal on the profile affordance)   | `unreadCount > 0` **and** newest `createdAt > seenAt` | `unreadCount`, `seenAt`, `items[].createdAt` | `unreadCount` `:230`, `seenAt` `:249`                                                                                                  | `seenAt` is `null` for every existing user (the column shipped in PR-A and nothing has written it yet), so the null branch is the **first** thing everyone hits. It must read as "nothing seen yet," not as "everything is backfill."                                                                     | ✅               |
| 13  | Panel-open clears the pip                       | `POST /mark-panel-seen`                               | —                                            | `greatest(notifications_seen_at, now())`, upserted                                                                                     | Fires on open in PR-B/PR-C. Monotonic by construction.                                                                                                                                                                                                                                                    | ✅               |

No ⚠️, ❌ or 🚫. Nothing in the handoff's state table is a stub or unreachable,
so the UI build is unblocked.

## Two things this gate changes about PR-B

1. **Row 3 is a constraint the API cannot enforce.** The loading state exists
   only for as long as nobody seeds the query on the server. It is written down
   here so that a later "just prefetch it in the layout" optimization is
   recognized as deleting a designed state rather than as a free win.
2. **Row 12's null is the majority case at launch, not an edge.** Every user
   has `seenAt === null` on the day this ships. The empty-divider branch gets a
   test, not a hope.

## Not verified here

- Nothing was driven in a browser — that is Gate 2's job, and it runs inside
  PR-B before `gh pr create`. This gate read the route and the response type.
- `unreadCount` is uncapped by deliberate choice (see the comment at `:227`);
  whether a render layer caps it at "9+" is a PR-B decision and is not a
  contract question.

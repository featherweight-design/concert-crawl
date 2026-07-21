# #737 — In-app notification surface (design brief)

**Ticket:** [#737](https://github.com/HartiganHM/concert-crawl/issues/737) — Build the in-app notification surface (bell + panel + endpoints)
**Phase / Priority:** Beta · Normal
**Track:** 2 (needs design)
**Status:** Brainstorm complete; brief locked; awaiting Claude Design handoff production
**Follow-up filed:** [#1150](https://github.com/HartiganHM/concert-crawl/issues/1150) — Notification preferences UI (v2 of #737)

---

## 1. Purpose

Ship the consumer-side notification surface (bell + panel + endpoints) that reads `user_notification` rows already being written by push infra, admin contest-review, and Spotify sync. Users who miss OS pushes — device off, permission revoked, network flake — need somewhere in-app to catch up on what they missed.

## 2. App context

- **`user_notification` rows write today via:** PWA push infra (PR #1060) for `watch_update` + `price_drop`; admin contest-review (#697) for `contest_resolved`; Spotify sync (#763) for `spotify_new_show`.
- **Admin bell precedent exists** at `apps/web/src/components/admin/notification-bell/NotificationBell.tsx`, backed by `apps/api/src/routes/admin/notifications.ts`. Design should look at it for mirror-vs-diverge decisions on the consumer bell.
- **PWA cluster settings** (from PR #1044) already ships `NotificationsSection` in Settings → Notifications with master + per-category sub-toggles for push preferences. The v2 in-app preferences (#1150) will likely extend that same section.
- **Existing passive-surfacing pill:** event detail's `lastAdminActionAt` pill (from #697) is separate — see Q4 lock (coexists as a different job).
- **Header + bottom-nav are already crowded** — PWA install slot, offline pill, existing tabs. Placement constraint honors that (Q1 lock).
- **Voice:** Sour Patch — cheek + honesty rail + warmth. No brochure copy.

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| Q1 | **Placement is Design's call, constrained by "no new persistent nav slots."** Header and bottom-nav are already crowded (PWA install slot + offline pill + existing tabs). Design proposes a nesting/pulse pattern (e.g. profile-icon pulse + panel nested under profile) within that fence. | Respect existing crowding; let Design pick the least-invasive discoverable pattern. |
| Q2 | **4 categories at v1:** `watch_update`, `price_drop`, `contest_resolved`, `spotify_new_show`. Panel is extensible via a category-map convention. | Ships every category that writes rows today OR imminently lands. Future categories add via just a category-string + label + icon addition, no re-mock. |
| Q3 | **Mark-read: panel-open clears the pip via `last_seen_at`; per-item read state on click.** | Standard SaaS convention (Gmail, Slack, Linear). Doesn't over-eagerly clear per-item state; preserves "what did I miss" signal even after opening the panel. |
| Q4 | **Existing `lastAdminActionAt` pill on event detail coexists** with the bell — different jobs (passive engagement history vs active new-alert). | Two signals doing different jobs; redundancy = discoverability for engaged users; no code churn on the pill. |

## 4. What Design will produce

- **Bell placement + unread-signal design** within the no-new-nav-slots constraint (Design's proposal for how the bell surfaces without a dedicated nav slot).
- **Panel anatomy** — dropdown vs sheet vs full page; mobile can differ from desktop.
- **Per-item layout + info hierarchy** — timestamp, category, action affordance, body.
- **Per-category visual differentiation** for the 4 v1 categories (icons + color cues, or intentionally uniform — Design's call).
- **Unread-vs-read visual differentiation** within the panel (weight, background, dot marker, etc.).
- **Empty state** — Sour Patch voice, no notifications yet.
- **Loading state** for the poll-on-mount fetch.
- **Backfill panel visual** — how a full panel of historical notifications reads (grouping? day dividers? paginated?).
- **Action affordance visual** — whole row clickable, inline link, both.
- **Mobile + desktop parity** in the same handoff, 320px baseline.
- **Themes:** Electric / Jade / Light — panel + bell + pip render theme-consistent.
- `README.md` (decisions + gap report) + `design-canvas.jsx` following the project's canvas convention.

## 5. Technical requirements

- **Poll-on-mount** (ticket-locked) — no real-time push, SSE, or WebSockets in v1.
- **Backend endpoints already scoped in ticket:** `GET /v1/notifications/me` (paginated), `POST /v1/notifications/:id/read`, `POST /v1/notifications/read-all`. **Plus one new state atom for panel-open pip clearing (Q3):** either `user.last_seen_notifications_at` (recommended — simplest, single field update) or a `POST /v1/notifications/mark-panel-seen` endpoint. Eng-plan locks the choice.
- All colors via `var(--*)` tokens; no hardcoded hex.
- All customer-facing strings in `apps/web/src/components/consumer/definitions/copy.ts`.
- Mobile-first 320px baseline; mobile + desktop parity in the same handoff.
- **WCAG-compliant:**
  - Level A: text alternative on the bell button; semantic markup on panel and items
  - Level AA: contrast for the pip/unread signal against theme backgrounds; contrast for any text on colored category cues
  - Keyboard: panel must open/close via keyboard; items focusable and activatable via Enter/Space
- Themes: Electric / Jade / Light.
- Free tier / signed-in only. Signed-out users see no bell (aligns with #794 handling logged-out event-detail state comprehensively).

## 6. What's NOT in this brief (out of scope)

| Excluded | Handled where |
|---|---|
| Preferences UI (per-category opt-out) | [#1150](https://github.com/HartiganHM/concert-crawl/issues/1150) — v2 of this ticket. Blocked on v1 shipping. |
| Real-time push (SSE / WebSockets) | Ticket-locked poll-on-mount for v1. Possible future ticket if polling proves insufficient. |
| Email / push notification dispatch | Separate worker concern; PWA cluster (#971) already covers push. |
| Retention policy (auto-prune old notifications) | Eng-plan lock, not brief-lock. Design doesn't need this to mock. |
| Backfill window size (last N days, or all rows) | Eng-plan lock. |
| Grouping semantics beyond chronological ordering | Design's call within the panel anatomy. |
| Notification-count-in-browser-tab-badge | Follow-up; v1 is in-app pip only. |
| Retiring the `lastAdminActionAt` pill on event detail | Q4 lock: pill coexists, doesn't retire. |
| Signed-out treatment | Deferred to #794 Logged-out UX. |

## 7. Decisions inherited

- **3 themes** — Electric / Jade / Light
- **Sour Patch voice** — cheek + honesty rail + warmth; grep-clean of "last chance", "we miss you", "fraud"
- **Mobile-first 320px baseline**
- **All customer-facing strings in `definitions/copy.ts`**
- **Free tier / signed-in only** for consumer bell surface
- **`user_notification` schema** at `packages/db/src/schema/notifications.ts` — already exists, no schema changes needed for v1

## 8. Open for Design to call

- Bell + panel + pip visual placement within the no-new-nav-slots constraint
- Panel anatomy — dropdown vs sheet vs full page (mobile can differ from desktop)
- Per-item layout and info hierarchy
- Category visual differentiation strategy (per-category icon + color vs intentionally uniform)
- Empty state voice + shape
- Action affordance visual (whole row vs inline link vs both)
- Unread visual style (bold, dot, background, weight)
- Loading skeleton shape
- Backfill panel visual (grouping, day dividers, pagination, virtualization)
- Whether the unread pip shows a count number or just a dot
- Whether the bell/panel style mirrors or diverges from the admin bell precedent

## 9. Open for eng-plan to lock (not blocking Design)

- Retention policy (30 / 60 / 90 days / forever)
- Backfill window cutoff (last N days vs all rows)
- `last_seen_at` implementation choice (user-table field vs dedicated endpoint)

## 10. Cross-references

- **Source ticket:** [#737](https://github.com/HartiganHM/concert-crawl/issues/737)
- **Follow-up ticket (v2):** [#1150](https://github.com/HartiganHM/concert-crawl/issues/1150) — Notification preferences UI
- **Push infra that writes rows:** PR #1060 (watch_update, price_drop)
- **Admin bell precedent:** `apps/web/src/components/admin/notification-bell/NotificationBell.tsx`
- **PWA cluster prefs section this may extend later:** `NotificationsSection` from PR #1044 (Settings → Notifications)
- **Notification schema:** `packages/db/src/schema/notifications.ts`
- **Adjacent shipped design:** `design/design_handoff_pwa_cluster/` (push permission + prefs pattern)
- **Pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Persona + locked decisions:** `memory:feedback_design_track_persona` — lives outside the repo in Claude's per-project memory store (not repo-browsable); referenced here by filename convention used across other docs (matches `design-pipeline-status.md`).

---

## Process

Track 2 design ticket per [design-pipeline.md](../design-pipeline.md). After Claude Design produces the R1 handoff to `design/design_handoff_in_app_notifications/`, runs Readiness Review before opening the plan PR. Handoff prompt to Claude Design is delivered separately (chat, not committed).

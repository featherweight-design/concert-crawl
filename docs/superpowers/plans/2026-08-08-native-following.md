# Native Artist Following — Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a user who has never touched Spotify a way to find artists, follow them, see who they follow, and control what a follow sends them. PR #1515 already made the crawl-discovery fan-out reach a follow from any source; this plan builds the front half that produces those follows.

**Architecture:** Every surface is a shipped component with a follow layer added. No screen is rebuilt. Artist alert preferences relocate from `user_spotify_connections` (which native users do not have) onto `user_notification_preferences` (which every user can have), and the weekly digest and push fan-out are generalized to read from there. One migration, no new tables.

**Tech Stack:** TypeScript (strict), Hono, Drizzle ORM, Postgres, Vitest, Next.js App Router, Playwright, pnpm + Turborepo.

**Source spec:** `docs/superpowers/specs/2026-08-08-native-following-eng-spec.md` (PR https://github.com/HartiganHM/concert-crawl/pull/1518).
**Design handoff:** `design/design_handoff_native_following/` (merged, PR #1504).

---

## Read this before Task 1

The spec's §1.2 lists **five** things the design handoff asserts that are false about shipped code. Two of them describe work that is already done:

- **There is no hardcoded Spotify logo on the Following chip.** The handoff calls fixing it the epic's highest-value item. `row-chips.ts:58` renders a text-only chip gated on `show.isFollowed`, and there is no `SpotifyLogo` import anywhere under `event-row/`. Do not go looking for it.
- **The bottom-nav tab-3 label already reads "my shows".** #70 renamed it. `BottomNav.test.tsx` asserts it in several places. **No task in this plan touches the nav.**

The other three: `MiniPaywall` does not exist (the paywall is `TierPickerSheet`), the entitlement code is `'entitlement_required'`, and artists carry no genre (only `events.genre` does).

**The prototypes in `design/design_handoff_native_following/*.jsx` are a design artifact, not a source of truth about this codebase.** Where a prototype and the spec's §1.1 inventory disagree, §1.1 wins — it was verified against `origin/main`. Where the spec and shipped code disagree, stop and amend the spec in the same PR that finds it.

**All copy in the handoff and the prototypes is placeholder.** Nothing in `nf-*.jsx` ships verbatim.

### There is no artist index route, and this epic does not add one

The handoff's follow shelf and its My shows ▸ Artists empty state both offer a "browse all artists" affordance. It has no destination: `apps/web/src/app/(protected)/(main)/artists/` contains only `[slug]`, and artists are a projection off event billing rather than a browsable catalogue, so an index would be a new surface with its own ranking, pagination and empty-state design that no handoff covers.

**Every such affordance points at `/search` instead.** PR 5 puts an Artists section at the top of search results, which makes search the artist-discovery surface the link wants. Do not add an `/artists` index, and do not quietly drop the affordance either — a shelf that recruits follows with no way to see more is the recruiting problem this epic exists to fix.

---

## Global Constraints

- **Worktree only.** All file changes happen in a `.worktrees/<branch>` directory. `/Users/huey/Projects/concert-crawl` must stay clean. Copy `apps/{web,api,crawler}/.env.local` into each new worktree immediately after `git worktree add`.
- **No unsafe `as` casts.** Zod `safeParse`, type guards, or declaration merging. `as const` is not a cast in this sense.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- **Every `catch` logs.** Fire-and-forget is a `void` async IIFE.
- **Customer-facing strings live in a `definitions/copy.ts`**, never inline in a `.tsx` — ESLint `react/jsx-no-literals` blocks the build otherwise. No em-dashes in copy files.
- **Locked vocabulary:** **Watching** is the show-tracking concept and its icon is an **eye**, never a heart. **Following** is a separate concept for artists and is never a synonym for Watching. "Price check", never dispute or contest. There is no "Saved".
- **Token-only colour** — `var(--*)`, verified in Electric, Jade and Light. `--accent` is Watching; `--signal` is CTA and status. Never swapped. Email is the sole exception and uses inline hex.
- **Mobile (390 and 320) and desktop ship in the same PR.** 320 is the baseline.
- **Migration timestamps:** `when` in `packages/db/migrations/meta/_journal.json` must exceed every prior entry. The last shipped migration is `0077_artist_new_show_category` at `when: 1786838400000`.
- **Expand/contract migrations only.**
- **Test commands:** `pnpm typecheck`, `pnpm lint`, `pnpm test`. Integration tests need `docker compose up -d` and run against a per-worktree DB created automatically on first run.

---

## PR sequence

Order is load-bearing. API lands before the UI that consumes it, so Gate 1 (state reachability) has something real to check.

| #   | Branch                           | Delivers                                                                        | Depends on |
| --- | -------------------------------- | ------------------------------------------------------------------------------- | ---------- |
| 1   | `feat/nf-preferences-foundation` | Migration 0078, preferences API, `nfLocked`, `FollowButton` locked + optimistic | —          |
| 2   | `feat/nf-settings-artist-group`  | Settings ▸ Notifications "Artists you follow" group                             | 1          |
| 3   | `feat/nf-follow-api`             | `following=1`, `GET`/`POST bulk /v1/me/artist-follows`, search `following`      | 1          |
| 4   | `feat/nf-browse-scope-shelf`     | "My artists" scope chip + three-mode shelf                                      | 3          |
| 5   | `feat/nf-search-artists`         | Search results Artists section                                                  | 3          |
| 6   | `feat/nf-my-shows-artists`       | My shows ▸ Artists tab + the shared artist picker                               | 3          |
| —   | —                                | **Mid-run cold-eyes review** (§ below)                                          | 6          |
| 7   | `feat/nf-bill-block`             | Event detail `billBlock` + "Follow all N"                                       | 3, 6       |
| 8   | `feat/nf-onboarding-steps`       | Onboarding genres + artists steps                                               | 6          |
| 9   | `feat/nf-alerts-digest`          | Push batching + generalized digest                                              | 1, 2       |
| 10  | `feat/nf-nudge-tier-copy`        | First-watch nudge + Premium tier copy                                           | 3          |
| 11  | `feat/nf-polish`                 | **Reserved, unscoped.** Do not pre-fill                                         | all        |

PR 11 is reserved on purpose. Cold-eyes triage and Hugh's own walk produce subjective calls, and a reserved slot means they land in one branch instead of spawning four cleanup PRs after the run closes.

---

## File Structure

Every path is an existing file to modify unless marked **(new)**.

| File                                                                                     | Responsibility                                                    | PR      |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| `packages/db/migrations/0078_artist_follow_preferences.sql` **(new)**                    | Three columns + upsert backfill                                   | 1       |
| `packages/db/src/schema/user-notification-preferences.ts`                                | Schema for the three columns                                      | 1       |
| `apps/api/src/routes/me-push.ts`                                                         | `preferencesSchema` + GET/PATCH `/v1/me/notification-preferences` | 1       |
| `packages/entitlements/src/index.ts`                                                     | `nfLocked` helper                                                 | 1       |
| `apps/web/src/components/consumer/artist-page/FollowButton.tsx`                          | `locked` state, optimistic follow                                 | 1       |
| `apps/web/src/components/consumer/artist-page/definitions/`                              | `NF_FOLLOW_SIZES`                                                 | 1       |
| `apps/web/src/components/settings/notifications/NotificationsSection.tsx`                | Artist group + locked card                                        | 2       |
| `apps/web/src/components/settings/notifications/definitions/copy.ts`                     | `NOTIFICATIONS_COPY` additions                                    | 2       |
| `apps/api/src/routes/events.ts`                                                          | `following` query flag beside `taste`                             | 3       |
| `apps/api/src/routes/artist-follows.ts`                                                  | `GET /v1/me/artist-follows`, `POST .../bulk`                      | 3       |
| `apps/api/src/routes/search.ts`                                                          | `following` on the artist result shape                            | 3       |
| `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`                              | "My artists" scope chip                                           | 4       |
| `apps/web/src/components/consumer/spotify/DiscoveryShelf.tsx`                            | Three-mode follow shelf in the same slot                          | 4       |
| `apps/web/src/components/consumer/search/SearchResultsState.tsx`                         | Artists section above shows                                       | 5       |
| `apps/web/src/components/consumer/history/MyShowsTabs.tsx`                               | Third tab                                                         | 6       |
| `apps/web/src/components/consumer/artist-picker/**` **(new)**                            | Shared picker                                                     | 6       |
| `apps/web/src/components/consumer/event-detail/PublicEventDetail.tsx`                    | Optional `billBlock` prop                                         | 7       |
| `apps/web/src/components/onboarding/OnboardingShell.tsx`                                 | `FLOW` + `StepContent`                                            | 8       |
| `packages/crawler-core/src/lib/artist-fanout/index.ts`                                   | Per-run push batching                                             | 9       |
| `apps/api/src/jobs/spotify-weekly.ts`, `apps/api/src/emails/templates/spotify-digest.ts` | Digest generalization                                             | 9       |
| `apps/web/src/components/consumer/spotify/FirstWatchNudge.tsx`                           | Artist-anchored variant                                           | 10      |
| `apps/web/src/lib/definitions/releases.ts`                                               | Release note (user-facing PRs only)                               | 4, 6, 8 |

---

### PR 1: Preference foundation and the `locked` follow state

Relocates artist alert preferences onto a table every user can have, and gives `FollowButton` the state it needs to be shown to a free user without lying to them.

**No new surface ships here.** The artist page's existing follow button gains `locked`; nothing else changes visually for a premium user.

**Files:**

- Add: `packages/db/migrations/0078_artist_follow_preferences.sql`
- Modify: `packages/db/migrations/meta/_journal.json` (idx 78, `when: 1786924800000`)
- Modify: `packages/db/src/schema/user-notification-preferences.ts`
- Modify: `apps/api/src/routes/me-push.ts`
- Modify: `packages/entitlements/src/index.ts`
- Modify: `apps/web/src/components/consumer/artist-page/FollowButton.tsx`

- [ ] **Step 1: Migration 0078**

Three columns on `user_notification_preferences`:

```sql
ALTER TABLE user_notification_preferences
  ADD COLUMN artist_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN artist_auto_watch     boolean NOT NULL DEFAULT false,
  ADD COLUMN weekly_digest_enabled boolean NOT NULL DEFAULT true;
```

The defaults are deliberately asymmetric and mirror the SQL `COALESCE` #1515 already encodes: **following is the opt-in, so alerts default on; following must never silently mutate Watching, so auto-watch defaults off.** Do not tidy them into a matching pair.

- [ ] **Step 2: Backfill by INSERT, not UPDATE**

This is the step that is easy to get wrong and impossible to notice.

`user_notification_preferences` rows are **created lazily on first PATCH** — the schema file says so in its header comment. A Spotify-connected user who has never opened the notifications screen has settings on their connection row and **no preferences row at all**. An `UPDATE ... FROM` backfill matches nothing for that user and silently discards their settings.

```sql
INSERT INTO user_notification_preferences
  (user_id, artist_alerts_enabled, artist_auto_watch, weekly_digest_enabled)
SELECT user_id, push_enabled, auto_watch, digest_enabled
FROM user_spotify_connections
WHERE status <> 'revoked'
ON CONFLICT (user_id) DO UPDATE SET
  artist_alerts_enabled = EXCLUDED.artist_alerts_enabled,
  artist_auto_watch     = EXCLUDED.artist_auto_watch,
  weekly_digest_enabled = EXCLUDED.weekly_digest_enabled;
```

`master_enabled` is **not** in the column list. Newly inserted rows take the table default (`false`), which preserves today's behaviour exactly — `sendPushForNotification` already gates on it, and inventing `true` here would start pushing to users who never enabled a device.

`user_spotify_connections.{auto_watch, push_enabled, digest_enabled}` are **not dropped**. Expand only. The Connections panel stops writing them in PR 9; a later contract PR removes them after one clean weekly digest cycle.

- [ ] **Step 3: Extend `preferencesSchema`**

`apps/api/src/routes/me-push.ts` carries `preferencesSchema` with `masterEnabled`, `watchUpdatesEnabled`, `priceDropsEnabled`. Add the three new keys, all `z.boolean().optional()`, matching the existing partial-PATCH shape. GET returns them with the same lazy-create-on-read-default semantics the route already uses.

Integration test: a PATCH of only `artistAutoWatch` must not reset the other five fields.

- [ ] **Step 4: `nfLocked`**

```ts
export const nfLocked = (state: PlanStateLike): boolean =>
  !canUseFeature(state, 'following')
```

Beside the existing entitlement helpers in `packages/entitlements/src/index.ts`. It negates `canUseFeature`; do not reimplement the lookup. Two things it must not do, both of which were wrong in earlier drafts of the spec:

- **Do not take a bare `UserPlan`.** `roleComped` is an override the matrix does not encode, so a comped user on `plan: 'free'` would render locked. `PlanStateLike` is `Pick<PlanState, 'plan' | 'roleComped'>` and already exported.
- **Do not enumerate tiers.** `tier === 'free' || tier === 'supporter'` returns `false` for `'logged-out'`.

Route the locked tap with `lockedSurface(state, 'following')`. Tests: assert locked for `'logged-out'` and `'supporter'`, unlocked for `'premium'`, and unlocked for `{ plan: 'free', roleComped: true }`.

**Never test `tier === 'free'` inline.** Design R2 leaked a live Follow button to Supporter on six surfaces doing exactly that. Most call sites should still prefer `useEntitlement('following')` and read `surface`; `nfLocked` exists for render paths that already hold a tier and would otherwise re-query.

- [ ] **Step 5: `FollowButton` gains `locked`, and follows optimistically**

Three states, not four. The spec's §5.1 drops `pending` from the single-artist button: its entire visual difference is `opacity: 0.72` and a label swap, visible for roughly 120ms, which is a flash rather than feedback. The Event Detail CTA work removed its own `pending` on 2026-08-04 for the same reason, and #1467 was a bug caused by a loading state that flashed.

| state       | look                                                                                                                  | behaviour            |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `idle`      | `--signal` fill                                                                                                       | follow               |
| `following` | `--signal` @14% fill, `--signal` border and text, check glyph                                                         | unfollow, no confirm |
| `locked`    | a new signed-in-only skin: transparent, `--border-strong`, `--fg`, plus a lock glyph, **same size and label as idle** | opens the paywall    |

`locked` is **never `disabled`**. It opens `TierPickerSheet`, so it stays in the tab order and stays activatable. `locked` is signed-in-only — `ArtistPageContent` computes it as `!signedOut && nfLocked(planState)`. A logged-out visitor draws the **idle** skin (#794 §3.10: the signed-out control is pixel-identical to signed-in-and-not-following) and its tap opens the tier picker rather than the paywall.

Optimistic update: flip to `following` on click, roll back on error, and **clear the override when the server value changes, never on mutation success**. Clearing on success drops the override before the new data lands and flashes the old state.

`pending` survives only on **bulk** commits (PR 7's "Follow all N", PR 8's onboarding commit) — those are genuinely multi-second and an unacknowledged bulk tap gets tapped again.

Add `NF_FOLLOW_SIZES` verbatim to a definitions file: `sm` 36 (only where the row is itself a target) · `md` 44 · `full` 48.

- [ ] **Step 6: A11y**

- `aria-pressed` on the button, **dropped only for `locked` and signed-out** — a pressed state on a control that opens a paywall is a lie.
- `locked` carries `aria-describedby` pointing at a gate sentence. The sentence node is visually hidden **via clip**, never the `hidden` attribute: `hidden` drops a node from the accessibility tree, so a `describedby` aimed at it announces nothing.
- The gate-sentence id must come from `useId()`, not a module counter. A bill puts four follow buttons on one screen and a colliding id aims every gate sentence at one node.

---

### PR 2: Settings ▸ Notifications — "Artists you follow"

**Files:** `apps/web/src/components/settings/notifications/NotificationsSection.tsx` and its `definitions/copy.ts`.

Add to the shipped screen. No new section, no new page.

- [ ] **Step 1: The rows**

**Artists you follow**

- `New show alerts` — placed **above** Watch updates. An artist announcement is the earliest signal in the chain, and reading top-down should feel like the funnel does: artist announces → you watch it → the price moves.
- `Add them to Watching for me` — an indented **sub-row of the above**, default off.
- `Weekly digest` — Monday, one email, matching the shipped `concert-crawl-spotify-weekly` cron (`30 15 * * 1`). This plan does not change the cadence.

**Shows you're watching** — the existing Watch updates and Price drops rows, unmoved.

- [ ] **Step 2: The locked card**

Free and supporter get the whole artist group as **one locked card with an upgrade route**. Not three disabled toggles. A switch that does nothing is the worst version of this screen.

- [ ] **Step 3: A11y and copy**

Toggles are `role="switch"`, labelled by the row title, described by the body line, rows ≥44px. Group headings are `h2`.

Run the `copy-review` skill over the new strings before `gh pr create` (Gate 7). The handoff's strings are placeholders; the one sentence worth preserving in substance is that new-show alerts are "sent when we find it, not on a schedule", because it manages an expectation the interface cannot.

---

### PR 3: The follow API

Pure API. No UI. **Gate 1 (state reachability) runs against this PR's output before PR 4 begins** — for every state the handoff names, answer whether the field is in the response type, whether the route actually computes it, and whether the triggering condition can be true at runtime given how the consumer is mounted and seeded.

**Files:** `apps/api/src/routes/events.ts`, `apps/api/src/routes/artist-follows.ts`, `apps/api/src/routes/search.ts`.

- [ ] **Step 1: `GET /v1/events?following=1`**

Model it on the shipped `taste` flag in `events.ts`: `z.literal('1').optional()`, applied by pushing a condition into the same conditions array that `spotifyTasteCondition(userId)` uses. An `EXISTS` subquery over `user_artist_follows` matching **every row regardless of `source`** — a native follow and a Spotify follow filter identically.

Additive (AND) with date, venue, price and genre.

**`/v1/events` is a public route and stays one.** Gate `following` inline, exactly as `taste` does: 401 only when the flag is present and the caller is anonymous. Do not add `requireAuth` as route middleware, which would take signed-out browse offline.

**The response must carry `followingApplied`.** If the flag is rejected — unauthenticated, or the plan lacks `following` — the UI must not render a banner claiming a filter applied. The `taste` flag has no such field today and does not need one; this one does, because it drives a `role="status"` announcement.

- [ ] **Step 2: `GET /v1/me/artist-follows`**

The user's follows, each with the artist's next Denver date (nullable) and `source`.

**Deliberately not `requireFeature`-gated.** A user who downgrades must still be able to see and manage the list. This mirrors the existing DELETE, which is ungated for the same reason. Write the reason into a comment; it will otherwise look like an oversight and get "fixed".

- [ ] **Step 3: `POST /v1/me/artist-follows/bulk`**

Body `{ slugs: string[] }`, Zod-bounded on array length, `requireFeature('following')`. Returns a **per-slug result** so a partial failure is visible rather than swallowed. Idempotent: re-following an already-followed artist succeeds.

- [ ] **Step 4: `following` on artist search results**

`GET /v1/search/artists` already returns the right shape and already filters to artists with a consumer-visible event. Add a `following` boolean per result.

- [ ] **Step 5: Tests**

Integration tests per endpoint, including: `following=1` returns nothing for a user with zero follows rather than erroring; the bulk endpoint returns 403 with `code: 'entitlement_required'` for a free plan; `GET /v1/me/artist-follows` succeeds for a free plan.

---

### PR 4: Browse — scope chip and shelf

**Files:** `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`, `apps/web/src/components/consumer/spotify/DiscoveryShelf.tsx`.

- [ ] **Step 1: "My artists" scope chip**

Four states: `off | on | locked | absent`.

- `locked` sets **no `aria-disabled`**. It opens the paywall, so it stays in the tab order and stays activatable. There is no disabled access state anywhere in this product's entitlements model.
- `absent` at zero follows. **Decided server-side and rendered absent from first paint.** A component that computes this from a client query renders `off` for a frame first, and that frame is the bug Gate 1 exists to catch. Never remove the chip mid-session: one that vanishes while you look at it is worse than one that was never there.
- Active state uses `--signal`. The scope banner is `role="status"`.

The shipped `TasteFilterChip` in the same file is the pattern to follow, not to fork.

- [ ] **Step 2: The shelf slot**

One component, three modes, in the slot `DiscoveryShelf` occupies:

- `zero` — a **starter shelf**: followable artists with upcoming dates, shuffled per session. The slot recruits; it does not render an apology. No dismiss affordance — this is the slot's zero mode, not a promo.
- `some` — your followed artists with upcoming dates.
- `spotify` — identical to `some`. Never `zero`.

**Spotify is a `source` prop on these components, not a second information architecture.** The only genuine divergence is the zero state. Where a Spotify logo appears it is the official asset dropped into a slot, never a redrawn mark, and Spotify green is not an app colour.

- [ ] **Step 3: Release note + progress row**

User-facing: add a `releases.ts` entry and a `progress.md` row on this branch.

---

### PR 5: Search results — Artists section

**File:** `apps/web/src/components/consumer/search/SearchResultsState.tsx`, which already has an `ArtistPageSection` rendering above event-derived rows.

- [ ] **Step 1: The section**

Artists above Shows when the query matches an artist name. `FollowButton size="sm"` (36 — permitted here because the row is itself a target), icon-only under 360px.

An artist who has played Denver before but has nothing upcoming gets a **normal live Follow button** plus a muted `NoDatesLine`. **Never inert.** There is no `unavailable` state: an artist with zero Denver shows cannot exist, since artists are a projection off event billing and search already filters to artists with a visible event.

- [ ] **Step 2: Desktop**

Two-column: results list plus an explainer rail. Desktop is required in this PR, not a follow-up.

---

### PR 6: My shows ▸ Artists, and the shared picker

**Files:** `apps/web/src/components/consumer/history/MyShowsTabs.tsx`, new `apps/web/src/components/consumer/artist-picker/`.

- [ ] **Step 1: The third tab**

Beside Watching / History. The `TABS` const already carries `'watching'` and `'history'` with labels from `HISTORY_COPY.tabs`; add `'artists'`.

A real tablist with arrow-key navigation and the **count inside the accessible name** ("Artists, 7").

**The nav is not touched.** Tab-3's bottom-nav label already reads "my shows".

- [ ] **Step 2: The two groups**

Upcoming Denver dates first (date in `--signal`, soonest first), then no dates (muted, alphabetical). Group headings are `h2`.

- [ ] **Step 3: The find-more row**

A **labelled row**, not a button: "Find artists to follow" with a supporting line about searching by name or browsing who is playing Denver soon. Beside a column of Following buttons, a "+ Follow more" button reads like it might follow everything at once. Copy is placeholder; run `copy-review`.

- [ ] **Step 4: The alerts row**

Deep-links to Settings ▸ Notifications, carrying the current state as its meta line.

- [ ] **Step 5: The shared picker**

Build the artist picker as a standalone component here. **PR 8 reuses it for onboarding step 7 — build it once.** In the picker the affordance is a **badge on the art**, not a full button: same states, same gesture, less shouting.

Artist tiles are `role="checkbox"` in a labelled group. **The tile itself is the checkbox**, so a 12-artist grid is 12 targets, not 24. Selection is check glyph **+** border **+** fill — never colour alone; the Light theme needs all three for AA.

- [ ] **Step 6: Empty state**

Per the handoff's `MyShowsArtistsEmpty`. Structure only; the words go through `copy-review`.

---

## Mid-run cold-eyes review — runs after PR 6, blocks nothing

The first complete user journey is reachable end-to-end once PR 6 merges: follow from search → see the scope chip → manage the list. **Do not defer this to the end of the run.** #794 shipped all 8 PRs before anyone looked at the vertical whole, and the walk then produced 15 bugs across 4 cleanup PRs, several of which were early-PR mistakes copied forward into every sibling.

1. **Capture.** Add the epic's new routes to `apps/e2e/src/audit/manifest.ts`, then run `pnpm --filter @concert-crawl/e2e audit:sweep`. It needs `E2E_AUDIT_USER_*` / `E2E_AUDIT_ADMIN_*` and runs against staging. If the credentials are not placed, say so in the run report and fall back to driving local dev with Playwright screenshots — do not silently skip.
2. **Critic subagent, context deliberately starved.** Give it the screenshot reel, the design handoff, the locked vocabulary, Hugh's voice rules and the recurring-defect list. **Do not give it this plan, the diffs, or any rationale** — that context is exactly what blinds the builder. Ask which strings say something the surrounding UI already says, which control's purpose is not obvious, where a surface offers no way back, and what a first-time user would misread. Ranked, with severity, and it must be able to say it found nothing.
3. **Triage and continue.** Fix everything valid in this run, not as follow-ups. Then re-read PRs 7–11 against the triage list and amend their scope **before** building them. That re-read is the step that stops a PR-3 mistake reaching PR-10.
4. **Notify, do not block.** Push the summary and the screenshot path to Hugh, then keep building. Never schedule a wakeup to wait for a reply.

---

### PR 7: Event detail — the bill block

**File:** `apps/web/src/components/consumer/event-detail/PublicEventDetail.tsx`.

- [ ] **Step 1: One new optional prop**

`billBlock`, on the shipped `PublicEventDetailProps`, rendered under the Watch CTA. Mobile: a card in the main column. Desktop: in the right rail, under Watch. **One prop. Do not restructure the component.**

- [ ] **Step 2: Gate the block as ONE unit**

"Follow all N" and the per-row buttons **lock together** below Premium. A 4-act bill is one paywall and one tap, not four. Above Premium the rows are independent.

- [ ] **Step 3: "Follow all N"**

Calls the bulk endpoint from PR 3. This button **keeps `pending`** — it is a genuinely multi-second write and the count belongs in the button's text.

---

### PR 8: Onboarding — genres, then artists

**File:** `apps/web/src/components/onboarding/OnboardingShell.tsx` (`FLOW` at line 27, `StepContent` at 32–40) and `definitions/copy.ts`.

- [ ] **Step 1: Eight steps**

`welcome · how · today · theme · notyet · genres · artists · done`

Both new steps slot in **before `done`**, are skippable, and neither blocks sign-in. The step counter and dot indicator read from `FLOW.length` and update for free.

- [ ] **Step 2: The suggestion query**

Artists with an upcoming Denver date, filtered by the picked genres, ordered by follower count — so **every suggestion is followable by construction**.

Genre comes from `events.genre` (`text[]`), matched by array overlap against the artist's billed events. **Artists carry no genre of their own; do not add an `artist_genres` table.**

**Genres are not persisted as preferences.** They filter this one screen. Do not add a column.

- [ ] **Step 3: One write at commit**

Selection is held client-side and committed as a single `POST /v1/me/artist-follows/bulk`. Not N requests.

- [ ] **Step 4: The upgrade round-trip**

Free and supporter may **select freely**; only the commit is paywalled. Picks must survive the round-trip:

- Selection lives in component state **and** mirrors to `sessionStorage` under a namespaced key. Checkout is embedded (`CheckoutPanel`) and SCA challenges mount in-page, so there is no navigation away and component state alone would usually suffice. "Usually" is why the mirror exists.
- On a `403` with `code === 'entitlement_required'`, open `TierPickerSheet` with `entry: 'follow'` and **keep the selection**.
- On picker close, re-read the entitlement and retry the commit if it is now active.
- Clear the mirror only on a successful commit or an explicit skip.

- [ ] **Step 5: `FOLLOW_ANCHOR` is not a new component**

The handoff names `MiniPaywall`; it does not exist in shipped code. `FOLLOW_ANCHOR` becomes two things:

- a new `PickerEntry` value `'follow'` in `packages/types/src/analytics-events.ts`. The union already carries `'logged-out-follow'` from #1115 — **these are different reaches and must not be merged**;
- a header-copy variant in `TIER_PICKER_COPY.header` (`apps/web/src/components/consumer/tier-picker/definitions/copy.ts`).

`scaRegion` is derived server-side from `x-vercel-ip-country` via `isScaRegion` and must be threaded to every component that can render `TierPickerSheet`. A missing `scaRegion` is invisible until a European card hits 3D Secure.

---

### PR 9: Alerts — push batching and the generalized digest

This PR creates records in response to events, so **Gate 6 (side-effect provenance) is mandatory** and its artifact is `docs/superpowers/side-effects-native-following.md`. Clicking through a rendered list finds none of these bugs; the characteristic failure is silence.

**Files:** `packages/crawler-core/src/lib/artist-fanout/index.ts`, `apps/api/src/jobs/spotify-weekly.ts`, `apps/api/src/emails/templates/spotify-digest.ts`.

- [ ] **Step 1: Batch delivery, not the claim**

`runArtistFanout()` currently sends a push inside its per-event loop. A large crawl run must not fire eight pushes in ninety seconds.

- **Exactly-once is unchanged.** The `spotify_alert_log` claim stays per `(user, event, 'push')` via `onConflictDoNothing().returning()`. Only _delivery_ is coalesced.
- Accumulate claimed pairs across the whole run, then flush per user at the end: one event uses the existing single-show copy keyed off `artistAutoWatch`; two or more collapse into one "N artists you follow just booked Denver" push.
- **Tray rows stay per event.** The tray is a list, and collapsing it would lose the individual deep links.
- **The flush must be awaited, not detached.** Both crawler entrypoints hard-exit via `process.exit(0)`, which severs a floating promise mid-flight. Same #649 lesson the fan-out module already documents in its header.

- [ ] **Step 2: Read preferences from the new home**

The fan-out's `COALESCE` over `user_spotify_connections` becomes a read of `user_notification_preferences.{artist_alerts_enabled, artist_auto_watch}`, which every user can have. The Connections panel stops writing the legacy columns.

- [ ] **Step 3: The digest — fix BOTH halves**

The existing job and template are Spotify-gated end to end, and generalizing them hits **the same two-part trap #1515 hit**. It will look fixed after fixing only half:

1. The **source filter** — select from `user_artist_follows` regardless of `source`.
2. The **join onto `user_spotify_connections`** — currently an inner join for `digestEnabled`. It becomes a read of `user_notification_preferences.weekly_digest_enabled`. **Fixing only (1) leaves the inner join silently dropping every native follower**, and the job will report success.

Required integration test: **a follower with no Spotify connection at all receives a digest.** That single test is what proves both halves landed.

- [ ] **Step 4: Content**

- A quiet week **still sends** — light, with two follow suggestions. Never a blank send.
- Inline hex, not CSS vars. Email clients cannot read them; this is the sole documented exception to token-only colour.
- **The zero variant must exist in the plain-text part as well as the HTML.** An HTML/plain-text disagreement is a defect, not a formatting detail. `templates.test.ts` uses targeted `toContain` assertions, so a divergence on a line nobody asserted passes silently: add an assertion for every new line against both `rendered.html` and `rendered.text`. Each part also carries lines the other does not, so read both.
- Unsubscribe: per-family first, global secondary, using the existing signed one-click URL machinery unchanged.

- [ ] **Step 5: Ship it off**

Behind `NATIVE_DIGEST_ENABLED`, **default off**. The generalized job must not send from the new query until PR 1's migration has been live in prod through one weekly cycle. Hugh flips the flag. List the variable in the PR body with its purpose and how to set it.

- [ ] **Step 6: Gate 6**

Prove by running, not by reading: it **fires** (perform the real upstream crawl), it **fires once** (run the crawl twice, and concurrently), and it **fires for exactly the right audience** (a second account confirms non-delivery). Then the lifecycle: what marks a tray row read, what a second device sees, and what a brand-new user sees before any trigger has ever fired.

---

### PR 10: First-watch nudge and Premium tier copy

**File:** `apps/web/src/components/consumer/spotify/FirstWatchNudge.tsx` and its gate.

- [ ] **Step 1: Artist-anchored variant**

Replace the Spotify pitch. Single-fire, dismissable, never returns. Free tier still sees it, with the lock on the CTA. Also add the inline follow row to the watch confirmation as the permanent path — the nudge is the introduction, the confirmation row is the habit.

- [ ] **Step 2: Desktop is not a port**

On mobile the nudge is a card in the browse feed, because the user lands back on browse after watching. **On desktop they never leave the detail page**, so a card injected into a feed they are not looking at fires the one-shot nudge at an empty room. On desktop the nudge **replaces the rail's watch card in place** — not a ported card, not a modal. Dismissing restores the watch card.

- [ ] **Step 3: The dismissal key**

Key the dismissal by **`userEventId`, not `eventId`**. This is the #70 bug restated and it must not recur: `eventId` is immortal, `userEventId` dies when the user unwatches. Keyed by `eventId`, one dismissal silences the nudge forever, including after unwatch → re-watch.

- [ ] **Step 4: Premium tier copy**

The headline benefit becomes artist following; Spotify sync drops to a fine-print line. The reversal is deliberate: Spotify is capped at 5 accounts, so nobody buying Premium today can actually have its current headline benefit. Run `copy-review`.

---

### PR 11: Polish — reserved

Unscoped by design. Fill from the cold-eyes triage's subjective residue and Hugh's own walk. Do not pre-fill it and do not skip it: the cold-eyes proxy shrinks Hugh's morning findings, it does not eliminate them.

---

## Gates

| Gate                         | When                                       | Artifact                                                       |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| 1 State reachability         | After PR 3, before PR 4 builds             | `docs/superpowers/state-coverage-native-following.md` (new)    |
| 2 Forced-state runtime       | Before each `gh pr create`                 | Recorded in the PR body                                        |
| 3 Sibling duplicate sweep    | Before each `gh pr create`                 | —                                                              |
| 4 design-review, both halves | Agent 1 before any code; Agents 2–3 pre-PR | `docs/superpowers/design-tables/native-following.md` (new)     |
| 5 Journey lifecycle          | Once each journey is reachable             | `docs/superpowers/journey-lifecycle-native-following.md` (new) |
| 6 Side-effect provenance     | PR 9                                       | `docs/superpowers/side-effects-native-following.md` (new)      |
| 7 Copy review                | Every PR adding a string                   | Applied in the diff                                            |

Every path marked `(new)` is an artifact this run produces. None exist yet; each is committed on the branch of the PR whose gate produced it.

**Gate 2 specifics.** Force the paywall, the 403 stale-entitlement race, every zero-follow state, and the digest zero variant. Throttle the network for every mutation: **a fast local machine hides the optimistic-update bug completely.** "Renders in the happy path" is not this gate.

**Gate 5 specifics.** The spec's §3.3 walk script, run four ways — forward, reverse, repeat, resume. The **repeat** pass is the one that matters here: unfollow → re-follow must leave genuinely clean state rather than hollow state, and watch → unwatch → re-watch must bring the nudge back. Ask of every dismissal and one-time banner: what key is this stored under, and does that key die when the underlying thing dies?

---

## Infrastructure

**Nothing new is provisioned.** No cron, worker, queue, bucket or DB. The weekly digest runs on the existing job schedule; PR 9 changes what it selects, not where it runs.

One new environment variable, `NATIVE_DIGEST_ENABLED`, default off, set on the API service in staging and prod. `render.yaml` is descriptive and editing it deploys nothing — if a real change to a service is ever needed, make it through the Render MCP or dashboard in **both** environments, and carry any gap into the run report's infra table as `⚠️ declared only`.

---

## Bookkeeping, per PR

- `releases.ts` entry on user-facing PRs (4, 6, 8 and any polish that ships a visible feature). Skip for API-only and chore PRs.
- `progress.md` row for substantive PRs only.
- Follow-ups: **do not file GitHub issues during this run.** Both backlog ceilings are breached. Collect proposals under **Proposed intake** in the run report and let Hugh choose. Anything diagnosable and in scope is fixed in this run instead.
- Any follow-up needing Design input also needs a row in `docs/superpowers/design-pipeline-status.md`. `design-status` parses that file and never queries labels, so a labelled ticket with no row is invisible.
- Prune the worktree and test DB after each merge: `pnpm worktree:prune <branch>`. Only this run's branches.

---

## Open

Nothing. The spec's §15 closes both decisions the handoff left open — `pending` versus optimistic in §5.1, and the nav label in §7.6, which turned out to be already shipped. Any question that surfaces during the build and is not answered by the spec is a **spec defect**, and the fix is an amendment to the spec in the same PR that discovers it.

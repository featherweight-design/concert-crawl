# Native artist following — engineering spec

**Date:** 2026-08-08
**Design handoff:** `design/design_handoff_native_following/` (merged, PR #1504)
**Depends on:** PR #1515 (artist fan-out generalization), #737 (in-app notifications), #1115 (artist page), #70 (My shows tabs)
**Status:** spec — the execution plan is a separate PR

---

## 1. Premise

The Spotify Web API caps this app at 5 authenticated users in Development Mode, and Extended Quota is unreachable (it requires an organization and 250k MAU). Spotify was the entire onboarding funnel for artist following. PR #1515 fixed the back half of that problem: the crawl-discovery fan-out now reaches a follow from any source, not only a Spotify-synced one.

This spec covers the front half. Today a user can only acquire a follow by connecting Spotify, or by finding an artist page and tapping Follow — there is no discovery path, no list of who you follow, no way to manage the alerts, and the digest still only reaches Spotify-connected users.

**This is a diff, not a rebuild.** Every screen named below is a shipped component with a follow layer added. The single largest risk in this build is treating it as new construction.

### 1.1 What already exists

Verified against `origin/main` at e8df22f2d. Anything not listed here is new.

| Thing | Where | State |
|---|---|---|
| `artists` projection table | `packages/db/src/schema/social.ts:41` | Ships. Projection off event billing; `hidden` kill switch |
| `user_artist_follows` with `source` enum | `packages/db/src/schema/social.ts:84` | Ships. `'manual' \| 'spotify_followed' \| 'spotify_top'` |
| `POST/DELETE /v1/artists/:slug/follow` | `apps/api/src/routes/artist-follows.ts` | Ships. POST carries `requireFeature('following')`; DELETE deliberately does not |
| `following` entitlement, premium+ | `packages/entitlements/src/index.ts:84` | Ships. free/supporter = `paywall-on-tap`, logged-out = `tier-picker-on-tap` |
| Artist page + `FollowButton` + `FollowBlock` + `EmptyUpcoming` + `StickyBar` | `apps/web/src/components/consumer/artist-page/` | Ships, incl. the `hasShows` and `showFollow` guards |
| `GET /v1/search/artists?q=` | `apps/api/src/routes/search.ts:105` | Ships. Returns top 3, filtered to artists with a consumer-visible event |
| Crawl-discovery fan-out, source-agnostic | `packages/crawler-core/src/lib/artist-fanout/` | Ships (#1515). Asymmetric defaults applied as SQL `COALESCE` |
| My shows, Watching / History tablist | `apps/web/src/components/consumer/history/MyShowsTabs.tsx` | Ships |
| `user_notification_preferences` | `packages/db/src/schema/user-notification-preferences.ts` | Ships: `masterEnabled`, `watchUpdatesEnabled`, `priceDropsEnabled` |
| Weekly digest template + job | `apps/api/src/emails/templates/spotify-digest.ts`, `apps/api/src/jobs/spotify-weekly.ts` | Ships, **Spotify-gated** |
| `TierPickerSheet` | `apps/web/src/components/consumer/tier-picker/` | Ships. This is the paywall |

### 1.2 Handoff corrections

Three things the handoff names do not exist in shipped code. The handoff is a design artifact and was written against the prototypes; these are eng calls, not design rounds.

1. **`MiniPaywall` does not exist.** It lives only in `design/design_handoff_monetization_tier_states/`. The shipped paywall is `TierPickerSheet`. "Do not fork the paywall" still binds — we render `TierPickerSheet`, and `FOLLOW_ANCHOR` becomes a new `PickerEntry` value plus a header-copy variant, not a new component. See §6.2.
2. **`ENTITLEMENT_REQUIRED_CODE` is `'entitlement_required'`** (`apps/web/src/lib/history.ts:9`), not the longer string.
3. **Artists carry no genre.** The only genre data in the schema is `events.genre` (`text[]`, `packages/db/src/schema/events.ts:82`). The onboarding genre picker therefore filters artists through their *events'* genre arrays. Consistent with artists being a projection, but it means a genre pick can only ever surface artists with a dated Denver event — which is what the handoff wants anyway ("every suggestion is followable by construction").

---

## 2. Scope

### 2.1 In

Discovery and management for native follows, plus the notification plumbing that makes a follow mean something for a user who has never touched Spotify.

1. `FollowButton` gains a `locked` state and a shared `nfLocked()` gate.
2. Browse: a "My artists" scope chip and a follow shelf in the slot the Spotify taste shelf occupies.
3. Event rows: `following` + `followSource`, surfaced through the existing meta-chip budget.
4. Event detail: a `billBlock` slot under the Watch CTA with per-artist and "Follow all N".
5. Search results: an Artists section with inline follow.
6. Onboarding: two new steps (genres, then suggested artists) before `done`.
7. My shows: a third tab, Artists.
8. Settings ▸ Notifications: an "Artists you follow" group, and the migration of artist alert preferences off the Spotify connection.
9. Weekly digest: generalized off Spotify, with a zero variant in **both** the HTML and plain-text parts.
10. Push: per-crawl-run batching.
11. Premium tier copy: following becomes the headline benefit.
12. First-watch nudge: artist-anchored, replacing the Spotify pitch.
13. Nav: bottom-nav tab 3 label `watching` → `my shows`.

### 2.2 Out

- **Follower counts.** Cut by the handoff. Not an API build item.
- **Contracting the legacy connection preference columns.** §7.1 expands; the drop is a later PR after a full digest cycle has run on the new columns.
- **Any change to Watching.** Following never writes to Watching except through the existing, default-off auto-watch path.
- **Artists who have never played Denver.** They are not in the index and cannot be.
- **A fifth follow state.** See §5.1.

---

## 3. Premise questions

epic-run refuses to start without these answered. They are answered here, not in the plan.

### 3.1 Launch gating

**Nothing in this epic makes a new vertical publicly reachable.** Every surface is inside `(protected)`, and the two public-adjacent ones (artist page, search) already ship with follow affordances today. The only flag-like decision is the **digest**, which must not send from the new query until the preference migration has run in prod and been verified. Gate: the generalized digest job ships in its own PR, *after* the preference migration PR has been live through one weekly cycle, and lands with `NATIVE_DIGEST_ENABLED` defaulting off. Hugh flips it. See §8.3.

There is a second, quieter gate: **do not ship the notification settings rows before delivery exists.** #737 has landed, so this is satisfied — but the artist rows in Settings must not appear in a PR that precedes the fan-out reading them, or the toggles are decorative.

### 3.2 Off-happy-path homes

Every new state a user can be in, and where they live:

| State | Home |
|---|---|
| Follows nobody, free/supporter | Browse starter shelf (recruiting), My shows ▸ Artists empty state, onboarding step 7 with a locked commit |
| Follows nobody, premium | Same, unlocked |
| Follows someone with no upcoming Denver date | My shows ▸ Artists, "Nothing on the books" group (muted, alphabetical). Artist rows elsewhere carry `NoDatesLine` |
| Follows someone, then downgrades to free | **Follows are retained.** The user keeps the list, loses the alerts and the scope chip. Artists tab still renders; the alerts row shows the locked card. Unfollow stays available (DELETE is unentitled by design) |
| Followed via Spotify, then disconnects Spotify | Spotify-sourced rows persist; the user keeps the follows. Preferences now come from `user_notification_preferences`, so nothing is lost |
| Selected artists in onboarding, then hit the paywall | Picks held in component state **and** `sessionStorage`; commit retried after checkout closes. See §9.3 |
| Zero-follow user who dismisses the starter shelf | No dismiss affordance. The shelf is the slot's zero mode, not a promo |

The downgrade row is the one that has bitten before. It is settled: **downgrading never deletes follows.**

### 3.3 Journey walk script

Drives Gate 5 and the cold-eyes capture. Numbered, end-to-end.

1. Sign up as a new free user. Walk onboarding to step 6, pick three genres, continue.
2. Step 7: select four suggested artists. Tap commit. Expect the paywall.
3. Dismiss the paywall without upgrading. Expect the four picks still selected.
4. Skip to `done`. Land on browse. Expect the starter shelf, and **no** "My artists" chip (absent at zero follows).
5. Upgrade to Premium from Settings.
6. Search an artist by name. Follow from the results row.
7. Browse: expect the "My artists" chip to now be present and off, and the shelf to have flipped from starter to your-artists.
8. Activate the chip. Expect a `role=status` count line and a filtered list.
9. Open an event with a multi-act bill. Use "Follow all N". Expect one write and N rows flipping.
10. Watch that show. Expect the first-watch nudge, artist-anchored, once.
11. My shows ▸ Artists: expect all follows, split upcoming vs no-dates, with the alerts row.
12. Tap the alerts row → Settings ▸ Notifications. Toggle "Add them to Watching for me" on.
13. Trigger a crawl that discovers two new events for followed artists. Expect **one** push, tray rows for both, and both auto-watched.
14. Unfollow one artist from the Artists tab. Re-follow. Expect the state to be genuinely clean, not hollow (Gate 5 repeat pass).
15. Downgrade to free. Expect follows retained, chip locked, alerts card locked.

---

## 4. Data model

One migration, **0078** (0077 is the artist-fanout migration from #1515). Confirm the number against `packages/db/migrations/` at build time; the `when` timestamp must exceed every prior entry.

### 4.1 `user_notification_preferences` — three new columns

```
artist_alerts_enabled   boolean NOT NULL DEFAULT true
artist_auto_watch       boolean NOT NULL DEFAULT false
weekly_digest_enabled   boolean NOT NULL DEFAULT true
```

The defaults mirror the asymmetry #1515 already encodes in SQL, and for the same reason: **following is the opt-in, so alerts default on; following must never silently mutate Watching, so auto-watch defaults off.** Do not "tidy" these into a matching pair.

### 4.2 Backfill

`user_notification_preferences` rows are created *lazily* on first PATCH. That is the trap: a Spotify-connected user with settings on their connection row and no preferences row would silently lose them. The migration must therefore **insert** rows, not only update:

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

`master_enabled` is **not** touched by the backfill. It takes the table default (`false`) for newly inserted rows, which preserves today's behaviour exactly: `sendPushForNotification` already gates on it, and inventing `true` here would start pushing to users who never enabled a device.

Per CLAUDE.md's expand/contract rule, `user_spotify_connections.{auto_watch, push_enabled, digest_enabled}` are **not dropped in this epic**. They become write-through-legacy: the Connections panel stops writing them, and a later contract PR removes them once one weekly digest cycle has run clean.

### 4.3 No new tables

Following is already modelled. Resist adding an `artist_genres` table — §1.2 covers the genre path. Resist a `follow_preferences` table — the whole point of the handoff's §9 is that these are two more rows in the same list, not prefs hanging off a connection native users do not have.

---

## 5. Component contracts

### 5.1 `FollowButton` states — three, not four

The handoff's contract table names four: `idle`, `following`, `locked`, `pending`. **We ship three. `pending` is dropped from the single-artist button.**

Rationale, and this is the one place the spec deliberately departs from the handoff:

- Repo precedent. The Event Detail CTA work removed its `pending` state on 2026-08-04 for exactly this reason, and #1467 was a bug caused by a loading state that flashed. A state whose entire visual difference is `opacity: 0.72` and a label swap, visible for ~120ms on a fast connection, is a flash, not feedback.
- The mutation gets **optimistic** feedback instead: the button flips to `following` on click and rolls back on error. That is what the "I'm going!" bug taught us, and it is already the house pattern.
- The optimistic override clears on **the server value changing**, never on mutation success. Clearing on success drops the override before the new data lands and flashes the old state.

`pending` survives in exactly one place: **bulk commits** ("Follow all N", the onboarding step-7 commit). Those are genuinely multi-second, they write N rows, and an unacknowledged bulk tap gets tapped again. Bulk buttons render a pending label with no width change.

Final contract:

| state | look | behaviour |
|---|---|---|
| `idle` | `--signal` fill | follow |
| `following` | `--signal` @14% fill, `--signal` border + text, check glyph | unfollow, no confirm |
| `locked` | shipped signed-out skin (transparent, `--border-strong`, `--fg`) + lock glyph, **same size and label as idle** | opens the paywall. **Never `disabled`.** Logged-out opens the tier picker |

There is no `unavailable` state. An artist with zero Denver shows cannot exist — artists are a projection off event billing, search filters to artists with a visible event, and the detail endpoint 404s. The real and common case is "played Denver before, nothing upcoming", and that artist gets a **normal live Follow button** plus a muted `NoDatesLine` meta line. Never inert.

### 5.2 The gate helper

```ts
export const nfLocked = (tier: UserPlan): boolean =>
  tier === 'free' || tier === 'supporter'
```

Lives beside the existing entitlement helpers. **Never test `tier === 'free'` inline** — design R2 leaked a live Follow button to Supporter on six surfaces doing exactly that. In practice most call sites should prefer `useEntitlement('following')` and read `surface`; `nfLocked` exists for the render paths that already have a tier in hand and would otherwise re-query.

### 5.3 Sizes

`NF_FOLLOW_SIZES` is ground truth and goes into a definitions file verbatim: `sm` 36 (only where the row is itself a target) · `md` 44 · `full` 48. `--accent` is Watching and is never used by a follow affordance; `--signal` is CTA and status.

### 5.4 Badge variant

In shelves and the onboarding picker the affordance is a **badge on the art**, not a full button — same states, same gesture. The onboarding tile *is* the checkbox (`role="checkbox"`), so a 12-artist grid is 12 targets, not 24.

### 5.5 `FollowingTag` and row attribution

Read-only attribution in the row meta line, never beside a button. It takes `RowMetaChip`'s grammar from the shipped event-row system rather than inventing a third chip shape.

**`buildMeta` in the event-row system hardcodes the Spotify logo on the Following chip.** It must become conditional on `followSource`, or every native follow is labelled Spotify. This is a one-line fix in shipped code and it is the highest-value item in the whole epic per unit of effort.

---

## 6. Entitlement and paywall

### 6.1 The house pattern

Unchanged from `EventDetailCtaBlock.tsx`. Every gated follow action is gated **twice**:

1. **Client-side**, from `useEntitlement('following')` → `surface`. A `paywall-on-tap` or `tier-picker-on-tap` surface renders `locked` and opens the picker directly, without a network round trip.
2. **Server-side**, by catching a `403` whose `code === ENTITLEMENT_REQUIRED_CODE`. This is not redundant — it is the stale-entitlement race. A user whose subscription lapsed mid-session has a stale client entitlement, and only the 403 catches it.

`scaRegion` is derived server-side from `x-vercel-ip-country` via `isScaRegion` and threaded to every component that can render `TierPickerSheet`. Any new page that renders a follow affordance must thread it; a missing `scaRegion` is invisible until a European card hits 3D Secure.

### 6.2 `FOLLOW_ANCHOR`

Not a new component. It becomes:

- a new `PickerEntry` value, `'follow'`, in `packages/types/src/analytics-events.ts` (which already carries `'logged-out-follow'` for the signed-out artist-page reach — these are different reaches and must not be merged);
- a header-copy variant in `TIER_PICKER_COPY.header`.

The anchor's structural content (eyebrow, title, body, three bullets, CTA) is placeholder copy and goes through `copy-review` before it ships. Its *shape* is locked.

### 6.3 Bill block gates as one unit

"Follow all N" and the per-row buttons lock together below Premium. A 4-act bill is one paywall and one tap, not four. Above Premium the rows are independent.

---

## 7. Surfaces

Each entry names the shipped thing it modifies. Anything described as "new component" is genuinely new.

### 7.1 Browse

- **Scope chip "My artists"**, four states: `off | on | locked | absent`.
  - `locked` sets **no `aria-disabled`** — it opens the paywall, so it stays in the tab order and stays activatable. There is no disabled access state anywhere in the entitlements model.
  - `absent` at zero follows: rendered absent **from first paint**, server-side, for a 0-follow user. Never removed mid-session — a chip that vanishes while you look at it is worse than one that was never there.
  - Additive (AND) with date / venue / price / genre, exactly like `taste=1`.
  - Active state uses `--signal`. The scope banner is `role=status`.
- **API:** `GET /v1/events?following=1`, modelled on the existing `taste=1` flag (`apps/api/src/routes/events.ts`) — Zod-validated, `requireAuth`, entitlement-checked, an `EXISTS` subquery over `user_artist_follows` matching the §9.1 canonical rule. If the API rejects the flag, `followingApplied` is false and the banner must not claim a filter applied.
- **Shelf slot** — one component, three modes, in the slot `DiscoveryShelf` occupies:
  - `zero` — starter shelf: followable artists with dates, shuffled per session. The slot **recruits** rather than rendering an apology.
  - `some` — your followed artists with upcoming dates.
  - `spotify` — same as `some`. Never `zero`.
- **Row data:** two new fields, `following` and `followSource`, rendered through the row's existing meta-chip budget. **No layout, truncation or price-treatment change.**

### 7.2 Event detail

One new optional prop, `billBlock`, on the shipped `EventDetail`, rendered under the Watch CTA. Mobile: a card in the main column. Desktop: in the right rail, under Watch.

### 7.3 Artist page

One pass-through prop, `followState`, threaded to `FollowBlock` **and** to `EmptyUpcoming`'s inline button. `StickyBar` takes `state`.

**No behaviour change. Keep the `hasShows` guard.** An artist with no upcoming date already gets a follow button inside `EmptyUpcoming`; lifting the guard renders two. Both existing guards stay: `showFollow` on the sticky sub-header, `hasShows` on `FollowBlock`. The artist page shows exactly one live follow affordance.

### 7.4 Search results

An Artists section above Shows when the query matches an artist name. `FollowButton size="sm"`, icon-only under 360px. `GET /v1/search/artists` already returns the right shape; it needs a `following` field added.

Desktop is a two-column layout: results list plus an explainer rail.

### 7.5 My shows ▸ Artists

Third tab beside Watching / History. Real tablist, arrow-key nav, count inside the accessible name ("Artists, 7").

Two groups: upcoming Denver dates (date in `--signal`, soonest first), then no dates (muted, alphabetical). Group headings are `h2`.

The find-more affordance is a **labelled row**, not a button — beside a column of Following buttons, a "+ Follow more" button reads like it might follow everything at once. It opens the same picker as onboarding step 7.

An alerts row deep-links to Settings ▸ Notifications with the current state as its meta line.

**API:** `GET /v1/me/artist-follows` — the user's follows with each artist's next Denver date and `source`. Not gated by `requireFeature`: a downgraded user must still be able to see and manage the list.

### 7.6 Nav rename

Bottom-nav tab 3 label `watching` → `my shows`. This was the handoff's one open product question and it is settled: the container already holds Watching and History, and now Artists, so the tab label naming one of its three children is wrong. **The Watching concept itself does not change** — the list, the sub-tab and every string that says "Watching" stay exactly as they are. This is a one-word change in `BottomNav.tsx` plus its test.

Gate 3 sweep: grep for the old label across `apps/e2e` selectors and snapshots, which do not fail typecheck.

---

## 8. Notifications

### 8.1 Settings ▸ Notifications

Add to the shipped screen. No new section, no new page. Grouped:

**Artists you follow**
- `New show alerts` — **above** Watch updates, because an artist announcement is the earliest signal in the chain and reading top-down should feel like the funnel does (artist announces → you watch it → the price moves).
- `Add them to Watching for me` — an indented **sub-row** of the above, default **off**.
- `Weekly digest` — Friday, one email.

**Shows you're watching** — the existing Watch updates and Price drops rows, unmoved.

Free/supporter get the whole artist group as **one locked card with an upgrade route**. Not dead toggles. A disabled switch that does nothing is the worst version of this screen.

Toggles are `role="switch"`, labelled by the row title, described by the body line, rows ≥44px.

**API:** extend the existing `GET`/`PATCH /v1/me/notification-preferences` with the three new fields. Same lazy-create-on-PATCH semantics.

### 8.2 Push batching

The fan-out currently fires one push per (user, event). A large crawl run must not fire eight pushes in ninety seconds.

Design:

- **Exactly-once is unchanged.** The `spotify_alert_log` claim stays per `(user, event, 'push')` via `onConflictDoNothing().returning()`. Only *delivery* is coalesced.
- The fan-out accumulates claimed pairs across the whole run, then flushes per user at the end:
  - 1 event → the existing single-show copy, keyed off `artistAutoWatch` as it is today.
  - ≥2 events → one push, the "N artists you follow just booked Denver" shape.
- **Tray rows stay per event.** The tray is a list; collapsing it would lose the individual deep links. Only the push is batched.
- The flush must be awaited, not detached — both crawler entrypoints hard-exit via `process.exit(0)`, which severs a floating promise mid-flight. Same #649 lesson the fan-out already documents.

This is Gate 6 territory: prove it fires, fires **once** (run the crawl twice), and fires for exactly the right audience (a second account confirms non-delivery).

### 8.3 Weekly digest

The existing template and job are Spotify-gated end to end. Generalizing them hits **the same two-part trap #1515 hit**, and it will look fixed after fixing only half:

1. The **source filter** — the job must select from `user_artist_follows` regardless of `source`.
2. The **join onto `user_spotify_connections`** — currently an inner join for `digestEnabled`. It becomes a read of `user_notification_preferences.weekly_digest_enabled` (§4.1), which every user has. Fixing only (1) leaves the join silently dropping every native follower.

Content:

- A quiet week **still sends**, light, with two follow suggestions. Never a blank send.
- Inline hex, not CSS vars — email clients cannot read them. This is the sole documented exception to token-only colour.
- **The zero variant must exist in the plain-text part as well as the HTML.** An HTML/plain-text disagreement is a defect, not a formatting detail, and `templates.test.ts` asserts exact strings on both. Both parts also carry lines the other does not, so read both.
- Unsubscribe: per-family first, global secondary. The existing signed one-click URL machinery applies unchanged.

Ships behind `NATIVE_DIGEST_ENABLED`, default off, per §3.1.

### 8.4 First-watch nudge

Replace the Spotify pitch with the artist-anchored variant. Single-fire, dismissable, never returns. Free tier still sees it, with the lock on the CTA. Also add the inline follow row to the watch confirmation as the permanent path.

**Desktop is not a port.** On mobile the nudge is a card injected into the browse feed, because the user lands back on browse after watching. On desktop they never leave the detail page, so a card injected into a feed they are not looking at fires the one-shot nudge at an empty room. On desktop the nudge **replaces the rail's watch card in place** — not a ported card, not a modal. Dismissing restores the watch card.

**Dismissal key.** This is the #70 nudge bug restated, and it must not recur: the dismissal is keyed by **`userEventId`, not `eventId`**. `eventId` is immortal; `userEventId` dies when the user unwatches. Keyed by `eventId`, one dismissal silences the nudge forever, including after unwatch → re-watch. Gate 5's repeat pass exists to catch precisely this.

---

## 9. Onboarding

### 9.1 Eight steps

The shipped flow is six: `welcome · how · today · theme · notyet · done` (`OnboardingShell.tsx:27`). Two slot in **before `done`**:

`welcome · how · today · theme · notyet · genres · artists · done`

Both new steps are skippable and neither blocks sign-in. The step counter and dot indicator read from `FLOW.length`, so they update for free.

### 9.2 The suggestion query

Artists with an upcoming Denver date, filtered by the picked genres, ordered by follower count — so **every suggestion is followable by construction**. Genre comes from `events.genre` (§1.2), matched by array overlap against the artist's billed events.

**Genres are not persisted as preferences.** They are a filter for this one screen. Do not add a column.

### 9.3 One write at commit, and the upgrade round-trip

Selection is held client-side and committed as **one write**: `POST /v1/me/artist-follows/bulk`, body `{ slugs: string[] }`, Zod-bounded, `requireFeature('following')`, returning a per-slug result so a partial failure is visible.

Free/supporter may **select freely**; only the commit is paywalled. Picks must survive the upgrade round-trip:

- Selection lives in component state **and** mirrors to `sessionStorage` under a namespaced key. The session mirror is the belt for a mid-flow reload; checkout itself is embedded (`CheckoutPanel`) and SCA challenges mount in-page, so there is no navigation away and component state alone would *usually* suffice. "Usually" is why the mirror exists.
- On a `403 entitlement_required`, open `TierPickerSheet` with `entry: 'follow'` and **keep the selection**.
- On picker close, re-read the entitlement and retry the commit if it is now active.
- Clear the mirror only on a successful commit or an explicit skip.

The same picker component is reused by My shows ▸ Artists' "Find artists to follow" row. Build it once.

---

## 10. Copy

**Every user-facing string in the handoff and the prototypes is a placeholder.** The handoff says so in its first line. Nothing in `nf-*.jsx` ships verbatim.

Copy is a copy-writer call, not a Design call and not an eng call. Every PR touching a `definitions/copy.ts`, an email template, push copy, `releases.ts`, or a handoff string runs the `copy-review` skill before `gh pr create` (epic-run Gate 7). Locked vocabulary applies throughout: **Watching** for shows, **Following** for artists, **price check** never contest or dispute. There is no "Saved".

Premium tier copy: the headline benefit becomes artist following; Spotify sync drops to a fine-print line. That reversal is deliberate — Spotify is capped at 5 accounts, so nobody buying Premium today can actually have its headline benefit.

---

## 11. Accessibility

Not a checklist item at the end; it ships in the same PR as each surface.

- `aria-pressed` on the follow button. **Dropped only for `locked` and signed-out** — a pressed state on a control that opens a paywall is a lie.
- `locked` is never `disabled`, and carries an `aria-describedby` gate sentence. The sentence node is **visually hidden via clip**, never `hidden` — the `hidden` attribute drops a node from the accessibility tree, so a `describedby` pointing at it announces nothing.
- The gate-sentence id must be `useId`-derived, not a module counter. A bill can put four follow buttons on one screen and a colliding id aims every gate sentence at one node.
- Artist tiles: `role="checkbox"` in a labelled group. Selection is check glyph **+** border **+** fill — never colour alone; the Light theme needs all three for AA.
- Tabs: a real tablist with arrow-key nav and the count inside the accessible name.
- Toggles: `role="switch"`, labelled by row title, described by body line, rows ≥44px.
- Scope banner: `role="status"`.
- Tray unread: dot **+** bold weight.
- Group headings are `h2`. Commit buttons carry the count in their text.

---

## 12. Non-negotiables

- **Mobile (390 and 320) and desktop ship in the same PR.** 320 is the baseline. Desktop is required for all three new surfaces: artist search results, the bill block, and the first-watch nudge.
- **Token-only colour** — `var(--*)`, verified in Electric, Jade and Light. No raw hex in screen code. Email is the sole exception.
- **`--accent` = Watching. `--signal` = CTA and status.** Never swapped.
- **The Spotify logo is the official asset in a slot**, never a redrawn mark. Spotify green is not an app colour.
- **Native is the base IA; Spotify is a `source` prop**, not a second information architecture. Build native first, then make the Spotify path a `source="spotify"` variant of the same components. The only genuine divergence is the zero state.
- Do not fork the byte-identical infra files shared across handoffs (`theme-context.jsx`, `supporting-line.jsx`, `tweaks-panel.jsx`). Note that the root `theme-context.jsx` is stale — it is missing `--shadow-soft` and `--shadow-strong`.

---

## 13. Testing and gates

Standard epic-run gates apply. The ones with teeth here:

- **Gate 1 (state reachability)** at the API→UI seam, before each UI PR's build starts. The state that will fail this is the browse scope chip's `absent` mode: it must be decided server-side at first paint, and a component that computes it from a client query renders `off` for a frame first.
- **Gate 2 (forced-state runtime)** — force the paywall, the 403 race, the zero-follow states, the digest zero variant, and a throttled network for every mutation. A fast local machine hides the optimistic-update bug completely.
- **Gate 3 (sibling sweep)** — the `buildMeta` Spotify-logo fix and the nav rename are both exactly this shape. Grep the *old* value; E2E selectors and snapshots do not fail typecheck.
- **Gate 5 (journey lifecycle)** — the §3.3 script, run forward, reverse, repeat and resume. The repeat pass is the one that matters: unfollow → re-follow, and watch → unwatch → re-watch for the nudge key.
- **Gate 6 (side-effect provenance)** — mandatory here. The digest and the batched push are both records created by something else happening, and their characteristic failure is silence. Prove each fires, fires once, and fires for exactly the right audience using a second account.
- **Gate 7 (copy review)** on every PR that adds a string.

Integration tests run against the per-worktree test DB. The digest template test asserts exact strings on both the HTML and plain-text parts; changing either without the other fails, which is the intended behaviour.

---

## 14. Risks

| Risk | Why it bites | Mitigation |
|---|---|---|
| The digest half-fix | Same two-part trap as #1515: fixing the source filter alone looks correct and silently drops every native follower | §8.3 names both halves. An integration test asserts a native-only follower receives a digest |
| Preference migration loses Spotify users' settings | Preference rows are created lazily, so an UPDATE-only backfill silently misses them | §4.2 inserts, with `ON CONFLICT DO UPDATE` |
| Nudge dismissal keyed by `eventId` | Exactly the #70 bug. Renders correctly on a single forward pass and survives every gate except Gate 5's repeat | §8.4 mandates `userEventId`. Gate 5 verifies |
| `buildMeta` marks native follows as Spotify | The logo is hardcoded today. Ships silently wrong on every browse row | §5.5. One-line fix, sweep for siblings |
| Optimistic update flashes the old state | Clearing the override on mutation success drops it before the new HTML lands | §5.1: clear on the server value changing |
| Bulk commit tapped twice | A multi-second write with no acknowledgement | §5.1: `pending` retained for bulk buttons only |
| Push storm on a large crawl | Eight pushes in ninety seconds reads as spam and costs the notification permission | §8.2 batches delivery while keeping per-pair exactly-once |
| Supporter leaks a live Follow button | Happened in design R2 on six surfaces via inline `tier === 'free'` | §5.2. Gate 3 greps for inline tier tests |

---

## 15. Open

Nothing. The handoff's single open question (the nav label) is settled in §7.6, and the `pending`-vs-optimistic call is settled in §5.1. Any question surfacing during the build that this spec does not answer is a spec defect, and the fix is an amendment to this document in the same PR that discovers it.

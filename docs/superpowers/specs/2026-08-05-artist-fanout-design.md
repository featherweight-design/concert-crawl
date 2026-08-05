# Artist fan-out — generalizing Spotify notifications to native follows

**Date:** 2026-08-05
**Status:** Design approved (Hugh, 2026-08-04)
**Scope:** Project 1 of 3. Ships alone. No design track dependency.

---

## Problem

Manual artist following is already shipped. `POST /v1/artists/:slug/follow` writes
`user_artist_follows` with `source: 'manual'` and has been live since #1115. Prod carries
330 `spotify_followed` and 150 `spotify_top` follows across 3 users — and **zero manual
follows**.

The reason is that following a band manually does nothing. New-show notifications are
wired exclusively to Spotify-sourced follows, so the button writes a row and the user
never hears from us again.

Meanwhile Spotify itself cannot grow. The app is in Development Mode, capped at **5
authenticated users**, currently at 3. Extended Quota requires a registered organization
with 250k MAU, which Concert Crawl will not meet. Spotify-as-personalization is a 5-user
feature; Spotify-as-a-data-source (artist identity matching and photos, via client
credentials) is uncapped and unaffected by anything here.

So the whole product gap is one sentence: **notifications must fire for the artists a
person follows, regardless of how they came to follow them.**

## Non-goals

- Turning off `SPOTIFY_SYNC_DRY_RUN`. It stays at `1`. Flipping it starts emailing real
  users and is a separate decision.
- Artist search, browse, or bulk-add. Native users have no way to discover artists to
  follow yet. That is Project 3 and belongs to Design.
- A per-source notification preference. See "Preferences" below.
- Any feature-flag infrastructure. That is Project 2.

---

## 1. Entitlement alignment

`packages/entitlements/src/index.ts` already declares the answer:

```ts
following: {
  'logged-out': 'tier-picker-on-tap',
  free: 'paywall-on-tap',
  supporter: 'paywall-on-tap',
  premium: 'visible-active',
  founder: 'visible-active',
  gifted: 'visible-active',
},
```

Following is a **Premium** feature. The route is out of step with the matrix: its header
comment asserts following is free for all signed-in plans, citing design brief #1115
§3.6.

**Decision: the matrix wins.** `POST /v1/artists/:slug/follow` gains
`requireFeature('following')`. The button renders `paywall-on-tap` for free and supporter
— visible, tappable, and it opens the paywall. Not hidden (that destroys the upsell) and
not disabled (**no `disabled` access state exists**; the four states are
`visible-active`, `paywall-on-tap`, `tier-picker-on-tap`, `hidden`).

The reasoning Hugh gave: following without notifications is a useless action, and
notifications were always intended to be premium. Gating the follow and gating the
notification at the same tier keeps the promise honest.

**DELETE stays ungated.** A user who downgrades must always be able to unfollow. Gating
unfollow would strand rows a user cannot remove.

The fan-out's push gate changes key from `canUseFeature(planState, 'spotify-sync')` to
`canUseFeature(planState, 'following')`, so a Premium user with no Spotify connection is
no longer silently excluded.

> **This reverses design brief #1115 §3.6.** Hugh confirmed on 2026-08-04 that the brief
> is out of date. The route's header comment must be rewritten, not merely edited around,
> and the regression test asserting free access must be inverted.

## 2. Fan-out generalization

`packages/crawler-core/src/lib/spotify-fanout/` becomes
`packages/crawler-core/src/lib/artist-fanout/`. Generalized **in place** — not a parallel
native path.

The deciding argument against a parallel path: a user who both Spotify-follows and
manually follows the same artist would be notified twice, suppressed only accidentally by
`claimAlert`'s idempotency. Relying on a dedupe key to paper over a duplicated code path
is how the second notification eventually escapes.

Two independent blockers exist in the candidate query today, and both must go:

```ts
const SPOTIFY_FOLLOW_SOURCES = ['spotify_followed', 'spotify_top'] as const
// ...
.innerJoin(userSpotifyConnections,
  eq(userSpotifyConnections.userId, userArtistFollows.userId))
.where(and(
  ne(userSpotifyConnections.status, 'revoked'),
  inArray(userArtistFollows.source, [...SPOTIFY_FOLLOW_SOURCES]),
  inArray(userArtistFollows.canonicalName, allCanonicalNames),
))
```

1. **The `source` filter** — drop it entirely. All three enum values fan out.
2. **The inner join** — becomes a `LEFT JOIN`. A user with manual follows and no Spotify
   connection currently produces no candidate rows at all. This is the blocker that
   matters more, because it is also where the preferences live.

`ne(status, 'revoked')` moves **inside** the join condition. On the `where` clause with a
LEFT JOIN it would re-filter the null rows back out; inside the join, a revoked
connection simply yields nulls and the user degrades to manual-only notifications rather
than losing them.

**Preference defaults for users with no connection row** (both null after the LEFT JOIN):

| Preference | Default | Why |
|---|---|---|
| `pushEnabled` | `true` | Following *is* the opt-in. A follow that notifies nothing repeats the bug we are fixing. |
| `autoWatch` | `false` | Following an artist must never silently mutate the user's Watching list. Auto-watch is a distinct, deliberate choice. |

This asymmetry is intentional. Apply it as a SQL `COALESCE` in the select itself, so the
candidate rows are already correct and no downstream consumer can forget the defaults.
Comment it at that site: "both default true" is the natural wrong guess.

### Preferences: following implies notify

There is **no new preference column and no new preference UI**. If you follow an artist,
you get told when they announce a Denver show. Unfollow is the off switch.

`autoWatch`, `pushEnabled`, and `digestEnabled` remain columns on
`user_spotify_connections` and remain meaningful only for Spotify-connected users. Giving
those preferences a native home is a Design question flagged for Project 3, not something
to invent here.

Everything downstream is unchanged: `claimAlert(userId, eventId, 'auto_watch' | 'push')`
still provides idempotency, the tray row is still inserted before `sendPush`, and the
push tag stays stable per event.

## 3. Notification category rename

`spotify.new_show` → `artist.new_show`. The category is no longer Spotify-specific and a
manual follower receiving a notification labelled "Spotify" is plainly wrong.

The string appears in 11 files, including a **web allowlist** at
`apps/web/src/lib/notifications.ts` and the category definitions at
`apps/web/src/components/consumer/notifications/definitions/categories.ts`. Because the
allowlist rejects unknown categories, existing `spotify.new_show` rows in
`notifications` would silently stop rendering after the rename.

**A backfill migration is required**, not optional: update existing rows to the new
category in the same deploy as the code change. Expand/contract still applies — the
reader must tolerate both values across the deploy window.

`packages/push/src/notification-categories.ts` deliberately places this category in
*neither* sub-toggle set. Preserve that; it is load-bearing, and the rename must not
quietly enrol it in a toggle group.

## 4. Spotify Connect entry point

Add a `SPOTIFY_CONNECT_ENABLED` env flag. When off, the Connect entry point in
`apps/web/src/components/settings/connections/` is hidden.

Users 6 and beyond hit the worst possible failure today: OAuth **succeeds**, the account
links, and then every API call returns `403`. It looks like a working connection that
does nothing — "I connected Spotify but nothing happened." With the cap already binding
at 3 of 5, the next two connections exhaust it.

An env var suffices for Project 1 because this is a global on/off. The per-user override
Hugh wants — so he keeps the Spotify experience while everyone else gets native — needs
a real flag system and lands in Project 2.

`SPOTIFY_SYNC_DRY_RUN` stays at `1`.

---

## Testing

- Fan-out integration: a user with **only** manual follows receives an
  `artist.new_show` notification. This test fails on `main` and is the core proof.
- Fan-out integration: a user with a `revoked` connection and manual follows still
  receives notifications (guards the join-condition placement).
- Fan-out integration: a user following the same artist via both `manual` and
  `spotify_followed` receives **exactly one** notification.
- Defaults: no connection row → `pushEnabled` true, `autoWatch` false.
- Route: free and supporter plans receive the `paywall-on-tap` response from POST;
  premium succeeds; DELETE succeeds on every signed-in plan.
- Migration: rows written as `spotify.new_show` render after the backfill.
- The existing regression test asserting the follow route makes zero Spotify API calls
  must survive unchanged. Fan-out generalization must not introduce a Spotify call on
  the manual path.

## Risks

- **The entitlement change is user-visible on merge.** Following is free in prod today.
  Any beta user who has followed an artist keeps their rows (DELETE is ungated, POST is
  not retroactive), but the button changes behavior for free and supporter plans.
- **Backfill correctness gates the rename.** A missed row is an invisible notification.
- **Zero manual follows in prod** means this ships with no natural traffic to validate
  against. Verification is a deliberate manual follow plus the next crawl discovery,
  not an organic signal.

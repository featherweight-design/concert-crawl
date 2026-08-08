# Gate 6 — Side-effect provenance: artist fan-out

Feature: generalize the Spotify new-show fan-out so every follow source reaches it.
Branch: `feat/artist-fanout`. Plan: `docs/superpowers/plans/2026-08-05-artist-fanout.md`.

Gate 6 applies because the whole feature is a record created in response to something
else happening: a venue crawl inserts an event, and that insert is what produces a tray
row, a Web Push, and sometimes a `user_events` row. None of it is reachable by clicking
around the app, so the only honest evidence is a run against real Postgres.

Evidence lives in `packages/crawler-core/src/lib/artist-fanout/artist-fanout.integration.test.ts`,
which runs against a real database (the canonical-array overlap and the exactly-once
unique index are precisely the parts an in-memory mock would fake into passing).

## Triggers

There is one trigger: `runArtistFanoutSafely(insertedEventIds)`, called by the crawler
after a venue crawl persists its events, with the ids that were _brand new_ in that run.

### 1. Fires

`notifies a manual follower who has no Spotify connection at all` seeds a follow with no
`user_spotify_connections` row, runs the fan-out, and asserts the tray row and the push.
This is the case the old code silently dropped, and it dropped it twice over: the source
filter and the inner join onto the connections table were independent blockers, so a fix
to either one alone still delivers nothing. The join is now a LEFT JOIN with the
`ne(status, 'revoked')` check inside the join condition rather than the WHERE clause,
where it would filter the null-connection rows straight back out.

Preference defaults land as SQL `coalesce` in the same select, so no consumer downstream
can forget them. They are deliberately asymmetric: `pushEnabled` defaults **true**
(following is itself the opt-in), `autoWatch` defaults **false** (following must never
silently mutate someone's Watching list). `never auto-watches a manual follower` and
`still notifies a manual follower whose Spotify connection is revoked` pin both halves.

### 2. Fires once

Both channels claim a `(user, event, kind)` row in `spotify_alert_log` via
`onConflictDoNothing().returning()` **before** doing anything, so a re-crawl or a retry
that reaches the same pair fails to claim and does nothing.

- `re-running the fan-out sends nothing twice` runs the fan-out twice over the same
  event and asserts one push, one tray row, and two ledger rows (one per kind).
- `sends exactly one push when the same artist is followed both ways` covers the case
  the generalization created: a user who followed an artist natively _and_ has the same
  artist synced from Spotify now matches through both rows. `selectDistinct` plus a
  per-event `Map` keyed by user id collapses them to one pair before the ledger is
  reached, so the ledger is a second line of defence rather than the only one.

No concurrency race is possible from the crawler itself, which awaits the fan-out
serially, and the ledger's unique index is what covers the two-cron case regardless.

### 3. Fires for exactly the right audience

`reaches the matching follower and nobody else` seeds a bystander who is equally
premium and equally push-enabled and differs only in _which_ artist they follow, then
asserts zero tray rows and zero `user_events` rows for them. A single-account test
cannot see an over-broad match, because the intended recipient's alert looks correct
either way.

Entitlement is the other half of the audience. Push is gated on
`canUseFeature(planState, 'following')`, not on `spotify-sync` — the alert belongs to the
follow that earned it, whatever created it. `sends no push to a manual follower on the
free plan` and `free tier gets auto-watch only; premium gets push + tray row` cover both
sides of that line.

## Lifecycle

**What marks it handled.** The tray row is a standard `#737` `notifications` row with
`category: 'artist.new_show'`, so the existing seen/read machinery owns it unchanged.
The rename from `spotify.new_show` is migration `0077`, which rewrites existing rows
rather than leaving two categories in play; a grep for the old string returns nothing.

**Second device.** Read state is a server-side column on the notification row, so it is
already shared. The push itself carries a stable `tag` of `artist-new-show-<eventId>`,
so a duplicate delivery coalesces into one OS notification rather than stacking.

**Old records.** Nothing new here: tray rows follow the existing `#737` retention, and
`spotify_alert_log` is an append-only ledger that must not be pruned, since pruning a
claim is what would let an old event alert someone a second time.

**Before any trigger has fired.** A brand-new follower sees the ordinary empty
notification tray. Following an artist deliberately produces no immediate record of any
kind — the first thing that ever arrives is a genuine new Denver date. That is the state
most users will sit in for weeks, and it is the correct one.

## Not covered here

Native users still have no way to _find_ an artist to follow. That is the
`design_handoff_native_following` work, and is a deliberate non-goal of this branch
rather than a gap in this gate.

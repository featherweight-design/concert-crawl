# Gate 6 — Side-effect provenance, native following

The visible half of this epic is a button. The half that matters is what happens
_later_: a crawl inserts an event, and a row appears in someone's notification
list, their Watching list, and possibly their inbox. None of that is reachable by
clicking around, which is what this gate is for.

**Read the next paragraph before reading the gate as passed.**

Gate 6 asks for three things to be proven _by running them, not by reading them_.
This walk was done 2026-08-09 by **reading the fan-out path end to end**. No
trigger was actually fired. So this document is a provenance _map_, not a
provenance _proof_: it establishes where the idempotency key lives, where the
audience is scoped, and where the flags sit — which is what the next person needs
in order to run the gate — but it does not discharge it.

The honest reason: firing the fan-out requires a crawl inserting a genuinely new
event against a database with seeded follows, and the local stack for this run
was a scratch database (`concert_crawl_nf_polish`) stood up to work around
migration drift on Hugh's machine. Driving a real crawl through it was out of
scope for a polish PR, and faking the insert would prove the SQL, not the
trigger.

Every claim below is therefore marked **read** (traced in source) or **unrun**
(the leg Gate 6 wants and did not get). Nothing is marked passed.

## The triggers this feature adds

| Trigger        | Fires on                                                          | Writes                                              |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| Artist fan-out | A crawl inserting an event whose lineup matches a followed artist | `notifications`, `user_events`, `spotify_alert_log` |
| Weekly digest  | The Monday cron, for users with native follows                    | An email send                                       |
| Web push       | A fan-out notification, per user                                  | A push message per subscription                     |

## 1. Artist fan-out

`packages/crawler-core/src/lib/artist-fanout/index.ts`, entered through
`runArtistFanoutSafely(insertedEventIds)` after the crawl persists. It is not on
a schedule of its own — no inserted events, no fan-out.

### Fires — **unrun**

The write is at line 389: a `notifications` row, type `user_notification`,
category `artist.new_show`. Traced from `runArtistFanoutSafely` through the match
query to the insert with no conditional in between other than the claim below.
Nobody has watched it happen.

### Fires once — **read, and the mechanism is sound**

**Idempotency key: the unique `(user_id, event_id, kind)` on
`spotify_alert_log`.** `claimAlert` (lines 192–197) inserts with
`onConflictDoNothing()` and returns whether the row was taken; every downstream
write sits behind `if (claimed)`. The claim is what serialises, not the
notification insert — so a re-run and a concurrent run are covered by the same
constraint rather than by ordering. This is the right shape, and it is the one
claim here I would defend without running it, because the guarantee is the
database's rather than the code's.

The table's name is Spotify's, from when Spotify sync was the only source of a
follow. It is now the shared claim ledger for both sources. That is worth a
rename and is not one this PR takes.

### Fires for exactly the right audience — **unrun**

The match is a join from the event's lineup to `artist_follows` (line 282), so a
user with no follow has no join row to produce and cannot be notified. That is
structural rather than conditional, which is reassuring. But fan-out bugs are
specifically the ones invisible from a single account, and no second account was
used, so the reassurance is from the shape of the query and not from evidence.

Follow **source** does not affect the match. Spotify-derived and manually-added
follows sit in the same table and the join does not filter on source (lines
310–313), which is the intended behaviour — a follow is a follow.

### Auto-watch

The fan-out optionally also inserts a `user_events` row at status `watching`
(line 365). It is gated on a per-user preference:

```
autoWatch: sql<boolean>`coalesce(${userNotificationPreferences.artistAutoWatch}, false)`
```

**The coalesce default is `false`**, so a user who has never touched the setting
does not get shows silently added to their Watching list. That matters because
Watching is a list the user curates by hand; writing to it unasked would be the
product deciding on their behalf. The default being off is correct and is the
one thing in this gate worth re-checking if the preference ever moves.

## 2. Weekly digest — **not proven, and here is why**

`apps/api/src/jobs/spotify-weekly.ts`, cron `concert-crawl-spotify-weekly`,
`30 15 * * 1` (`render.yaml` lines 81–115 prod, 261–295 staging). The cron is
real and provisioned in both environments.

Native follows enter the digest behind a flag:

```ts
NATIVE_DIGEST_ENABLED === '1'
```

**That variable is unset in staging and unset in prod.** Unset is falsy, so today
the digest covers Spotify-connected users only, exactly as it did before this
epic. The native-following leg of the digest is written, unit-tested, and
**switched off in every environment that has real users**.

So the digest's native leg is unproven twice over: unrun like the rest of this
gate, and switched off in both environments that have real users. Flipping the
flag is Hugh's call, not an autonomous run's. Named here so nobody reads this
document as evidence of a shipped digest.

Idempotency is a dedupe key, `${userId}:${isoWeek}` (line 114), handed to
`sendTransactionalEmail()`. A second run in the same ISO week is dropped by the
mailer rather than by our own table, and only `sendOutcome === 'sent'`
increments `digestSent` — so the counter reports sends, not attempts.

## 3. Push delivery

Push is per-notification, and the audience question here is the one that bites:
a fan-out matching forty users must send forty scoped pushes, not one broadcast.

The loop is scoped per user — `for (const [userId, pending] of pendingByUser)`
(line 425) — and the send itself filters subscriptions by owner
(`packages/push/src/send-push.ts:141`, `eq(pushSubscriptions.userId, input.userId)`).
There is no join from artist to subscription anywhere in the path, which is the
shape that would produce over-delivery. Searched for one; it does not exist.

## Lifecycle

| Question           | Answer                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| What marks it seen | `user_profiles.notifications_seen_at` — a timestamp, so it is per user, not per row                    |
| What marks it read | `notifications.read_at` — per row                                                                      |
| Second device      | Both are server-side, so a read on the phone is read on the laptop                                     |
| Old records        | Pruned. `runNotificationPrune()` in the daily `billing-daily` cron, `NOTIFICATION_RETENTION_DAYS = 90` |

Seen and read are deliberately different things and are stored differently: seen
is "you have looked at the list", read is "you have opened this one". The badge
uses seen; the row styling uses read. Do not collapse them.

## The state a new user actually sees first

Before any trigger has ever fired, the notification surface renders its empty
state (`apps/web/src/components/settings/notifications/definitions/copy.ts`
lines 71–75):

> **No notifications yet.**
> Watch a show and we'll ask if you want a heads-up when its tickets or details
> change. Or flip this on now.

It is gated on `!masterOn && !deviceState.subscribed`, so it doubles as the
turn-it-on prompt rather than being a dead end. This is the first thing a
brand-new follower sees, and it currently talks about _watching a show_ rather
than _following an artist_ — accurate before this epic, narrower than the product
after it. Flagged, not edited here: it is a settings-surface string outside this
PR's diff and it is not wrong, only incomplete.

## What is owed before this gate is discharged

Three runs, none of them long, all of them needing a stack this run did not have:

1. **Fire it.** Seed a follow, insert a matching event, confirm the notification
   row exists.
2. **Fire it twice**, including concurrently, and confirm one notification. The
   claim ledger says this holds; watch it hold.
3. **Fire it with two accounts**, one following and one not, and confirm the
   second gets nothing. This is the leg that cannot be faked from one account.

Then the digest, with `NATIVE_DIGEST_ENABLED=1` in staging only, on Hugh's say-so.

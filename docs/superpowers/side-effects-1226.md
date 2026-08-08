# Gate 6 — Side-effect provenance: `crew.*` notification fan-out (#1226 PR-7)

Crews' notification layer is the one part of this epic whose core is a record created by
something _else_ happening. Clicking through a rendered bell proves nothing about it, so each
claim below was proved by running the trigger, not by reading the code.

Scope: the three bell-only categories `crew.going`, `crew.joined`, `crew.left`.

## 1. Fires

| Trigger       | Real upstream action                          | Result                                                     |
| ------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `crew.going`  | `PUT /v1/attending/:eventId` by a crew member | One row per other member of each crew the actor belongs to |
| `crew.joined` | Accepting an invite via `/v1/crew-invites`    | One row per member already in the crew                     |
| `crew.left`   | `DELETE` self-membership on `/v1/crews`       | One row per remaining member                               |

All three are asserted end to end in `apps/api/src/lib/crew-notifications.integration.test.ts`.
Fan-out runs **after** the triggering write commits and swallows its own failures, so a
notification problem can never roll back an attendance or a membership change that already landed.

## 2. Fires once

**`crew.going` is the only trigger that can race**, because attendance is a user-repeatable tap.

The original implementation guarded on a read-then-write (`SELECT attendingAt` → early return),
which settles a _sequential_ re-tap but not two concurrent ones: both requests read "not going
yet" and both fan out. Fixed by making the transition atomic — the upsert carries
`setWhere: isNull(userEvents.attendingAt)` and `.returning()`, so exactly one request claims the
move off `null`, and only the claiming request notifies. **No separate idempotency key is needed:
`(userId, eventId)` with the null-attendingAt predicate is the key.**

The request that _loses_ the claim still has to answer honestly: it reports the timestamp that
persisted rather than the one it generated, so two concurrent taps never disagree about when the
user committed.

Proved in `apps/api/src/routes/attending.integration.test.ts`:

- sequential double `PUT` → 1 row
- two concurrent `PUT`s via `Promise.all` → 1 row, and both responses carry the stored timestamp
- go → un-go → go → 2 rows (a genuine second decision _is_ news; suppressing it would be a bug)

`crew.joined` / `crew.left` cannot double-fire: the membership row's unique index means the second
attempt never reaches the fan-out.

## 3. Fires for exactly the right audience

- **Never the actor.** Asserted directly.
- **Only crew-mates**, never the whole user table — a user in no crew produces zero rows.
- **Deduped across crews**: sharing three crews with the actor yields one row, not three.
- **Muted members are excluded at write time** (`crew_mutes`, left-joined into the recipient
  query), and the mute is **per crew** — a mate muted in one shared crew still hears via the other.
- Fan-out is bounded at 11 recipients per crew by the member cap, so a single insert per crew is
  sufficient and no batching layer exists.

## 4. Lifecycle

| Question                        | Answer                                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What marks it read?             | The shipped `#737` bell shell. Crews adds no new read semantics.                                                                                                                                |
| Second device?                  | Read state is server-side, so it follows the account, not the tab.                                                                                                                              |
| Retention?                      | The existing `prune-notifications` job covers `crew.*` with no change. Verified by reading it: it selects on `type = 'user_notification'` and never on category, and crew rows carry that type. |
| Empty state before any trigger? | The bell's existing empty state. In Settings, the crew block renders `"You're not in a crew yet."` rather than an empty switch list — this is the state a brand-new user actually sees first.   |

## 5. Channel containment

Crew activity is **bell-only by contract**, not by omission. The three categories are absent from
the push-eligible set, and `packages/push/src/send-push.test.ts` asserts each one returns
`skipped: 'not_eligible'` with `sendNotification` never called — so a future category added to the
push pipeline by accident fails a test rather than buzzing a phone.

The per-crew mute in Settings sits **outside** the push master switch for the same reason: gating a
bell-only channel behind push would make it unreachable for the many users who leave push off.

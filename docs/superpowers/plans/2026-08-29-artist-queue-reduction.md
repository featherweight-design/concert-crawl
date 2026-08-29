# Artist review queue reduction

**Status:** in progress — PR 1 open
**Goal:** get the list of artists Hugh has to resolve by hand down to under 100.

## The problem

The admin artist queue is large enough that nobody works it. Four separate
causes contribute, and each needs a different fix — three in code, one as a
one-off pass over prod data.

| Cause                                                                                 | Fix                             |
| ------------------------------------------------------------------------------------- | ------------------------------- |
| Rows the match job will never resolve still sit in the ambiguous / no_match queues    | PR 1 — terminal exhausted state |
| Ambiguous rows are never re-checked, so a Spotify catalogue change never reaches them | PR 2 — bounded re-check         |
| 121 rows carry a display name the event billing already contradicts                   | PR 3 — corroborated name repair |
| The table lists every artist ever derived, including ones with no upcoming show       | PR 4 — default to upcoming      |

None of these is a new admin control. Hugh's constraint was explicit: automate
the fixes rather than adding another surface he has to operate.

## PR 1 — terminal exhausted state

`artists.matchAttempts`, an integer counter beside `matchStatus`.

- Every fruitless verdict increments it; a match resets it to 0, and so does an
  admin resolving the row by hand.
- At `MATCH_ATTEMPT_LIMIT` (3) the match job stops selecting the row. Without a
  ceiling, a growing set of unanswerable rows would eventually claim the whole
  daily batch and starve the rows nobody has looked at yet.
- The admin queue gains a derived `exhausted` filter. Exhausted rows move **out**
  of the queue they came from rather than being counted in both — the point of
  giving up on a row is that the ambiguous count visibly drops.
- They stay visible and keep their public artist page. Hugh: _"Show exhausted,
  yes, do not vanish."_

**Why a counter and not a sixth `artist_match_status`.** Exhaustion answers
"have we stopped asking", which is orthogonal to what the last search answered.
An enum member would overwrite the verdict, losing whether the row is
`ambiguous` (candidates a human could still pick from) or `no_match` (nothing to
pick). Same modelling as `hidden`.

Three attempts because the retry _cadence_ is the expensive part, not the count:
each attempt is weeks apart, so three spans months of catalogue churn.

The photo-refresh path is deliberately outside the budget. It maintains an
identity that is already established, and a row whose image keeps failing to
re-resolve still needs its next refresh.

## PR 2 — bounded ambiguous re-check

`ambiguous` is currently never retried, on the reasoning that re-searching
reproduces the same exact-name tie. That holds for the tie itself but not for
the catalogue: an act that gained a disambiguating release since the first look
now resolves cleanly.

- Re-check at **14 days**, not 7 — `PHOTO_REFETCH_DAYS` is already 7 and would
  compete for the same batch.
- Bounded by PR 1's counter, so the cadence cannot become a permanent tax.
- A `canonicalName` change resets `matchCheckedAt` to NULL, which puts the row at
  the front of the queue via the existing `nulls first` ordering. A renamed row
  is a different question and should not wait out the old answer's cooldown.

## PR 3 — corroborated display-name repair

121 rows whose `canonicalName` disagrees with how the act is billed on its own
events. Single-act bills only (`array_length(canonical_headliners, 1) = 1`), so
the billing names exactly one artist.

The rule only ever **shortens or re-cases**, never lengthens:

- `lower(billed) === lower(current)` — a case fix.
- `lower(current).startsWith(lower(billed))` — a suffix strip, which is what
  removes the tour name from `Dogstar: ALL IN NOW TOUR`.

Anything else is left alone for a human.

## PR 4 — admin table defaults to upcoming

The table lists every artist ever derived. Defaulting to "has an upcoming show"
is what makes the remaining number the number that matters — an act with no
future date costs nothing to leave unresolved.

## Prod ops pass

Gated on Hugh at every step, in this order:

1. Prune 234 stale rows. **Destructive.** 143 of them are `matched`, which means
   they have live `/artist/...` URLs that will 404 afterward.
2. Re-check the stuck ambiguous rows once PR 2 is deployed.
3. Re-run the MusicBrainz disambiguation pass.
4. Report the final review count.

Step 1 is the one that needs the most care; the rest are additive.

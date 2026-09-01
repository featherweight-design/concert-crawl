# Artist review queue reduction

**Status:** PRs 1–4 merged (#1632, #1634, #1636, #1637). PR 5, the tour-title
reap below, is the last code change; the prod ops pass follows it.
**Goal:** get the list of artists Hugh has to resolve by hand down to under 100.

> ⚠️ **The goal is not reachable with these four PRs.** Measured against prod on
> 2026-08-29, the unresolved queue is **1,342** rows, not the couple of hundred
> this plan assumed. See "What the numbers actually say" below before treating
> any of the estimates here as current.

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

## What the numbers actually say

Measured against prod on 2026-08-29, after PRs 1 and 2 merged. Unresolved means
`match_status` in `ambiguous | no_match | unmatched`, excluding hidden rows.

| Slice                              | Rows      |
| ---------------------------------- | --------- |
| Unresolved, all time               | **1,342** |
| …of those, with an upcoming show   | **554**   |
| …ambiguous with an upcoming show   | 392       |
| …no_match with an upcoming show    | 162       |
| Unresolved and unreferenced (dead) | 189       |
| Currently exhausted (3+ attempts)  | 0         |

Three consequences the original plan got wrong:

**PR 4 is the biggest lever by far, not PR 3.** Defaulting the table to
"has an upcoming show" takes the visible queue from 1,342 to 554 on its own.

**PR 3 does not reduce the queue at all.** The Spotify search reads
`canonical_name`, and the repair only rewrites `name`. It is a data-quality fix
— the one Hugh asked for by name — but it resolves nothing. Of its 126 rows,
49 happen to be unresolved and all 49 stay unresolved afterwards.

**PR 1's counter starts at zero.** No row is exhausted yet; it takes three
match-job cycles, weeks apart, before the filter has anything in it. The
exhausted bucket is a drain, not a step change.

Extrapolating the earlier MusicBrainz pass (39 of 118 ties broken, ~33%) over
the 392 upcoming ambiguous rows suggests ~130 more resolve, landing the queue
near **420**. Getting under 100 needs a lever this plan does not contain —
that is a decision for Hugh, not something to invent here.

### The duplicate-row class Hugh flagged

`Dogstar` and `Dogstar: ALL IN NOW TOUR` are two separate artist rows: the
second's _canonical_ name is itself the tour title. There are **85** such rows,
72 of them in the queue.

They are all unreferenced, so the reaper should take them — but it does not.
`prune-artists`' `BILLED_IN_LIVE_TITLE` widening spares every one of them,
because a tour-title canonical name is by construction a substring of its own
event title. That widening is the guard that saved Denzel Curry and Ministry
from a previous dry run, so it cannot simply be dropped.

Narrowing it safely is its own PR, and a destructive one — see PR 5 below.

## PR 5 — narrow the title spare to titles that say more than the name

The widening exists to find an act billed _within_ a title: the "& Denzel
Curry" half of a co-headline bill. So the title has to say something the name
does not. Where the two are the same string the row is not an act billed in a
title, it is the title itself, projected as an act back when the write-through
took any headline string it saw.

One clause: the sparing event's `canonical_title` must be **strictly longer**
than the apostrophe-stripped name.

Measured against prod on 2026-08-31, of 92 rows the widening spares, this
condemns exactly **22**, and every one of them is `no_match` — `Dogstar: ALL IN
NOW TOUR`, `Adela: The Red Bottoms Tour`, `Bass Package: Krisnova, MedX,
Majaztic, Nowhere`. Nothing `matched` or `ambiguous` is touched, so no live
`/artists/:slug` a human has confirmed goes with it. The next bucket up — one
character of extra title — is `gavn` and `melt`, both real matched acts, so the
boundary is where it should be.

**Why length and not name shape.** The separator rule considered first (require
the subsumed remainder to begin with `:`, `(`, `,`, `-`) catches 13 of the 92
and adds only 3 rows the length rule misses. It also needs a hand-tuned
separator list, and the boundaries loose enough to catch the rest (` tour`,
` rocks`, `b2b`, `presents`) match real acts: a live `ghost` subsumes
`Ghost Canyon`, a live `j` subsumes `Japan Fest`. The length rule cannot make
that mistake — `Ghost Canyon` is longer than `ghost`, so it goes on sparing it.
Three rows is not worth a fragile list, so the separator rule was dropped.

**What it deliberately leaves.** A tour title some _other_, longer live title
still prints stays — `Our Lady Peace: 30th Anniversary Tour` survives because a
real show bills it inside a longer string. That is the same signal that saves a
co-headliner, so the spare is evidence-based rather than keyed on name shape.
Three rows in that state; they stay for a human.

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
- The MusicBrainz resolver clears `matchAttempts` alongside its `matched` write.
  It is a resolution like any other, and leaving the counter spent would file the
  row into the `exhausted` queue if it ever returned to an unresolved status.

**The `canonicalName` reset moves to PR 3.** The original shape had a rename
reset `matchCheckedAt` to NULL, putting the row at the front of the queue via
the existing `nulls first` ordering — a renamed row is a different question and
should not wait out the old answer's cooldown. That still holds, but nothing
writes `canonicalName` after insert today: the crawler write-through and the
backfill are both insert-only, and the admin PATCH accepts only
`spotifyArtistId` / `matchStatus` / `photoUrl`. PR 3 introduces the first
rename, so the reset ships with it rather than as dead code here.

## PR 3 — corroborated display-name repair

**126 rows** (51 re-case, 75 suffix strip) whose display `name` disagrees with
how the act is billed on its own events. Single-act bills only
(`cardinality(canonical_headliners) = 1 AND cardinality(headliners) = 1`), so
the billing names exactly one artist and the two arrays cannot be mispaired.

`packages/db/src/scripts/repair-artist-names.ts`, modelled on `prune-artists`:
named `sql` fragments, dry run by default, `--apply` to write, sample + tally.

The rule only ever **shortens or re-cases**, never lengthens:

- `lower(billed) = lower(current)` — a case fix.
- `left(lower(current), length(billed)) = lower(billed)` — a suffix strip, which
  removes the tour name from `Dogstar: ALL IN NOW TOUR`.

Anything else is left alone for a human. A longer billing is how the bad rows
were made, so adopting one would be the bug rather than the fix.

**`canonicalName` is not touched, and the planned `matchCheckedAt` reset is
therefore dropped.** The reset moved here from PR 2 on the assumption that this
PR introduced the first rename of `canonicalName`. It does not. Every candidate
already holds the correct canonical name — the ladder fixed that side; only the
human-readable string is stale. Rewriting `canonicalName` would risk a unique-index
collision and change the derived `slug`, breaking a live `/artists/:slug`. So
there is still no writer for it, and the reset would still be dead code.

That also means this PR cannot change a match outcome: the Spotify search reads
`canonicalName`. It is a data-quality fix, not a queue reduction.

Prefix comparison uses `left(...)` rather than `LIKE billed || '%'` because the
billing is raw venue data — `Just_Graham` carries a LIKE wildcard. Same
reasoning as `strpos` in `prune-artists`.

## PR 4 — admin table defaults to upcoming

The table lists every artist ever derived. Defaulting to "has an upcoming show"
is what makes the remaining number the number that matters — an act with no
future date costs nothing to leave unresolved.

`upcoming` is a query param on both `GET /v1/admin/artists` and its `/counts`
sibling, defaulting to `true`. Both take it, and had to: a chip promising a
number the table it opens cannot produce is worse than no number.

The predicate lives in `apps/api/src/lib/artist-upcoming.ts` as a correlated
`EXISTS`, and is the public artist page's upcoming query restated as a
subquery — deliberately. "Has an upcoming show" must mean "a visitor can see a
future show for this act", or the admin hides rows the site is still rendering.
That inherits three things from `artists-public.ts`, and the two must not drift:

- Cancelled and postponed rows count. A cancelled show is still a page someone
  can land on, and every other list surface keeps it.
- The consumer pair applies — `hidden_from_consumer`, `first_missing_at`. An
  admin-hidden or crawler-stale row is not evidence of a show.
- The venue must be active. A deactivated venue's shows are gone from
  everything forward-looking.

The join is the same three-arm OR the public page uses, not the
`canonical_artist` fast path alone (#1203). An act that only ever appears as a
co-headliner or support billing still has a public page, so filtering on the
indexed column alone would hide exactly the rows the site renders.

Two things it is not. A search bypasses the filter, for the same reason it
bypasses `status` — a row the admin has to untick a box to find is a row they
will conclude we do not have. And nothing is deleted: `upcoming=false` lists
everything, and the rows are untouched.

## Prod ops pass

Gated on Hugh at every step, in this order:

1. Prune 234 stale rows. **Destructive.** 143 of them are `matched`, which means
   they have live `/artist/...` URLs that will 404 afterward.
2. Re-check the stuck ambiguous rows once PR 2 is deployed.
3. Re-run the MusicBrainz disambiguation pass.
4. Report the final review count.

Step 1 is the one that needs the most care; the rest are additive.

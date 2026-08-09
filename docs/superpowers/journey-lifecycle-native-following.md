# Gate 5 — Journey lifecycle, native following

Walked 2026-08-09 against a local dev stack (web :3000, API :3001) driving a real
Chromium session with Playwright. Every result below is an observation from that
run, not a code read.

## How it was run, and why that matters

The runtime leg of Gates 2 and 5 went unmet on PRs 1–10 of this epic, for two
compounding reasons that are worth writing down so the next run does not lose the
same days:

1. `pnpm db:migrate` fails on this machine with `type "artist_match_status"
already exists` (42710). The cause is **local drift, not a repo defect** — a
   fresh database takes all 80 migrations cleanly, so the dev database's schema
   was pushed ahead of its `__drizzle_migrations` journal at some point. The
   journal sits at 65 applied while the schema carries objects from 0078. Because
   `pnpm dev` runs migrate first, the whole dev stack refused to start.
2. Every native-following surface sits behind Clerk, and there are no local test
   credentials in the repo.

Both were worked around without touching anything of Hugh's:

- A separate database, `concert_crawl_nf_polish`, was created and migrated from
  empty, then seeded. **Hugh's `concert_crawl_db` was not modified.** Turborepo
  filters environment variables, so the override only takes effect when the API
  is started directly rather than through `pnpm dev`.
- A throwaway Clerk user was created in the **development** instance
  (`pk_test_…`) and signed in with a Backend-API sign-in ticket, which bypasses
  the instance's second factor. The user was deleted at the end of the run.

Sign-in tickets are **single use**. A ticket reused across two scripts silently
lands on the sign-in page, and the walk then reports every surface as empty —
which reads exactly like a feature that does not work. One run of this review
lost twenty minutes to that false negative; mint a fresh ticket per script.

## Journey — follow an artist from a show, and stop following them

The one journey the epic adds. Walked on mobile (390×844) as a **Premium** user;
the free-tier leg is recorded separately below.

### 1. Forward

| Step                 | Observed                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Event detail, before | One control, labelled `Follow`                                   |
| Tap `Follow`         | Label becomes `Following`                                        |
| `/following`         | Artist listed, tab badge `Artists 1`, heading `1 PLAYING DENVER` |

**Mutation feedback sub-check.** The label changed **47ms** after the click. This
is the check that caught the "I'm going!" bug on #70, where a server-rendered
page with no optimistic path looked inert. The follow control has an optimistic
path and it works. No throttling was needed to see the change land, and a
throttled run would only widen a gap that is already imperceptible.

### 2. Reverse

Unfollowing from `/following` does **not** remove the row, and does not decrement
`Artists 1` or `1 PLAYING DENVER`. This looked like the classic hollow-state
failure and was chased as one. It is not: `ArtistManageRow` documents the
behaviour as deliberate — there is no confirm step on unfollow, so _"the row
stays where it is until the next navigation, so a mis-tap is one tap to undo."_
The row's own control does flip to `Follow`, so the surface stays internally
consistent: the count describes the rows on screen.

The claim in that comment was then verified rather than taken on trust:

| Step                           | `empty`  | badge | heading | row present |
| ------------------------------ | -------- | ----- | ------- | ----------- |
| Before unfollow                | false    | 1     | 1       | yes         |
| Immediately after unfollow     | false    | 1     | 1       | yes         |
| After navigating away and back | **true** | –     | –       | **no**      |

The surface returns to a genuine pre-action empty state, not a hollow one. Pass.

### 3. Repeat (do → undo → redo)

Re-following the same artist after an unfollow works: the event-page control
reads `Follow` again on return, and flips to `Following` on tap. No dead key.

This is the pass that would have caught the #70 nudge bug, where a dismissal
keyed by `eventId` (immortal) rather than `userEventId` (deleted on unwatch)
silenced the nudge forever after one dismissal. The equivalent store here,
`nudge-dismissal.ts`, is keyed by `userEventId`, and the header documents the one
deliberate exception: a user who is also attending keeps the same row through an
unwatch, so their answer persists on purpose.

### 4. Resume

| Check                             | Result          |
| --------------------------------- | --------------- |
| Reload `/following` mid-journey   | Follow survives |
| Same user, second browser context | Follow visible  |

Nothing is held only in component state or one tab's memory.

## Free tier — the paywall leg

Walked first by accident, and worth keeping. As a free user, `POST
/v1/me/artist-follows` answers **403** with `code: entitlement_required`, and the
client turns that into the tier picker sheet rather than a dead button or a
generic error. The sheet renders correctly on first tap.

Note that `DELETE` is deliberately **not** entitlement-gated, so a user who
downgrades can still leave an artist they can no longer add. That asymmetry is
correct and is documented at the route.

## Defects the walk found, and the fixes

Two, both on the manage list, both fixed in this PR.

### The date was being truncated away — on both breakpoints

`<venue> · <date>` was one string in a single `nowrap` + `text-ellipsis` span,
so the ellipsis ate the tail. The tail is the date, which is the only part of
that line a user can act on.

| Viewport | Before                       | After                             |
| -------- | ---------------------------- | --------------------------------- |
| 390px    | `Red Rocks Amphitheatre · …` | `Red Rocks Amphith… · Aug 10`     |
| 1280px   | `Red Rocks …`                | `Red Rocks Amphitheatre · Aug 10` |

Fixed by `FollowDateLine`, which splits on the **last** separator (a venue may
contain one of its own) and renders the venue as the shrinking part with the
date pinned `shrink-0`. Same drop ladder the event row already uses.

Gate 3 applies: `ShelfCard` held a byte-identical single-span version, so it
was swept in the same PR rather than left as the next surface to report this.

### Desktop was narrower than mobile

At 1280px the artist name itself ellipsised — `Tame I…` — while 390px rendered
`Tame Impala` in full. The 940px column ran a three-up grid, which is 285px a
cell; the mobile row is 358px. Desktop was showing less than mobile in more
space, which is the responsive failure backwards.

The cause is a **deliberate** earlier divergence, not a layout slip. The
handoff's card carries an `sm` icon-only control; `ArtistManageRow` ships the
labelled `md` button on purpose, because an unlabelled check reads as
confirmation rather than as a toggle you can switch off. That label costs
~110px, which a 285px cell does not have. The grid is what gave way: two-up,
434px a cell. The control stays labelled.

## What this gate did not cover

Stated plainly rather than implied:

- **The nudge surfaces were not walked.** `FollowNudgeCard` reaches the screen
  only on a genuine first watch, and the seeded walker user had watch history
  that did not reproduce it. Its dismissal keying is covered by unit tests and by
  the code read above, but no screenshot of the rendered nudge exists from this
  run.
- **Onboarding was not walked.** The multi-step follow onboarding needs a
  brand-new account through the real sign-up flow, which the dev instance's
  second factor blocks for an automated run.
- **Push and digest delivery** are Gate 6's subject, not this one. See
  `side-effects-native-following.md`, including the honest note that
  `NATIVE_DIGEST_ENABLED` is off in both staging and prod.

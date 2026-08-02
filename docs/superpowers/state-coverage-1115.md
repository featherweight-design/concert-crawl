# Gate 1 — State reachability, #1115 Dedicated Artist Page

Run 2026-08-01 against `origin/main` @ `4dc31e4b`, after PR-B (#1310), PR-C (#1315) and
PR-D (#1316) merged and before the PR-E UI build started.

Audited against the state-coverage table in
`docs/superpowers/design-tables/1115-artist-page.md` §16 (42 rows).

**The question this gate exists to ask is Q3.** Q1 (is the field in the response type) and
Q2 (does the route compute it, or is it a `= null` stub) both pass trivially for most of
this epic. Q3 — _given how the component is actually mounted, seeded and cached, can this
condition ever be true?_ — is what caught #1169, and it is what produced every blocker
below.

Marking: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced ·
🚫 unreachable at runtime.

---

## Summary

36 of 42 rows ✅. Six findings, all resolved or dispositioned before the PR-E build began.

`shows`, `past`, `history`, `photoUrl`, `spotifyArtistId` and `following` are all genuinely
computed by `apps/api/src/routes/artists-public.ts` — none is a `= null` stub, and
`history.count` derives from the same row set the list renders, so the count and the list
cannot disagree.

---

## Findings

### 1. 🚫 Every signed-out state is unreachable — **resolved in PR-E**

`/artists` appears in neither `isAlwaysPublic` (`apps/web/src/middleware.ts:13-27`) nor
`isPublicOnceLaunched` (`:39-52`), and PR-E mounts the route under `(protected)`. The
`await auth.protect(...)` at `:175` redirects before the page component ever runs, so
`following: null`, `followSignedOut*` and `EmptyUpcoming signedOut` are application-level
impossibilities. PR-E Step 62's anonymous-render test would have passed against a state no
visitor can reach.

The plan (`:1004`) puts this out of scope — _"#794 owns the directory move and the
`isAlwaysPublic` matcher entry"_ — but #794 shipped and closed on 2026-07-30, so no owner
remains and the vertical would ship permanently dark.

**Resolution:** PR-E adds `/artists(.*)` to **`isPublicOnceLaunched`**, not
`isAlwaysPublic`. That list is gated on `isPublicBrowseEnabled()`, so the route stays
signed-in-only until the launch flag flips — this changes no current-day exposure. It is
the same treatment `/venues(.*)` already gets, and the artist page is the venue page's
closest sibling. A negative case in `middleware.test.ts` proves `/me` and `/admin` still
redirect, per the ⚠️ block at `middleware.ts:7-11`.

`isAlwaysPublic` was deliberately **not** used: it removes auth in both launch modes, which
is the #794 mistake that made a private-beta app publicly browsable.

### 2. ❌ No page-level error state — **fixed in PR-E**

The venue sibling (`apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx:32-34`)
catches every fetch failure with a bare `} catch { return null }`, then `:50`
`if (!result) notFound()`. A 500 from the API therefore renders "not found" — the visitor is
told the artist doesn't exist when the truth is that the server broke.

**Fix:** the artist page returns `null` only for a genuine 404 body and re-throws otherwise,
so `(protected)/error.tsx` catches it and the retry affordance the design table specifies is
actually reachable.

### 3. ⚠️ No `not-found.tsx` anywhere in `apps/web/src/app` — **fixed in PR-E**

`notFound()` currently renders Next's unstyled default: no header, no bottom nav, no theme.
Every existing route that calls it (venue, event) has the same hole.

**Fix:** add `apps/web/src/app/(protected)/(main)/not-found.tsx`. Placed in the `(main)`
group so it inherits the app chrome, which also repairs the venue and event routes.

### 4. 🚫 `EmbedLoading` (design table `:318-326`, `:264`) is built by no PR — **dropped**

Clock 2 of the embed is specified but appears in no task in the plan. Building it means an
iframe `onLoad` state; the Spotify embed paints its own skeleton inside the iframe, so ours
would be a second skeleton stacked on the first.

**Resolution:** dropped, along with the now-orphaned `playerLoading` copy key. Recorded here
rather than left as a silent omission.

### 5. ❌ Cancelled and postponed upcoming shows vanish — **fixed in PR-E's API touch**

`artists-public.ts:127` filters upcoming with `eq(events.status, 'upcoming')`, while every
other list surface (`events.ts:146`, `:542`, `:1166`) uses
`inArray(events.status, ['upcoming', 'cancelled', 'postponed'])`. A show the visitor is
watching disappears from the artist page at the moment it is cancelled — the moment they
most need to see it.

That the _past_ query handles status deliberately (`:146` `ne(events.status, 'cancelled')` —
a cancelled show is not one of the times you caught them) is what makes the upcoming
asymmetry read as accidental rather than intended.

**Fix:** match the sibling surfaces' `inArray`, and add `status` to `ArtistShow` so the card
can render the cancelled/postponed treatment it already knows how to render.

### 6. ⚠️ `following` pre-toggles on `spotify_top` — **fixed in PR-E's API touch**

The read at `artists-public.ts:188-193` counts a follow from any source, including
`spotify_top` — which is listening history, not a follow the user performed. So an artist
the user has never followed shows the Follow button already engaged, and pressing it to
unfollow does nothing visible, because DELETE is scoped to `source = 'manual'`.

**Fix:** the GET read excludes `spotify_top`. `manual` and `spotify_followed` both remain
true follows.

Note this is adjacent to, but distinct from, the DELETE contract fix already merged in
PR-D (#1316): that one made DELETE report the _effective_ state so a synced user's button
doesn't flicker. Both are needed.

---

## Non-blocking observations

- `showTime` is returned by the route and rendered by nothing. Left in place — PR-F's card
  may use it; no cost to carrying it.
- `history.count` is capped at 50 by the query limit, by design. The copy reads "50+" past
  the cap, so the number never lies.
- Design table row 37 (`venue` missing) is dead by construction: `venue` arrives via an
  `innerJoin` on a NOT NULL column, so a show with no venue cannot be selected. No fallback
  needed; noting it so a later reader doesn't add one.

---

## Evidence

| Check                   | Command / file read                                 | Result                                |
| ----------------------- | --------------------------------------------------- | ------------------------------------- |
| Matcher membership      | `apps/web/src/middleware.ts:13-52`                  | `/artists` in neither list            |
| Auth ordering           | `apps/web/src/middleware.ts:175`                    | `auth.protect()` precedes page render |
| Error swallowing        | `venues/[slug]/page.tsx:32-34`, `:50`               | bare catch → `notFound()`             |
| not-found presence      | `find apps/web/src/app -name 'not-found.tsx'`       | no matches                            |
| Upcoming status filter  | `artists-public.ts:127` vs `events.ts:146,542,1166` | `eq` vs `inArray`                     |
| Past status filter      | `artists-public.ts:146`                             | `ne(status,'cancelled')` — deliberate |
| Follow source predicate | `artists-public.ts:188-193` vs the DELETE scope     | read unscoped, delete `manual`-only   |

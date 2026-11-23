# Artist search UI: U1 follow errors, U2 search lists, U4 no-shows page

Approved by Hugh on 2026-11-23. Builds the UI half of `2026-11-22-artist-search-musicbrainz.md` (its PR "8+"), to the Yellow handoffs `design/design_handoff_bplus_redesign/addendum-12/` (merged) and `addendum-13/` (PR #830; where it differs from 12, 13 wins). Wording on the boards is placeholder and goes through `copy-review`. `design/` is reference only: nothing is imported from it.

**Not in this plan:** U3 (`ArtistPreview`, lane 9d), API-A (lane 9d), active years, link pills, a page-by-MBID route, any new endpoint, the production MusicBrainz load, backfill, the add-a-venue plan. No new top-level route, so `KNOWN_TOP_LEVEL_SEGMENTS` is unchanged.

## PR boundaries

Each PR branches from fresh `main`, merges alone, no stacking, about 20 files or fewer. Tests count toward size.

| PR | Branch | Contents | Depends on |
| --- | --- | --- | --- |
| U1 | `feat/artist-search-u1` | `ApiError` gains `retryAfterSeconds`; the `Retry-After` parse moves from `user-export.ts` into one shared helper both use; `useArtistFollow` maps 404, 409, 429, 503 to four states and exposes `error`; `FollowButton` follow block and the search row take an optional error prop; four row strings and four page strings in `copy.ts` | none |
| U2 | `feat/artist-search-u2` | `useSearch.ts` and the palette and `/search` switch to `scope=all`; kinds 1 and 2 rows, the rest list; one-letter, two-letter, loading, error and empty states; cap 8; Artists then Shows then Venues; "Artist pages" section removed; `SEARCH_SKELETON_COUNT` and `copy.search` updated; kind-3 rows Follow-only with the tap left as a prop | API-A (type on MB rows, cap 8); U1 for errors |
| U4 | `feat/artist-search-u4` | The no-shows artist page: plate and Commons photo, identity line, About block (TYPE and FROM only), Commons credit, Wikipedia attribution, Following states, empty Upcoming card, over `/v1/artists/:slug/info` | U1 for the follow block; API `{ following, slug }` for nothing here |

Order is U1, U2, U4. If U2 is blocked on API-A, U4 goes first. Release-notes entry (`apps/web/src/lib/definitions/releases.ts`, plus a spotlight if `design/design_handoff_spotlight_heroes/` has one) goes on the PR that makes search user-visible: U2.

## The seam for U3 (lane 9d)

Lane 9d's `ArtistPreview` opens from a kind-3 row. U2 gives the row one optional `onOpen` handler for kind 3 and renders nothing else new for it; until U3 lands, a kind-3 row is Follow-only (nothing happens on tap). The search row's follow path, `useArtistFollow` and `ApiError` are shared files: whichever of U1 and 9d's work merges first, the other rebases. Collisions are reported to the orchestrator.

## Route x viewport inventory (every PR draws its own rows)

Viewports: 320, 360/390 and 1280 (desktop). Themes per the repo's sheet convention.

| Surface | U1 | U2 | U4 |
| --- | --- | --- | --- |
| `/search` page: rest, one letter, two letters, results, loading, none, error | error row at 320 and 1280 | all states at 320, 390, 1280 | none |
| Cmd+K palette: same states | error row at 1280 | all states at 1280 | none |
| Onboarding picker row (check circle, not Follow) | unchanged (checked) | same list and second lines | none |
| `/artists/[slug]` no-shows page | follow error under the Follow at 320 and 1280 | none | all variants at 320, 360, 1280, Following and not |
| `/artists/[slug]` booked artist (regression) | error under the Follow | none | unchanged (checked) |

Checks per PR: the shared row component is the only row (import equality across `/search`, palette and picker); the error strings come from `copy.ts`; the phone and desktop layouts share one component.

## Ambiguities resolved from the nearest drawn pattern (each recorded as a row in the PR's `## Design review`)

- Signed-out 401 on Follow: the existing Follow sign-in prompt, not an error state.
- Unfollow from a Following preview: the page's Following toggle (U3's concern; noted here for the seam).
- A 429 `Retry-After` that is missing or unusable: the full hour, as `user-export.ts` already does.
- A 429 time reads as "2:15 PM" in the viewer's local time, never in Mountain Time.
- Error persistence: until the next tap on that Follow, a new query, or leaving the page (addendum 13 section 2).

## Open Hugh calls (do not block)

- Whether 404 and 409 grey out Follow. Built as drawn (greyed); one prop flips it.
- Unheld acts get a preview, not a page (the U3 route).

## Each PR

Worktree under `.worktrees/`, typecheck and lint only, CI runs the tests. Claude review per `pr-review` (these are UI and not risky classes: no route, DB, auth or payments change). `## Design review` table, contact sheet for the routes above against the lane's dev server, release notes where user-visible. Handoff to the orchestrator at each boundary.

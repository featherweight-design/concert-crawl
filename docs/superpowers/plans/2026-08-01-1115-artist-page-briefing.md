# Epic Run Briefing — #1115 Dedicated Artist Page

Companion to `docs/superpowers/plans/2026-07-27-1115-artist-page.md`. The plan owns sequencing
and per-task detail; this file carries only the facts the epic-run skill needs and the plan
does not state. Where the two disagree, **the plan wins** — that was Hugh's explicit ruling on
2026-08-01 when an agent-generated kickoff prompt contradicted it.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-27-1115-artist-page.md` — master sequencing: 7 PRs (A–G),
   23 tasks, 91 steps. Follow its order exactly; the sequencing lock is load-bearing.
2. `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md` — merged eng/design spec.
3. `design/design_handoff_artist_page/` — visual ground truth. `CLAUDE_CODE_HANDOFF.md` is the
   authoritative measurement doc; `READINESS.md` is 🟢 Green with five open items, all resolved
   in the plan's **Resolved open items** table.
4. `docs/superpowers/design-tables/1115-artist-page.md` — the Gate 4 Agent 1 enumeration,
   committed with this briefing. Paste it into every UI build subagent's prompt.

## Current state (verified 2026-08-01)

- **`NEXT_PUBLIC_PUBLIC_BROWSE`** — the #794/#1254 launch flag. Set in Vercel per environment;
  unset or any value other than `"true"` keeps the private-beta shape. Defaults closed. It is
  `NEXT_PUBLIC_`, therefore **build-inlined** — flipping it requires a redeploy, and a stale dev
  server will not pick it up.
- **`apps/web/src/middleware.ts` is two-tier and no longer matches what the plan describes.**
  The plan predates #794 shipping. Current shape: `isAlwaysPublic` (always open) vs
  `isPublicOnceLaunched` (open only when the flag is on). Read the file, not the plan's version.
- **#794 moved no directories.** Every browse route still lives under
  `apps/web/src/app/(protected)/(main)/`. The plan's "directory move plus one matcher entry"
  is therefore **one matcher entry only** — there is no move to do.
- **`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` do not exist yet** for the app-token
  (client-credentials) flow PR-C needs. #763 shipped user-scoped OAuth, which is a different
  grant. Provisioning is a Hugh action. PR-C is the designated pressure valve: if provisioning
  stalls, skip to PR-D and the route degrades to `IdentityArt` plates.
- **Migration numbering drifts under concurrent epics.** `0068` was claimed by #764's venue
  first-timer guide mid-run and forced PR-B to renumber to `0069`. Re-read
  `packages/db/migrations/meta/_journal.json` immediately before writing any migration; do not
  trust a number computed earlier in the run.
- **Known anomaly to ignore:** the staging crawler is intentionally paused. Prod is the
  crawl-health evidence. Artist rows on staging come from the seed's `backfillArtists` pass,
  not from crawling.
- **Watch for:** on 2026-08-01 a local `pnpm db:migrate` reported success and wrote a
  `drizzle.__drizzle_migrations` row while creating neither the table nor the enum. If the
  artists migration appears recorded-but-absent on staging, this is the thing to check first.

## Risk shape — **content/data-driven**

`/artists/{slug}` is an entity page fed entirely by crawled strings. Nothing here fires on a
schedule and almost nothing is a mutation, so Gate 6 does not apply (the one exception is
noted under Gate 6 below).

The bugs will come from the **long tail of real artist names**, not from the happy path. A
seeded "Phoebe Bridgers" renders beautifully; the failure cases are `P!nk`, `M.I.A.`, `AC/DC`,
a name that slugs to the empty string, two distinct artists that collide on one slug, a
30-character name overflowing the plate, an artist with zero upcoming and zero past shows, an
artist whose Spotify match is wrong or absent, and an expired signed photo URL that 403s at
render time. Over-invest in Gate 2 (forced states) and Gate 3 (sibling sweep); the slug unit
table in `packages/types/src/artist-slug.test.ts` is the cheapest high-yield surface in the epic.

Second-order risk: **cross-PR duplication**, the #794/#70 failure mode. PR-E, PR-F and PR-G all
render artist names and links. A mistake made in PR-E gets copied into F and G. The mid-run
cold-eyes review exists to catch that at PR-E, not after PR-G.

## Launch gating — **gated behind `NEXT_PUBLIC_PUBLIC_BROWSE`, defaults closed**

`/artists(.*)` goes into **`isPublicOnceLaunched`** in `apps/web/src/middleware.ts`, never into
`isAlwaysPublic`. That single line is what flips the vertical, and it lands in **PR-E** (the
route shell), because the route does not exist before it and adding it later would leave a
window where the page 404s for signed-out visitors in launched mode.

- **Reachable to signed-in beta users on merge of PR-F**, deliberately. That is the existing
  private-beta audience and is the point of shipping.
- **Reachable to signed-out visitors only when the flag flips**, on the Aug 18–22 launch window,
  along with the rest of the #794 browse surfaces. No separate switch.
- **Release notes / `releases.ts` do NOT need holding back.** The entry ships with PR-F and
  describes a feature that is genuinely live for the beta audience reading it. This differs
  from #794, whose changelog entry announced *public browse* and had to be pulled.

Every addition to a route matcher needs a negative case in `apps/web/src/middleware.test.ts`
proving `/me` and `/admin` still redirect. Non-negotiable, per the ⚠️ comment in the file.

## Off-happy-path homes

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| Following an artist | The Follow control on `/artists/{slug}` itself | Bookmark, the artist link on an event detail page, or search | Yes — the same control unfollows |
| Followed artist, **no other surface** | ⚠️ **Nowhere.** See below. | — | Yes, but only from the artist page |
| Artist with zero upcoming shows | `/artists/{slug}` empty state, which pitches Follow | Any inbound artist link | n/a |
| Artist with zero upcoming **and** zero past shows | Same empty state | Direct URL only — nothing links to a showless artist | n/a |
| Signed-out visitor taps Follow | Sign-up hand-off; returns to the artist page | The Follow control | n/a |
| Artist whose Spotify match failed | `IdentityArt` plate, no embed. Visually complete, silently degraded | Any inbound artist link | n/a |
| Artist whose photo URL expired | `onError` swaps to `IdentityArt` in the same fixed-height container | Any inbound artist link | n/a |

⚠️ **The manual-follow black hole — filed as issue #1306, deliberately not fixed in this epic.**
The Follow control writes `source: 'manual'` to `user_artist_follows`, but every downstream
consumer filters on `SPOTIFY_FOLLOW_SOURCES = ['spotify_followed', 'spotify_top']`
(`apps/api/src/lib/spotify-sync.ts:40`, and three more sites). A user follows an artist, the
button flips to "Following", and **nothing else ever happens** — no Taste filter, no fan-out,
no notification. Same shape as #70's "going but not watching has no home".

It is out of scope here because the Taste filter is entitlement-gated while brief §3.6 locks
Follow as a Free-tier affordance, which makes the fix a monetization decision rather than an
engineering one. Recommended resolution when Hugh picks it up: add `'manual'` to the **fan-out
only**, leaving the entitlement-gated Taste filter untouched. **Build PR-F's Follow as the plan
writes it. Do not expand scope to close this.**

## User journeys — walk script

Walk each of these forward, reverse, repeat and resume (Gate 5). Local dev with
`NEXT_PUBLIC_PUBLIC_BROWSE=true pnpm dev` covers all of them; none require staging except where
noted.

### J1 — Discover an artist from a show (the primary journey)

1. From `/events`, open any event detail page. → Headliner and supporting names render.
2. Tap the headliner name. → Navigates to `/artists/{slug}`; plate, name, history line render.
3. Confirm the history line reads against `CRAWL_SINCE` ('March 2026') and is not a bare count.
4. Tap the back chip. → Returns to the event detail page, scroll position intact.
5. **Reverse:** browser back from the artist page behaves identically to the chip.
6. **Repeat:** navigate in and out three times. → No duplicated fetches, no stale name flash.
7. **Resume:** reload on `/artists/{slug}` directly. → Renders fully; the back chip falls back
   to `/events` rather than dead-ending (history length ≤ 1).

### J2 — Follow and unfollow, signed in

1. On `/artists/{slug}`, tap Follow. → Control flips to the following skin.
2. Time the gap between tap and visible change **with the network throttled**. A server-rendered
   page with no optimistic path looks broken — this is the #70 "I'm going!" bug exactly.
3. **Reverse:** tap again to unfollow. → Returns to the genuine pre-action state, not a hollow one.
4. **Repeat:** follow → unfollow → follow. → Third state is correct and no duplicate row is
   written (the `(userId, source, spotifyArtistId)` unique index does not cover `source: 'manual'`
   rows with a null Spotify id; the API layer must guard).
5. **Resume:** reload after following. → Still following. Open in a second session → still following.

### J3 — Follow, signed out

1. Signed out, open `/artists/{slug}` with `NEXT_PUBLIC_PUBLIC_BROWSE=true`.
2. Confirm the Follow control is **pixel-identical at rest** to the signed-in not-following
   skin — #794 §3.10 wins over the handoff here. Honesty lives in the accessible name
   (`ARTIST_COPY.followSignedOutAria`) and `aria-haspopup="dialog"`.
3. Tap it. → Sign-up hand-off, not a silent no-op.
4. **Resume:** complete sign-up. → Land back on the artist page, not bounced to `/events`.
   (See the `forceRedirectUrl` seam noted in the #794 pickup memory — verify, do not assume.)

### J4 — The empty artist

1. Open an artist with no upcoming shows. → Empty state renders and pitches Follow.
2. Open an artist with no upcoming **and** no past shows. → Still a coherent page, not a blank one.
3. Confirm neither variant offers a dead control or a section header with nothing under it.

### J5 — Search to artist

1. From `/search`, query an artist name. → Artist result appears (PR-G).
2. Open it. → Same page as J1 step 2.
3. **Reverse:** back returns to the search results with the query intact.

### J6 — The long tail (walk on staging after seed, not just locally)

Walk `P!nk`, `M.I.A.`, `AC/DC`, and any name that slugs to empty. Confirm each resolves to a
live URL, renders its name in original casing, and does not collide with a sibling.

## Hard pause points — stop and ask

- **Spotify app credentials.** Never ask Hugh to paste a key into chat. If PR-C needs
  provisioning, name the variables in the PR body with creation steps and move to PR-D.
- **Any change to `user_artist_follows` read filters.** That is issue #1306 and a monetization
  call, not an engineering one.
- **Adding `/artists(.*)` to `isAlwaysPublic`.** Never. It belongs in `isPublicOnceLaunched`.
- **Hand-running SQL against prod.** Migrations through the deploy pipeline are fine.

## Notify-and-proceed

- **Renumbering a migration** after a concurrent epic claims the number. Validate by running
  `pnpm db:migrate` against a clean local DB and confirming the table and enum actually exist
  (not just that a `__drizzle_migrations` row appeared). Capture the `\dt` output.
- **Skipping PR-C.** Validate that the artist page renders correctly with a null Spotify
  identity, capture the screenshot, note it in the run report, proceed to PR-D.
- **Pushing back on a Copilot finding** where a 2+-site sibling pattern already settles the
  question. Reply on the thread with the call sites, then proceed.

## Done means

- PRs A–G merged, each at the full Copilot bar.
- Gate artifacts committed with evidence, not attestation: `state-coverage-1115.md` (Gate 1,
  after PR-D and before PR-E), `journey-lifecycle-1115.md` (Gate 5, all six journeys × four
  passes), and this briefing's design table.
- Gate 6 is **skipped**, with one exception: the follow write is a record-creating mutation, so
  its "fires once" idempotency is proven inside J2 step 4 rather than in a separate artifact.
- Mid-run cold-eyes review run at PR-E, its findings fixed inside the run, and the remaining
  PRs' scope re-read against the triage list before they are built.
- The final PR slot is reserved for unscoped polish.
- `/artists(.*)` present in `isPublicOnceLaunched` with a negative `/me` + `/admin` case in
  `middleware.test.ts`.
- `releases.ts` entry and a `progress.md` row on PR-F.
- Issue #1306 still open and referenced, not silently closed.
- Every bug the walk finds ships with a regression test; route-shaped findings go into
  `apps/e2e/src/audit/manifest.ts` rather than a bespoke test.

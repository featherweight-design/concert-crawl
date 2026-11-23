# Artist search on a slim MusicBrainz copy

Approved by Hugh on 2026-11-22 ("a slim copy is fine"). Source: the MusicBrainz research spike of 2026-11-22 (lane scratch report; its findings are summarised below where they decide something).

**Goal.** One artist search box that finds any real act, not just the ones we have crawled, and a Follow that works for an artist with no Denver shows yet. Identity comes from MusicBrainz (MB), held locally, so search never waits on MB's API.

**Why a local copy, not live MB calls.** The spike sent MB about one request a second from one IP and was refused with 503 ("server is currently busy") on 44% of searches. Vercel functions share egress IPs with other tenants and do not share a limiter, so live per-keystroke search would fail a third to half the time. A local copy of MB's CC0 core data costs no API calls at read time.

Out of scope: any UI build (see "UI needs Design first"), a full MB mirror or MB's search server, MB tags, ratings, annotations or any CC BY-NC-SA data, and generated artist text.

## Decisions this plan makes

1. **The slim table holds CC0 core fields only**: MBID, name, sort name, aliases, type (Person, Group, ...), country or area name, disambiguation, and the Spotify and Wikidata URL relations. Nothing else from MB is stored.
2. **Loaded from the MB data dump, refreshed weekly by a GitHub Actions job.** It runs on GitHub Actions, never on Render. The job downloads the latest full export, extracts only the tables it needs, builds the rows, loads them into a fresh table and swaps it in inside one transaction, so a failed run leaves the old copy serving.
3. **One search box, one query.** `GET /v1/search/artists` searches our `artists` rows and the slim table together and returns one list: our artists with shows first, then our artists without shows, then slim-table acts. There is no "search more artists" step and no live MB call.
4. **Follow by MBID.** `artists.mbid` and `user_artist_follows.mbid` are new nullable columns (expand only). Following a slim-table act creates a lightweight `artists` row from the slim table (no MB call) and writes the follow with its MBID. The existing slug follow and the `(user_id, canonical_name)` manual dedupe index stay as they are.
5. **Image order:** the Spotify photo, then a Commons photo whose file licence permits reuse, shown with its credit, then the IdentityArt plate. Never a non-free English Wikipedia upload; the resolver checks the file is on Commons and reads its licence and author before using it.
6. **Info order:** MB facts (type, area, active years, links), then the Wikipedia extract with its attribution (credit and link, CC BY-SA, unmodified), then nothing. No generated text.
7. **Matching keeps today's safety rule.** An MB answer is accepted for an existing Spotify-matched artist only when its Spotify relation agrees with ours (the spike found 3 conflicts in 25).
8. **Spotify photos are re-fetched at least every 30 days and dropped when Spotify no longer has them** (Hugh, 2026-11-22). Spotify's developer terms allow only temporary caching. Today the daily `match-artists` job (`apps/api/src/jobs/match-artists.ts`) already date-stamps each photo (`artists.photo_fetched_at`) and re-fetches it after `PHOTO_REFETCH_DAYS = 7`, but when the name re-search no longer lands on the same Spotify artist it keeps the old photo, so a photo can outlive its source indefinitely. The change: refresh by our stored Spotify id rather than by name, clear `photo_url` and `photo_fetched_at` when Spotify no longer returns that artist or returns it with no image, and never serve a photo whose `photo_fetched_at` is more than 30 days old. The 7-day cadence stays as it is, inside the 30-day ceiling. The cleared row falls back to the next image in decision 5's order.

9. **No MetaBrainz supporter tier and no payment** (Hugh, 2026-11-22). MetaBrainz asks commercial users to take a supporter tier; Concert Crawl charges nothing, so the ask does not apply. Revisit only if the app ever earns revenue.

## UI needs Design first

Two surfaces need a Design handoff with a READINESS verdict before any UI PR:

- **the artist search box** (result rows for our acts and slim-table acts, disambiguation and country lines, the empty and loading states)
- **the artist page for an act with no shows** (today `artists-public.ts` 404s an artist with no visible event), including the photo credit and Wikipedia attribution lines.

This plan builds no UI. The API PRs below ship dark: nothing on screen changes until the Design PRs land.

## PR split

Each PR branches from `main`, merges alone, and stays under about 20 files and 800 lines. No stacked PRs.

| # | PR | Contents | Review | Depends on |
| --- | --- | --- | --- | --- |
| 0 | **This plan** | Plan doc only | none (doc) | none |
| 1 | **Schema (expand)** | Next free migration: `mb_artists` (mbid PK, name, sort_name, aliases text[], type, area, disambiguation, spotify_id, wikidata_id, refreshed_at), `pg_trgm` plus trigram and full-text indexes on name and aliases, nullable `artists.mbid` with a partial unique index, nullable `user_artist_follows.mbid`. Drizzle schema to match. Nothing dropped or renamed | risky: `/code-review medium` + checklist | none |
| 2 | **Loader and weekly job** | `packages/db/src/scripts/load-mb-artists.ts` (stream the dump, keep only the artist, alias, area, type, URL and link tables, build rows, load into a shadow table, swap in one transaction), `.github/workflows/mb-artists-refresh.yml` (weekly, plus `workflow_dispatch`), row counts and timing in the job summary. The first production run waits for Hugh's OK | risky | 1 |
| 3 | **MBID backfill** | Fill `artists.mbid` where the slim table's Spotify relation equals our Spotify id, then where one exact name-or-alias hit exists and we hold no conflicting Spotify id. Dry-run counts first. Ambiguous names stay null | risky | 2 |
| 4 | **Search API** | `GET /v1/search/artists` joins the slim table into one ranked list. Today the route drops any artist with no consumer-visible event and returns at most `ARTIST_RESULT_LIMIT = 3` (from 25 candidates); this PR lifts that gate for the new list and sets a new cap from the Design handoff, while the existing caller keeps today's gated, 3-row behaviour until the UI PR switches it. Zod response gains `mbid`, `disambiguation`, `area` and a `hasShows` flag. Existing fields unchanged | risky | 2 |
| 5 | **Follow by MBID** | `POST /v1/artists/follow { mbid }` (Zod, signed in): reuse the `artists` row with that MBID or create one from the slim table, then write the follow with `mbid`. `prune-artists.ts` keeps a row a follow points at. `artists-public.ts` serves a followed or MBID row with no shows (API only; the page waits on Design) | risky | 1, 3 |
| 6 | **Artist info and images** | A cached resolver: MB facts from the slim table; Wikidata sitelink to the Wikipedia summary (extract, article link); Commons image licence check through `extmetadata`. Image and info order as decided above. A descriptive bot User-Agent with a contact on every Wikimedia call | risky | 4 |
| 7 | **Spotify photo refresh** (decision 8) | `match-artists.ts`: the photo pass looks rows up by stored Spotify id, clears `photo_url` and `photo_fetched_at` when the artist or its image is gone, and counts clears in the job summary. Public artist readers treat a photo older than 30 days as absent. Tests for the clear and the age cut-off | risky | none |
| 8+ | **UI** | Search box and the no-shows artist page, built on the Design handoffs | per handoff, with contact sheets | Design handoffs, 4, 5, 6 |

A contract step (keying follows on MBID instead of `canonical_name`) is not planned. It needs its own plan once MBID follows are in use.

## Rollout and rollback

- Migrations in PR 1 are additive; rollback drops the new table, the two nullable columns and their indexes, and no existing data changes.
- The loader writes only `mb_artists`, through the shadow-table swap. A bad load is undone by re-running the previous week's dump.
- Production migrations and the first production load go through the normal promotion with Hugh's OK.

## Things to measure, not assume

- The slim table's row count and size on Neon after the first staging load (storage cost), and the trigram index size.
- Search latency over our rows plus the slim table at the p95 the current search hits.
- The dump's download size and the job's runtime on a GitHub-hosted runner (disk and the job time limit).
- How many staging artists gain an MBID in PR 3, by match bucket.

## Addendum 13 build: API-A and U3 (lane 9d)

Source: `design/design_handoff_bplus_redesign/addendum-13/` (READINESS Yellow; it also answers addendum 12). Lane 47 owns U1 (follow errors), U2 (search lists) and U4 (no-shows page) and writes its own section; this one covers only the two PRs below. Neither PR adds a route, a migration or a feature switch.

### Split

| PR | Branch | Contents | Review | Depends on |
| --- | --- | --- | --- | --- |
| API-A | `feat/artist-search-api-a` | The three API changes below, with tests. Ships dark: no caller reads the new fields until U3 | risky (API route): `/code-review medium` + checklist | none |
| U3 | `feat/artist-search-u3` | `ArtistPreview`: the tap on a MusicBrainz-only row. Release note on this PR, not on API-A | UI: `## Design review` + contact sheet, Claude review | API-A; rebases on whichever of U1 and U2 has merged |

### API-A

1. **`type` on MusicBrainz search rows.** `searchMbArtists` (`apps/api/src/routes/search.ts`) selects `mb_artists.type` and `ArtistSearchAllResult` (`packages/types/src/artist.ts`) gains `type: 'person' | 'group' | null`. MusicBrainz's `Person` maps to `'person'` and `Group` to `'group'`; every other value (Orchestra, Choir, Character, Other) and a missing one read `null`, which the preview drops ("each dropped when missing"). The words shown for the two values are copy, decided in U3 through copy-review, so the API carries a closed value and no label. Rows from our own half of the list (`ourRows`) read `null`: they open their page, not the preview.
2. **Follow by MBID returns the slug.** `ArtistFollowResponse` becomes `{ following: boolean; slug?: string }`; `POST /v1/artists/follow` returns `{ following: true, slug }` with the slug of the row it reused or created, so Open their page has a target and the same session can unfollow with `DELETE /v1/artists/:slug/follow`. The slug follow and the delete are unchanged.
3. **`ARTIST_SEARCH_ALL_LIMIT` 10 to 8**, the drawn cap (addendum 13, "Also settled"). `searchMbArtists` already takes the remainder after our rows, so the cap holds for the whole list.

Tests: the mapping (Person, Group, other, null), our-half rows read `type: null`, the follow response carries the slug for a created row and for a reused row, and the cap is 8 for a query that matches more.

### U3 inventory (route by viewport)

| Surface | 320 / 360 / 390 | 1280 |
| --- | --- | --- |
| `/search` list, kind-3 row tap | Sheet (the built sheet, blue-to-pink top edge) | Centred card over the page (ModalShell) |
| Command palette | n/a (phone has no palette) | Drill-in with a "Results for ..." back row; Esc goes back, a second Esc closes |

Each surface is drawn unfollowed and Following (Following adds "Their dates will live on their page." and Open their page). Boards: `boards/01-musicbrainz-tap`. One `ArtistPreview` body serves all three surfaces and takes the search row and nothing else. Follow sits inside the preview. Signed out, Follow uses the existing Follow sign-in prompt. Unfollow from the Following preview goes through the page's Following toggle, by the slug the follow returned. No new route.

### Out of scope

Active years and the extra link pills (no data reload ruled), a page-by-MBID route, any new endpoint, the MusicBrainz production load and backfill. Two Hugh calls are open and do not block: unheld acts get a preview rather than a page, and whether 404 and 409 grey out Follow.

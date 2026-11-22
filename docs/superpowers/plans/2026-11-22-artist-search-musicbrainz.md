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

## Open questions for Hugh (not decided here)

- **(a) Spotify photo refresh.** Spotify's developer terms allow only temporary caching, and `artists.photo_url` is kept indefinitely today. Proposed: re-fetch each photo every 30 days and drop it when the re-fetch fails.
- **(b) MetaBrainz supporter tier.** MetaBrainz asks commercial users to take a supporter tier. Proposed: the $0 Stealth Start-Up tier now, and a paid tier at launch.

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
| 7+ | **UI** | Search box and the no-shows artist page, built on the Design handoffs | per handoff, with contact sheets | Design handoffs, 4, 5, 6 |

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

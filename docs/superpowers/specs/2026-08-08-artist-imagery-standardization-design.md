# Artist & Event Imagery Standardization — Design

**Brainstorm date:** 2026-08-08
**Status:** Decisions locked — Design handoff prompt ready, eng specs below
**Related:** [#1115 artist page](https://github.com/HartiganHM/concert-crawl/issues/1115) (shipped), PRs [#1500](https://github.com/HartiganHM/concert-crawl/pull/1500) / [#1502](https://github.com/HartiganHM/concert-crawl/pull/1502) / [#1506](https://github.com/HartiganHM/concert-crawl/pull/1506) / [#1507](https://github.com/HartiganHM/concert-crawl/pull/1507)

---

## 1. Problem

Concert Crawl draws event and artist imagery from three sources with no unified rule:

1. `events.imageUrl` — artwork scraped from the venue's own listing page
2. `artists.photoUrl` — a press portrait from a matched Spotify artist
3. `IdentityArt` — a procedurally-generated SVG derived from the artist's name

Each surface picks its own source ad hoc, and no surface can reach more than one real source. Event surfaces see venue artwork or nothing. Artist surfaces see a Spotify portrait or nothing. Where a surface has nothing it falls to IdentityArt — except artist search results, which fall to a bare microphone icon instead.

The consequence is that we show generated art on events for which we hold a perfectly good real photograph, purely because the photo lives on a table the event response never joins.

### Measured state (prod, 2026-08-08)

Neon project `small-bird-62431126`, `events` filtered to `date >= current_date AND NOT hidden_from_consumer`.

| Upcoming consumer-visible events                  | Count | Share |
| ------------------------------------------------- | ----: | ----: |
| Total                                             |   990 |  100% |
| Has venue `image_url`                             |   380 | 38.4% |
| No venue image, but headliner has a Spotify photo |   317 | 32.0% |
| Neither — IdentityArt is the only option          |   293 | 29.6% |

| Artists with a consumer-visible page | Count | Share |
| ------------------------------------ | ----: | ----: |
| Total                                | 1,621 |  100% |
| Has `photo_url`                      |   737 | 45.5% |
| No `photo_url`                       |   884 | 54.5% |

Photoless pageable artists by `match_status`: 326 `ambiguous`, 303 `no_match`, 249 `unmatched`, 6 `matched`.

**Venue images are per-event, not house logos.** Across every venue with 5+ imaged upcoming events, the distinct-image ratio is 85–100% — Gothic, Bluebird, Mission Ballroom, Ogden, Marquis, Fiddler's Green and Meow Wolf are all at 100%; Levitt Pavilion 85% and The Fillmore 87% carry a handful of repeats. No venue reuses one image across its listings, so preferring the venue image needs no quality guard.

---

## 2. The rule

> **Event surfaces prefer the event's own artwork; artist surfaces prefer the artist's own portrait; each falls to IdentityArt rather than borrowing across the boundary.**

| Surface class                                | Resolution order                                               |
| -------------------------------------------- | -------------------------------------------------------------- |
| Event (rows, tiles, hero cards, detail hero) | `event.imageUrl` → headliner's `artist.photoUrl` → IdentityArt |
| Artist (artist page, artist search results)  | `artist.photoUrl` → IdentityArt                                |

Expected effect: event-surface IdentityArt drops from ~62% to ~30% of upcoming events. Artist pages are unchanged at ~55%.

The rule is stated as one sentence deliberately, so a future session can apply it to a new surface without re-deriving it.

### 2.1 — The chain applies in every slot, including heroes

Restricting the chain to small square avatar slots was considered and rejected. The large slots — the `EventRow` tile, `HeroEventCard`'s full-width 180px banner, and the 300px full-bleed hero on the event detail page — are where the 62% figure is most visible, so excluding them forfeits most of the win.

The cost is real and is handed to Design rather than waved away: a Spotify press portrait is square and usually a face, and it must occupy a wide banner card and a full-bleed hero without reading as an artist profile pasted into a concert surface. §4 states this as an objective problem. Shipping a bare centre-crop into a 300px banner is **not** an acceptable outcome — the treatment is a precondition of the chain reaching hero slots, not a follow-up.

### 2.2 — Headliner only; never walk down the bill

When the headliner has no photo, we do **not** search supporting artists for one.

Of the 293 floor events, 83 have a supporting artist with a Spotify photo, and zero are rescued by a second headliner (`canonical_artist` already carries top billing, so `canonical_headliners` contributes nothing). Walking the bill would take the floor from 293 to 210 — 29.6% to 21.2%.

Rejected because those 83 events would show the **opener's** face beside the headliner's name. That is a wrong picture a user can catch, which is the same failure mode already ruled unacceptable at the matching layer, where `ARTIST_MATCH_MIN_CONFIDENCE` demands exact canonical-name equality on the grounds that a wrong photo is worse than no photo. The principle extends from _which artist_ to _which billing_.

### 2.3 — Artist surfaces never borrow event imagery

Of the 884 photoless pageable artists, 216 have at least one event carrying a venue image. Using it would lift artist-page coverage from 45.5% to 59.0%.

Rejected. "Venue image wins" is an event-surface rule and does not survive the trip to an artist page. A gig poster is artwork about one night; an artist page represents a career. Worse, venue posters are frequently multi-act bill posters or festival lineups in which the artist is one name among many, or set in small print — a poor hero for a page about them. A variant restricted to sole-billing events was also rejected: the filter shrinks the win to a size that does not justify the branch.

### 2.4 — IdentityArt is neutral chrome, not an identity mark

IdentityArt is permanent on roughly 30% of event surfaces and 55% of artist pages. It should be retuned to recede — closer to a considered empty state than to decoration competing for attention. Its job is to let the eye pass to the title and date, which carry the actual information.

**Amended 2026-08-14, after the R3 design round.** This section originally asked for three things: quieter, lower contrast, and less palette variance. Design produced the evidence rather than the assertion — `design_handoff_event_artist_imagery/Slots and States.html` §9 renders the four loudest palette/template combinations in the registry at 44 / 56 / 112 / 208, shipped beside retuned, and again inside real rows. The read that survived it:

- **Quieter — accepted and delivered.** The monogram is removed at every scale and grain drops 0.10 → 0.06.
- **Lower contrast and less palette variance — declined, on evidence.** The palettes are unchanged. At 44–56 the palette reads as a colour accent and the row's hierarchy holds; at 112–208 the geometry becomes the subject, which is what the following shelf and the artist page want. The original ask assumed the art was competing with the title, but what was actually competing was a square source stretched across a wide band — which decision 1 of the handoff (wide slots stop being image slots) removes at the source.
- **One cut, taken:** `mesh` at **hero** scale is dropped from the template pool. Mesh is a gradient field with no geometry to resolve into, so scale only makes it a bigger gradient; it is the only combination in the registry that fails its own test. Mesh remains available at tile and micro.

So the retune is: monogram off, grain 0.06, panel hairline on, and no `mesh` at hero. Palettes and contrast are unchanged and are not to be re-opened without new evidence.

The opposite direction — leaning in, treating the generated art as the artist's sigil with the monogram promoted and the palette strengthened — was considered and rejected on two grounds:

- **A mark that appears intermittently is not a mark.** Under the rule above, the same artist presents different faces depending on surface and data luck: portrait on their artist page, venue poster on one show, IdentityArt on another. A sigil you cannot rely on seeing is a placeholder in costume.
- **It invests in something we are trying to delete.** As Spotify coverage improves, the identity-mark direction strands work on a shrinking surface, while neutral chrome simply recedes further.

---

## 3. Spec A — Consumer imagery chain

Consumer-facing, so it routes through the design pipeline (Track 2). The eng work below is buildable in parallel with the Design handoff **except** for the hero slots, which are gated on §2.1's treatment.

### 3.1 — API

`apps/api/src/routes/events.ts` serializes `imageUrl` in three response shapes (~lines 290, 513, 1138) and never exposes any artist photo. There is no `event_artists` join table and no foreign key — `artists` is a projection keyed on `canonicalName`.

Add a `LEFT JOIN artists ON artists.canonical_name = events.canonical_artist` to those queries and expose `artistPhotoUrl` alongside `imageUrl`. Single join, headliner only, no array expansion.

Constraints:

- The join cannot change row cardinality: `artists.canonicalName` carries a unique index (`artists_canonical_name_idx`, `packages/db/src/schema/artists.ts:79`), so no de-duplication is needed. If that index is ever dropped, this join fans out and silently multiplies event rows.
- Events whose `canonical_artist` is NULL or matches no projection row yield `artistPhotoUrl: null`. This is ordinary, not an error.
- The field is nullable in the response type. No client may assume its presence.

### 3.2 — `EventImage`

`apps/web/src/components/consumer/event-image/EventImage.tsx` currently takes `src: string | null` and falls to `IdentityArt` on null or load error.

Give it an optional second source so the resolution order lives in the component rather than in each of its callers: `src` → `artistPhotoUrl` → IdentityArt. The existing load-error fallback must chain the same way — a venue URL that 404s should try the artist photo before giving up on real imagery, not skip straight to IdentityArt.

Both remote sources are hotlinked today with no proxy, no CDN, and no `images.remotePatterns` allowlist in `next.config.ts`. This spec does not change that. Spotify image URLs can expire; the existing match job already re-searches stale-photo `matched` rows, and the load-error chain covers the window in between.

### 3.3 — `SearchResultsState`

`apps/web/src/components/consumer/search/SearchResultsState.tsx` (~lines 140–153) renders `artist.photoUrl` as a raw `<img>` and shows a `Mic2` icon when it is null, bypassing the shared component entirely. Replace with `EventImage` so artist search results fall to IdentityArt like every other surface. This is conformance to an existing pattern, not a design decision.

### 3.4 — Artist surfaces

`ArtistPlate` keeps its behaviour — `photoUrl` → IdentityArt, never event imagery. It moves onto the shared component for consistency of load-error handling and IdentityArt scaling.

### 3.5 — Testing

- API: an event with a venue image and a matched artist returns both fields; an event with neither returns both null; the join does not duplicate rows when an artist projection exists.
- Component: resolution order across all four combinations of the two sources, plus the load-error path falling from venue image to artist photo to IdentityArt.
- Search results render IdentityArt, not an icon, for a photoless artist.

---

## 4. Design handoff (Track 2)

The copy-pasteable prompt lives at `docs/superpowers/specs/2026-08-08-imagery-identityart-design-handoff-prompt.md`. It states two objective problems:

1. A square press portrait must occupy a wide banner card and a 300px full-bleed hero without reading as an artist profile in a concert surface. ~32% of upcoming events hit this.
2. IdentityArt is permanent on ~30% of event surfaces and ~55% of artist pages, and must be retuned as neutral chrome.

Out of scope for Design: the source priority (locked in §2) and all copy (a copy-writer call per `design-pipeline.md` § "Who owns copy").

---

## 5. Spec B — Spotify candidate persistence

Independent of Spec A: no shared files, no shared surfaces, and it can land first. Backend plus admin UI, so no design pass (admin is exempt).

### 5.1 — Why there is no _automatic_ dominance rule

> **Amended 2026-08-08, before implementation.** The section below argued that no dominance signal was needed because a human with the picker judges better than a threshold. Hugh withdrew that premise on reading it: _"Many I'm not familiar with and don't know how to make a determination."_ The bottleneck is not the admin's time, which the argument correctly sized — it is the admin's confidence, which the argument never tested.
>
> The volume arithmetic still holds and is left intact below; only the conclusion changes. Nothing is auto-applied, so §5.2's "nothing is auto-resolved" is untouched. Instead the picker computes a **dominance ratio** from the cached candidates' `popularity` and pre-selects the dominant one, surfacing the ratio so the admin confirms a suggestion rather than adjudicates a list of identical names. That is strictly cheaper than the threshold engine rejected below, because it runs against the cache §5.2 already builds and spends no Spotify call of its own.
>
> Two facts constrain the signal. Spotify's `/search` returns simplified artist objects with **no follower count**, so `popularity` (0–100) is the only dominance signal available without a second call per row — and it is already parsed and already displayed in the picker. And `ARTIST_MATCH_MIN_CONFIDENCE` is untouched: the suggestion lives in the admin UI, never in the matcher.

523 artist rows are `ambiguous`, meaning Spotify returned several exact-name candidates. A 40-row sample showed these are mostly not true homonyms — they are well-known artists (Lewis Capaldi, Bonobo, DJ Shadow, JPEGMAFIA) colliding with tribute, karaoke and bedroom uploads that share the name exactly. A popularity-dominance rule would plausibly clear most of them.

We are not building one, because the pile is smaller than it looks and the tool already exists:

- Only **203** of the 523 headline an upcoming visible event, and only **122** of those would change any event-surface pixel — the other 81 already carry a venue image, which wins under §2.
- **326** of the 884 photoless pageable artists are ambiguous. The rest are `no_match` (303, retrying from ~2026-09-01 per [#1507](https://github.com/HartiganHM/concert-crawl/pull/1507)) and `unmatched` (249, draining at 100/night).
- The admin candidate picker shipped in [#1350](https://github.com/HartiganHM/concert-crawl/pull/1350) and was polished in [#1362](https://github.com/HartiganHM/concert-crawl/pull/1362). At roughly 15 seconds a row, the 203 with upcoming shows is under an hour; the full 523 is a few sittings.
- Regrowth is **~21 rows/week** — the last full pre-backfill week (2026-07-27) produced 21. The 502 stamped in the week of 2026-08-03 are the 2026-08-05 backfill burst draining through the nightly cron, not steady state. Keeping up costs a few minutes a week.

Building a threshold engine to automate an hour of human work — one that must first re-search 523 rows against the Spotify quota that is the binding constraint on everything else — is the wrong trade. **A human with the picker has better judgment than any threshold, at this volume.**

Loosening `ARTIST_MATCH_MIN_CONFIDENCE` is explicitly not on the table. Exact canonical-name equality is deliberate.

### 5.2 — What we build

Persist the candidate set on the `artists` row whenever the match job or the picker fetches one from Spotify. Per candidate: Spotify artist id, name, popularity, image URL, Spotify URL, genres, and a fetched-at timestamp for the set. No follower count — `/search` does not return one, and a second call per row to get it is exactly the quota spend this section exists to avoid.

- The picker reads the cache and opens with **zero Spotify calls**. A second look at a row is free.
- An explicit refresh control re-searches when the admin wants fresh data.
- Nothing is auto-resolved. Persistence is picker infrastructure, not rule infrastructure.

The framing matters: this is the piece with value under every future path. If accumulated candidate data later shows a dominance rule is safe, that becomes a separate decision made against real evidence rather than a promise attached to this build.

### 5.3 — Constraints

- Storage shape is an engineering call. Whatever is chosen must tolerate Spotify's response shape changing and must not break the row if a cached candidate is later unresolvable.
- `GET /search?type=artist` returns **simplified** artist objects with no `genres`; only `GET /artists?ids=` (capped at 50 ids, `null` slots for unresolvable ids) carries them. The picker hydrates genres separately, and `fetchGenres` is deliberately not folded into `searchArtists` — the batch matcher calls the latter on every row and ignores genres, so folding would double its quota spend for a field it never reads. Cache whichever fields each call path actually returns; do not manufacture a call to fill a gap.
- Every Spotify call goes through the shared `fetchWithTimeout` in `apps/api/src/lib/spotify.ts` and the capped `Retry-After` handling from [#1502](https://github.com/HartiganHM/concert-crawl/pull/1502). Caching must not introduce a new call path that bypasses either.
- Clearing the existing 523 is Hugh's picker time, not code.

### 5.4 — Testing

- A picker open against a cached row issues no Spotify request.
- An uncached row fetches, persists, and serves from cache on the next open.
- Explicit refresh overwrites the cached set and its timestamp.
- A cached set survives a candidate that no longer resolves.

---

## 6. Out of scope

- Any change to `ARTIST_MATCH_MIN_CONFIDENCE` or the ambiguity criterion.
- Auto-resolution of `ambiguous` rows by any rule.
- Retrying `ambiguous` in the match job — it is deliberately terminal and pinned by a test. Only the picker breaks the tie.
- An image proxy, CDN, or `next.config.ts` remote-pattern allowlist.
- Raising `MATCH_BATCH_SIZE` or otherwise force-draining Spotify. ~5 back-to-back runs exhausts a rolling budget and cooldowns run for hours; plan around the nightly 100/night cron.
- Deleting IdentityArt. It is a permanent floor for a large minority of artists, not a transitional state.

# Addendum 12 (2026-11-22): one artist search box, and the artist page for an act with no shows

The two surfaces that `docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md` (PR #805) says need Design before any UI PR: the artist search box, now searching our acts and the slim MusicBrainz copy as one list, and the artist page for an act with no shows, which today 404s.

Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-12/a12.py` (`python3 a12.py <dest>`, then `node render.js <dest>`). **All wording here is placeholder** for copy review. **Every act except Clipse is invented sample data**, and the Commons photo is a drawn stand-in, not a real file. `01/search-spec` means `screens/01-artist-search/search-spec.jpg`. The dashed pink outline on the boards only marks the piece under discussion; it is not UI.

No new colours and no new motion: every colour is an existing B+ Electric token, and the skeletons use the existing loading treatment.

## The rulings, in one table

| Item | Ruling | Boards |
|---|---|---|
| One list | Artists come back as one list in three kinds: has shows, ours without shows, MusicBrainz acts. No sub-headers between kinds and no "search more" step | `01/search-spec`, `01/search-results-*` |
| Has-shows marker | A signal-tinted mono **N SHOWS** marker on the second line, before the next date. Only kind 1 carries it | `01/search-spec` |
| Second line | Kind 1: marker, next date, venue. Kind 2: "No Denver dates yet". Kind 3: disambiguation · area, else type · area, else type, else "Artist" | `01/search-spec` |
| Same name | When two listed rows share a name, every one of them shows disambiguation · area, kind 1 included | `01/search-spec`, `01/search-results-360` |
| Art | Kind 1 and 2: photo if we hold one, else the IdentityArt plate. Kind 3: always the plate (search does no image lookups). Genre ring on kind 1 only; neutral ring otherwise | `01/search-results-*` |
| Follow | On every row, quiet weight, as built. Icon-only under 360px. Following stays in the list with its signal tint | `01/search-results-320`, `01/search-results-360` |
| Tap the row | Opens the artist page, for every kind, including a MusicBrainz act nobody follows (see READINESS, gap 2) | n/a |
| Cap | 8 artist rows; kinds fill in order. 4 skeleton rows while loading | `01/search-loading-320`, `01/palette-loading-d` |
| Order on the screen | **Artists** (this list), then **Shows** (today's event-derived rows, renamed), then Venues. "Artist pages" goes away | `01/search-results-*`, `01/palette-results-d` |
| States | Nothing typed (Recent, Popular, one hint card), one letter, loading, no result, failed | `01/search-rest-360`, `01/search-one-320`, `01/search-loading-320`, `01/search-none-320`, `01/search-error-320`, `01/palette-none-d` |
| Page photo | Spotify (no credit), then a Commons photo **with a credit line under it**, then the plate | `02/page-spec`, `02/page-commons-*` |
| Page ring | Neutral ring (`NEUTRAL_GENRE_COLOR`), no glow, no desktop starburst, as built for an ungenred artist | `02/page-*` |
| Identity line | One mono line under the name, where genre chips sit for a booked act: the search row's second line | `02/page-plate-360` |
| About | Facts (Type, From, Active, Links) then the optional Wikipedia summary with its attribution. A missing fact drops its row; nothing at all drops the section | `02/page-commons-360`, `02/page-plate-*` |
| Empty Upcoming | "No Denver dates yet." with one line that changes once you follow | `02/page-commons-320-following`, `02/page-commons-d-following` |
| Follow on the page | As built: hero bar on phone, right rail on desktop, gradient Follow then outlined Following. The empty card carries no second Follow | `02/page-*` |

## 1. The search box

### One list, three kinds

The list is ranked by kind first, then by the API's own match score inside each kind:

1. **Our artist, has shows.** Photo or plate in the lead genre's ring (as today's rows). Second line: the **N SHOWS** marker, then "Next Thu, Nov 12 · Red Rocks". At 320 the venue ellipsises first; the marker never does.
2. **Our artist, no shows.** Neutral ring. "No Denver dates yet". Usually an act someone follows, so this is where Following shows most.
3. **MusicBrainz act.** Neutral ring, always the plate. Second line from the slim table:
   - `disambiguation · area` when MB has a disambiguation ("Osaka noise trio · Japan")
   - `type · area` when it has none ("Band · United States")
   - `type` when there is no area ("Solo artist")
   - "Artist" when there is nothing. The row still shows and still follows.

   Type maps to words: Person "Solo artist", Group "Band", Orchestra, Choir, Character and Other as "Artist".

Kinds 2 and 3 look alike on purpose. To a fan both are "an act with nothing booked here"; only the marker matters.

**The marker** is new layout, not a new colour: `--signal` at 12% fill and 35% border, mono 9px, a 6px signal dot. It sits on the second line so every row stays one height (56px phone, 54px palette) and the Follow column lines up.

### Same name

The rule fires on what is listed, not on the database: when two or more rows in the result share a name (case-insensitive), **each** of them shows disambiguation · area. On a kind-1 row that replaces the venue after the date ("2 SHOWS Next Thu, Nov 12 · US hip-hop duo"). An unrelated single "Clip" shows its normal second line.

### Follow

`FollowButton`, quiet tone, as built: size `row` on the phone, `rowWide` in the palette. One loud control per screen still holds, because there is none here. **Under 360px it is icon-only** (+ / ✓), which the component already permits for that breakpoint, so the name keeps its width (`01/search-results-320`). Signed-out and locked keep their built behaviour and labels.

Following a kind-3 act is PR 5's `POST /v1/artists/follow { mbid }`; the row then reads Following with no change of position until the next query. Followed rows are never hidden: hiding them made "nobody by that name" lie in the picker, which `use-artist-search.ts` already has to work around.

### Tapping a row

The whole row (minus the Follow) opens the artist page, for every kind. For kinds 1 and 2 that is today's `/artists/<slug>`. For a kind-3 act nobody follows there is no `artists` row yet: see READINESS, gap 2.

On desktop, ↑↓ moves the highlight and Enter opens the highlighted row, as built; the Follow is its own Tab stop and owns its own Enter (the existing palette rule).

### Where the list sits

Today `/search` and the ⌘K palette show "Artists" (rows derived from events, opening a filtered Browse), "Venues", then "Artist pages" (the `/v1/search/artists` rows). This addendum makes the new list the **Artists** section and moves it first, renames the event-derived rows **Shows** (they are shows), and drops "Artist pages". Venues stay as built. See "Decisions only Hugh can make".

### Cap and states

- **8 artist rows at most**, filled in kind order, so a common word can be all kind 1. PR 4 sets the new cap to 8.
- **Nothing typed** (`01/search-rest-360`): Recent and Popular this week as built, plus one dashed hint card saying any act can be found and followed.
- **One letter** (`01/search-one-320`): the endpoint floor is two (`SEARCH_MIN_QUERY`), so no request goes out; a quiet "Keep typing" line.
- **Loading** (`01/search-loading-320`, `01/palette-loading-d`): four skeleton rows with the Follow footprint. Four, not eight: a query that returns three rows contracts by one row at most, and a full list grows downward only.
- **No result** (`01/search-none-320`, `01/palette-none-d`): "Nobody by that name." Only when artists **and** venues **and** shows are all empty; otherwise the empty section is simply not drawn.
- **Failed** (`01/search-error-320`): "Search didn't load." with Try again. A failure is never shown as "nobody by that name" (the picker's existing rule).

### The onboarding picker

The tour's in-step search queries the same endpoint, so it gets the same list, the same kinds and the same second lines. **Its rows keep their check circle, not Follow**, as `ArtistSearchRow.tsx` explains: the tour batches one write at its rail. Not drawn again here; it is the 320 row with the check in place of the Follow.

## 2. The artist page for an act with no shows

This is the built artist page (`09-artist`, `ArtistPageContent.tsx`) with the gaps filled, not a new page. Rules on `02/page-spec`.

### Photo and credit

- Order (plan decision 5): Spotify photo under 30 days old, then a Commons photo whose licence allows reuse, then the IdentityArt plate.
- **A Commons photo carries a credit line directly under the card**: `Photo: {author} · {licence} · Wikimedia Commons`, mono 10px `subtle`, each part a link (author page, licence deed, file page). Centred on the phone, under the card on desktop. It wraps; it never truncates (`02/page-commons-360`, `02/page-commons-d`).
- Spotify photos and the plate carry no credit, as today.

### Ring

No shows means no genres, so the card takes the built neutral ring (`NEUTRAL_GENRE_COLOR`, 1.25px, no glow) and the desktop starburst is not drawn. That is what the code already does for an ungenred artist; it is drawn here so nobody adds a colour for it.

### Identity line

Where a booked act shows genre chips, this page shows **one mono line**: the same text as the search row's second line ("Band · Leeds, England", "Osaka noise trio · Japan"). It is what tells two acts called Clip apart once you are on the page. A booked act that also has an MBID keeps its genre chips and does not get the line.

### About

A new section, titled "About":
- **Facts:** TYPE, FROM (the area), ACTIVE ("2011 to now", "1998 to 2004"), LINKS (official site, Bandcamp and similar, each an outlined pill with ↗, opening in a new tab). A missing fact drops its row.
- **Wikipedia summary**, optional, under the facts in the same card: the extract **whole and unedited** (CC BY-SA), no clamp, no "more". Under it: `From Wikipedia ↗ · CC BY-SA 4.0`, both links (article, licence). Never generated text (plan decision 6).
- No facts and no summary: the section is not drawn.
- Phone: after Upcoming. Desktop: the right column, above Listen.

### Upcoming, empty

The built `EmptyUpcoming`, with words for an act we have never seen here:
- Title: "No Denver dates yet."
- Not following: "We haven't seen them on a Denver bill. Follow them to hear the day they book one."
- Following: "You're following, so you'll hear the day they book one. This page is where it turns up."

The Follow stays where it is built (phone hero bar, desktop rail); the card carries no second one. The history note above it reads "Not on a Denver bill since we started looking in March 2026." An act with past shows keeps the built "Previously" section and today's empty copy.

### Everything else as built

Back chip, Share, the phone sticky bar, Listen when we hold a Spotify id (`02/page-commons-d`), signed-out and locked Follow, and the report card, which now also covers a wrong MusicBrainz match ("Wrong photo or details?").

## Boards

| Board | Shows |
|---|---|
| `01/search-spec` | The three kinds, second-line rules, same-name rule, Follow, cap, order, floor |
| `01/search-results-320` | "Clip" at 320: icon-only Follow, one Following |
| `01/search-results-360` | "Clip" at 360: labelled Follow, the two same-name Clips |
| `01/search-rest-360` | Nothing typed: Recent, hint card, Popular |
| `01/search-one-320` | One letter |
| `01/search-loading-320` | Four skeleton rows |
| `01/search-none-320`, `01/search-error-320` | No result; request failed |
| `01/palette-results-d`, `01/palette-loading-d`, `01/palette-none-d` | The ⌘K palette |
| `02/page-spec` | Photo order, ring, identity line, About, empty state, reading order |
| `02/page-commons-360` | Commons photo and credit, About with facts and Wikipedia, Follow |
| `02/page-commons-320-following` | The same at 320, Following |
| `02/page-plate-360` | MusicBrainz act: plate, identity line, two facts |
| `02/page-commons-d`, `02/page-commons-d-following` | Desktop, Follow and Following, with Listen |
| `02/page-plate-d` | Desktop, plate, facts only |

## Build notes

- `/v1/search/artists` (PR 4) returns `kind` or `hasShows` plus `showCount`, `nextShow` (date, venue), `mbid`, `type`, `area`, `disambiguation`, and a photo URL for kinds 1 and 2. Cap 8. The "same name" rule is computed client-side over the returned list.
- `useSearch.ts`: the artist fetch stops being a "garnish" that never gates `isLoading`; it is now the primary section and gets its own loading and error state. The event-derived rows keep their own.
- `copy.search`: `artistsSectionPrefix` now heads the new list; new `showsSectionPrefix`; `artistPagesSectionPrefix`, `artistPageNoUpcoming` and `artistPageRowTag` go. New placeholder strings: the marker ("{n} shows"), "No Denver dates yet", the type words, the hint card, "Keep typing", the failed state, the identity-line fallbacks.
- Artist page: an `AboutBlock`, a `PhotoCredit` under `ArtistStage`'s card, the identity line in place of `GenreChips` when there are no genres, and the new `EmptyUpcoming` strings. The picker's `SEARCH_SKELETON_COUNT` comment (three, matching the old cap) needs revisiting.
- Before the UI PR is ready, screenshot `/search`, the palette and a no-shows artist page at 320, 390 and 1280 against these boards and list the diffs in its body.

## Decisions only Hugh can make

None block the build. Each goes a step past the brief:
- **Search sections: Artists, Shows, Venues.** The brief asked for one artist list; making it the "Artists" section means renaming today's event-derived "Artists" rows to "Shows" and dropping "Artist pages". The alternative keeps today's sections and puts the new list where "Artist pages" is, which leaves two sections both about artists.
- **The cap is 8.** Enough for a same-name spread and a few MusicBrainz acts without pushing Venues off a phone screen.
- **Kind 3 never shows a photo in search.** Resolving Commons images per keystroke would break "search never waits on outside calls". The photo appears on the page.

## READINESS

**Verdict: READY to build, once two gaps in the plan are closed.** Neither changes the boards; both are API scope.

1. **The slim table cannot fill ACTIVE or LINKS.** Plan decision 1 stores only type, area, disambiguation and the Spotify and Wikidata relations. The page's facts block needs begin and end years and the official homepage and Bandcamp-style URL relations. They are CC0 core data like the rest, so the fix is to add `begin_year`, `end_year` and a small `links` column to `mb_artists` in PR 1 and the loader in PR 2, or to have PR 6's resolver read them from Wikidata. Until then those rows drop out (which the boards already allow), and the page still works.
2. **A MusicBrainz act nobody follows has no page to open.** PR 5 serves an `artists` row that is followed or has an MBID, but an unfollowed kind-3 act has no `artists` row. Tapping its row must either create the lightweight row (PR 5's follow path, without the follow; `prune-artists.ts` clears it later if nobody follows) or route by MBID (`/artists/mb/<mbid>`). Recommended: create the row on open, so every artist page has one URL shape. Until decided, the build can make kind-3 rows Follow-only and not tappable.

Everything else is drawn: all three row kinds, the marker, same-name handling, Follow and Following at 320, 360 and desktop, empty (nothing typed and one letter), loading, no result and failed; and the no-shows page with the Commons credit, the facts, the Wikipedia attribution, the plate fallback, and the empty state before and after Follow. The copy goes to copy review as usual.

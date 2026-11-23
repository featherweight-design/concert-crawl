# Addendum 13 (2026-11-23): artist search and the no-shows page, the follow-up

Engineering audited addendum 12 (#829) against the API as built and came back with four things that needed a Design call before the search UI can ship. This addendum answers them. Where it differs from addendum 12, this one wins.

**Live canvas (source of truth for review):** https://claude.ai/artifact/GkFMLJRt91HVF3gmBFXuZS, page **"Follow-up: taps, errors, states"** (the same canvas as addendum 12; its other two pages are unchanged except the credit line, see §4).

Boards are in `boards/` (HTML) and `screens/` (2x JPG), listed in `manifest.json`. Sources: project files `design/addendum-13/a13.py` (`python3 a13.py <dest>`, then `node ../addendum-12/render.js <dest>`; `dc13.py` puts them on the canvas). **All wording here is placeholder** for copy review. Every act except Clipse is invented sample data. `01/tap-spec` means `screens/01-musicbrainz-tap/tap-spec.jpg`. The dashed pink outline marks the piece under discussion; it is not UI. No new colours or motion: the error states use the existing `--danger` and `--warning`.

## The rulings, in one table

| Ask | Ruling | Boards |
|---|---|---|
| 1a. What tapping a MusicBrainz-only row does | Opens a **preview**: plate, ARTIST, name, identity line, TYPE and FROM, "Not on a Denver bill yet", Follow. Built from the search row's own fields: no new endpoint, no request | `01/tap-spec`, `01/preview-320`, `01/preview-360`, `01/palette-preview-d`, `01/search-page-preview-d` |
| 1b. How the row signals tappable versus Follow-only | No signal needed: **there is no Follow-only row**. Every row opens something | `01/tap-spec` |
| 1c. Right after Follow on such a row | Row reads Following and stays put; its tap opens the preview with Following and **Open their page**. In the preview, Follow turns to Following and Open their page appears | `01/preview-360-following`, `01/palette-preview-d-following` |
| 2. Follow errors | The message replaces the row's second line, or the pitch line under the Follow on the page, the preview and the desktop rail. `--danger` for 404 and 409 (Follow greys out), `--warning` for 429 and 503 (Follow stays live) | `02/errors-spec`, `02/search-errors-320`, `02/palette-errors-d`, `02/page-errors-320`, `02/page-errors-d` |
| 3. Missing viewports and states | All drawn | `03/*` |
| 4. Credit with null parts | Null credit: drop the author. Null licence link: licence as plain text. "Wikimedia Commons" always links the file page | `03/states-spec` |
| Cap | 8, confirmed | `03/states-spec` |
| Past shows only | **No marker** (never "0 shows"). Genre ring stays; the line reads "No upcoming Denver dates" | `03/states-spec`, `03/search-two-360` |

## 1. Tapping a MusicBrainz-only act

Three options were weighed (`01/tap-spec`):

- **Nothing (Follow-only).** The only rows in the list that ignore a tap would look broken, and would need a second style to say so.
- **A full no-shows page.** Needs a slug the row does not have until a follow creates it, so it needs a new route by MBID plus the info call. With no photo and no summary it would be the preview, made taller.
- **A lightweight preview. Chosen.** Everything it shows is already in the row (name, type, area, disambiguation), so it costs no request, and every row in the list now opens something.

**Where it opens.** A sheet on the phone (the built sheet, blue-to-pink top edge), a drill-in inside the ⌘K palette (a "Results for 'Clip'" back row; Esc goes back, a second Esc closes), and a centred card (ModalShell) over the /search page on desktop.

**What it shows.** The plate in the neutral ring, ARTIST, the name, the identity line (disambiguation · area, else type · area), TYPE and FROM (each dropped when missing), one line, "Not on a Denver bill yet. Follow to hear the day they book one.", and the loud Follow with its pitch. No photo, shows or summary: the row has none of them.

**The row.** Kind 3 looks and presses like kinds 1 and 2. No chevron on any row; the Follow sits at the end of every one.

**After Follow.** In the list the row reads Following and stays where it is. Its tap still opens the preview, now showing Following, "Their dates will live on their page." and **Open their page**. On the next query the act comes back as kind 2 (it has a row now) and its tap opens the page directly. Keyboard in the palette: Enter follows, then Enter opens their page.

## 2. Follow errors

Outcomes of `POST /v1/artists/follow` (the slug follow for kinds 1 and 2 shows the same states for the outcomes it can return):

| Outcome | Colour | Row message (placeholder) | Follow afterwards |
|---|---|---|---|
| 404 not found | `--danger` | We can't find this act any more. | Greyed out (retrying cannot work) |
| 409 name held by another act | `--danger` | Can't follow: another act we list has this name. | Greyed out |
| 429 rate limited | `--warning` | Lots of follows this hour. Try again at 2:15 PM. | Live; a tap retries |
| 503 try again | `--warning` | That didn't go through. Try again. | Live |

- The optimistic Following falls back to Follow first, then the message shows.
- **Row:** the message replaces the second line, with the alert glyph, wrapping to two lines if it must (the row grows).
- **No-shows page, preview, desktop rail:** a longer form of the message replaces the pitch line under the Follow.
- **429** gives the time from `Retry-After` in the viewer's local time. Every other row would hit the same limit, so any further tap shows the same time.
- A message stays until the next tap on that Follow, a new query, or leaving the page. Colour is never the only signal: each carries the glyph and words.

## 3. Missing viewports and states

| Board | Shows |
|---|---|
| `03/search-rest-320` | Nothing typed at 320 |
| `03/search-two-360` | Two letters, "Cl": our acts only, then "One more letter searches every act, not just ours." |
| `03/search-two-none-320` | Two letters, none of ours: the card points at the third letter instead of "Nobody by that name" |
| `03/palette-rest-d`, `03/palette-one-d`, `03/palette-two-d`, `03/palette-error-d` | The palette with nothing typed, one letter, two letters, and a failed search |
| `03/search-page-d` | The standalone /search page at desktop: a 720px column, the same list at `rowWide`, then Shows and Venues |
| `03/page-plate-320`, `03/page-plate-360-following`, `03/page-plate-d-following` | The plate page at 320, and Following at 360 and desktop |

## 4. Photo credit with null parts

Per `ArtistInfoImage` (`credit` null only for public-domain and CC0 files; `licenseUrl` nullable; `fileUrl` always set):

- Full: `Photo: {author} · {licence} · Wikimedia Commons`.
- **`credit` null:** drop the author and its dot ("Photo: Public domain · Wikimedia Commons"). Never "Unknown".
- **`licenseUrl` null:** the licence is plain text, not underlined.
- **"Wikimedia Commons" always links `fileUrl`**, so the line always has a link.
- **The author is plain text**, not a link. Addendum 12 drew it underlined; the API links the file page, which "Wikimedia Commons" already carries. The no-shows boards on the canvas are updated to match.
- Still one line at 8.5px, the author ellipsising first (addendum 12).

## Also settled

- **Cap: 8 artist rows**, confirmed.
- **The N SHOWS marker counts upcoming shows only and never reads "0 shows".** A row with past shows only (`upcomingShowCount` 0) has no marker, keeps its genre ring, and reads "No upcoming Denver dates". That line now covers kind 2 as well (addendum 12 said "No Denver dates yet").
- **Out of the first build:** ACTIVE and the link pills on the no-shows page, until Hugh rules on a data reload. The About block ships with TYPE and FROM. The addendum-12 boards that draw them stay as the later target.

## Build notes

- Preview: a new `ArtistPreview` body shared by the sheet, the palette drill-in and the desktop card. It takes the search row (`ArtistSearchAllResult`) and nothing else.
- Errors: `useArtistFollow` maps 404, 409, 429 (reading `Retry-After`) and 503 to the four states. The row and the follow block each take an optional error. Four new placeholder strings for row and page each, plus the two-letter hint and its empty card.
- Before the UI PR is ready, screenshot /search, the palette, the preview and a no-shows page at 320, 390 and 1280 against these boards and list the diffs in its body.

## Decisions only Hugh can make

None block the build:
- **The preview over a page-by-MBID.** If Hugh wants every act to have a shareable URL before anyone follows it, that is a new route and is not drawn.
- **404 and 409 grey out the Follow.** The alternative leaves it live, so people can retry into the same answer.

## READINESS

**Verdict: READY to build, with one API ask.**

1. **The MBID follow must return the new artist's slug.** Today `POST /v1/artists/follow` answers `{ following: true }` only. Without the slug, Open their page has nowhere to go, and Following cannot be undone in the same session, because unfollow is `DELETE /v1/artists/:slug/follow`. Return `{ following: true, slug }`; that is a small change inside PR 5's route. Until it lands, the preview after Follow can show Following with no Open their page, and the row can stay Following until the next query.

Everything in the ask is drawn: the kind-3 tap at 320, 360, the palette and /search desktop, with the after-Follow state; all four Follow errors on a search row and on the page at 320 and desktop; the missing search, palette and page states; the credit with null parts; the cap; and the past-shows-only row. Copy goes to copy review as usual.

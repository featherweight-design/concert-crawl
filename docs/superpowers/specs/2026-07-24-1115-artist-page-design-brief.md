# #1115 — Dedicated Artist Page — Design Brief

**Ticket:** [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115) — `type: design` · `phase: launch` · `priority: normal`
**Track:** 2 (needs design)
**Brainstorm date:** 2026-07-24
**Status:** Brief locked — awaiting Claude Design handoff production

---

## 1. Purpose

Concert Crawl treats artists as **strings**. They appear inside event titles, in the supporting-artists line, and in search results — but there is no artist-first surface anywhere in the app. A user who sees a band name they don't recognize has no way to answer the only question that matters at that moment: *should I care about this show?*

This brief covers a dedicated artist page whose job is to answer that question in a few seconds — who is this, what do they sound like, when are they playing here, and how do I not miss it.

**The problem, stated plainly:** the app can tell you a band is playing Tuesday at the Bluebird, but it cannot tell you whether you'd like them.

---

## 2. App context

### What actually exists today

Design should not trust the ticket's framing here — it overstates the data we have. Verified against `main` on 2026-07-24:

| Thing | Reality |
|---|---|
| Artists table | **Does not exist.** No artist master record anywhere. |
| Artist identity on events | Free-text strings: `events.artist`, `events.supportingArtists` (text array), plus normalized `events.canonicalArtist` and `events.canonicalSupporting` (`packages/db/src/schema/events.ts:54,55,109,122`) |
| Spotify artist IDs | Stored **only** on `user_artist_follows.spotifyArtistId` (`packages/db/src/schema/social.ts:70`), and only for artists a connected user already follows |
| Artist photos / genres / popularity | **Not stored.** The Spotify sync deliberately fetches name + ID only (`apps/api/src/lib/spotify.ts:43-48`) |
| Event↔artist matching | Normalized string equality, not ID joins (`apps/api/src/lib/spotify-matches.ts:86-101`) |
| Existing artist UI | None. The #763 discovery shelf and taste filter are event-centric; the images they show are event images, not artist photos |

**Consequence:** artist photos and playable music are net-new infrastructure for this feature, not a read of data we already hold.

### Spotify Web API constraints (February 2026 changes)

Spotify removed a large amount of the Web API in February 2026, applied to all existing client IDs. This directly invalidates several assumptions in the ticket:

| Capability | Status |
|---|---|
| `GET /artists/{id}` — artist object incl. **images** | ✅ Available. This is what makes the photo hero possible |
| `GET /artists/{id}/top-tracks` | ❌ **Removed** — we cannot build our own track list |
| `GET /artists/{id}/related-artists` | ❌ **Removed** — the ticket's related-artists shelf (its Q7) is not buildable |
| Artist `genres` | ⚠️ Deprecated — must not be load-bearing in any design |
| Artist `followers`, `popularity` | ❌ **Removed** from the response object |
| Editorial / algorithmic playlists ("This Is X") | ❌ Not reliably reachable |
| **Spotify Embeds** (iframe) | ✅ Available, and outside the Web API entirely — no auth, no quota, unaffected by these changes |

**Standing risk, wider than this ticket:** Spotify Development Mode now requires a Premium account and caps test users, effective for existing client IDs as of 2026-03-09. Our extended-quota request ([#1070](https://github.com/HartiganHM/concert-crawl/issues/1070)) is therefore load-bearing for the entire Spotify vertical, not just this page. This does not block design work.

### Voice

Sour Patch Kids: slight cheek, honesty rail, warmth. The honesty rail matters unusually much on this surface, because a page about an artist we only partially know must never imply we know more than we do.

---

## 3. Locked decisions

### 3.1 — Music is a Spotify **artist embed**

The page plays music via an embedded Spotify player scoped to the **artist** (`open.spotify.com/embed/artist/{id}`), which plays that artist's popular tracks.

**Rationale:** requires no Web API call, no OAuth token, and no quota headroom, so it is immune to the deprecation churn above. It degrades honestly by account type — anonymous visitors get 30-second previews, signed-in Spotify users get full tracks.

**Why not a "This Is ARTIST" playlist** (the original idea): editorial playlists are the exact category Spotify locked down, there is no guarantee a given artist has one, and finding its ID would depend on a search path we can't rely on. The artist embed delivers the same outcome — hear this band before buying a ticket — without a fragile lookup in the critical path of a hero element.

**Why not our own player:** `/artists/{id}/top-tracks` is removed, so there is no supported way to assemble a track list ourselves.

### 3.2 — Artist identity is resolved by **confidence-gated auto-match**

An artist string resolves to a Spotify artist by automated match. High-confidence matches auto-approve with no human involvement. Only the ambiguous tail — low score, or several plausible candidates — enters an admin review queue.

**Rationale:** pure human verification does not survive contact with reality; the show-review queue is already beyond one person's capacity. Pure auto-match confidently attaches the wrong face and the wrong music to common-word band names ("Wednesday", "Home", "Girlfriend"). Gating on confidence means the human only sees cases that genuinely need a human.

**Scoring is an engineering concern, not a design one** — the brief deliberately does not specify thresholds or signals.

### 3.3 — Unresolved artists show the **plain fallback**

While a match sits unresolved in the admin queue, the page renders the no-Spotify fallback: name, upcoming shows, history line, follow button — no photo, no embed. It silently upgrades once the match resolves.

**Rationale:** users never see a wrong face or hear the wrong band, and it adds no new state for Design to draw — "unresolved" and "no Spotify presence" render identically. Cost accepted: a real artist may look sparse while queued, and users cannot distinguish "we don't know them" from "we're not sure yet."

**Why not a hedged best-guess:** showing an unverified photo with a visual caveat plus a report affordance would improve coverage and recruit users into verification, but it puts wrong matches in front of real people, which cuts against the honesty rail.

### 3.4 — Route identity is a **canonical-name slug**

Not a Spotify ID.

**Rationale:** forced by the data model rather than chosen. Non-Spotify artists have no ID at all, and the entire event↔artist relationship already runs on `canonicalArtist` / `canonicalSupporting`. A slug is the only identity that covers every artist on the calendar. Engineering picks the exact scheme.

### 3.5 — One **Follow** button, meaning "watch every show this artist plays"

A single in-app affordance. It writes a `user_artist_follows` row with `source: 'manual'` (an enum value that already exists and is currently unused) and carries the existing `autoWatch` semantics. **Free tier.** It never writes to the user's Spotify account.

**Rationale:** one affordance, one mental model, and — decisively — it behaves identically for non-Spotify artists, which the alternatives don't. Watching is Free per the locked entitlements matrix (#781 R6).

**Why not separate Follow and Watch-all:** semantically cleaner and maps neatly onto Free vs Premium, but two similar buttons adjacent on a hero is where users stall.

**Why not mirror to Spotify:** writing into someone's personal Spotify library from a concert app needs its own consent moment and silently fails for non-Spotify artists.

### 3.6 — Page is **Free tier**

Locked by precedent, not deliberated: #72 shareable cards and #762 who-else-is-watching both landed Free for discovery surfaces, and the follow in 3.5 is Free. Alerts remain Premium as already locked.

### 3.7 — A **light history line** off our own data, built to extend

The page states how many times the artist has played Denver and where — a compact factual signal, not a full past-shows list. Copy must be honest about the window rather than implying a complete historical record, since our crawl data begins spring 2026. **Design owns how that honesty is phrased and whether the line reads as prose, chips, or a small stat block.**

**Forward-compatibility requirement:** the treatment must be source-agnostic, so that if a deeper historical backfill is ever licensed, the number changes without a redesign.

**Why not a full past-shows list:** doubles the page's primary content, needs its own pagination and empty state, and competes with the upcoming list for attention.

**Why not deep multi-year history now:** the only viable source is setlist.fm, which requires a commercial-use conversation *and* prohibits retaining its data — tracked in **#1170**, see §6.

### 3.8 — No upcoming shows is a **designed state**, not a leftover

An artist with no upcoming Denver shows gets the full page — photo, embed, history line, follow — with an honest empty block where the upcoming list would be, and the follow button carrying the moment ("nothing announced yet" → follow).

**Rationale:** this will be the *majority* state across the calendar's artists. It is the strongest conversion moment on the page, not a degraded case.

**Why not redirect away:** breaks links from past shows and search, and discards the follow opportunity precisely when someone is showing interest.

### 3.9 — Entry points: **event detail + search results only**

Links into the artist page come from (a) the headliner name and each name in the supporting-artists line on event detail (#643, shipped), and (b) artist matches in existing search results.

**Why not browse/calendar cards or the discovery shelf:** both are dense surfaces that already carry a tap target for the event itself. Nesting a second target — especially at the 320px baseline, and inside a horizontal carousel — is a real mis-tap problem that deserves its own design pass. Filed as **#1171**.

---

## 4. What Design will produce

Handoff at `design/design_handoff_artist_page/`, mirroring the structure of `design/design_handoff_who_else_is_watching/`.

**States to cover:**

1. **Populated, Spotify-known** — photo, embed, upcoming shows, history line, follow
2. **Populated, no Spotify presence** — the fallback shape (also serves unresolved-match artists per 3.3)
3. **No upcoming shows** — per 3.8, in both Spotify-known and fallback variants
4. **Many upcoming shows** — an artist with a residency or multi-night run
5. **Loading** — the artist fetch and the embed both have latency; the embed is a third-party iframe
6. **Follow states** — not-following / following, both tiers where relevant

**Also expected:**

- Mobile (320 baseline) + desktop, full behavioral parity
- All 3 themes: Electric / Jade / Light
- Decisions log covering every item in §8
- a11y annotation (see §5)
- Copy externalized as an `ARTIST_COPY`-style object ready to lift into `definitions/copy.ts`

---

## 5. Technical requirements

- **Themes:** Electric / Jade / Light. Token-only colors via `var(--*)`. No hardcoded hex.
- **The embed is an un-themeable iframe.** This is the single hardest visual constraint on the page: Spotify's player accepts only a background-color and dimensions, and will not inherit our tokens. Design must decide how a foreign-styled rectangle sits inside three different themes without reading as a bug — including in Light, where the embed's own chrome may clash hardest.
- **Mobile + desktop parity** is non-negotiable (behavioral parity; visual differences are expected).
- **WCAG AA.** Colored elements maintain contrast across all three themes. The embed is third-party and cannot be fully controlled — annotate what we *can* control around it (focus order, labeling, whether it's reachable by keyboard in sequence).
- **Artist images carry expiring signed URLs.** Design need not solve this, but should flag if a chosen visual approach implies specific caching or a specific aspect ratio.
- **All customer-facing strings** live in `definitions/copy.ts`. Artist names, venue names, dates and counts are data, not copy.
- **Prefer no new dependencies.** The Spotify embed is an iframe; it does not require a package.
- **Data available:** `events.artist`, `events.supportingArtists`, `events.canonicalArtist`, `events.canonicalSupporting`, `user_artist_follows.*`, and a live `GET /artists/{id}` fetch for photo.

---

## 6. What's NOT in this brief

| Excluded | Why / owner |
|---|---|
| Related-artists shelf | Not buildable — endpoint removed by Spotify Feb 2026 |
| Genres as a design element | `genres` is deprecated on the artist object; must not be load-bearing |
| Follower / popularity counts | Removed from the artist object |
| Deep multi-year show history | Only source is setlist.fm — needs a commercial-use license conversation, and its terms prohibit retaining the data. Tracked in **#1170** |
| Setlist previews for upcoming shows | Same blocker. Note: `events.setlist`, the `Setlist` type, and a working `SetlistPreview` component already exist in the repo but have never been fed real data — and the stored-column shape conflicts with setlist.fm's no-retention terms. Tracked in **#1170** |
| Artist links on browse cards + discovery shelf | Nested tap-target problem; own design pass. Tracked in **#1171** |
| Ticketing / purchase flows | Discovery and follow, not commerce |
| Artist biography, bio editing | Spotify gives what it gives |
| Community-submitted artist metadata | Out of scope |
| Artist search | Existing search covers it; this brief only links its results |
| Notification wiring for follow-artist | #737 territory, downstream |
| Match-scoring thresholds and signals | Engineering, not Design (per 3.2) |
| Admin review queue UI for ambiguous matches | Admin-utility surface — exempt from the Design pass per pipeline rules |

---

## 7. Decisions inherited

- **Entitlements matrix (#781 R6):** Watching is Free; alerts / attending / concert history are Premium
- **Free tier for discovery surfaces:** #72 shareable cards, #762 who-else-is-watching
- **Supporting artists render as discrete names** (#643, shipped) — the linkable units in 3.9 already exist
- **`avatarColor` atom** (#762) — available if Design wants a deterministic color for artists without photos
- **Themes:** 3 shipped (Electric / Jade / Light), not 9
- **Voice:** Sour Patch Kids; banned words include "fraud", "last chance"

---

## 8. Open for Design to call

1. **Hero shape** — what the top of the page is, and how photo, name, follow, and the embed relate to each other
2. **Where the embed lives** and how prominent it is — hero element, or below the fold
3. **How the un-themeable iframe is integrated** across all three themes (see §5 — the hardest call on this page)
4. **The history line's form and its honest phrasing** — prose, chips, stat block; how it admits the window without undermining trust
5. **Upcoming-shows list treatment** — chronological vs grouped by venue, and how much event detail each row carries
6. **The no-Spotify fallback's character** — how it avoids reading as broken, and whether it leans on `avatarColor`, typography, or something else
7. **The empty-upcoming block** — copy and how the follow button takes over as the primary action
8. **Follow button states** and where it lives on scroll (sticky sub-header vs inline)
9. **Header / back-navigation pattern** — own back affordance vs browser back
10. **How the hero compacts at 320px**, particularly with a photo and an iframe competing for vertical space
11. **Loading treatment** for the artist fetch and the third-party embed, which will resolve at different times
12. **Many-upcoming-shows** handling — truncation, grouping, or full list

---

## 9. Cross-references

- **Ticket:** [#1115](https://github.com/HartiganHM/concert-crawl/issues/1115)
- **Spotify sync epic:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) — all 11 PRs merged 2026-07-19; source of `user_artist_follows` and the taste features
- **Extended quota:** [#1070](https://github.com/HartiganHM/concert-crawl/issues/1070) — now load-bearing for the whole Spotify vertical
- **Supporting artists:** [#643](https://github.com/HartiganHM/concert-crawl/issues/643) — shipped; provides the linkable names in 3.9
- **setlist.fm license:** [#1170](https://github.com/HartiganHM/concert-crawl/issues/1170) — gates both deep show history (3.7) and setlist previews; filed out of this brainstorm
- **Artist links on browse cards + discovery shelf:** [#1171](https://github.com/HartiganHM/concert-crawl/issues/1171) — the entry points deliberately excluded by 3.9; filed out of this brainstorm
- **Sibling social surface:** `design/design_handoff_who_else_is_watching/` — structural pattern to mirror
- **Entitlements source:** `docs/superpowers/specs/` — #781 tier states brief
- **Pipeline workflow:** `docs/superpowers/design-pipeline.md`

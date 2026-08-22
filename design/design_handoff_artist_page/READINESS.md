# Readiness Review — Artist Page

**Verdict:** 🟢 Green
**Audited:** 2026-07-24 (R1 🟡 Yellow) → 2026-07-25 (R2 🟢 Green)
**Auditor:** Claude (Track 2 design audit)
**Related ticket(s):** #1115 (`[design] Dedicated Artist UI — Spotify photos + upcoming shows + follow/watch flows` — `type: design, source: internal, phase: launch, priority: normal`)
**Brief:** `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md`
**Plan PR target:** TBD (`docs/superpowers/plans/artist-page.md` — next step)

## Summary

Two rounds. R1 was structurally right and behaviourally under-built: five behaviours the
prose specified that no mock exercised, plus ten Lows. R2 fixed all five **in code**, not
in prose, and drew every one on the canvas. This audit re-traced each fix by executing the
model rather than reading the claims.

The design's core calls hold up: an identity band rather than a photo hero (a tall hero is
a large empty gesture for the ~60% of artists with no press photo), the embed treated as a
labelled guest rather than a failed native element, and a state-dependent block order that
never buries the empty state — the page's strongest conversion moment — under a third-party
rectangle.

Ready to plan against. The punch list below was applied in this PR rather than sent back for
an R3, because every item was a one-line edit or a question the schema already answered.

## R1 → R2 verification

| R1 Medium | R2 state | How verified |
|---|---|---|
| Skip link jumps backwards in the no-shows state | ✅ `EmbedSkipLink` returns `null` on falsy `targetId`; page passes `skipTo={hasShows ? "upcoming" : null}` | Read both call sites; artboard `a3` draws it |
| Two live follow affordances reachable | ✅ `StickyBar` takes `showFollow`, page passes `hasShows` — invariant enforced in code | Artboards `em-sticky` / `f-stick3` draw the bare sub-header |
| Desktop sticky left rail specified but absent | ✅ `position: sticky; top: 24` on the left column, outer div `overflowY: auto` | Artboards `f-deskrail` / `d4` render pinned at `scrollTop` 420 / 520 |
| `Show all N` unreachable (4 items vs cap 5) | ✅ `many` grew to 11 shows → **7 items**, over the cap | Re-executed `groupShows` in node |
| Back chip `#fff` vs shipped `var(--fg)` | ✅ `stroke="var(--fg)"`, 36px visible inside a 44×44 button | Diffed against `venue-profile/BackButton.tsx` |

Ten Lows: eight closed by Design, two closed here (the HTML `<title>` still read `#1169`;
README call 1 still read "150px at 320" against the handoff's "below 360").

## Verified against shipped code — not re-litigated

- `IdentityArt` is shipped at `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`
  and `ArtistPlate` passes props with exact parity (`name` / `kind` / `scale` /
  `showInitials` / `height` / `grain`).
- Rejecting `avatarColor` (#762) is correct — that's the settings-avatar system, sized for a
  24px disc; at 200px it reads as a placeholder.
- `mode: 'dark' | 'light'` is real on `THEME_META`, so `embedPlate()`'s light branch works,
  and it branches on `mode` rather than a theme name — which is what makes a three-theme
  mock sufficient for nine production themes.
- `--surface-1` / `-2` / `-3` are real in all nine themes.
- `color-mix(in oklab, …)` has 374 uses across 113 production files.
- "There is no `--shadow` token" is correct.
- Full hex sweep of the four authored files: only the photo stand-in, the `FOREIGN` embed
  palette, and `EMBED_LIGHT_PLATE` remain. The first two are mock-only; the third is the one
  documented production-surviving exception. **The token claim is accurate.**
- Zero unused `ARTIST_COPY` keys.

## Punch list — applied in this PR

1. `Artist Page.html` `<title>` still read `#1169` (a closed, unrelated Spotify-shelf fix).
2. **`many` fixture stated `history.count: 9` above a `past` list of 5 rows** — the prose
   claimed "9 shows on our map" and the evidence list under it contradicted it. Same set,
   one query, so the fixture was wrong: filled to 9 rows and the contract is now stated in
   both `artist-data.jsx` and the eng handoff.
3. **Gap-only clustering let a 42-day spread render as a "3-night run."** Confirmed by
   execution: three shows at 21-day gaps clustered into `run:3`. A cluster now needs to pass
   **both** tests — `RESIDENCY_MIN` count **and** total span within `RESIDENCY_WINDOW`.
   Re-verified: consecutive nights still group, the 42-day spread doesn't, and the `many`
   fixture still yields 7 items.
4. `countShows()` was dead code — defined and exported, never called.
5. `upcomingCount` keyed the Previously head too; renamed `showCount`, since the key name
   would mislead on lift into `copy.ts`.
6. README call 1 breakpoint wording aligned to `AP_NARROW_BP = 360`.
7. Folder note deleted — it claimed the repo has no `design/` parent, but `design/` holds
   30+ sibling handoffs and this drop is already correctly placed in it.
8. Line-count claim corrected (`artist-surface.jsx` is 379 lines).

Plus the brief's own error, which Design flagged and was ours to fix: §7 read
*"Themes: 3 shipped (Electric / Jade / Light), not 9."* Mock scope is three; production
ships nine. Corrected in the spec.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] New top-level route at `/artists/{canonical-slug}` — slug, not Spotify ID, so
  non-Spotify artists get a full page.
- [✅] Entry points bounded: event-detail headliner + supporting-artist names (#643) and
  search matches. Browse-card / discovery-shelf links explicitly deferred to #1171.
- [✅] Out-of-scope list is explicit and matches the brief: related artists, genres,
  follower/popularity counts (all removed or deprecated by Spotify's Feb 2026 API changes),
  deep multi-year history and setlists (#1170), notification wiring (#737).
- [✅] The one scope *addition* — the crawl-only Previously list — was confirmed by Hugh
  before Design built it.

### 🎭 State coverage
- [✅] Five artist fixtures cover populated/known, populated/no-Spotify (= unresolved),
  no-upcoming × known and fallback, and many-upcoming with a residency.
- [✅] Both loading clocks are independent and drawn: artist fetch (full skeleton) and
  player pending (well at exact final height, so the shows list can't shift).
- [✅] Follow: not-following / following / signed-out, plus three sticky-bar variants
  including the no-follow one.
- [✅] Mobile 390 + 320 + desktop for every primary state; behavioural parity, visual
  asymmetry only (mobile sub-header vs desktop sticky rail).
- [✅] Theme coverage exceeds the three-theme bar: five full-page renders plus the mat
  direction across Electric / Jade / Light.

### 🔌 Data contract
- [✅] Every field maps to something we already have or can trivially derive: `spotifyId`
  (nullable), `photo`, `history.{count,venues}`, `past[]`, `shows[{iso,venue,city,price}]`.
- [✅] `CRAWL_SINCE` is data in exactly one place, so a licensed backfill is a one-line
  change and no copy string needs rewriting.
- [✅] Follow writes `user_artist_follows` with `source: 'manual'` and carries existing
  `autoWatch`. Never writes to the user's Spotify account.
- [✅] `history` ↔ `past` contract now stated explicitly (same set, one query).
- [🟡] Press photos arrive on expiring signed URLs. Design flagged rather than solved, as
  instructed; the container is fixed-height and cover-cropped so an expired URL degrades to
  `IdentityArt` with zero reflow — but the plan PR must wire an `onError` swap, not just a
  null check, since the URL can expire between fetch and render.

### 🧩 Codebase fit
- [✅] Chrome matches shipped Event Detail v2 / Venue Profile (36px chip on `--scrim` at
  `top:56 left:14`; desktop breadcrumb).
- [✅] Identity uses the existing `IdentityArt` artist namespace — no new avatar system.
- [✅] All copy externalized in `ARTIST_COPY`, keyed for lift into
  `apps/web/src/components/consumer/definitions/copy.ts` per the definitions copy rule.
- [✅] The embed is an iframe, outside the Web API — no auth, no quota, so it's unaffected
  by the Extended Quota question tracked in #1070.

### ♿ Cross-cutting
- [✅] `<main aria-label>` landmark, `h1` name, real `h2` per section (styled to 15px).
- [✅] Focus order stated; skip link is the honest answer to a tab region we don't own, and
  is correctly absent where it would move focus backwards.
- [✅] `aria-pressed` + full-sentence `aria-label` on follow; state never colour-only.
- [✅] Touch targets ≥44px including tertiary controls.
- [✅] Contrast is claimed as a token-pair property rather than per-theme, with the two
  non-token-pair cases named individually (the chip's ink on `--scrim`, verify in Light
  whose scrim is 0.40 against 0.72 elsewhere; and the embed interior, which is theirs).

### 📉 Drift
- [✅] No vocabulary drift: "Watching" throughout, never "Saved" / "Favorites". Following an
  artist is described in terms of what it does to Watching, not as a competing concept.
- [✅] No "we'll notify you"-class copy — correct until #737 ships.
- [✅] The unknown-price label's divergence from Phase 7's full `PriceChip` is deliberate
  and confirmed: eight sparklines on a routing surface is noise. (Reviewed as `Price TBD`;
  the shipped literal is `tba`, uppercased by CSS. What this line confirms is the plain
  label over the full chip, which is unaffected.)

## Open items for the plan PR

1. **`onError` fallback swap** for expired signed photo URLs (Design's flag #2) — must be
   reachable at render time, not only at fetch time.
2. **Supporting-artist link affordance** (#643 renders bare names). It's the dependency that
   makes this route reachable and it's event-detail territory — needs a home so it doesn't
   fall between two issues.
3. **Past-list pagination** is absent. Fine at current crawl depth (months); needs the same
   truncation control Upcoming has after a year or a backfill. Flagged, not requested.
4. **Back-chip hit-area fix on the two shipped surfaces.** Event Detail v2 and Venue Profile
   ship a bare 36px target, under the 44px bar. Artist pads to 44 and keeps the 36px visual;
   the same one-line fix belongs on both.
5. Pick a single embed direction. If **mat** ships alone, `embedPlate()`'s `direction`
   argument can be dropped.

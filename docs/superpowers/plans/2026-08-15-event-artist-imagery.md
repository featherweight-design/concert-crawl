# Event & artist imagery — implementation plan

**Issue:** [#1525](https://github.com/HartiganHM/concert-crawl/issues/1525)
**Brief:** `docs/superpowers/specs/2026-08-08-artist-imagery-standardization-design.md` (Spec A)
**Handoff:** `design/design_handoff_event_artist_imagery/` — Round 3, readiness 🟢 Green (PR #1574)
**Date:** 2026-08-15

Seven PRs, strictly sequential. Each is independently mergeable and leaves every
consumer surface rendering.

---

## What is already shipped

PR #1536 landed the first half of Spec A, and the plan below must not re-order it:

| Shipped | Where |
| --- | --- |
| `LEFT JOIN artists ON canonical_name = canonical_artist`, `artistPhotoUrl` in all three response shapes | `apps/api/src/routes/events.ts:358, 604, 1229` |
| `artistPhotoUrl` on `EventWithVenue`, nullable | `packages/types/src/index.ts:672–676` |
| `EventImage` walks `src → artistPhotoUrl → IdentityArt`, including on load error | `apps/web/src/components/consumer/event-image/EventImage.tsx:36–65` |
| Integration coverage for the join, unit coverage for the chain | `events.integration.test.ts:1851+`, `EventImage.test.tsx` |

**The gap nobody has noticed.** The chain is built but only two of seven event
surfaces feed it. `EventRow.tsx:105` and `SmallEventRow.tsx:53` pass
`artistPhotoUrl`; `HeroEventCard`, `PublicEventDetail`, `ArtistResultRow` and
`DiscoveryShelf`'s taste pick pass only `src`. So the ~32% of events that hold a
portrait but no venue artwork still render generated art on every large slot —
which is precisely the population the design exists to serve. PR 1 closes this,
and it is deliberately first: every later PR is judged on how portraits look in
the new slots, and until this lands there are no portraits to look at.

---

## Decisions this plan makes

The handoff is a `file://` prototype with no runtime. Four things it leaves
implicit have to be settled in code, and are settled here rather than mid-build.

### D1 — Slot size maps to `scale`; the prototype's mapping is a shortcut

`IdentityArt`'s `scale` prop is a detail-density knob, not a size label: it sets
blob count (5/4/3), stripe count (8/6/4), ring count (12/8/5), halftone cell size
and blueprint grid step (`IdentityArt.tsx:184, 228, 285, 340, 387`). The
prototype's `Panel` passes `scale="tile"` for everything above 64px, including
the 208px desktop hero panel — which would render a 208px panel at 4-blob density.
That is a prototype convenience, not a design instruction.

The shipped mapping is by rendered size:

| Slot size | `scale` |
| --- | --- |
| ≥ 112px (BandCard 112, mobile HeroBand 128, desktop HeroBand 208) | `hero` |
| 64–111px (shelf card art, FlexArt) | `tile` |
| < 64px (row tiles 40–56, avatars 40) | `micro` |

This also makes "mesh is dropped at hero scale only" literally true in code
rather than true-by-analogy.

### D2 — The mesh cut substitutes; it does not re-index the pool

Filtering `mesh` out of the pool before `hash % pool.length` shifts the index for
every artist past it, so most artists would draw one template in a row and a
different one in a hero. Instead `identityFor` learns an optional `scale`, and
when the resolved template is `mesh` at hero scale it advances deterministically
to the next template in the pool. Only mesh-assigned artists change, and they
change in exactly one direction.

`IdentityArtPrint` deliberately consumes the same `identityFor` — "the point is
that there is exactly one derivation" (`IdentityArtPrint.tsx:53`). Keeping the
cut inside the resolver preserves that invariant, and share posters are a large
slot where mesh fails for the same reason. A poster regenerated after this ships
may therefore differ from one shared before it, for mesh artists only. Accepted;
the alternative forks the derivation.

### D3 — The hairline belongs to the slot, not to the generated art

The readiness review lists the retune as "monogram-off, grain 0.10 → 0.06, panel
hairline on". The first two are properties of `IdentityArt`; the hairline is
`boxShadow: inset 0 0 0 1px …` on the prototype's `Panel` wrapper, applied to
photographs and generated art alike. It ships with `Panel` in PR 3, not with the
retune in PR 2, or photographs would go unframed.

Grain moves to a `0.06` **default** rather than a per-caller argument. The
prototype passes `grain={0.06}` at all four of its call sites, which is the same
thing said four times.

### D4 — Spec A §3.3's stated target is already done; the real bypass is `CardArt`

§3.3 says artist search renders a raw `<img>` with a `Mic2` fallback. It does
not: `ArtistResultRow.tsx:149` already renders through `EventImage`. The
surviving bypass is `CardArt` (`following/ShelfCard.tsx:81–118`) across four call
sites. PR 3 amends §3.3 to say so, per Hugh's call of 2026-08-14 — in the
implementation PR, not a standalone doc PR.

---

## Out of scope

- The 44px row tile preferring the generated mark. Deferred (Hugh, 2026-08-14);
  it would change the locked source priority. Do not quietly fix it.
- Palette and contrast changes. Declined by Design on rendered evidence at
  44/56/112/208; brief §2.4 records it. Not reopened without new evidence.
- Riso ink on artist photographs. Venue-only on purpose
  (`design_handoff_venue_imagery`); the two handoffs are not reconciled.
- Artist surfaces borrowing event artwork. Structurally excluded.
- Venue imagery surfaces (`VenueIdentityTile`, `VenueFeatureCard`), share/passport
  cards, `LandingPoster`. Different handoffs.

---

## PR 1 — Feed the chain at every event surface

**Branch:** `feat/imagery-chain-wiring`

No visual redesign. Pure wiring, and the only PR whose effect is visible before
the shape system lands.

1. `hero-event-card/HeroEventCard.tsx:37` — pass `artistPhotoUrl={event.artistPhotoUrl}`.
2. `event-detail/PublicEventDetail.tsx:118` — same.
3. `search/ArtistResultRow.tsx:149` — this is an **artist** surface, so it must
   keep `src={artist.photoUrl}` and pass **no** second source. Confirm by test
   that it cannot reach event artwork; do not "helpfully" add a second source
   here.
4. The taste pick is an event surface and its payload is one source short.
   `SpotifyTastePick` (`packages/types/src/index.ts:1324–1335`) carries
   `imageUrl` and no portrait, so `DiscoveryShelf.tsx:91` has nothing to pass.
   Add a nullable `artistPhotoUrl` to the interface, populate it in
   `apps/api/src/routes/spotify.ts` (and `lib/spotify-matches.ts` if the
   projection is built there) with the same headliner-only join Spec A §3.1
   already applies to `events.ts`, then pass it in the component. The picks are
   derived from the viewer's Spotify artists, so the join is the same shape and
   the same unique-index guarantee against fan-out.

**Tests.** Component tests asserting each of the four surfaces renders the
portrait when `imageUrl` is null and a portrait exists, and that
`ArtistResultRow` renders `IdentityArt` rather than any event image when the
portrait is null. Extend `spotify-taste-picks.integration.test.ts` with the join:
a pick whose headliner has a portrait carries it, one whose headliner has no
projection row carries null, and the join does not multiply picks.

**Done when:** an event holding a portrait but no artwork shows the portrait on
browse hero, event detail and the taste pick. `pnpm typecheck && pnpm lint` clean.

---

## PR 2 — The `IdentityArt` retune

**Branch:** `feat/identity-art-retune`

One component plus its resolver. Every surface changes appearance; none changes
shape.

1. `identity-art/IdentityArt.tsx`:
   - `grain` default `0.1` → `0.06` (line 598).
   - Retire the monogram chip: delete the `initialsOn` branch (lines 667–690),
     the `showInitials` and `initialsBottom` props, and the now-dead `chipBg` /
     `chipFg` / `chipFs` / `ia_getInitials` wiring. Decision 3 in the handoff
     retires it everywhere — it existed only because a wide image could not say
     who it was, and after PR 4 there are no wide images.
   - `identityFor` takes an optional `scale`; at `hero` a resolved `mesh`
     advances to the next template in the pool (D2).
2. Remove `showInitials` / `initialsBottom` / `grain={0.1}` from every caller:
   `ArtistPlate.tsx:63–71`, `ShelfCard.tsx:110–117`, and any other site the
   `data-identity-monogram` attribute or a `showInitials` grep turns up.
3. `IdentityArtPrint.tsx` — it declares its own `showInitials` and chip. Leave
   the print chip alone unless it is dead; share cards are a different surface
   with a different composition. Verify before touching either way.

**Tests.** `IdentityArt.test.ts` gains: no element carries
`data-identity-monogram` at any scale; grain defaults to 0.06; `identityFor`
never returns `mesh` at hero for any name in a large sampled set; `identityFor`
returns the **same** template at tile and micro as before the change for a
non-mesh name (the anti-re-index assertion — this is the test that proves D2).
Existing `IdentityArtPrint.test.tsx` must still pass.

**Done when:** monogram gone product-wide, no mesh hero, and the print snapshot
suite is green.

---

## PR 3 — The slot primitives, and `CardArt` folded in

**Branch:** `feat/imagery-slot-primitives`

The deliverable of `imagery-slots.jsx`, minus the band components (PRs 4–6).

1. New `components/consumer/image-slot/` exporting `Panel`, `FlexArt` and
   `AvatarSlot`, plus `SLOT_RADIUS` (`row 8 / panel 12 / card 14 / avatar 999`).
   `Panel` owns: the 1:1 box (or an explicit `ratio`), the radius class, the
   hairline (D3), the `--image-tint` overlay on photographs only, and the
   size → `scale` mapping (D1). It resolves its source through `EventImage` so
   there is one chain implementation, not two.
2. `Panel` takes a `surface: 'event' | 'artist'` discriminator. On `artist` it
   accepts one source and structurally cannot be handed event artwork — mirror
   the prototype's `resolveArtistImage`, which the readiness review verified is
   incapable of returning an artwork key across all 32 cases. Enforce it in the
   type, not in a comment.
3. Delete `CardArt` and re-point its four call sites onto `Panel`:
   `following/ShelfCard.tsx:184`, `artist-picker/ArtistPickTile.tsx:75`,
   `following/my-shows/ArtistManageRow.tsx:90`, `following/nudge/FollowNudgeCard.tsx:131`.
   All four are artist surfaces. `FollowNudgeCard` passes `photoUrl={null}`
   unconditionally today; preserve that.
4. `search/ArtistResultRow.tsx:149` → `AvatarSlot` (40px, circular — the only
   circular slot in the product).
5. `history/HistoryItem.tsx:112` renders `IdentityArt` directly at 40/56/64 →
   `Panel`, artist surface. `HistoryShow` carries no image URL, so this is a
   frame-and-radius change only.
6. **Amend Spec A §3.3** in the same commit (D4): record that the
   `SearchResultsState` item is already satisfied, and order the `CardArt`
   unification across the four named call sites.

**Tests.** `Panel` unit tests: 1:1 by default, explicit ratio honoured, hairline
present, tint on photographs and absent on generated art, correct `scale` at 40 /
56 / 112 / 208, and — the one that matters — an artist-surface `Panel` rejects an
event artwork source at the type level and never renders one at runtime.

**Testids.** `shelf-card`, `taste-pick-card`, `event-row` and `row-watching-tick`
must survive verbatim. `apps/e2e/src/audit/testid-contract.test.ts` is the gate;
selector drift froze prod for 17 hours once already (#1462).

**Done when:** `CardArt` no longer exists, every small slot renders through
`Panel`, and the testid contract test is green.

---

## PR 4 — `BandCard` replaces the browse hero banner

**Branch:** `feat/imagery-band-card`

`HeroEventCard` is the smallest of the three wide slots and the safest place to
prove the band reads correctly.

1. Replace the `h-[180px]` full-bleed image (`HeroEventCard.tsx:36–76`) with a
   112px `Panel` beside the type column, per `BandCard` in the handoff.
2. Delete the bottom scrim (lines 46–54) and the `-mt-10` content overlap
   (line 79) — both existed to make type legible over a wide image, and there is
   no longer an image under the type.
3. The eyebrow badge slot survives: `HeroFollowingBadge` and the `★ Tonight's
   pick` badge move into the type column as the eyebrow. Reuse the shipped
   strings; introduce none.
4. `WatchShowButton` stays outside the `Link`. Re-place it against the new box.

**Note the footprint.** `SLOT_SPEC` records that this slot was a full-width 180px
banner (≈4:1 desktop, ≈2:1 mobile), **not** 16:9 — the 16:9 figure was an error
that originated in the brief and is corrected in the handoff. Do not reintroduce
it from the spec text.

**Tests.** Component test: renders at 320px without horizontal overflow; the
badge renders in the eyebrow; watch button still reachable and does not navigate.

---

## PR 5 — `HeroBand` replaces the event-detail hero

**Branch:** `feat/imagery-event-detail-band`

The largest single visual change: 300px of full-bleed image becomes a 128px
(mobile) / 208px (desktop) panel with the title as a real column beside it.

1. `PublicEventDetail.tsx:117–126` — replace the fixed-300px hero with
   `HeroBand`. The band **absorbs the title block** that currently sits below the
   hero, so `EventTitleBlock` moves into the band's type column and the page
   below the band starts at content.
2. The ink field is derived from the art's own palette when the source is
   generated (`sl_field`), and falls back to tokens for photographs — a
   hotlinked image cannot be sampled client-side, since there is no proxy and no
   CDN and this spec does not add one. The single non-token colour in the whole
   handoff lives here.
3. The back control keeps its current behaviour and 44px touch target.
4. Removing the wide hero removes the negative-margin overlap as a side effect.
   Verify nothing else depended on it.

**Tests.** 320 / 390 / desktop render without horizontal overflow; the title
block renders exactly once on the page after the move; portrait, artwork and
generated sources each produce a band.

**If the layout resists.** One failed fix, then instrument the DOM — invoke the
`css-layout-triage` skill rather than proposing a second container property.

---

## PR 6 — The artist page band, and `ArtistPlate`'s retirement

**Branch:** `feat/imagery-artist-band`

1. `artist-page/ArtistPageContent.tsx:134–142` (mobile, `AP_HERO_H.wide`) and
   `:156–161` (desktop rail, 320px) → `HeroBand`. Desktop keeps the sticky rail
   panel; mobile loses the full-bleed plate and its `.ap-hero-fade` gradient,
   which existed to fade a wide image into the page.
2. `ArtistPlate.tsx` is deleted. Its render-time `onError` gate — a signed press
   URL can expire between server render and the browser's request — is not lost:
   it is the same gate `EventImage` already implements, which is why the plate
   moves onto the shared component (Spec A §3.4).
3. The `<h1 className="ap-name">` at `:169` moves into the band's type column.

**Tests.** An expired portrait URL falls to generated art without layout shift;
the artist band never renders event artwork (the §2.3 guarantee, asserted);
desktop rail stays sticky.

---

## PR 7 — `ShelfCard` at 3:4 and `FlexArt` on the taste pick

**Branch:** `feat/imagery-shelf-and-flex`

Last because it is the one slot pair with a live regression history.

1. `following/ShelfCard.tsx:183` — the art becomes a pinned 3:4 `Panel`. At
   `SHELF_CARD_WIDTH = 168` that is 224px of art, which with the ~56px body lands
   exactly on the shipped `SHELF_CARD_HEIGHT = 280`. Confirm that arithmetic
   against the rendered body before pinning; if the body is taller, the card
   height moves, not the ratio.
2. `spotify/DiscoveryShelf.tsx:91` — the taste pick gets `FlexArt` and **must
   not** be handed a ratio. Its image is `min-h-[116px] flex-1` deliberately:
   pinning an aspect there broke the row in #763 r4, and the comment at
   `DiscoveryShelf.tsx:84–90` is the scar. `FlexArt` carries no `aspectRatio`
   property anywhere, which is what makes it incapable of reproducing that
   regression — keep it that way.
3. Both cards occupy one browse slot and must stay dimensionally identical, per
   the standing comment at `ShelfCard.tsx:5–9`. Any box change here is a box
   change there.

**Tests.** Both cards render at identical outer dimensions; the taste-pick art
region has no `aspect-ratio` in its computed style at 116 / 132 / 150px row
heights; `taste-pick-card` and `shelf-card` testids intact.

---

## Cross-cutting gates

- **Copy.** The handoff reuses shipped strings only and introduces no new copy.
  Two strings still get a `copy-review` pass because the band moves them into a
  new context: the hero eyebrow and the watching tick's `aria-label`. Prefer the
  shipped string over the prototype's wording where they differ — the prototype
  is not a copy source. Copy findings are fixed in place, never sent to Design.
- **Mobile/desktop parity** in the same PR, every PR. 320px baseline.
- **Release note.** PR 7 adds the `releases.ts` entry for the whole change; PRs
  1–6 do not, since none of them is independently a shippable story.
- **progress.md.** One row, on PR 7.
- **Copilot loop** per the canonical merge bar on every PR, this plan PR
  included.

## Next

Open this plan as a PR, run the Copilot loop to the merge bar, then execute PR 1.

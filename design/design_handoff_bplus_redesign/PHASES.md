# B+ Redesign: Phasing

The redesign is too big for one PR. It touches nearly every consumer component. This file proposes how to ship it, smallest risk first, with each phase deployable to staging on its own.

## Pipeline steps (per `docs/superpowers/design-pipeline.md`)

1. **Handoff PR (docs only).** Add this folder as `design/design_handoff_bplus_redesign/`, plus a 🕰️ Backlog row in `design-pipeline-status.md`.
2. **Readiness Review.** Write `READINESS.md` in this folder. The data-contract gaps and open decisions in `README.md` are the likely Yellow items.
3. **Plan PRs, one per phase**, in `docs/superpowers/plans/`, each through the Copilot review loop. Write Phase 0's plan first, since everything else builds on it.
4. **Implementation PRs** per phase, each listing the boards it implements. **Copy review** (`copy-review` skill) runs on `COPY.md` before Phase 1's implementation, because copy is a copy-writer call and the handoff strings are drafts.
5. **Release notes.** Phases 1, 2, 4 and 6 are user-facing features and each gets a `releases.ts` entry. Phase 0 is invisible and gets none.

Visual changes ship to staging and are promoted by hand as usual. No feature flag is proposed, because each phase is a self-contained restyle of surfaces that already exist. If Hugh wants to see a phase on prod before the next one starts, promote after each phase.

## Phase 0: Foundations (no visible change by itself)

Build the shared pieces with tests, using them nowhere yet, or only where the swap is invisible.

- `GenreChip` with the neutral style and a colored dot. This replaces the current `GenreChips` styling.
- `StatusChip`, with the fixed status-to-color map (Sold out, Postponed, Cancelled, Tickets available, No longer listed) and pending (dashed, with dots) versus live (solid).
- Image treatment: a ring and glow on `event-image` and the thumbnail slot, plus the row's 2px left edge.
- The Sheet top edge (it follows the corner radius), applied in `modal-shell` and the BottomSheet.
- `Skeleton` primitives: block, row and header, with the sheen and its reduced-motion fallback.
- `VenueGlyph` and `VenueTile`, with the 21 SVGs keyed by slug plus a fallback.
- `PassportStamp`: the ink stamp, solid and dashed, which is the replacement for `StubStamp`.
- `PinkWave` loader (a motion module, see README rule 13).
- Centering fix for small caps chips.

**Exit:** every component tested in isolation, and no screen visibly changed except chip centering.

## Phase 1: Browse (highest traffic, Hugh's biggest complaint)

- The filter bar (desktop segments with popovers) and the Filters sheet (mobile). Where uses venue tiles, Vibe uses dots plus the teaching line. Remove the floating Crews button. Keep the URL params. **Single-select for Where and Vibe** unless the plan PR widens the params.
- Rows, the Tonight spotlight, Coming to Denver, List/Cal icons.
- Cal view: week strip with genre dots, jump picker.
- Browse skeletons with the pink wave, pull-to-refresh, empty and filtered-empty states.

## Phase 2: Event and Artist pages

- The theme-washed backdrop (option A), the tilted card with the genre ring, and genre chips.
- The artist page: Follow in the hero, Upcoming first with venue tiles, the framed Spotify card, the desktop starburst at 8%.
- Show-status states on the event page (pending banner under the title, cancelled and postponed CTA swaps) and the price card states.
- The share image (square thumbnail on a tilted card over a blurred copy).
- Event and artist skeletons, and the public signed-out event page.
- **Do `status-and-dispute-fixes.md` in or just before this phase.** It is the defect list for the same surfaces.

## Phase 3: Venues

- Venues list with icon tiles. The venue page with the neon glyph hero (380px on mobile), About, First-timer, Before you go.
- Venue skeletons. The Venues list has no loading state today, so add one.

## Phase 4: My shows, Passport and Crews

- Watching (going prompt on one line, "Yes, going" in the stamp's color), Concerts (stamps, stats), Artists.
- The Passport booklet, with Up next as a ticket stub.
- Crews: the hero patch motif, the Host rename, invite card states (open, already in, stale), the crew-lens empty state.
- The avatar "Mix two" picker and the profile banner, which **needs the avatar-pair migration (expand-only)**.
- Skeletons and empty states for all of these.

## Phase 5: Chrome, account and the long tail

- Header and bottom nav (Crews included), the account menu, Settings, the ⌘K search palette and mobile search overlay, the notifications panel and its states, What's new and the feature modal, the Tell us tab.
- Error, 404 and offline pages. The error page is the standalone page in `12-error-page`, which replaces `bp-s-error_m` (see the README for its render-without-the-app rules).
- The signed-out beta invite page, if Hugh keeps it in scope.

## Phase 6: PWA and launch

- Install slot, the iPhone how-to sheet, dismissed toast, the iPhone push-needs-install sheet, offline pill and offline states.
- iPhone startup images (the plain icon on #070A1A for each device size).
- The launch animation: cold standalone start only, reduced-motion cut, never blocks the load.

Phase 6 can run in parallel with Phases 3 to 5 once Phase 0 is in.

## Risks to watch

- **Theme regressions.** Check every phase in at least Electric, Light and one genre theme. Light uses the darker genre set.
- **StubStamp removal** touches the history surfaces and their tests. Keep the hash rules that choose a stamp's accent.
- **Bundle and paint cost of the glows and blurs on low-end phones.** The event backdrop blur should be one blurred image, not a stack of filters.
- **The launch animation on slow phones.** If the first paint is late, skip straight to Browse. Never show the intro on top of content that is already there.

# Handoff: Onboarding · artist search escape hatch (R1)

**Status:** R1 — recommendation made, ruling open. Pinged for audit against the onboarding handoff's existing step-7 states.
**Canvas:** `Onboarding Artist Search.html`
**Scope:** one control. Everything else on step 7 is closed.

> ⚠️ **All copy in this bundle is placeholder.** Every user-facing string is a structural stand-in that sizes the layout and proves the state machine. Headlines, the rest / no-results / error bodies, the field placeholder, the return-strip line and the button labels all need a pass from the copy-writer before build. Two things here are design decisions, not copy — see "Vocabulary" below.

---

## 1. The control, and what's wrong with it

`FollowStepArtists` (`nf-cold-start.jsx`, onboarding step 7 of 8) ends its suggestion grid with a dashed-border button: **"Search for someone specific"**. It is a plain link to `/search`.

It walks the visitor out of the tour with no way back. The progress strip, the Skip rail and the commit CTA all disappear; `/search` has no idea anyone was mid-onboarding; the only route back is the browser's back button. The selection survives in `sessionStorage`, and **nothing on screen says so**.

It is the one control in eight steps that ends the flow without ending it deliberately. Skip and the CTA both go somewhere on purpose. This one just leaves.

The precise defect is narrower than "it navigates away": **it leaves a committing flow with an uncommitted selection.** The step batches one write at the rail; the moment you're on `/search` there is no rail.

---

## 2. Recommendation

**Direction 1, in-place (A1).** The step swaps *mode* instead of opening a *surface*.

- The header block (eyebrow · headline · lede) collapses into a search field, in the same vertical box — nothing below moves.
- The grid region becomes a result list.
- **The progress dots and the commit rail are untouched and live.** A row tapped in search increments the same counter the tiles feed; the rail reads `Follow 5 artists →` while you're still searching.
- A **picked strip** pins under the results, so leaving the grid never looks like losing it.

One flow, one commit, no navigation to undo.

### Why not the sheet (A2)

A sheet is a separate surface, so it needs its own commit (`Done · 5 selected`) while the step's real commit sits live-looking and unreachable behind the scrim — two commit affordances, one of them fake. Dimming the step rail to fix that produces a step whose CTA disappears when you search, which is the same disorientation moved six pixels.

And the tour renders both trees at once: at 1280 a sheet has nowhere to be a sheet and becomes a centred modal — a surface class invented for one control, in a flow that has none anywhere else. **A1 is the same swap at both widths.** Both costs are drawn in canvas §2, not argued.

### Why not the round trip (B)

The return strip is easy to draw, but it lands on `/search`, a shared route that gains an onboarding-aware mode for one caller — and underneath it sits a real conflict: **`/search`'s rows carry `NFFollow`, which writes on tap, while the step batches one write at commit.** Following three artists on `/search` mid-onboarding creates three follows before the rail ever fires. Two commit models over one selection. Resolving that is a product decision, not a layout one. Browser back also still bypasses the strip.

### Why not dropping it (C)

Defensible, and better than the status quo — an exit that strands people is worse than no exit. But the suggestion query is **genre-filtered**: a visitor whose band isn't in their picked genres has no route to them inside the tour at all, and that's the visitor most motivated to follow someone. It also hands the error state a hole (§4).

If eight steps is the real objection, the fix is cutting a *step*, not this control.

---

## 3. What's in the canvas

| § | Contents |
|---|---|
| Live | Tweaks-driven artboard (direction · state · tier · width) + the recommendation notes |
| 1 | **Direction 1 · in-place** — before/after trigger, rest, typing, results, no results, Free, 320 |
| 2 | **Direction 1 · sheet** — sheet states, plus desktop: corrected baseline, A1 in-place, A1 no-results, and A2-as-modal (the cost) |
| 3 | **Direction 2 · round trip** — `/search` with and without the strip, the return, 320, desktop |
| 4 | **Direction 3 · drop it** — step 7 without the trigger, 320, Free |
| 5 | **Error state** — E1 / E2 / E3 at 402 + 320, E1/E2 desktop |

Mobile 402 + 320 and desktop 1280 ship together (the tour renders both trees). Electric only this pass, per the R1 brief; every colour is a token, so Jade and Light follow without redraw.

The default query on every results artboard is `man` — five hits, one already picked, two with no upcoming date. That mix is deliberate: it's the smallest query that exercises the whole row grammar (selected · unselected · "No dates announced") in one screen.

**Canvas weight:** ~25k DOM nodes. It renders fine but is slow to capture as a still. If R2 adds artboards, trim the grid fixtures or drop duplicate 320 variants first.

---

## 4. The grid error state — ruling deferred to R2

"That list didn't load." Today the search trigger is the only thing in it, which is weak even if the trigger stays: *"search for them by name"* is not a reply to *"we couldn't load ten suggestions"* — the visitor doesn't have a name in mind, which is why they were on a suggestion grid.

- **E1 · retry primary + "Skip this step" secondary** — correct under **all three** directions. Retry answers a load failure; skip is the honest escape from a step that was never required.
- **E2 · retry primary + "Search by name" secondary** — right if direction 1 wins. Wrong under 3 (the control doesn't exist), shaky under 2.
- **E3 · search only** — the live behaviour, drawn for reference. No retry: a network blip becomes a dead end with one door, and the door leads out of the tour.

**Lean: E1 even under direction 1.** The primary action for a failed load is to load it again; offering search alongside retry reads as "we don't think it'll work". Search stays reachable via the header trigger, which is present in this state anyway.

All three use the Hybrid empty-state anatomy and the locked error status word **SIGNAL LOST**. Don't coin a new one.

---

## 5. Two live defects fixed in passing

1. **Step 7's eyebrow reads `Step 5 of 6` while `NFDots` renders 8 dots.** The dots are right; the string was never updated when the flow went to eight (`welcome · how · today · theme · notyet · genres · artists · done`). Corrected on every artboard here.
2. **`FollowStepDesktop` (`nf-desktop.jsx`) passes `NFDots total={6} index={4}`** — the same miscount — **and has no search control at all.** The escape hatch is mobile-only today. Canvas §2 ships the corrected desktop baseline; on desktop the trigger sits in the header as a field, because under a five-column grid a full-width dashed strip reads as a sixth, empty row.

---

## 6. Vocabulary (design decisions, not copy)

| Say | Never say | Why |
|---|---|---|
| **Selected / picked** (during the step) | ~~Saved~~, ~~Followed~~ | Nothing is written until the rail commits. Calling a pick a follow makes the rail a no-op. |
| **Followed** (after commit) | — | The rail is the only thing that follows. |
| **Watching** | ~~Saved~~ | Unchanged, CLAUDE.md §4a — shows, not artists. |

The promise that **nothing is written until the rail fires** is structural. Keep it; rewrite everything around it.

---

## 7. Components

New in this bundle (`oas-shared.jsx`, `oas-direction-a.jsx`, `oas-direction-bc.jsx`):

| Component | Role |
|---|---|
| `OASField` | Search field. Matches `SearchBarSM` geometry (44 min-height, radius 11, `--surface-1` on `--border-strong`) so the field inside the tour is the same object as the one on `/search`. |
| `OASRow` | Result row. **`role="checkbox"`, not a Follow button** — inside the tour a result speaks the grid's language. Same grammar as `BulkFollowSheet`, so the gesture is learned once. |
| `OASPickedStrip` | The picks, pinned. Fixes the `sessionStorage` silence. Read-only, caps at six faces + count. |
| `OASMessage` | Rest / no-results / error body. Hybrid empty-state anatomy. |
| `OASStepChrome` · `OASStepHead` · `OASRail` | Step 7's shell, lifted from `FollowStepArtists` with the two corrections applied. |
| `OASDeskCard` · `OASDeskRail` | Desktop card shell, matching `FollowStepDesktop` with the same corrections. |
| `SearchInPlace` · `SearchInPlaceDesktop` | **Direction 1 (recommended).** |
| `SearchSheetBody` · `SearchModalDesktop` | Direction 1, sheet variant + its desktop cost. |
| `ReturnStrip` · `RoundTripSearch` · `RoundTripReturn` | Direction 2. |
| `StepNoTrigger` | Direction 3. |
| `GridError` · `GridErrorDesktop` | The three error offers. |

Reused unchanged: `ArtistPick`, `PickGrid`, `NFDots`, `NFFollow`, `NFPrimary`, `NFGhost`, `NFArt`, `Mono`, `Sheet`, `Scrim`, `NoDatesLine`, `nfLocked`, `IdentityArt`, `CCMark`.

### Index contract

Artists are a projection off event billing strings, so the index only holds artists a crawl found on a Denver bill. Two consequences the mocks honour: **every result is followable by construction** (there is no "can't follow" row), and **"played Denver before, nothing upcoming" is real, common, and the clearest case for following** — it carries a meta line, not a disabled state.

---

## 8. Open for product

- **Free / Supporter — RULED (Sep 19, 2026).** Following stays **all-or-nothing Premium**; quantity-gating is a post-launch question, not a blocker. Nobody is locked today: new accounts get a card-less 14-day Premium trial, beta testers get a lifetime comp at code redemption. The locked state serves post-trial free users and supporters. It is **not a dead end** — the rail fires, the 403 opens the tier picker, and the selection is held across the Stripe round-trip and replayed on return. Search inherits that unchanged: a locked row still selects. Drawn at §1 `a1-free` and §4 `c-free`. Do **not** hide the picker from free users — it would hide a working step from trial users, who are nearly everyone who sees it. Full note in `design_handoff_onboarding/README.md` §0.
- **Sequencing changed (Sep 15, 2026).** The tour now runs *after* Clerk sign-up, not before. Step 7 reads and writes as the signed-in reader, which is why. The pre-move failure — no session — is what made `That list didn't load` the default experience; it is a genuine error state again, which raises the stakes on §4's ruling rather than lowering them.
- **Direction 2's two commit models** (§3) — needs a product answer if 2 is chosen.
- **Eight steps.** Still long. If that's the objection, name the step to cut and we'll draw it.

## 9. Files

| File | Role |
|---|---|
| `Onboarding Artist Search.html` | The canvas. Reference only — do not ship. |
| `oas-shared.jsx` | Atoms, index, copy, step + desktop shells. |
| `oas-direction-a.jsx` | Direction 1 — in-place and sheet, mobile + desktop. |
| `oas-direction-bc.jsx` | Directions 2 and 3 + the error-state offers. |
| `oas-canvas.jsx` | Canvas layout and notes. Not production. |
| `nf-shared.jsx`, `nf-cold-start.jsx`, `identity-art.jsx`, `theme-context.jsx`, `ios-frame.jsx` | Shipped components, copied verbatim from their handoffs. |
| `design-canvas.jsx`, `tweaks-panel.jsx` | Canvas presentation. Not production. |

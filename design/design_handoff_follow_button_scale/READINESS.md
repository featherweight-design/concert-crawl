# Readiness Review — Follow button scale & weight pass (R3)

**Verdict:** 🟡 Yellow
**Audited:** 2026-09-07
**Related ticket(s):** none — this is an unticketed iteration on the Native Following handoff, which shipped R2 as `FollowButton` / `NF_FOLLOW_SIZES`
**Plan PR target:** `docs/superpowers/plans/2026-09-07-follow-button-scale.md`

## Summary

The design is ready to build. The problem is stated concretely and is real — R2 put a
saturated `--signal` fill on every follow affordance at three densities, so a three-act
bill on a 390 screen carries three cyan slabs plus a full-width fourth. The remedy is two
axes rather than one (scale *and* weight), the before/after is drawn for every surface,
tokens are used throughout, and the decision log names what is locked. Nothing about the
visual direction needs another Design pass.

What keeps it off Green is that the handoff was drawn against the R2 *design*, not against
the R2 *code*, and the two have moved apart in seven places. All seven are settled by
reading `apps/web` — none of them is a question for Design. Three are corrections to the
handoff's stated facts (the shelf badge is 34px in prod, not 30; the onboarding picker
does not use the badge at all; the bill's locked state hides its row buttons rather than
locking them), three are contract decisions the shipped control already made and R3 would
silently undo (`pending`, `signedOut`, the locked skin), and one is an arithmetic slip in
the prototype's hit-area overlay. The last one is the only finding with an accessibility
consequence, and it is four characters of CSS.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary is exact and small: one control's geometry and weight, five surfaces, no
  behaviour change, no data change. "Artist page — height only. Pitch line unchanged."
- ✅ The governing rule is stated as a rule rather than as a set of examples — "one filled
  Follow per screen, maximum" survives contact with surfaces the handoff never drew, which
  matters because there are four such surfaces (below).
- ✅ Both open questions are logged and correctly scoped (the Light-theme `Following`
  border mix; the onboarding badge/selection-check collision).
- 🟡 The handoff names five surfaces. Shipped code has nine `FollowButton` call sites plus
  two skeletons that hardcode its heights. `EmptyUpcoming`, `FollowNudgeCard`,
  `ArtistManageRow` and the two skeletons are unaddressed. None needs Design — the size
  table maps onto all of them — but a rename of the size keys forces every one of them in
  the same commit, so the plan PR enumerates them.

### 🎭 State coverage

- ✅ `idle`, `following`, `locked` are drawn at both tones and at every size, plus a
  dedicated state gallery and a hit-area artboard.
- 🟠 **`pending` is back.** `FollowButton.tsx:60` documents the opposite call: "THREE
  states, not four… the flip is instant, so a spinner would only ever flash. This control
  is presentational; the optimism lives in `useArtistFollow`, in one place." The same
  decision was taken independently for the event-detail CTA on 2026-08-04. R3's
  `pending` skin and its "Following…" label would reintroduce a flash the shipped code
  deliberately removed. Eng keeps three states. The README's state list is **corrected in
  place** to say so; the canvas keeps the skin, which costs nothing and documents the
  option that was considered.
- 🟠 **`signedOut` is absent from R3 entirely.** It is a shipped state with a deliberate
  design: per #794 §3.10 the signed-out control is pixel-identical to
  signed-in-and-not-following, because a different visible label leaks auth state into the
  layout; the honesty lives in the accessible name and in the fact that activation opens a
  dialog. That rule composes with `tone="quiet"` unchanged, but the handoff should not be
  read as having dropped the state.
- 🟠 **Locked and idle collapse at quiet weight.** R2 separated them by fill: idle was a
  cyan slab, locked was an outline. R3 makes both `transparent` + `--border-strong`, so the
  entire difference between "you can do this" and "you cannot do this without paying" is an
  11px glyph and `--fg` vs `--fg-muted`. The pass's own logic argues against this — if a
  quieter control reads as less important, the paywall just got quieter than the action it
  gates. Eng holds locked at the shipped `--fg` and lets the lock glyph carry it.
- 🟠 **The bill's locked state is drawn wrong.** `BillFollowBlock.tsx:233` renders
  `{!locked && <FollowButton …>}` — below Premium the per-row buttons are *absent*, and the
  single bulk button is the only paywall surface. That is already the "one paywall, one
  tap" the README asks for; R3 instead draws a locked pill on every row plus a locked
  header shortcut, which is the same promise implemented as N+1 gates. Shipped behaviour
  stands.

### 🔌 Data contract

- ✅ Nothing to get wrong. No endpoint, no schema, no query, no new props beyond `tone`.
  Every state the handoff draws is already reachable from `useArtistFollow` /
  `useBillFollows`.
- ✅ The one new string, the header shortcut's label, already exists as
  `COPY.followAll(unfollowed)` in `following/bill/definitions/copy.ts:27`. No copy is added
  by this pass, so no copy-review round is owed.

### 🧱 Codebase fit

- ✅ `var(--*)` throughout. Every token referenced exists in `globals.css`: `--signal`,
  `--accent`, `--border-strong`, `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent`,
  `--scrim`.
- ✅ `--accent` is correctly left to Watching; Following never borrows it.
- 🟡 The size keys are renamed wholesale — `sm | md | full` becomes
  `badge | row | rowWide | primary`. This is an improvement (the old names described
  density, the new ones describe placement, which is what the rule actually constrains) but
  it is a breaking rename across nine call sites and two skeletons, and the two skeletons
  hardcode `48` and `44` as literals with comments explaining that they must track the
  table. They will not track it. The plan PR updates both.
- 🟡 **The shelf badge is 34px, not 30.** `ShelfCard.tsx:253` is a hand-rolled circular
  button outside `NF_FOLLOW_SIZES` — different diameter, different scrim
  (`rgba(0,0,0,0.5)`, not `var(--scrim)`), different border weight (1.5px). The "30 → 26"
  row was therefore wrong about the only surface it names; **corrected in place** to
  "34 → 26". Eng folds the badge into the shared table on the way through, which is the fix
  the handoff implies anyway.
- 🟡 **The onboarding picker does not use the badge.** README §Open says steps 6–7 "were
  built at 30 and inherit 26 automatically." `ArtistPickTile` is a selection tile with its
  own check/plus glyph and no `FollowButton`, so nothing inherits and the flagged collision
  between the picker's check and the follow badge cannot occur. The open question resolves
  itself; the picker is out of scope. **Struck through in place** in the README, along with
  the ramp row that named the picker as a `badge` consumer.
- 🟡 The bulk "Follow all" is not a `FollowButton` — it is a hand-rolled `.ap-follow` with
  `aria-haspopup` / `aria-busy` / `aria-disabled` semantics that a toggle must not carry.
  Moving it into the header means restyling it to the quiet row geometry, not swapping it
  for the shared control.

### ♿ Cross-cutting

- 🟠 **The icon-only hit area was 40px wide, not 44.** `follow-scale.jsx` expanded the
  overlay vertically by `(hit - height) / 2` but horizontally by a fixed `-6px`, so a 28px
  icon-only square got 40 × 44 and missed the target the artboard is there to prove.
  `CCFollowBadge` gets it right one function later (`inset: -(44 - d) / 2`). **Fixed in
  place in this PR**, in both the control and the `HitProof` artboard's dashed box, since a
  proof drawing the wrong box is worse than no proof.
- 🟡 The overlay overhangs the button on surfaces where the row is itself a tap target
  (search results are a full-width link to the artist page). 6px of the link becomes the
  button. Acceptable — that edge is the button's own margin — but worth a look on device.
- 🟡 Quiet weight puts the whole affordance on a `--border-strong` (#2c3661) outline, which
  against `--bg` (#070a1a) is roughly 1.5:1, under WCAG 1.4.11's 3:1 for a non-text
  boundary. The label text carries the affordance, so this is arguable rather than a
  failure, but it should be eyeballed across all three themes at the same time as Design's
  own flagged item (the 55%-mixed `--signal` border on Light).
- ✅ `aria-pressed` handling in the prototype matches shipped: omitted, not `false`, when
  the control is a dialog trigger.
- 🟡 The prototype's icon-only `aria-label` is the bare "Follow". Shipped uses
  `ARTIST_COPY.followAria(name)`. Keep the named version — the icon-only case is exactly
  where the accessible name is the only name.
- ✅ `all: unset` wipes the focus ring; the shipped `.ap-follow` class puts it back and
  must survive the restyle.

### ⏰ Drift from reality

- ✅ Recent. R2 is live, the surfaces it names all exist, and the screenshots match what
  ships today.
- 🟡 The drift is one-directional: the handoff is accurate about the R2 *design* and stale
  about the R2 *code* in the five places listed above. Nothing here predates a migration or
  a schema change.

### 📝 Decision log

- ✅ Rules 1–5 are unambiguous, ordered, and state their reasoning. Rule 3 in particular
  ("`Following` stays `--signal`-tinted at either tone — it's a state, and losing the
  colour loses the read") is the kind of note that prevents a later "simplification".
- ✅ The R2 numbers are preserved in `FS_SIZES_R2` so the before column renders honestly
  rather than from memory.
- 🟡 "One filled Follow per screen" is stated as a rule and then given exactly one home
  (the artist page hero). Two shipped surfaces are a single full-width follow on a screen
  with no hero — `FollowNudgeCard` and `EmptyUpcoming`. The plan PR reads the rule as a
  per-screen count with the hero as its default home, so those keep `loud`.

## Eng-side clarifications (resolved in the plan PR)

1. Three states, not four. No `pending` skin, no "Following…" label; optimism stays in the
   hooks.
2. `signedOut` keeps the at-rest skin at quiet weight, per #794 §3.10.
3. Locked keeps `--fg`, not `--fg-muted`, so the gate does not read quieter than the action.
4. The bill keeps its shipped locked shape: no per-row buttons below Premium, one bulk gate.
5. Icon-only and badge use symmetric `inset: -(44 - size) / 2` for the hit overlay.
6. The shelf badge (34px, hand-rolled) joins the shared size table at 26.
7. `FollowNudgeCard` and `EmptyUpcoming` keep `tone="loud"` at `primary` — each is the only
   follow on its screen. Every other surface is quiet.
8. Both skeletons (`FollowSkeleton` 48, `following/loading.tsx` 44) move to the new heights.
9. The onboarding picker is out of scope; the README's inheritance note does not apply.

## Decisions inherited

- `--accent` is Watching. Following never borrows it. (Locked vocabulary, CLAUDE.md.)
- The signed-out control is pixel-identical to not-following; the honesty is in the
  accessible name. (#794 §3.10.)
- Locked keeps idle's accessible name; an `sr-only` sentence carries the gate. (Native
  Following.)
- The tap target does not move. Visual height may shrink; 44px may not. (R3, rule 4.)
- `Following` stays `--signal`-tinted at either tone. (R3, rule 3.)

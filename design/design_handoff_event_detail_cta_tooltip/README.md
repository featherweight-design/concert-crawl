# Event Detail CTA + CCTip

**R2 canvas:** `Event CTA + Tooltip v2.html` ← current
**Eng prompt:** `CLAUDE_CODE_PROMPT.md` in this folder
**Status:** design complete, ready for engineering review
**R1 canvas:** `Event CTA + Tooltip.html` (superseded for the CTA half; the tooltip variant gallery is still the reference)
**Date:** Aug 3, 2026

---

# R2

## 1 · R1 solved the wrong composition

R1 read the problem as "Going + eye + a tooltip trigger" because that is all the screenshots contained. The live UI is two sibling blocks: `EventDetailCtaBlock` (Going only) and `WatchZone` (the eye, an **alerts hint**, and a **watcher count**). The hint hides once you're watching and the count is empty at zero watchers, so neither appeared in the screenshots. R1's `CommitBlock` has a slot for the eye and nothing else — **adopting it would have silently deleted two shipping elements.**

## 2 · The four elements are three objects

The hint and the count never both need weight, and they substitute for each other by state. They are **one line**:

| watching | others | line |
|---|---|---|
| no | 0 | Watch it — we'll ping you if the price drops. |
| no | N | 142 watching. We'll ping you if the price drops. |
| yes | 0 | You're watching this one. |
| yes | N | You + 141 others watching. |

So the composition is Going, the eye, and **one status line that belongs to the eye**. That is what changes the answer: once the eye owns a line of text, putting the eye on Going's row orphans that text.

## 2a · R2.1 — the watcher count is a social object

Correction to §2. "Watcher count" is not a number: it's an **avatar stack, named handles, and a roster behind "see all N"**. Folding it into a bare count on the status line under-modelled it badly.

So Direction D's strip is **two rows in one bordered object**:

| | |
|---|---|
| **row 1** | the toggle — eye + hint. Whole row is the button |
| **row 2** | the crawl — avatars, names, and an "All 13" that opens the roster |

Two **sibling** buttons, never nested. Row 2 is absent when nobody is watching — which, together with the hint hiding once you're watching, is the entire reason R1 saw neither element.

- **Name budget is measured, not guessed.** `WatcherWord` observes its own box and degrades in this order: **3 names → 2 → 1 → drop the "in the crawl" suffix → 0 names → hide the sentence.** Names outrank the suffix deliberately: an earlier ladder exhausted names first and spent 72px of decoration to bin a 111px handle, which is how 320 ended up showing a bare count. The "All N" chip carries the count at every rung, so **the count is never what gets cut**. Same ResizeObserver approach as the event row's `MetaRow`.
- **At ≤360 the faces give way to the names.** Measured at 320: the row is 237px, and an avatar stack (52) plus a numeric chip (58) left 113px — less than one handle (111) plus any tail — so *no name could ever render*, and the sentence always bottomed out to a count that merely restated the chip. Compact drops the stack and shrinks the trigger to a chevron, freeing 203px. The roster still shows every face; the names are the payload, and on the smallest screen they win.

  Result at 320: **"sc_setlist_bassbin6 + 11 more"** — the reference screenshot's sentence, not a number.
- **The viewer is never seed data.** `WATCHERS` is the *other* people (12 with anons); `wr_crowd()` injects `VIEWER` when — and only when — you're watching, and `wr_total()` derives the count from that same list. One definition of membership, so names, avatars and the total can't disagree. The count therefore reads **12 others, 13 once you watch** — that difference is real, not a bug.
- **Row 2 hides when you're the only watcher.** "All 1" beside your own avatar isn't social proof, and row 1 already says you're watching it.
- **Anonymous watchers stay counted, never faked.** The roster's last row is "5 more watching, no handle yet" with a dashed avatar.
- **The disc is `UMAvatar`** from `user-menu.jsx`, not a new primitive. The crawl needs per-handle colour so a stack reads as distinct people; the disc's halo was *already* its colour knob, so this pass added an optional `tone` prop there (plus `muted` for the "+9" overflow disc) rather than authoring a fourth avatar treatment. Omit both props and the render is byte-identical to what ships. Tones are deterministic from the handle across four existing tokens — `--signal`, `--accent`, `--warning`, `--success`. No raw hex.

  This is the same rule as §2b and §6, applied to something I'd already got wrong once: **check for the shipped primitive before drawing a new one.** `UMAvatar` is also used by `NotifAvatarButton` in `design_handoff_in_app_notifications/`, which documents the same reuse.

## 2b · "See all" no longer pushes the page

You flagged the inline expand. It's right to fix now, and it's a shell problem, not a roster problem.

On a show with 13 watchers the inline list pushes Get Tickets, the price block and the setlist off-screen — the user opened a name list and lost the page. An inline expand is right when the revealed content is short and what's below it is unimportant; neither is true here. **The roster moves into an overlay:** bottom sheet on mobile, anchored popover on desktop. Nothing below it moves.

### Ruling: the shell is now shared

The roster needs exactly the two shells `CCTip` already had. Rather than write a second popover/sheet pair beside the first, the chrome moved into **`cc-overlay.jsx`** — positioning, arrow, header, close, scrim, grabber, focus trap, Escape — and both features consume it.

- `CCTip` = `CCOverlay` + `TIP_CONTENT`
- `WatcherRoster` = `CCOverlay` + a list
- `useOverlayTrigger` holds the hover/pin/blur/Escape model once, so it can't drift between the two.

Same reasoning as retiring `InfoTooltip` (§6) and as one `EventRow` for three surfaces. That's three times in one pass — worth making it a house rule: **a second component that renders the same chrome is a refactor, not a feature.**

## 3 · Recommendation moves C → D

| | Direction | Trade |
|---|---|---|
| **D ★** | **Watch strip** — Going full-width; below it a strip where the eye leads its own status line | The whole strip toggles watching: a ~300×52 target whose copy says what tapping does, instead of a bare 52px square. **Recommended.** |
| E | **Two-up + line** — R1's Direction C with the status line added beneath | Demonstrates the orphaning directly: the line reads as belonging to neither control |
| F | **Count on the eye** — badge on the eye square, hint moves into the tooltip | Tightest, but the alerts hint leaves the page entirely |

R1's Direction C judged the eye as a peer control needing peer weight. With a status line in play the eye is instead the leading element of its own object — and the strip is both a better target and a clearer promise.

## 4 · Entitlement + lifecycle

Going is gated behind Concert History. Seven states now, all in canvas §2:

| State | Treatment |
|---|---|
| `default` / `going` / `past-yes` / `past-no` | **delegate to the shipped `GoingButton`, copy included.** Only `locked`/`pending`/`error` are authored in `GoingCTA`, because `GoingButton` has no equivalent |
| `locked` | Same size, position and label as unlocked — the label is `GOING_LABEL`, read from `going-cta.jsx` rather than retyped — **outlined instead of filled**, lock mark, one honest line beneath with a `concert-history` tip. Tap opens the upgrade sheet. **Never disabled** — a disabled control can't sell anything |
| `pending` | Not a button. `role="status"` + `aria-live="polite"`; the watch strip stays live underneath |
| `error` | Names what survived — "We couldn't reach the server. Your watch is safe." Retry is the button itself, not a separate link |
| `past-yes` / `past-no` | `GoingButton`'s existing past states, unchanged — "You went · Aug 15, 2026" / "Didn't make it". The block's only addition is flipping the eyebrow to "That night" |

**Watching is free in every one of these**, so the watch strip is never touched by the gate. A Free user gets the whole free feature without meeting a wall first — that's the honest read of the split.

## 5 · Tooltip copy is honest about the split

R1's `going-vs-watch` said Going "lands in your concert history after the show" and never mentioned it was paid — the last thing a Free user reads before finding out otherwise. Rewritten as a two-row `defs` tip: **Watching — free** / **Going — part of Concert History**, stated once, without apology. New `concert-history` tip carries the locked-state pitch.

## 6 · Ruling: CCTip replaces InfoTooltip

**Call it.** `InfoTooltip` is retired, not coexisted with.

- Port both live uses to `CCTip`. The Event Detail one becomes `tip="going-vs-watch"`; the other surface gets a new `TIP_CONTENT` key rather than an inline string.
- `InfoTooltip` is click-only, single-string, `role="tooltip"`. CCTip is `role="dialog"` — correct here, because the content is interactive and can be rich. Screen-reader announcement changes; that's intended.
- The trigger changes from "?" to ⓘ. Same 26px box, same 44px touch target.
- Delete `InfoTooltip` in the same PR. Two tooltip components is exactly the drift we just spent a pass removing from event rows.

## 7 · On the standing support line

Fair catch — and R2 does **not** restore it. `We'll add this to your history.` is gone for good; it restated the button, which is why it was cut.

The line in Direction D is a different object: it's `WatchZone`'s status line, it belongs to the **eye**, and it carries alerts + social proof — both new information, neither a restatement of anything. It was already shipping; R2 just gives it a home inside the block instead of a sibling block.

## 7a · Copy rules worth keeping

- `watchStatus` is now just the toggle's own label — the count left it in R2.1. Row 1 reads "Watch to get pinged on price drops + sold-out." (your live copy) or "You're watching this one."; everything about *who* is watching lives on row 2.
- Any state `GoingButton` already models must delegate to it, copy included. The R2 review caught `GoingCTA` rendering "I'm going!" beside `GoingButton`'s "I'm going", and inventing "You were there" where `GoingButton` already said "You went · Aug 15, 2026". That seam is closed: `GoingCTA` now owns only `locked`, `pending`, `error`.

## 8 · Smaller fixes

- **Shadows tokenised.** `--shadow-soft` / `--shadow-strong` added to all three themes in `theme-context.jsx`; both shells read them. R1's `rgba(0,0,0,0.6)` sat like a bruise on Light — the Light values are 0.12 / 0.20 of a cool near-black. **This adds two tokens to the shared theme file** — flagging it explicitly.
- **Open model corrected** to match what the R1 README claimed: hover opens unpinned; hover-out closes *only if unpinned*; **click toggles pin** and a pinned panel survives mouse-out; focus opens; blur past the wrapper closes if unpinned; Escape closes, unpins, and returns focus to the trigger.
- **Focus trap added** behind the sheet's `aria-modal` — focus moves in on open, Tab cycles inside until close.

## 9 · Files

```
design_handoff_event_detail_cta_tooltip/
├── Event CTA + Tooltip v2.html  ← R2, open this
├── event-cta-v2.jsx             ← CommitBlockV2, GoingCTA, WatchStrip, GOING_STATES
├── cc-overlay.jsx               ← CCOverlay, CCOverlayHost, useOverlayTrigger (shared shell)
├── watcher-roster.jsx           ← AvatarStack, WatcherCrawlLine, WatcherRoster, rosterSummary
├── user-menu.jsx                ← UMAvatar + optional `tone`/`muted` props (only change)
├── cc-tip.jsx                   ← CCTip (R2 open model + focus trap + revised copy)
├── theme-context.jsx            ← +2 shadow tokens per theme
├── Event CTA + Tooltip.html     ← R1, kept for the variant gallery
├── event-cta.jsx                ← R1 CommitBlock (superseded)
├── going-cta.jsx                ← + `bare`/`radius`
├── guide-admin.jsx              ← + `tip`
└── admin-tip-surfaces.jsx
```

## 10 · Open for you

- `GoingCTA` locked/pending/error/past use the accent family, matching the shipped `GoingButton`. Note that CLAUDE.md reserves `--signal` for primary CTAs and `--accent` for brand/Watching — Going and Watching both sitting in accent predates this pass, but if you want Going moved to `--signal` it collides with Get Tickets directly below. Worth a ruling.
- Watcher floor: the crawl row renders from **two** watchers up — `WatchStrip` hides row 2 when `total <= 1`, because "All 1" beside your own avatar isn't social proof. If a show with 2–3 watchers reads as discouraging rather than social, tell me the threshold and I'll gate row 2 on it.
- `cc-tip.jsx` still carries its own `CCTipPopover`/`CCTipSheet`, which are now duplicates of `CCOverlay`. I left them so the R1 canvas keeps rendering; **delete them and point `CCTip` at `CCOverlay` in the implementation PR** — the API is identical.
- Handles are long (`sc_lastcall_bassbin7`). If real users get display names, the name budget goes further and 320 could carry two.

---

# R1 — original notes

## 1 · What was wrong

From the live screenshots (Aug 2):

| Symptom | Cause |
|---|---|
| Watching sits below Going with almost no emphasis | The eye square got stacked instead of paired — a 52px icon alone on a line reads as leftover chrome |
| The “?” lands *between* the two CTAs | A tooltip trigger placed in the CTA stack reads as a third action, and separates the pair it explains |
| Awkward on both breakpoints | Three loose objects on three lines, each less emphatic than the last, with no container claiming them |

**Not a copy problem, a containment problem.** Nothing was grouped, so hierarchy had to be carried by size alone.

## 2 · The fix

1. **One bordered block owns the pair** (`<CommitBlock>`, `--surface-1` + `--border`, radius 14). Going and Watching are siblings on **one row**, never stacked.
2. **The ⓘ leaves the CTA stack.** It attaches to the support line (mobile) or the `YOUR MOVE` eyebrow (desktop) — metadata position, not action position.
3. **The support copy stays visible.** It was migrated *into* the tooltip; that lost the only sentence explaining the difference. The mono line renders again, and the tooltip is depth on top of it — never the only home for the copy.
4. **Watching keeps peer weight:** same height and same 1.5px border weight as Going. Icon-only at ≤ 390, icon + label on desktop.
5. `Get Tickets ↗` stays the page's primary action below the block — the commit block is deliberately the secondary strip under the title.

### Three directions (canvas §1)

| | Direction | Trade |
|---|---|---|
| A | **Split bar** — Going + eye cap in one bordered bar, divided by a rule | Fewest objects; the eye can read as *part of* Going rather than its own toggle |
| B | **Stacked, labelled** — Going, then a full-width labelled Watch | Highest Watching clarity; two full-width buttons compete for the same slot |
| **C ★** | **Two-up** — Going flexes, 52 eye square beside it | Peer weight, one row, survives 320. **Recommended.** |

C is the smallest change from what's already built (`EventDetailCTABlock` already intended this row) — the live bug is that the eye wrapped below. It also keeps Going's stub shape uninterrupted, which the Concert History track locked.

### Copy

- Not committed: `Going saves the night · Watch tracks the price.` (mobile drops “the” to hold one line at 320)
- Going only: `We'll add this to your history.`
- Going + watching: `In your history after the show · watching the price.`

Vocabulary check: **Watching**, never Saved/Favorites. Going is the commitment; Watching is the price subscription.

---

## 3 · CCTip — the reusable tooltip

`cc-tip.jsx`. One component, **two shells**, **six content shapes**, content declared as **data**.

```jsx
<CCTip tip="going-vs-watch" surface="mobile|desktop"
       size="sm|md" placement="top|bottom" align="start|center|end"
       defaultOpen={false} sheetHost="#app-root" />
```

### Shells

| Surface | Shell | Behaviour |
|---|---|---|
| Desktop | Anchored popover, 272 (prose) / 320 (rich), pointer arrow | Hover-intent 110ms in / 140ms out, opens on focus, click pins, Escape closes |
| Mobile | Bottom sheet, grabber + label + close, scrim | Tap opens. Rich content can't fit a 320-wide popover, and a sheet is thumb-reachable |

`sheetHost` takes a selector / ref for the surface root so the sheet spans the viewport rather than the trigger's inline box. Omit it and the sheet renders in place (fine inside an already-full-bleed container).

### Content variants

| Variant | Shape | Live use |
|---|---|---|
| `text` | 1–2 sentences | Event Detail · `going-vs-watch` |
| `titled` | header line + body | Event Detail · `who-set-this-price` |
| `defs` | label + description + state dot rows | Admin · `chip-states` |
| `steps` | numbered sequence + optional mono footer | Admin · `publish-gate` |
| `example` | label + description + say-this / not-this mono snippets | Admin · `guide-voice` |
| `dos` | do's & don'ts pair | Admin · `chip-dos` |

All copy lives in `TIP_CONTENT` (one reviewable file). `label` doubles as the trigger's accessible name and the sheet title. Add a key, don't pass JSX at call sites.

### Trigger

Small ⓘ, 26px visual box (`size="md"` → 30), `--fg-subtle` at rest → `--signal` when open with a 12% signal wash. Touch target padded to 44px on mobile. Real `<button>` with `aria-expanded` + `aria-controls`; panel is `role="dialog"`, `aria-modal` on mobile only. No native `title=` tooltips — project convention. The ⓘ is never the only signal; the thing it explains always carries its own visible label.

---

## 4 · Admin · First-timer guide

The permanent **“Chip state indicators”** card below the form is **retired**. Its content becomes the `chip-states` ⓘ on the **form's card header** — the header speaks for the whole guide, which is what the card was doing while occupying ~200px of page.

Two more tips ride the same form to prove the variants in situ:

- `guide-voice` (`example`) on the **Add more chips** label — say-this / not-this
- `publish-gate` (`steps`) on the publish footer, next to `⌘↵ publish`

`ChipStateLegend` in `design_handoff_venue_first_timer_guide/guide-admin.jsx` can be deleted once this lands; its rows are reproduced verbatim in `TIP_CONTENT["chip-states"]`. Canvas §5 renders the **real** `GuideAdminBlock` and `ChipStateLegend`, not a mock.

---

## 5 · Files

```
design_handoff_event_detail_cta_tooltip/
├── Event CTA + Tooltip.html   ← open this
├── cc-tip.jsx                 ← CCTip + TIP_CONTENT (the reusable piece)
├── event-cta.jsx              ← CommitBlock, WatchCap, WatchTextButton, EventDetailTop
├── admin-tip-surfaces.jsx     ← tooltip gallery specimen
├── going-cta.jsx              ← Concert History CTA, + `bare`/`radius` props for Direction A
├── guide-admin.jsx            ← real First-Timer form, + `tip` prop threading the three ⓘs
└── (theme-context · ios-frame · identity-art · history-data · admin-primitives
    · guide-data · design-canvas · tweaks-panel — unchanged copies)
```

Two existing files modified:

- `going-cta.jsx` — `GoingButton` gained optional `bare` + `radius` so it can sit inside Direction A's shared bar. Defaults unchanged.
- `guide-admin.jsx` — `GuideAdminBlock` gained optional `tip` (which ⓘ is open, for review) and renders three `<CCTip>`s: header title, `Add more chips` label, publish footer. Renders identically when `tip` is omitted.

Both are safe to copy back over their source-of-truth versions.

## 6 · Eng notes

- Every color is a token. Verified across electric / jade / light (theme tweak on the canvas).
- `CommitBlock` replaces `EventDetailCTABlock`; same props plus `direction` and `sheetHost`. Ship `direction="C"` and drop the other branches if you'd rather not carry them.
- The eye stays neutral (not accent) while Going is on, so the two don't compete for the same emphasis.
- One `CCTip` open at a time is *not* enforced globally — if two triggers sit within ~300px on desktop, pass `align` so the panels can't collide.
- Sheet uses `--scrim`; it does not trap focus yet. Add a focus trap when it lands (it's `aria-modal`).

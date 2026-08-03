# Design Readiness Review — Event Detail CTA + Tooltip

**Round reviewed:** R3 · **Date:** 2026-08-03 · **Verdict: 🟢 Green — build it, with the carry-ins below**

> **R3:** the two open product calls went back to Design rather than being settled
> in engineering. Both are now ruled on in README §10, and this review no longer
> carries an open-calls section. R3's drop branched from before the R2 merge, so
> six fixes were re-applied on top of it — see "R3 re-applied" below.

Method: the prototype's logic was executed against adversarial inputs and diffed
against the shipped components on `origin/main`, not read from the README prose.

---

## R1 blockers — all closed

| R1 blocker | R2 |
| --- | --- |
| Composition deleted two shipping elements (alerts hint, watcher count) | Closed. §1 admits it; the hint and the count are modelled as one status line owned by the eye. |
| Roster expanded inline and shoved the page down | Closed. `CCOverlay` — sheet on mobile, anchored popover on desktop. |
| A second tooltip beside the shipped `InfoTooltip` | Closed. §6 rules `CCTip` **replaces** `InfoTooltip`, deleted in the same PR. |
| Open model had no pinning, no focus trap, no Escape-returns-focus | Closed. `useOverlayTrigger` has real `pinned` state; `useFocusTrap` is genuinely implemented; Escape refocuses the trigger. |
| Raw hex shadows | Closed. `shadow-soft` / `shadow-strong` tokenised. |

The staging watcher-distribution constraint was absorbed: row 2 hides at zero and
at self-only (R3 widened this to `wr_showCrawl`, which also hides a lone stranger
and an all-anonymous crowd), and row 1 carries a line in **both** toggle states, so
the strip doesn't change height on toggle.

## Fixed in this review (one-liners, already applied)

- `event-cta-v2.jsx:77` — `GOING_LABEL` was `"I'm going"`. Shipped
  `GOING_COPY.button.default` is `"I'm going!"` and copy.ts documents the
  exclamation as load-bearing *and* names the prototype JSX as the wrong source.
  R2 resolved the drift toward the known-wrong file. Now `"I'm going!"`.
- `watcher-roster.jsx:171` — `extra={total - 3}` under-counted whenever the named
  list was shorter than 3 and anon watchers existed. Now derived from
  `min(list.length, 3)`.

## Copy pass (`copy-review` skill)

Handoff copy ships verbatim, so rule 4 (no em-dashes) is enforced here rather
than at build time. Six fixes applied; all other strings pass.

| File | Was | Now | Verdict |
| --- | --- | --- | --- |
| `cc-tip.jsx` | `Watching — free` | `Watching: free` | TIGHTEN (rule 4) |
| `cc-tip.jsx` | `Going — part of Concert History` | `Going: part of Concert History` | TIGHTEN (rule 4) |
| `cc-tip.jsx` | `It's a paid feature — you can watch…` | `It's a paid feature. You can watch…` | TIGHTEN (rule 4) |
| `cc-tip.jsx` | `stack into a history — what you saw…` | `stack into a history: what you saw…` | TIGHTEN (rule 4) |
| `cc-tip.jsx` | `track the price for you — pings on…` | `track the price for you: pings on…` | TIGHTEN (rule 4) |
| `event-cta-v2.jsx` | `Didn't save — tap to retry` | `Didn't save. Tap to retry` | TIGHTEN (rule 4) |
| `event-cta-v2.jsx` | `${GOING_LABEL} — requires Concert History` (aria) | `${GOING_LABEL} Requires Concert History.` | TIGHTEN (rule 4) |
| `event-cta-v2.jsx` | `price drops + sold-out.` | `price drops and sold-outs.` | TIGHTEN (consistency) |

`KEEP`, notable: `Two different promises.` · `A fan put it there.` ·
`Your gig log, kept for you.` · `We couldn't reach the server. Your watch is
safe.` · `N more watching, no handle yet` · `The crawl on this show`. The
error line naming what survived, and the roster counting anonymous watchers
without faking them, are both the honesty rail working.

Two deliberate cap breaches recorded and kept: the `concert-history` and
`who-set-this-price` bodies run to three sentences where the Teaching cap is
two. Both spend the third sentence on the paid/free split or on price
provenance, which is the intent.

Out of scope, left alone: em-dashes in code comments, in the `CTA_DIRECTIONS_V2`
canvas notes, and in the `GOING_STATES` picker labels. None of those render to
a user. Admin tips in `cc-tip.jsx` are out of scope per the skill.

## Carry into the build — not another design round

1. **Logged-out is not free.** §4 says *"Watching is free in every one of these,
   so the watch strip is never touched by the gate."* Shipped `WatchShowButton`
   opens `TierPickerSheet` with `entry='logged-out-watch'` for signed-out users.
   The strip needs the same routing; no logged-out treatment exists in the v2 files.
2. **Two missing states.** Shipped `EventDetailCtaBlock` has two `return null`
   paths — `cancelled` and `isLoading || surface === null`. `GOING_STATES` models
   neither.
3. **Shadow tokens land in 9 themes, not 3.** This handoff's `theme-context.jsx`
   is the older 3-theme lineage (electric / jade / light), so the new
   `--shadow-soft` / `--shadow-strong` are defined 3 times. The canonical
   9-theme merge already exists in the repo at
   `design/design_handoff_artist_page/theme-context.jsx` (base 3 plus pulse,
   forge, bluenote, drip, cedar, gloss). Port the shadow tokens against *that*
   file, not this one, or the six genre themes ship without them.
4. **Copy goes to `definitions/copy.ts`.** Every string authored in the v2 files
   (`watchStatus`, the locked line, the error line, overlay titles) is
   customer-facing.

## Rulings — both closed by Design (README §10)

1. **Colour: Going stays on `h_accentFor(artist)`.** The question assumed two
   token scopes; there are three, and Going uses the per-show one. CLAUDE.md's
   "`--accent` is not for CTAs" rule governs the *system* token and has no
   category for a per-show colour, so it isn't in play. The separator that does
   the work is weight, not hue: Get Tickets is always filled `--signal`, Going is
   outlined until you commit, so exactly one filled button is on screen
   pre-commit. Design offered a CLAUDE.md amendment naming the three scopes —
   worth taking, since this is the second pass to trip over it.
2. **Watcher floor: two nameable people** (`wr_showCrawl`). Not a watcher count.
   A lone stranger and a purely anonymous crowd both hide; "you & sc_x" shows.
   Anonymous watchers still count toward the total once the row qualifies.

Remaining, and genuinely not blocking: handles like `sc_lastcall_bassbin7` eat
the name budget. If real users get display names, 320 could carry two.

## R3 re-applied

R3's drop was authored from a pre-R2-merge base, so it arrived reverting fixes
that are already on `main`. Design's intentional changes were kept; these six
were restored on top:

| File | Restored |
| --- | --- |
| `cc-overlay.jsx` | Focus trap back on the dialog, scrim out of the tab order and the a11y tree |
| `cc-overlay.jsx` | `clearTimeout` in `close`/`toggle` — without it a hover-out then click self-closes ~140ms later |
| `cc-tip.jsx` · `event-cta-v2.jsx` | Seven em-dashes in rendered copy, plus `price drops and sold-outs` |
| `event-cta-v2.jsx` | `GOING_LABEL = "I'm going!"` — the exclamation is load-bearing per shipped `GOING_COPY.button.default` |
| `watcher-roster.jsx` | `AvatarStack` `extra` off-by-one when the named list is short and anons exist |
| `theme-context.jsx` | Dead `collapsed` state removed again |

## Nits

- A lone anonymous watcher renders an avatar stack with zero discs.
- `WatcherWord`'s measure loop is a deliberately dependency-free
  `useLayoutEffect`: it re-reads `scrollWidth`/`clientWidth` after every render
  and steps one rung down the ladder until the sentence fits, mirroring
  `EventRow`'s `MetaRow`. Keep the shape when porting — a dependency array that
  misses a parent-driven relayout silently strands a clipped name. It does mean
  layout reads on every render, and the `ResizeObserver` observes the element it
  resizes, so watch for thrash on first paint and cap the ladder in the build.
- `watchStatus(watching, count)` no longer uses `count`; drop the param.
- §4 prose says "Seven states" and then lists past-yes/past-no twice.
- `event-cta-v2.jsx`'s header comment still describes the four-way status line
  that carried the watcher count. R2.1 moved the count to row 2 and the comment
  at `watchStatus` says so; the file-top version is stale.
- Dead duplicates to delete **in the production code** during the build:
  `CCTipPopover` / `CCTipSheet` inside `cc-tip.jsx`. R1's `event-cta.jsx` and
  R1's HTML stay in the folder as the design record, per the multi-round
  precedent in `design_handoff_spotlight_heroes/`.
- `CLAUDE_CODE_PROMPT.md` is kept: despite the filename it carries design
  constraints and rationale, not a task breakdown. The two product calls it
  raises at the end are the open items below.

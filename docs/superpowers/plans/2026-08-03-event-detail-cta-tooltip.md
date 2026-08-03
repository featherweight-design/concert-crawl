# Plan — Event Detail CTA + CCTip

**Handoff:** `design/design_handoff_event_detail_cta_tooltip/` — R2 canvas
(`Event CTA + Tooltip v2.html`)
**Readiness:** 🟢 Green — `READINESS.md`, review round R3. The canvas version and
the review round are numbered separately; R3 reviewed the R2 canvas.
**Tracking issue:** #1387
**Shape:** 4 PRs, strictly sequential (each depends on the one before)

---

## What this changes

The event detail commit block today is two blocks that don't know about each
other: `EventDetailCtaBlock` (the Going button plus a `?` tooltip) and `WatchZone`
(the eye, an alerts hint, and a social-proof row that expands a roster inline and
shoves the page down). The handoff rebuilds this as one composition — Going on
top, then a two-row watch strip — and moves the roster into an overlay.

Three things come along for the ride: a shared overlay shell (`CCOverlay`) used by
both the tooltip and the roster, a tooltip (`CCTip`) that retires `InfoTooltip`,
and shadow tokens that don't exist yet.

**What is not changing:** the watchers API, `useEventWatchers`, `useAttendingToggle`,
the entitlement gate, or the optimistic-commit machinery in `EventDetailCtaBlock`.
That logic is load-bearing and well-commented; this is a composition and chrome
pass over the top of it.

---

## Rulings already made — do not re-open

Both were ruled by Design in README §10 after the R2 review raised them.

**Colour.** Going stays on `stampAccentFor(artist)`, the per-show identity colour
(the prototype calls it `h_accentFor`). This is already what production does —
the `accent` const in `GoingButton.tsx`. There are three accent scopes, and the
"`--accent` is not for CTAs" convention that prompted the question governs only
the system token. The scopes are named in the handoff README §10 — note they are
**not** currently written down in `CLAUDE.md`, which is why this keeps getting
re-litigated (see Out of scope):

| CTA | Token | Scope |
|---|---|---|
| Get Tickets | `--signal` | system, constant app-wide |
| Watching | `--accent` | brand presence, constant app-wide |
| Going | `stampAccentFor(artist)` | per-show |

The separator is **weight, not hue**: Get Tickets is always filled, Going is
outlined until you commit. `locked` is outlined too, so the Free path never shows
two fills either. Do not move Going to `--signal`.

**Watcher floor.** Row 2 renders when at least **two nameable people** are in the
crawl — not a watcher count. A lone stranger hides; an all-anonymous crowd hides;
"you & sc_x" shows. Anonymous watchers still count toward the total once the row
qualifies.

---

## Porting rules

1. **The prototype is inline styles; production is Tailwind + tokens.** Port the
   design, not the style objects. `var(--scrim)` becomes the existing token class
   where one exists.
2. **All copy goes to `definitions/copy.ts`.** The prototype authors strings in
   JSX. Every customer-facing string here — status lines, the locked line, error
   copy, overlay titles — lands in definitions, and any edit to them goes through
   the `copy-review` skill.
3. **The prototype's `theme-context.jsx` is the 3-theme lineage.** Shadow tokens
   go into `apps/web/src/theme/themes.ts`, which has **9** themes. Porting against
   the handoff file ships six genre themes without shadows.
4. **Mobile/desktop parity in the same PR.** Non-negotiable. CLAUDE.md sets the
   mobile-first 320px baseline; full behavioural parity shipping in the same PR
   is the standing convention on top of it.

---

## PR-1 · Overlay foundations, and retire InfoTooltip

**Why first:** everything downstream renders inside `CCOverlay`.

- Add `--shadow-soft` / `--shadow-strong` to **all 9 themes** in
  `apps/web/src/theme/themes.ts`. They do not exist today. `light` is the only
  theme with `mode: 'light'` — it takes a desaturated navy at ~0.12 / ~0.20. The
  other eight, `gloss` included, are all `mode: 'dark'` and take a near-black at
  ~0.45 / ~0.62. Match the value shape already used by `scrim`, and derive the
  split from each theme's own `mode` rather than from its name.
- Build `CCOverlay` — anchored popover on desktop, bottom sheet on mobile. Owns
  positioning, arrow, header, close button, scrim, grabber, focus trap, Escape.
  Knows nothing about its content.
- Build `useOverlayTrigger` — hover-intent + click-to-pin on desktop, tap on
  mobile, Escape returns focus to the trigger.
- **Reuse the existing `useFocusTrap`**, don't write a second one. It already
  lives at `apps/web/src/components/consumer/user-menu/use-focus-trap.ts` and is
  fully generic — it takes a ref and an `active` flag and is deliberately kept in
  step with `BottomSheet`'s selector. Promote it to a shared hooks location and
  update the user-menu import; a same-named sibling would make imports ambiguous.
- Build `CCTip` on top of it, port `TIP_CONTENT` into a definitions file.
- Replace `InfoTooltip` at both call sites —
  `apps/web/src/components/consumer/going/EventDetailCtaBlock.tsx` and
  `apps/web/src/components/consumer/PendingCardB.tsx` — then delete **both**
  `apps/web/src/components/ui/info-tooltip.tsx` and its test,
  `apps/web/src/components/ui/info-tooltip.test.tsx`. The test imports the
  component, so removing only the implementation breaks the suite. Its coverage
  moves onto `CCTip`.

**Two traps the design review already hit, both worth a test:**

- `useFocusTrap`'s ref belongs on the **dialog**, never on a wrapper that also
  holds the scrim. The hook focuses the container it is given and then cycles Tab
  within that container's subtree, so pointing it at a wrapper puts the scrim
  inside the trap and hands it a Tab stop. The scrim is click-to-dismiss only:
  `tabIndex={-1}`, `aria-hidden`, with the header's ⨯ as the accessible close.
- Every transition in `useOverlayTrigger` must `clearTimeout` the pending hover
  timer first. Without it, a hover-out immediately followed by a click fires the
  stale close ~140ms later and shuts the panel the click just pinned.

**Tests:** sheet is `aria-modal` and traps Tab in both directions; Escape closes
and returns focus to the trigger; hover-out-then-click leaves the panel open;
initial focus lands inside the dialog, not on the scrim.

---

## PR-2 · The two-row watch strip

Restructure `WatchZone` into the strip the handoff specifies:

- **Row 1** — the eye toggle plus a status line. The line carries copy in *both*
  toggle states so the strip doesn't change height when you tap. Today the hint
  renders only when not watching, which is the height jump.
- **Row 2** — the crawl, gated on the two-nameable-people rule. Implement it as a
  single predicate next to the existing helpers in `apps/web/src/lib/watchers.ts`,
  taking the same arguments as its siblings so call sites stay symmetric.

Keep `WatchShowButton`'s signed-out routing exactly as it is — it already opens
`TierPickerSheet` with `entry='logged-out-watch'`. **The handoff is wrong on this
point:** §4 claims "the watch strip is never touched by the gate". It is, for
signed-out users, and that routing must survive the restructure. It is already
pinned at the button level by "tags the picker with the logged-out-watch funnel
entry" in `WatchShowButton.test.tsx` — keep that test passing rather than
duplicating its assertion, and add coverage only at the new strip level.

Add the `releases.ts` entry on this PR — it is the first user-visible change in
the sequence, and PR-3 and PR-4 amend it rather than adding their own.

Row 1 and row 2 are **siblings**, never nested — the crawl must not end up inside
the toggle's hit area.

**Tests:** strip height is stable across a toggle; the crawl's six visibility
cases (0 others + watching, 1 other not watching, 1 other watching, 2 others,
all-anonymous, and a populated crawl); signed-out tap still opens the picker with
the right entry.

---

## PR-3 · Roster moves into the overlay

`WatchersSurface` currently expands `WatchersRoster` inline. Move it into
`CCOverlay` — bottom sheet on mobile, anchored popover on desktop — so opening the
roster stops displacing the page.

- The overflow count on the avatar stack must be derived from the number of discs
  actually rendered, not a hardcoded cap. With a short named list and anonymous
  watchers present, `total - 3` under-counts.
- Anonymous watchers stay counted and never faked: the roster's last row reads as
  a count with no handle, with a dashed disc.

**Tests:** roster opens in a sheet at mobile widths and a popover at desktop;
avatar overflow plus rendered discs sums to the true total when the named list is
shorter than the cap.

---

## PR-4 · Going CTA states

`GoingButton` models `default | going | past-yes | past-no`. The handoff adds
`locked`, `pending`, and `error` as button treatments rather than adjacent
elements — today a failure renders as a separate `<p>` beneath the button.

- `locked` is **outlined**, so a Free user never sees two filled buttons.
- Error copy moves into the button and gets its accessible name updated.
- `cancelled` and `isLoading || surface === null` keep their `return null` paths.
  The handoff's state list models neither, and that is fine — there is nothing to
  design for a row that doesn't render. Do not invent treatments for them.

The `releases.ts` entry lands on **PR-2**, not here. PR-2 is the first PR that
ships a visible change, and each PR merges on its own, so waiting until PR-4
would leave two user-visible releases unannounced. Amend the entry on PR-3 and
PR-4 as the rest of the composition arrives.

---

## Out of scope

- The `CLAUDE.md` amendment naming the three accent scopes. Design proposed it;
  it needs Hugh's word and it isn't code.
- Display names for users. Handles like `sc_lastcall_bassbin7` eat the name
  budget, and the handoff notes 320px could carry two names if real display names
  existed. That's a separate product change.

---

## Next

Start with PR-1. Nothing else can land first.

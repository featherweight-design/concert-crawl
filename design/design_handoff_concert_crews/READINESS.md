# Design Readiness Review — Concert Crews (#1226)

**Round reviewed:** R5 · **Date:** 2026-08-05 · **Verdict: 🟢 Green — ready for an engineering plan**

Track 2 parity gate. Method unchanged across all five rounds: the prototype's
logic was executed and diffed against shipped code on `origin/main`, not read
from the README's prose.

**R4 closed every item the bundle was blocking.** The sync bundle reached Design on the third
attempt, and everything that was blocked on it landed correctly — not
approximately, but at the exact line numbers and with the exact semantics the
manifest specified. Both bundle caveats were flagged rather than silently
absorbed, which is what was asked.

**R5 closes the last two.** Both were mechanical, both landed correctly, and
the diff is tightly scoped — six files, none of them a shared sibling. Nothing
is outstanding except one launch-gate call that belongs to Hugh.

---

## ✅ R3-1 — closed. All seven bundle-blocked items verified

**The three fixes in Design's own files:**

| item | verified |
|---|---|
| rules of hooks | `crew-social-rail.jsx:146` — the guard now sits **below** all 9 hooks in `CrewGoingLine` (which spans 102–191). The `useState` at :194 belongs to `EventDetailMock`, a separate component. Hook count no longer changes when a crew line loses its last member. |
| SSR-safe ids | `crew-art.jsx:314` — `React.useId()`, module-scope counter gone. |
| em-dashes | `crew-copy.jsx` — **17 → 0**. |

**The four stale siblings, now byte-identical to upstream** (every residual
diff is a trailing-newline difference only, confirmed by inspection):

`row-data.jsx` · `cc-overlay.jsx` · `cc-tip.jsx` · `watcher-roster.jsx`

The `watcher-roster.jsx` overflow undercount is fixed at line 191 —
`Math.max(0, total - Math.min(list.length, 3))`.

**`event-row.jsx` re-based correctly.** `PROVENANCE` is back (3 occurrences), and
the crew delta on top is exactly what was specified: two `SURFACES` entries
(`crewLens`, `crew`) and one `buildMeta` branch. Crew presence takes priority
over `following` in a budget of 2 — displaced, never removed — which honours the
locked decision rather than reinterpreting it.

Design also re-applied its measure-loop guard on top of the fresh file
(`lastW` ref + dep array + functional `setFit`), rather than dropping the fix to
take the bundle. Correct call, and it is still owed upstream.

**Jade `--success` = `#5FD97F`** applied at `theme-context.jsx:63`, and the dead
`collapsed` line dropped now that the newer copy is in — in that order, as
Design predicted would be necessary.

---

## ✅ R3-2 — closed

`notifications-data.jsx` is now byte-identical to
`design_handoff_in_app_notifications/`, including the shipped
`"More info requested on your price submission."` string.
`notifications-chrome.jsx` remains byte-identical. ✅

---

## ✅ Carried forward from R3, re-verified in R4

- `NAV_PRODUCT = NAV_A` (`crew-nav-options.jsx:124`) — five-slot bar, Hugh's ruling.
- Slot 3 is `"my shows"` at `:97` with an **eye**, not a heart. Locked vocabulary
  held, and Design documented at `:44` that `CCTabBar`'s heart is the stale one.
- `CrewsDesktop` filters the account trigger and renders real `<a>`s with
  `aria-current` inside `<nav aria-label="Primary">`.
- `CrewAppBar` single-sourced from `CCAppBar`; the rejected bell glyph is gone.
- `cc-overlay.jsx` carries `role="dialog"` (B3 intact); loading and error states
  present (B4 intact).

---

## Bundle caveats — correctly flagged, not fixed

Both were called out in `README.md:62–73` and left alone, which was the
instruction:

1. `row-data.jsx` ships `source: "primary"` on the `fourtet` and one other
   fixture. Not a valid `source_category` — production's enum is exactly
   `boxoffice | standard | resale` (`packages/db/src/schema/prices.ts:63`), so
   that row renders no provenance chip. **Upstream fixture bug, not a crews defect.**
2. `cc-tip.jsx` still carries 13 em-dashes in the newer copy. It is newer in
   structure only; not a clean copy reference.

---

## ✅ R4-1 — closed. a11y keys restored and the class swept

`crew-copy.jsx:213-215` carries `close`, `search`, and `crewActivity` again, and
all four call sites are rewired:

| site | now |
|---|---|
| `crew-browse-lens.jsx:171` | `CL.a11y.close` |
| `crew-shared.jsx:115` | `window.CREW_COPY.a11y.close` |
| `crew-shared.jsx:240` | `window.CREW_COPY.a11y.search` |
| `crew-social-rail.jsx:327` | `CR.a11y.crewActivity(c.name)` |

`crew-copy.jsx` still holds at **0 em-dashes**, so the restore didn't reintroduce
any. The `Search` label was swept in the same pass rather than left to come back
as its own round.

**The scope boundary held.** `cc-overlay.jsx`, `cc-tip.jsx`, `watcher-roster.jsx`
and `notifications-data.jsx` are untouched and still byte-identical to upstream
(trailing newline only). `event-row.jsx` still carries exactly the crew delta.
Design was told not to chase consistency into the shared siblings and didn't —
that restraint is what R2 and R3 were spent on.

## ✅ R4-2 — closed. The mute switch is a real button

`crew-social-rail.jsx:326` is now
`<button type="button" role="switch" aria-checked={on}>` with the label sourced
from copy. Focusable, and Space/Enter operable by default.

## ✅ Halftone node count — drifted, and corrected

`identity-art.jsx:225` moves `cellSize` for tile/micro from `22`/`32` to
`40`/`64`. Since dot count scales as `(400 / cellSize)²`, that is roughly a 3.3×
and 4× reduction at exactly the scales that mount most often. It had drifted;
Design checked and coarsened it rather than defending it.

Three findings from review were assessed and are **not** owed:
`tweaks-panel.jsx`'s `useTweaks` store and its ungated `postMessage` handler are
prototype-harness concerns with no shipped runtime, and `crew-art.jsx:233`'s
`radial(1, () => null) &&` is dead-but-harmless.

One build-time nit, not worth a round: `crews-destination.jsx:592,630` and
`crew-nav-options.jsx:179` still inline the landmark labels `Primary`,
`Account` and `My shows sections`. Route them through copy when building.

---

## Owed upstream (does not block this handoff)

- `row-data.jsx` `source: "primary"` → `design_handoff_event_row_system/`
- `cc-tip.jsx` em-dashes → same
- `event-row.jsx` measure-loop guard → same
- `CCTabBar` stale labels (`search`, `watching`) + heart glyph; production slot 3
  is `my shows` with an eye (`BottomNav.tsx:76-88`) →
  `design_handoff_in_app_notifications/`
- Jade `--signal` / `--success` collision →
  `design_handoff_phase7_5_identity_imagery/`

## Open for Hugh (launch gate, not a design blocker)

`/crew/join/<token>` appears in neither middleware public-route list. The invite
link is an acquisition surface, so a signed-out visitor must be able to reach it.
This is an engineering-plan input, not a design question.

---

## Verdict

🟢 **Green.** Five rounds: B1–B4, a nav ruling, a file-sync failure that was
ours, and two mechanical tails. Nothing is open that a plan can't absorb.
Proceed to an engineering plan PR under
`docs/superpowers/plans/`. Eng should size for **~4 net-new tables** — no crew
schema exists today — and carry `patchSalt` as one column of that.

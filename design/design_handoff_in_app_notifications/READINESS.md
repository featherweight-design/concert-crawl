# Design Readiness Review — In-App Notification Surface (#737)

**Round:** R2
**Date:** 2026-07-25
**Verdict:** 🟢 **Green** — both R1 Green-gate items resolved. Buildable.
**Prior round:** R1 audited 🟡 Yellow (2026-07-24). Brief errors that caused the R1
defects were corrected on `main` in PR #1173.

> R1's `READINESS.md` was overwritten when the folder was replaced wholesale for
> R2. This file is the current verdict of record; the R1 verdict survives only in
> PR #1173's tracker row and the history log.

---

## Verdict by dimension

| Dimension | R1 | R2 | Note |
|---|---|---|---|
| Scope vs brief | 🟡 | 🟢 | All brief §4 deliverables present, plus one scope addition (flagged by Design, gap 6) |
| Data contract | 🔴 | 🟢 | All 8 category keys match the Zod union exactly; `category` key correct; `actionUrl` added |
| State coverage | 🟢 | 🟢 | Loading / empty / error / fresh / backfill / all-read |
| Codebase fit | 🟡 | 🟢 | Chrome lifted from shipped components, provenance documented per bar |
| Theme coverage | 🟡 | 🟢 | Valence tokens verified present in **all nine** production themes |
| A11y — non-color signalling | 🟢 | 🟢 | Unread carries four redundant channels + accessible name |
| A11y — keyboard/focus | 🔴 | ⚪️ | Correctly deferred to eng per R1 scoping; recorded in Design's eng-plan notes |
| A11y — touch targets | 🟡 | 🟡 | Passes WCAG 2.2 AA; five secondary buttons miss the project's 44px convention |
| Mobile/desktop parity | 🟢 | 🟢 | 320px baseline, both compositions, mobile-menu knock-on identified |
| Decisions log | 🟡 | 🟢 | Every brief §8 item answered with stated rationale |

---

## R1 must-fix items — both closed

### 1. Category vocabulary — 🔴 → 🟢 RESOLVED

R1's `CATEGORY_MAP` was keyed on four invented underscore strings with **zero**
overlap against the shipped union, so every production row fell through to the
fallback. R2 keys on all eight real values, verified character-for-character
against `packages/push/src/notification-categories.ts:16-25`.

Design also made the collapse-or-split call the brief required, and made it well:
**split, with the two encoding jobs separated** — ink carries valence, glyph
carries event. The reasoning is sound: per-category ink doesn't survive eight
entries before the colors stop meaning anything, and collapsing `watch.*` would
have rendered `cancelled` and `backonsale` — opposite news — as one class.

`contest.needs_info` diverging to `--signal` while `contest.resolved` stays
`--fg-muted` is a deliberate, defensible read of the Phase 8.5 neutrality lock:
neutrality governs *verdicts*, and a request for more info isn't one.

### 2. Row layout at production title lengths — 🔴 → 🟢 RESOLVED

R1 sized rows against ~21-char fixtures; production emits ~76. R2 sizes for
35–80 characters with a **2-line clamp on both title and body**
(`notifications-panel.jsx:99-106`), so row height is bounded regardless of input.

I verified Design's fixture claims against the real templates:

| Category | Real template output | R2 fixture | Verdict |
|---|---|---|---|
| `watch.backonsale` | 77 chars | identical | verbatim ✅ |
| `watch.soldout` | 44 chars | identical | matches ✅ |
| `watch.cancelled` | ~31 chars | 54 chars | modeled **longer** |
| `watch.postponed` | ~49 chars | 67 chars | modeled **longer** |
| `watch.pricedrop` | different shape | 63 chars | modeled |

Design's disclosure (gap 4) is accurate and the error runs in the **safe
direction** — mocks are longer than or equal to real output, so the layout
conclusions are conservative rather than optimistic.

---

## Verified independently

- **Valence tokens are safe across all nine production themes.** This was the
  real risk in the new ink-encodes-valence system. `--success`, `--warning`, and
  `--danger` are each defined in all nine themes in
  `apps/web/src/theme/themes.ts` — no theme falls back. Genre themes share one
  valence triple in production, so they will read less differentiated than the
  mock implies, but nothing breaks.
- **No hardcoded hex in the four authored notification-surface files** —
  `notifications-panel.jsx`, `notifications-chrome.jsx`, `notifications-scenes.jsx`,
  `notifications-data.jsx` (plus `submissions-screen.jsx`). Every hex-looking match
  in them is a `#737` issue reference. Four `rgba()` values exist, all as fallbacks
  behind `var(--shadow, …)`. The claim is deliberately scoped: the shared prototype
  harness — `theme-context.jsx`, `design-canvas.jsx`, `ios-frame.jsx`,
  `tweaks-panel.jsx` — is full of hex by design (it *defines* the theme tokens and
  renders the canvas chrome) and ships nothing to production.
- **The `CLAUDE.md` vocabulary claim is correctly qualified.** README:104 points
  at the design-project memory, not this repo, and explicitly flags the `docs/`
  mirror as still owed. Closed.

---

## 🟡 Open items — none block a build

1. **Five secondary buttons miss the 44px convention** — "Mark all read" ~31px
   (`notifications-panel.jsx:250`), `seeAll` ~37px (`notifications-chrome.jsx:151`),
   profile segments `minHeight:34` (`:329`), empty-state CTA ~33px
   (`notifications-panel.jsx:201`), error retry ~31px (`:223`). All **pass WCAG
   2.2 AA** (2.5.8 minimum is 24px), so this is convention consistency, not a
   violation. R1 named two instances and Design fixed exactly those two — my R1
   was under-specified rather than Design being careless.
2. **`--shadow` / `--shadow-soft` don't exist in production.** Fallbacks mean
   nothing breaks, but panel elevation will render flat across all nine themes
   instead of the per-theme tints the mock shows. Eng decides: add the tokens or
   accept the fallback.
3. **No `aria-expanded` on the bell trigger** — open/closed state isn't exposed.
   One attribute, eng.
4. **No `aria-live` on unread-count change** — loading and error are announced,
   the resulting count is not.
5. **`metadata` absent from fixtures.** Acceptable — the panel doesn't read it.

---

## Decisions awaiting Hugh (Design asked directly)

These are product calls, not defects. None gate the build, but 6 wants an answer
before eng scopes:

| # | Question | Design's lean |
|---|---|---|
| 7 | **Page size.** 20 rows was sized against short rows; at production lengths it's ~1.6 screens/page | Accept longer scroll, or drop to 12–15. One constant. |
| 6 | **Submitted prices screen is out of #737's ticket scope** — mocked on request | Wants its own issue that this handoff satisfies |
| 10 | **No "unread only" filter** — deliberately omitted | Header has room for one chip if beta disagrees |
| 8 | **7-day relative→absolute timestamp cutover** | Confirm against retention policy once eng locks it |
| — | **Panel opened offline** shows poll-failed | Could show cached rows with a staleness note |

---

## Eng-owned, recorded not fixed

Correctly scoped out by Design, matching R1's ownership split:

- Escape-to-close, focus-in-on-open, focus-restore-on-close, mobile-sheet focus trap
- `onKeyDown` on the four `role="button"` rows outside `NotifItem` (`NotifItem`
  already handles Enter + Space correctly at `notifications-panel.jsx:82`)
- `last_seen_at` host — `user_profiles` or `user_notification_preferences`; there
  is no `users` table
- Retention policy and backfill window
- ~~Row copy re-voice~~ — **decided 2026-07-25, no ticket.** `contest.*` emits one
  role-neutral title per action, which already satisfies the Phase 8.5 "price
  update, not a callout" lock. R1's per-role variants are dropped and the R2
  fixtures now carry the shipped strings verbatim. Build against
  `apps/api/src/lib/contest-notifications.ts`.

---

## Path to build

1. ✅ Hugh answered 2026-07-25 — page size **20 stays**, Submitted prices gets its
   own build ticket (**#1176**), unread-only filter and offline-cached-rows stay out.
2. ✅ Vocabulary mirror landed in `CLAUDE.md` with this PR. Row-copy re-voice
   closed as a decision, not a ticket (see above).
3. Eng plan locks `last_seen_at` host, retention, backfill window, and picks up
   the keyboard/focus work as first-class scope — not polish.
4. Build row `title` / `body` from the shipped writers — `packages/push/src/definitions/copy.ts`
   and `apps/api/src/lib/contest-notifications.ts` — not the mock strings.

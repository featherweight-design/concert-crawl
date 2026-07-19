# Readiness Review — Who Else Is Watching (#762)

**Verdict:** 🟢 **Green — one-pass.** Ready for eng-planning.

**Reviewer:** design-track persona
**Reviewed:** 2026-07-19
**Brief:** `docs/superpowers/specs/2026-07-19-762-who-else-is-watching-design-brief.md` (PR #1097)
**Handoff files:** this folder

---

## Locks honored (Q1–Q9 from the brief)

| # | Lock | Honored where |
|---|---|---|
| Q1 | Watching signal only; attending is v2 (#1096) | Scope confined to `watches` / `user_events` reads; no attending semantics anywhere |
| Q2 | Handle-gated visibility (no separate opt-out) | `watcherInitial()` returns `null` for `handle: null`; anon rolls into `+N`; README §DNA principle 1 |
| Q3 | Named cap + "and N others" fold | `NAMED_CAP = 3` with density rationale; overflow rolls into the `+N` tail alongside anon |
| Q4 | Hide surface at 0 other watchers | `WatchersSurface` returns `null` when `total === 0` (gap-report §5) |
| Q5 | Signed-out sees nothing (defer to #794) | Not addressed in the surface; #794 owns signed-out event-detail comprehensively |
| Q6 | New surface replaces button count text | `WatchShowButtonCC` retires the count; alerts affordance rehomed as `watchHint` under inactive Watch button; retired-count row spec at §3 |
| Q7 | Exclude self — "others" only | Sentence semantics throughout ("who else is watching"); no viewer treatment |
| Q8 | Colored initials + handle text via existing `avatarColor` atom | `W_TONES = ['signal','accent','success','warning']` matches `profile_settings_v2` MonogramPoster; no new dependency |
| Q9 | Free tier | Confirmed in README opening; no paywall visuals; no tier gate anywhere in the surface |

**All 9 brief locks honored. No addenda needed.**

## Design principles demonstrated

- **Don't fake an identity we don't have** — anon watchers never get a fabricated letter or name. When every watcher is handle-less, the surface says the honest count with a muted honesty rail ("No handles to drop yet — beta's early") instead of padding with fake names.
- **Honest > cute, specific > generic** — tail copy is warm and cheeky ("+ 11 more in the crawl, watching") but never clinical ("N other users") and never saccharine.

## Voice check

- Grepped clean: no `last chance`, `we miss you`, `fraud`, `N other users`, `event` (as noun for a show).
- "in the crawl" is the warm brand handle for anon watchers — better than either "users" (clinical) or "people" (generic).
- Every customer-facing string externalized in `WATCHERS_COPY`, keyed for direct lift into `apps/web/src/components/consumer/definitions/copy.ts`.

## Token purity

- Authored files (`watchers-data.jsx`, `watchers-surface.jsx`, `watchers-context.jsx`) contain no hardcoded hex or `rgb()` values. All colors via `var(--*)`.
- `theme-context.jsx` is shared infra (copied unmodified from `venue_first_timer_guide`); token definitions there are expected.
- CCMark copied verbatim from `browse-home.jsx`; colors already token-driven.

## State coverage

All four brief §4 populated states are reachable in the canvas Live preview (§0) via the Tweaks panel state selector, plus dedicated artboards at §1:

- **1 named** — `WATCHER_FIXTURES.one`
- **2–3 named** — `WATCHER_FIXTURES.few`
- **Named + N others** — `WATCHER_FIXTURES.many` (3 named + 1 overflow + 10 anon)
- **All others no names** — `WATCHER_FIXTURES.anon` (14 anon)

Plus additional states not required by the brief but shipped for coverage:

- **Loading skeleton** — §2, mobile + desktop, `aria-busy`, visually-hidden "Counting the crawl…"
- **Adjacency** — §3, inactive + active Watch button variants (Q6 spec)
- **Roster expansion** — §4, collapsed + open ("+N" as real button with `aria-expanded`)
- **Anatomy** — §5, avatar tones × handle presence, stacks, sentences × 4 states
- **Theme parity** — §6, Electric + Jade + Light for the `many` state

## A11y

- `role="group"` + `aria-label` carrying the whole sentence as prose (not a list).
- Avatars `aria-hidden` (decorative — text carries meaning).
- Anon watchers never given a fake letter that a screen reader would misread.
- `+N` expander is a real button with `aria-expanded`; ≥44px effective tap on mobile via row padding.
- Loading uses `role="status"` + `aria-busy` + visually-hidden label; no color-only signals.
- Focus ring `--focus`. Contrast verified AA across Electric / Jade / Light.

## Mobile + desktop parity

- All 4 brief states rendered at mobile 390px (§1).
- Live preview (§0) supports both mobile + desktop via Tweaks.
- Adjacency spec (§3) is orientation-agnostic (column layout with fixed 12px gap).
- Watchers-context (`WatchersContext` component) frames the surface in a full event-detail hero context, mobile + desktop.

## Gap report — Design's flagged calls (all confirmed reasonable)

1. **Named = has handle** — matches codebase-true model. No change needed.
2. **Cap = 3** — density call with clean rationale (single-line at 320px, natural English list grammar). Confirm at real longest handles when it lands in build.
3. **Roster expansion** — Design-introduced feature via `+N` button. Optional (`expandable={false}` prop). Nice addition that gives "the who" without profile pages we don't have.
4. **Ordering within named** — insertion order in fixtures; Design recommends most-recent-first, or followed-first once a follow graph exists.
5. **Zero watchers = null render** — matches brief Q4 (hide surface).
6. **Desktop hero scaffold** — context only, not a spec for the event page itself. Understood.

**No addendum required.** All six flags are confirmations of intent, not open issues.

## Deferred to build (prototype-polish nits)

- Exact `+N` chip color-mix ratios if a specific theme's `--surface-2` reads too close to `--border` — spot-check at build time.
- Confirm real Denver handle lengths don't blow past the 3-named cap in practice; adjust if consistent handles run >12 chars.
- Desktop hero scaffold in `watchers-context.jsx` is illustrative — the real event-detail page layout stays authoritative; eng ports only the watchers surface + adjacency into it.

## Sequencing

- Ships independently — no follow graph, no user-profile-pages dependency.
- Async, non-blocking — watcher fetch resolves after hero paint; skeleton reserves the row so no layout shift.
- Data contract additions (per brief §5): `data.watchers: Array<{ handle: string, avatarColor: AvatarColor | null }>` LIMIT-capped to `NAMED_CAP` handled users on `GET /v1/events/:id`. `data.watching` (total count) stays; un-handled watchers still contribute to it.

---

## Verdict rationale

Every brief lock is honored; every design principle from the brainstorm is visible in the surface (warmth, honesty rail, no-fake-identity). Voice is Sour Patch throughout — cheeky where it can be ("in the crawl", "+ N more"), honest where it must be ("No handles to drop yet — beta's early"). Token purity clean, a11y baked in, mobile + desktop parity in the same handoff, all 3 themes covered. Design's own gap-report items are all defensible calls, several of which improve on the brief (rehomed alerts hint, roster expansion, count-only honesty line).

Handoff moves to **🟢 Green** — eng-planning may pick this up when ready.

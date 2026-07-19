# #762 · Who Else Is Watching — design handoff

**Track 2 · July 19, 2026**

A warm, honest social-proof surface on the event-detail Watch zone. It answers
*"who else in the crawl is watching this show?"* — surfacing named handles with
colored initials, and degrading gracefully to an honest count when there are no
names to drop. It replaces the retired "N watching" count tail (Q6). Free tier,
signed-in only.

Open: `Who Else Is Watching.html`

---

## DNA statement

Built on the Concert Crawl consumer design system. **Structural rhythm** lifted
from `venue_first_timer_guide` (Section-organized canvas, Live-preview §0,
Tweaks-driven states, theme-parity closer). **Voice** is the Sour Patch bar —
cheek + honesty rail + warmth; never brochure-y, never blame. **Avatars** reuse
the `avatarColor` + initials pattern already shipped in `profile_settings_v2`
(`MonogramPoster`) and `user_menu` — no new dependency. **Tokens only**
(`var(--*)`) across the three shipped consumer themes (Electric · Jade · Light).
Brand mark unchanged — `CCMark` copied verbatim per CLAUDE.md.

Two principles bind every decision:

1. **Don't fake an identity we don't have.** A watcher is *named* only if it has
   a handle. Beta anon users carry `handle: null` — they're counted, never given
   a fabricated letter or name. When every watcher is handle-less, the surface
   tells the truth: a warm count, no faked names.
2. **Honest > cute, specific > generic.** The tail copy is warm and a little
   cheeky ("+ 11 more in the crawl, watching") but never clinical ("11 other
   users are watching this event") and never saccharine.

---

## Template inventory

| Surface | State | Mobile | Desktop |
|---|---|---|---|
| Event detail | **1 named** | 390 | ✓ (live §0) |
| Event detail | **2–3 named** | 390 | ✓ |
| Event detail | **Named + N others** | 390 | ✓ (live §0) |
| Event detail | **All others · no names** | 390 | ✓ |
| Watch zone | **Loading skeleton** (async fetch) | 390 + isolated | ✓ (live §0) |
| Watch zone | **Adjacency spec** — inactive (hint rehomed) + active | ✓ | — |
| Watchers | **Roster expansion** — collapsed + open | ✓ | ✓ |
| Anatomy | avatar tones · stacks · sentence ×4 | ✓ | — |
| Theme parity | named + N others · Electric / Jade / Light | ✓ | — |

Canvas §0 is a Tweaks-driven Live preview (watcher state · loading · roster ·
watching-state · theme ×3), mobile + desktop.

---

## Design calls made (the "Open for Design to call" §8)

| Call | Decision | Rationale |
|---|---|---|
| **Named-handle cap** | **3** | The sub-hero row is tight. Three 24px avatars + three handles + a "+N" chip fit one line at 320px without truncation; a 4th handle wraps or clips. Three is also the natural English list grammar limit — "a, b & c" reads clean, "a, b, c & d" starts to drag before "and others" would anyway. Named overflow beyond 3 rolls into the same "+N" tail as anon watchers. |
| **Handle interaction posture** | **Plain text** — confirmed, not a link. | No profile pages exist in the codebase, so a handle link would dead-end. Instead the **`+N` is a real button** that expands an *inline roster* (avatars + handles as plain text). This delivers the "who" without inventing navigation we don't have. If profile pages ship later, the roster rows are the natural upgrade point to links. |
| **Retired count tail (Q6)** | The WHO surface **replaces** the count; the "alerts on price + sold-out" affordance the old tail carried is **rehomed** as a muted hint (`Watch to get pinged on price drops + sold-out.`) under the *inactive* Watch button. | Nothing the count tail did is lost: the count becomes richer (who, not just how many), and the alerts nudge survives — just attached to the action it describes, shown only when you're not yet watching. |
| **Adjacency layout** | Column, **gap 12px**. Row 1 = Watch button (28px outline, **unchanged**). Row 2 = alerts hint (inactive only). Row 3 = watchers surface. Avatars **24px**, overlap **−7px**, **2px ring** in the surface color behind for separation; `+N` chip is `--surface-2` / `--border-strong`. | The Watch button isn't ours to restyle — the surface sits beneath it as a distinct, lighter row so social proof never competes with the action. |
| **All-others voice** | `14 in the crawl are watching this one.` + a muted honesty line `No handles to drop yet — beta's early.` | Honesty rail: we acknowledge we have no names rather than padding with fake ones. "in the crawl" is the warm brand handle for "other users". |
| **A11y announcement** | **Sentence, not a list.** `role="group"` + `aria-label` carries the whole thing as prose. | It reads as prose on screen; a 3-item list + "12 others" is more natural spoken as one sentence than as a bulleted list. Avatars are decorative (`aria-hidden`). |
| **Loading** | Skeleton reserves the same 28px row (no layout shift), `aria-busy`, visually-hidden `Counting the crawl…`. | The watcher list is fetched after hero paint; the skeleton keeps the hero from jumping when it lands. |

---

## Voice pass — the "and N others" tail (Sour Patch)

Every string is voice-passed and lives in `WATCHERS_COPY` (see below).

- **1 named** — `marisol is watching this one.`
- **2–3 named** — `marisol, dev_ftw & priya are watching.`
- **named + N others** — `marisol, dev_ftw & priya + 11 more in the crawl, watching.`
- **all others** — `14 in the crawl are watching this one.` · honesty line: `No handles to drop yet — beta's early.`
- **roster header** — `The crawl on this show` · anon summary row — `14 other crawlers`
- **rehomed alerts hint** — `Watch to get pinged on price drops + sold-out.`

Grepped clean of brochure copy: no "last chance", "we miss you", "fraud", no
"N other users", no "event". "in the crawl" carries warmth; "+ N more … watching"
carries cheek; the honesty line carries the honesty rail.

---

## Copy map (ready for `copy.ts`)

All customer-facing strings are externalized in `WATCHERS_COPY` (in
`watchers-data.jsx`), keyed for lift into
`apps/web/src/components/consumer/definitions/copy.ts`:

- `eyebrow`, `loading`, `rosterTitle`, `rosterToggle(n)`, `rosterHide`
- `one`, `areWatching`, `plusOthers(n)` — the named-sentence tails
- `countOnly(n)`, `countOnlyHonest` — the all-others state
- `watchHint` — the rehomed alerts affordance

`buildWatchers(watchers)` and `watchersToParts(watchers)` are the headless
model — they produce both the render parts (handles vs. connective) and the flat
a11y sentence, so display and screen-reader text can never drift.

---

## Files

| File | Role |
|---|---|
| `Who Else Is Watching.html` | canvas + Tweaks (entry point) |
| `watchers-data.jsx` | fixtures, `avatarColor` tone pattern, `WATCHERS_COPY`, the sentence builder, `CCMark` (verbatim copy) |
| `watchers-surface.jsx` | `<WatchersSurface>` (4 states + loading + roster), `<AvatarStack>`, `<WAvatar>`, `<WatchZone>` (adjacency), `<WatchShowButtonCC>` (count tail removed) |
| `watchers-context.jsx` | event-detail hero framing (mobile + desktop) so the surface reads in situ |
| `design-canvas.jsx` · `theme-context.jsx` · `ios-frame.jsx` · `tweaks-panel.jsx` | shared infra (copied, unmodified) |

Each authored file is under ~350 lines for Copilot reviewability.

---

## A11y (WCAG AA)

- **Colored initials** reuse the four `avatarColor` tones; each token was chosen
  to double as fill and ink, so the letter (`var(--tone)`) on its own
  `22%`-of-tone tint clears AA in Electric, Jade, and Light. Verified across all
  three in §5 / §6.
- The surface is a **`role="group"` with `aria-label`** carrying the full
  sentence as prose; **avatars are `aria-hidden`** (decorative — the text carries
  meaning). Anon watchers are never given a fake letter that a screen reader
  would misread.
- The `+N` expander is a **real button** with `aria-expanded`; ≥28px row on
  desktop, ≥44px effective tap target on mobile via row padding.
- **Loading** uses `role="status"` + `aria-busy` + a visually-hidden label; no
  color-only signals anywhere.
- Every color reads from `var(--*)`; focus ring is `--focus`.

---

## Sequencing / dependencies

- **Ships independent of a follow graph.** "Named" is purely *has a handle* —
  it does not depend on a follow / friends feature (none exists). If a follow
  graph lands later, the natural enhancement is to *order* named watchers
  (people you follow first) — no structural change to this surface.
- **Async, non-blocking.** The watcher fetch is expected to resolve after hero
  paint; the skeleton reserves the row so nothing shifts.

---

## Gap report — calls the brief didn't cover

1. **Named vs. anon model** — the brief's four states don't say *why* some
   watchers are named and others aren't. Design call: **named = has a handle**
   (codebase-true — `handle: null` is the existing anon-user shape). This makes
   the "all-others-no-names" state a real, reachable state (a show watched only
   by handle-less beta users), not a hypothetical. Confirm this matches the
   intended data model.
2. **Cap = 3** — a density call the brief left open. Confirm 3 feels right at
   your longest real handles; the cap is a single constant (`NAMED_CAP`).
3. **Roster expansion** is a design-introduced interaction to give the "who"
   without profile pages. Named watchers list individually; anon watchers
   collapse into one honest summary row (`14 other crawlers`) rather than a
   space-wasting list of identical rows. It's optional — if you'd rather ship v1
   as plain text with no expander, set `expandable={false}` and the `+N` becomes
   static.
4. **Ordering within named** — fixtures show insertion order. Recommend
   most-recent-watcher-first (or followed-first once a graph exists); flag if
   you want a different sort.
5. **Zero watchers** — the surface renders nothing (returns `null`). The Watch
   button + alerts hint still stand alone. Confirm you don't want an explicit
   "be the first" nudge (deliberately omitted — it'd read as pressure, off-voice).
6. **Desktop hero scaffold** mirrors a standard two-column event layout for
   context only; it is not a spec for the event page itself.

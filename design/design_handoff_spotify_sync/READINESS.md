# Readiness Review — Spotify Sync (R1 + R2) · Track 1 Audit

**Verdict:** 🟢 Green (post-addendum, 2026-07-13) — Design's addendum resolved the gating blocker across all four surfaces + upsell + Tweaks preview + prose. Small prototype-polish items (aria-disabled on the locked chip button, stale header comments, heart-vs-eye glyph, theme-token constants, spec-note staleness) don't block eng — they're mock-fidelity artifacts, and the CLAUDE_CODE_PROMPT correctly tells the eng implementer to reimplement in the real stack matching layout/copy/behavior. Captured below as "🧹 Prototype polish deferred to build" so eng has a checklist during implementation.
**Original verdict:** 🟡 Yellow (2026-07-12 initial pass, refreshed with Copilot R1+R2 findings) — two blockers (gating + locked-chip a11y contract) + eleven nits blocking Green. Tier-gate question resolved 2026-07-13 by Hugh: `premium || founder`.
**Audited:** 2026-07-12 (initial pass) → refreshed 2026-07-13 (Copilot R1+R2 folded in) → **flipped 🟢 Green 2026-07-13** after Design addendum landed
**Auditor:** Claude (Track 2 post-handoff Readiness Review — R1 + R2 combined)
**Audited handoff:** `design/design_handoff_spotify_sync/` (R1 delivered 2026-07-11; R2 delivered 2026-07-12; addendum delivered 2026-07-13)
**Source ticket:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) (`type: design, source: internal, phase: beta, priority: normal`)
**Source brief:** `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` (PR #893, merged 2026-07-11)
**Plan PR target:** `docs/superpowers/plans/<date>-spotify-sync-plan.md` — **unblocked as of 2026-07-13.** Eng-planning agent can pick up.

---

## 🎉 Green resolution (2026-07-13 addendum)

Design's addendum touched exactly 4 files with 19 insertions / 23 deletions — small, tight, focused on the load-bearing gating fix.

### Fixed — blocker #1 (gating) is fully resolved

- ✅ **`taste-filter.jsx:14`** — comment updated to `paid = premium/founder`.
- ✅ **`taste-filter.jsx:114`** — `TasteFilterScreen` default prop `tier = "premium"`.
- ✅ **`taste-filter.jsx:115`** — gate check is `tier === "premium" || tier === "founder"`.
- ✅ **`taste-filter.jsx:158`** — upsell eyebrow reads `TASTE FILTER · PREMIUM`.
- ✅ **`taste-filter.jsx:176`** — upsell footer reads `PREMIUM $5/MO · FOUNDER $3 LOCKED`.
- ✅ **`Spotify Sync R2.html:101`** — Tweaks default tier is `premium`.
- ✅ **`Spotify Sync R2.html:133–138`** — Tweaks tier dropdown now offers `premium` + `founder` + `supporter (locked)` + `free (locked)`. Nice call adding `supporter (locked)` explicitly — makes the "Supporter is badge-only" behavior visible in the preview.
- ✅ **`Spotify Sync R2.html:179, 184–187`** — subtitle prose + on-canvas A11yNote both updated to `premium || founder`; reconcile-flag bullet deleted.
- ✅ **`Spotify Sync R2.html:195–196, 278`** — every artboard prop `tier="supporter"` swapped to `tier="premium"` (taste-off, taste-on, theme-parity taste-filter).
- ✅ **`README.md §53`** — prose: `premium || founder`; adds "Supporter stays badge-only."
- ✅ **`README.md §55`** — reconcile callout deleted.
- ✅ **`CLAUDE_CODE_PROMPT.md`** — gating paragraph fully rewritten with `premium || founder`, "⚠️ RECONCILE FIRST" preface dropped, `uploads/…` path removed by paragraph rewrite. Bonus: adds "Free (and Supporter) see the taste filter locked → upsell" for eng clarity.

### 🧹 Prototype polish deferred to build

These items were captured in the Yellow verdict's nit section but not addressed in Design's addendum. **Each is a documentation-vs-implementation or prototype-fidelity artifact — not a spec ambiguity.** Eng will apply best-practice implementations that match Design's documented intent regardless of what the prototype-level markup says. Listed here so the eng implementer has an at-a-glance checklist during build:

- **`taste-filter.jsx:37–52`** (locked-chip button) — Add `aria-disabled="true"` and `aria-label="Following filter, paid"` in real implementation. Design's own R2 A11yNote at `Spotify Sync R2.html:202` documents this contract; the prototype button markup doesn't set it. Build to the documented contract, not the mock.
- **`taste-filter.jsx:129`** (no-op toggle wire-up) — `TasteFilterScreen` passes `onToggle={() => {}}` to `TasteFilterBar`. In production, wire the chip toggle to real filter state (query param or context). Prototype-only inertia, not a spec ambiguity.
- **`connect-flow.jsx:122`** — Prototype glyph is a heart (♥); Design's own R1 decision §6 explicitly retired the heart for the eye/watch icon. Build with the eye/watch glyph.
- **`follow-highlight.jsx:10` + `:136`** — Header comment + inline note describe an older `--accent`-filled chip treatment; actual `FollowChip` implementation is neutral (`--surface-3`) + Spotify-marked per Design's own §6 R1 decision. Stale comments from an earlier draft; the implementation is right, the comments are misleading. Build to the implementation (neutral + Spotify-marked), not the stale comment.
- **`theme-context.jsx:2`** — Header says "5 genre themes" but lists 6 (pulse, forge, bluenote, drip, cedar, gloss). Nit; correct total is `3 + 6 = 9`.
- **`theme-context.jsx:76, 116`** — Forge sets `spotify-green: "#3BE06E"` and Cedar sets `"#4ADE7B"`; header comment claims all dark themes use `#1ED760`. Not a visual bug (README §36 reserves `--spotify-green` for the official Spotify logo asset — screens don't paint with it), just a token-value inconsistency. Reconcile to `#1ED760` or accept per-theme variants and update the comment.
- **`tweaks-panel.jsx:218`** — Comment says "Origin gate" but code only checks `e.source !== window.parent` (source, not origin). Rename to "Source gate" or add `e.origin` validation. Dev-tooling only; doesn't ship.
- **`tweaks-panel.jsx:361–369`** — `TweakRadio` reacts to `onPointerDown` on the container; individual `role="radio"` buttons have no `onClick`, so keyboard users can't advance with Enter/Space. Dev-tooling a11y bug in Design's own workflow; doesn't ship.
- **`spotify-states.jsx:49`** — Eyebrow copy lowercases "denver"; case-consistency with the rest of the surfaces (all use "Denver"). Build with capitalized "Denver."
- **`README.md:3`** — Design's stale sandbox note claims *"the brief referenced `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` — that file is not in the project"*. The spec has been in-repo since PR #893 merged 2026-07-11. The note is a leftover from Design's environment; safe to ignore during build. (Design can delete during a future polish pass.)

**Downstream note:** these prototype polish items are collectively very small and mostly documentation. They're compatible with an eng plan opening today.

---

## Summary

Design delivered **11 surfaces across 2 rounds** — connect flow + auth handoff + auto-watch modal + connected settings + browse/hero/detail Follow treatment + empty/failure states (R1); taste filter + discovery shelf + weekly digest email + push alerts (R2). All 9 themes covered, token-only outside the intentional email exception, Sour Patch voice held throughout, per-surface A11Y notes on every canvas, mobile + desktop parity verified.

Hugh's specifically-flagged **follow filter is present and drawn to the exact behavior asked for** — a toggle chip leading the FilterBar chip row, additive with venue/date/genre (AND), Free tier sees it locked and taps into an upsell, active state uses `--signal` while `--accent` stays reserved for Watching, Spotify mark carries the identity.

**Why Yellow, not Green:** one gating bug in `taste-filter.jsx` line 115 (`const paid = tier === "supporter" || tier === "founder"`) contradicts the brief in two ways at once. It's small, Design flagged the ambiguity themselves in both `README.md §55` and `Spotify Sync R2.html:186`, and the fix is a code find-replace + a copy tweak on the upsell sheet — but it's load-bearing enough that shipping as-is would mislead users about what tier unlocks Spotify perks.

## 🚧 Blockers (must resolve before Green)

### 1. 💳 Paid-tier gate contradicts the brief (and omits Premium entirely)

**File:** `taste-filter.jsx:115`
**Current:** `const paid = tier === "supporter" || tier === "founder";`

**Two entangled problems:**

**(a) `premium` is missing from the check.** The `subscription_tier` enum shipped via PR #878 is `['free', 'supporter', 'premium', 'founder']`. Design's check omits `premium` entirely — a $5/mo Premium user tapping the taste filter today would see it *locked*. This is wrong regardless of the Supporter question; Premium is the primary paid tier and unlocks Spotify per every source of truth.

**(b) Whether Supporter unlocks Spotify at all.** The brief (`docs/superpowers/specs/2026-07-11-spotify-sync-design.md`) says **"Premium users get the rich suite"** in §1 (Tier gate) and §3 (Premium features — the full rich suite), listing weekly digest / discovery / push / taste filter as **Premium** features. The older entitlements matrix (`docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md:45–46`) is explicit that Supporter is *"$2/mo. Badge-only; no Premium feature unlocks"* and Spotify sync is listed in §5 as a hidden Premium-only feature. Design's `supporter || founder` gate contradicts both sources — it implicitly upgrades Supporter to include Spotify, which no locked doc actually says.

**Design flagged this themselves** in `README.md §55` and `Spotify Sync R2.html:186` — the flag reads *"this R2 brief says gate on supporter||founder, but the older entitlements doc lists Spotify features as Premium-and-up."* But the R2 brief doesn't say `supporter||founder` — it consistently says "Premium users." Design misread the brief; the older matrix and the R2 brief actually agree.

**Resolution (2026-07-13):** Hugh confirmed the gate is `premium || founder`. Supporter stays badge-only per the older entitlements matrix. The two docs are already reconciled — the R2 brief consistently says "Premium users," matching the matrix.

**Fix (Design addendum):**
- Change `taste-filter.jsx:115` to `const paid = tier === "premium" || tier === "founder";`
- Update `taste-filter.jsx:14` inline comment: `paid = premium/founder`
- Update `taste-filter.jsx:114` default prop from `tier = "supporter"` to `tier = "premium"` so the live preview default shows a tier that actually unlocks
- Update the upsell eyebrow at `taste-filter.jsx:158` from `TASTE FILTER · PAID` to `TASTE FILTER · PREMIUM` (names the tier the user needs to reach)
- Update the upsell footer at `taste-filter.jsx:176` from `SUPPORTER $2/MO · FOUNDER $3 LOCKED` to `PREMIUM $5/MO · FOUNDER $3 LOCKED`
- **Add `premium` to the Tweaks panel tier dropdown** at `Spotify Sync R2.html:133–137` — currently only offers `supporter / founder / free`, mirroring the same Premium-omission bug at the preview layer
- Update `README.md §53, §55` and `Spotify Sync R2.html:178, 185` prose to say `premium || founder`; delete the "reconcile" callout at `README.md §55` and the on-canvas flag at `Spotify Sync R2.html:186` — resolved
- Update `CLAUDE_CODE_PROMPT.md` lines 50–58 Gating paragraph to say `premium || founder` and drop the "⚠️ RECONCILE FIRST" preface

### 2. ♿ Locked chip a11y contract not honored

**File:** `taste-filter.jsx:37–52` (the `locked` branch of `FollowFilterChip`)
**Current:** `<button onClick={onClick} style={{...}}>` — no `aria-disabled`, no `aria-label`.

The R2 A11y note (`Spotify Sync R2.html:202`) explicitly promises: *"Locked chip: aria-disabled + 'Following filter, paid' label; tap still opens the upsell (not a dead control)."* Design's code doesn't deliver either attribute — assistive tech will announce it as a plain enabled toggle. Not a full blocker on its own (behavior is correct — tap opens upsell), but it violates the A11y contract Design themselves documented and I marked ✅ on the a11y pass. Should be fixed in the same addendum.

**Fix:** Add `aria-disabled="true"` and `aria-label="Following filter, paid"` to the locked-branch `<button>`.

### 3. 📝 Upsell copy inconsistency (falls out from blocker #1)

`taste-filter.jsx:167` upsell body lists three feature bullets: "Following", "Taste picks", "New-show alerts" — accurate to the four R2 surfaces (grouping digest + push under "alerts"). Handled by the blocker #1 fix (eyebrow rename to `TASTE FILTER · PREMIUM`).

## 🌿 Nits — fold into the addendum, don't block on their own

Fine-toothed pass surfaced these; small enough that a plan PR *could* proceed with them open, but cheap to fix in the same addendum:

- **`README.md:3`** — the spec note claims *"the brief referenced `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` — that file is not in the project (the `docs/` folder is empty)."* But the spec exists in-repo at that exact path (merged as PR #893). Design's note is a stale artifact from their sandbox environment. Delete the callout.
- **`README.md:55` + `CLAUDE_CODE_PROMPT.md:52`** — both reference `uploads/2026-06-24-monetization-tier-states-entitlements-design.md`, a path that doesn't exist in-repo. The correct path is `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md`. Rewrite (and the tier-gate reconciliation itself is moot post-resolution).
- **`theme-context.jsx:2`** — header comment says *"base 3 (electric/jade/light) + 5 genre themes shipped May 10 (pulse, forge, bluenote, drip, cedar, gloss). 9 total."* That's 3 + 5 = 8 but lists 6 genre themes → 3 + 6 = 9. Change "5 genre themes" to "6 genre themes."
- **`theme-context.jsx:76, 116`** — header comment says *"Dark themes use the bright brand green (#1ED760)"*, but Forge sets `spotify-green: "#3BE06E"` and Cedar sets `"#4ADE7B"`. Either bring these two dark themes to `#1ED760` (Design's intent per the comment) or amend the comment to describe a per-theme variant. Note the token isn't currently painted with (§36 rule reserves it for the official logo asset), so this is a documentation-vs-data consistency issue, not a visual bug.
- **`tweaks-panel.jsx:218`** — comment labels the message check as an *"Origin gate"*, but the code only checks `e.source !== window.parent` (source, not origin). Rename the comment to `Source gate` or add `e.origin` validation to match the comment.
- **`spotify-states.jsx:49`** — eyebrow copy lowercases "denver" while every other surface capitalizes "Denver". Case-consistency fix.
- **`taste-filter.jsx:129`** — `TasteFilterScreen` passes `onToggle={() => {}}` (a no-op) to the FilterBar, so the "wired to the toggle" claim in the header comment is misleading — the chip can't actually flip state in the live preview; only the hardcoded `active` prop changes the UI. Either wire the toggle to local state, or remove the "wired to the toggle" language from the header comment.
- **`tweaks-panel.jsx:365`** — `TweakRadio` handles selection via `onPointerDown` on the container; the individual `role="radio"` buttons have no `onClick`, so keyboard users can't change the selection with Enter/Space even though the buttons are focusable. A11y bug in the design tooling (not a consumer surface, but affects Design's own accessibility testing).
- **`connect-flow.jsx:122`** — glyph uses a heart (♥), but Design's own decision text (README §40) says the heart was retired for the eye/watch icon. Mock contradicts the doc — swap to the eye/watch glyph to match.
- **`follow-highlight.jsx:10 + :136`** — header comment + inline note both claim the Follow chip is a filled `--accent`, text-only, no-icon treatment. Actual `FollowChip` implementation is neutral (`--surface-3`) and includes the Spotify mark, per Design's own §6 R1 decision reserving `--accent` for Watching. Stale explanatory comments from an earlier draft; update to describe the current neutral + Spotify-marked treatment.

## ✅ Per-dimension findings — Green-worthy across the board

### 🗺️ Scope clarity

- ✅ R1's 8 surfaces + R2's 4 surfaces are enumerated in `README.md` tables with intent per row.
- ✅ Clean R1/R2 split — R1 is Free-tier connect + recognition, R2 is Premium payoff. Both rounds carry their own "Decisions" section documenting Design's calls.
- ✅ `README.md §75` R2 decisions are explicit ("★ = my lean"), matching R1's convention.
- ✅ **Follow filter (Hugh's must-have) is present, correctly scoped, and drawn to spec.** Section 1 of R2 (`Spotify Sync R2.html:192–207`) covers all four states: paid+off, paid+on, free+locked, free+upsell. Additive-with-other-filters (AND) behavior called out inline. `--accent` reserved for Watching held.
- ✅ Discovery = section on Browse (not new tab) with reason chip variance ("You play them a lot" / "In your top 5" / "Following") — matches brief §5.
- ✅ Digest email = per-family unsubscribe first + zero-week variant + plain-text fallback — matches brief §6 with the (nice) zero-week call I hadn't specified.
- ✅ Push alerts respect the R1 auto-watch preference (copy varies: auto-on states outcome, highlight invites the tap) — better than what I'd asked for.
- ✅ `README.md §86` "Still deferred: nothing from the R2 brief." Full coverage.

### 🎭 State coverage

- ✅ **Taste filter:** paid off, paid on, free locked, free upsell (4 states drawn).
- ✅ **Discovery:** shelf on browse, empty ("quiet month"), failure ("taste on pause" with warning + Reconnect recovery). Empty and failure are visually distinct.
- ✅ **Digest:** 5-show week, zero week (light variant with 2 taste picks — clever), plain-text fallback.
- ✅ **Push:** iOS + Android lock screens, in-app tray (post-#737), copy variants table.
- ✅ **Cross-cutting:** R1 already carried the connect empty/failure states (0-in-Denver empty, Spotify-down, token-refresh, external-revoke).

### 🎨 Token discipline + theme parity

- ✅ Every color in R1 + R2 screen code reads from `var(--*)` — spot-checked `taste-filter.jsx`, `discovery-surface.jsx`, `push-alert.jsx` (in-app tray).
- ✅ `--accent = Watching` reservation held everywhere. Follow chip uses `--signal` (per FilterBar convention) + Spotify mark for identity.
- ✅ **Digest email inline hex is intentional and correctly justified** — email clients can't parse CSS vars. Design pinned this decision at `digest-email.jsx:4–7`.
- ✅ **Push alerts inline hex is intentional** — OS chrome (lock screen) isn't themed; the CC app icon uses fixed electric hex (`push-alert.jsx:17`). Only the in-app tray (which IS in-app chrome) uses tokens — correct split.
- ✅ Section 5 (theme parity) renders 5 named themes on-canvas (Light, Pulse, Forge, Cedar, Gloss); Tweaks drives the remaining 4.

### 🍬 Voice — Sour Patch, recognition never surveillance

- ✅ Upsell body: *"Slice the whole calendar by your taste. Filtering Denver down to just the artists you follow is a paid perk."* — warm/permissive, doesn't scold.
- ✅ Discovery empty: *"Your artists are lying low. Nobody from your taste has a Denver date this month."* — recognition register.
- ✅ Discovery failure: *"Can't read your taste right now. Your Spotify link needs a refresh."* — recovery-first, no blame.
- ✅ Digest headline: *"5 shows by artists you follow"* — never *"we noticed you listen to…"*
- ✅ Push copy: *"Big Head Todd — new Denver date. Fillmore · Oct 12. Added to your Watching."* — front-loads artist/venue/date for glanceability; auto-on states outcome, highlight invites tap.

### ♿ A11y (WCAG AA)

- ✅ Per-surface `A11Y` note on every R2 section (4 sections × per-surface notes).
- ✅ Taste chip: `role=button` + `aria-pressed` + SR announces "Following, filter, pressed/not pressed" (`Spotify Sync R2.html:201–202`).
- ✅ Locked chip: `aria-disabled` but still opens the upsell (not a dead control) — good behavior for gated-but-discoverable.
- ✅ Scope banner is `aria-live` (announces scope changes when toggle flips).
- ✅ Discovery cards: labelled list, accessible name = artist + venue + date; reason chips are real SR-read content.
- ✅ Digest: table layout + inline styles for client support; image `alt` = artist name called out.
- ✅ Push: title/body are plain text (OS reads); in-app receipt unread state = dot + bold (never color alone).
- ✅ Active state = fill + `✕` affordance + Spotify mark — not color alone.

### 📱 Mobile + desktop parity

- ✅ Every R2 surface drawn at phone width (`PHONE_W`) with `ios-frame` chrome. Discovery shelf is horizontally-scrolling — mobile-appropriate.
- ✅ Digest email is mobile-first (600px table, responsive).
- ✅ No desktop-specific R2 surfaces (correctly — the connect chapter carried desktop in R1's OAuth handoff).

### 💾 Data + tier assumptions

- ✅ Uses the shipped `subscription_tier` enum (post-PR #878): `free / supporter / premium / founder`.
- ✅ Tier gate check pattern (`taste-filter.jsx:115`) references the enum values correctly — the problem is *which* values it picks, not that it invents new ones.
- ✅ R2 correctly assumes the connect + recognition spine from R1 is already live; only adds Premium payoffs.
- ✅ Push alert delivery correctly deferred to #737 sequencing (design decoupled from ship date).

### 🧾 Handoff artifacts

- ✅ `CLAUDE_CODE_PROMPT.md` — Design left an eng-ready implementation prompt for the future eng agent Hugh dispatches after Green. Not needed for the audit but useful downstream.
- ✅ Files enumerated in `README.md §22–29` (R1) and §68–73 (R2) with responsibilities.
- ✅ R1's design references are reused (theme-context, spotify-shared, follow-highlight, monetization-shared, ios-frame, design-canvas, tweaks-panel) — no duplication.

## Historical: Path to Green (all steps resolved 2026-07-13)

1. ✅ **Hugh confirmed tier gate (2026-07-13):** `premium || founder`. Supporter stays badge-only.
2. ✅ **Design applied the addendum (2026-07-13)** — see "🎉 Green resolution" section at the top. All gating fixes landed across `taste-filter.jsx`, `Spotify Sync R2.html`, `README.md`, `CLAUDE_CODE_PROMPT.md`. Remaining prototype polish items (11 nits) are documented above as "🧹 Prototype polish deferred to build" — none block eng.
3. ✅ **Second-pass audit (2026-07-13):** flipped 🟢 Green. Plan PR can open.

## Handoff prompt outputs

`CLAUDE_CODE_PROMPT.md` inside the handoff folder carries Design's eng-ready implementation prompt for the eventual build. Gating language is now correct (`premium || founder`); the RECONCILE FIRST preface is dropped. Ready to hand to Claude Code / an eng-planning agent as-is.

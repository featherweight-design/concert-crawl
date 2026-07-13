# Readiness Review — Spotify Sync (R1 + R2) · Track 1 Audit

**Verdict:** 🟡 Yellow — one substantive gating bug + one small copy consequence blocking Green. Everything else is tight; the design shape across both rounds is strong, follow filter is drawn to the exact behavior Hugh flagged, and Design proactively caught the gating question but implemented it wrong. Fixable in a ~15-min direct-write addendum from Design.
**Audited:** 2026-07-12
**Auditor:** Claude (Track 2 post-handoff Readiness Review — R1 + R2 combined)
**Audited handoff:** `design/design_handoff_spotify_sync/` (R1 delivered 2026-07-11; R2 delivered 2026-07-12)
**Source ticket:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) (`type: design, source: internal, phase: beta, priority: normal`)
**Source brief:** `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` (PR #893, merged 2026-07-11)
**Plan PR target:** `docs/superpowers/plans/<date>-spotify-sync-plan.md` — cannot open until the gating question resolves.

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

**Fix (Design addendum):**
- Change `taste-filter.jsx:115` to `const paid = tier === "premium" || tier === "founder";`
- Update `taste-filter.jsx:14` inline comment: `paid = premium/founder`
- Update the upsell sheet at `taste-filter.jsx:176` — currently reads `SUPPORTER $2/MO · FOUNDER $3 LOCKED`. Correct copy should promote the actual unlocking tiers: something like `PREMIUM $5/MO · FOUNDER $3 LOCKED` (Supporter is not the entry-level tier for this feature)
- Update `README.md §53, §55` and `Spotify Sync R2.html:178, 185, 186` prose to say `premium || founder` and drop the "reconcile" flag (it's resolved)

Alternatively, if Hugh actually *wants* to upgrade Supporter to include Spotify features (deliberately override the older entitlements matrix), that decision needs an explicit brief amendment first — because it changes the whole Supporter value prop from "badge-only" to "badge + Spotify", which has knock-on effects for how Supporter is positioned in the tier picker. But even then, `premium` must be in the check.

### 2. 📝 Upsell copy inconsistency (falls out from #1)

`taste-filter.jsx:167` upsell body lists three feature bullets: "Following", "Taste picks", "New-show alerts". This is accurate to the four R2 surfaces (grouping digest + push under "alerts"). But the eyebrow at line 158 reads `TASTE FILTER · PAID` — should it name the specific tier the user needs to reach? "TASTE FILTER · PREMIUM" would be clearer than the generic "PAID." Not blocking; nice-to-have alongside the #1 fix.

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

## Path to Green

1. **Hugh confirms tier gate** — is Spotify gated on `premium || founder` (matches brief + older entitlements matrix, my read), OR is Hugh actually upgrading Supporter to include Spotify features (would need a brief amendment first)?
2. **Design applies 4-line addendum** in `taste-filter.jsx` (paid check + comment + upsell copy) + prose fixes in `README.md` + `Spotify Sync R2.html` (drop the "reconcile" flag once decided).
3. **Second-pass audit** — should be a single-round Low/Nit-floor pass to confirm the fix; the design shape doesn't change.

Once addendum lands, this flips 🟢 Green and the plan PR can open with the correct gate baked in from day one.

## Handoff prompt outputs

`CLAUDE_CODE_PROMPT.md` inside the handoff folder carries Design's eng-ready implementation prompt for the eventual build. It also flags the same gating question — the fix above will bring that prompt into line with the resolution.

# Design Readiness Review — Venue first-timer guide (#764)

**Verdict: 🟢 Green — ready for implementation**

Design shipped hi-fi handoff for #764 that honors every locked decision from
the brief (PR #999), applies Hugh's R1 + R2 iteration feedback fully, and
demonstrates both design principles (voice authenticity + admin-side automation)
consistently across every surface. The handoff is tight enough to hand
straight to eng-planning without addendum.

---

## Scope validated

**12 files in the handoff directory.** Breakdown:

- **4 authored code files** by Design: `Venue First-Timer Guide.html` (canvas + Tweaks), `guide-data.jsx`, `guide-consumer.jsx`, `guide-admin.jsx`
- **6 shared infra files** copied from sibling handoffs, unmodified: `design-canvas.jsx`, `theme-context.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx`, `admin-primitives.jsx`, `identity-art.jsx`
- **2 meta docs**: `README.md` (Design's handoff DNA + inventory + gap report), `READINESS.md` (this audit)

Every authored code file is under ~600 lines for Copilot reviewability.

### Consumer surface

| State | Mobile | Desktop | Verified |
|---|---|---|---|
| Venue detail · first-timer populated | 320 + 390 | single column · 2-col guide | ✅ |
| Venue detail · first-timer thin | 390 | single column | ✅ |
| Venue detail · returner (collapsed) | ✓ | inline peer (no empty rail) | ✅ |
| Venue detail · returner (open) | ✓ | — | ✅ |
| Venue detail · anonymous (= first-timer) | 390 | — | ✅ (identical treatment per Q7) |
| Event detail · first-timer chip | 390 | — | ✅ |
| Event detail · returner baseline | 390 | — | ✅ (no chip; standard event detail) |
| Guide anatomy · callout ×2 · vibe · chip ×2 · access both states | ✓ | — | ✅ |
| Theme parity · Electric / Jade / Light | 390 | — | ✅ (all 9 supported via Tweaks) |

### Admin surface

| State | Verified |
|---|---|
| Populated (ready to publish) | ✅ |
| Empty (fresh venue) | ✅ |
| Validation (publish blocked — accessibility missing) | ✅ |
| Chip-state legend (blank / authored / honest_placeholder) | ✅ |

---

## Locked decisions — every one honored

| Q | Brief lock | Handoff delivery |
|---|---|---|
| Q1 Surface pattern | Persistent section + first-timer callout | ✅ `VenueDetail` component; section renders always, callout gated on `mode` |
| Q2 Content shape | Structured chips + free-form vibe line | ✅ `GuideChip` + `VibeLine` (surfaced first per Hugh's R2) |
| Q3 Callout treatment | Warm inline card at top of venue page | ✅ `FirstTimerCallout` — inline, accented, jump-to-guide anchor |
| Q4 Chip set | Per-venue curated + accessibility always present | ✅ `CHIP_ORDER` with `locked: true, star: true` on accessibility; picker excludes it (never selectable) |
| Q5 Event detail | Compressed chip → anchor to venue callout | ✅ `EventFirstTimerChip` right-aligned in venue row, signal-tinted, `href="#ft-guide"` |
| Q6 Empty state | Callout adapts honestly; guide always surfaces | ✅ `CALLOUT_COPY.thin` softens (`"here's what we've got so far"`); accessibility floor always present |
| Q7 Callout logic | Anonymous fires; any prior attendance suppresses | ✅ Anonymous section on canvas confirms identical treatment; question copy works for both |
| Q7' Returner state | Guide persists collapsed/compact, non-obtrusive | ✅ Accent-tinted accordion with preview strip (`Access · Parking · Age +N`) — Hugh's R2 "emphasize with accent" applied |
| Q8 Admin authoring | Pool + blank slate | ✅ `ChipPicker` + `ChipField` per chip; no auto-drafting; v2 chips (#997) shown as ghosted `SOON` |
| Q9 v1 chip pool | 8 chip types (accessibility locked + 7) | ✅ 8 present in `CHIP_ORDER`; keys shortened (`entry`/`age`/`bag`/`coat`/`food` vs brief's `will_call`/`age_policy`/etc.) — see prototype polish |
| Voice principle | Every displayed chip reads concert-goer voice | ✅ Grepped: no brochure copy, no "fraud", no "last chance", no "we miss you"; every `ROXY_GUIDE_COPY` entry passes the specific-over-generic test |
| Automation principle | Admin-side only; display 100% voice-passed | ✅ No auto-drafting in admin; venue basics (Capacity/Type) stay in `BasicsRow`, never inside the guide |

---

## Hugh's R1 + R2 feedback — all applied

### Round 1

| Feedback | Handoff response |
|---|---|
| "Keep the About section" | ✅ `AboutSection` component; sits between BasicsRow and callout |
| "Map on the fence" | ✅ Design proposed drop; R2 confirmed. `MapPlaceholder` gone; Directions link in `DirectionsRow` covers it |
| "Upcoming on left-side desktop — feels empty when collapsed" | ✅ Resolved via single-column desktop matching prod; upcoming lives below (never a sidebar). Returner accordion is an inline peer, so no empty rail |
| "Callout on event detail — mindful of Watching / eventually Going" | ✅ R2 fix: signal-tinted + right-aligned in venue row, not near the accent Watching/Get Tickets commit actions. Future "Going" pill will slot next to Watching without collision |
| "Vibe missing from first-timer guide?" | ✅ R2 fix: Insider tip (vibe line) surfaced FIRST on both display AND admin — the hero of the guide, not an afterthought |
| "More chips? How to add insider tips content?" | ✅ Curated + finite pool per voice quality bar; `Insider tip` is the free-form catch-all; #997 pool expansion scales cleanly (v2 chips already ghosted in picker) |

### Round 2

| Feedback | Handoff response |
|---|---|
| "Ditch the map" | ✅ Removed; Directions link only |
| "Hoist Capacity/Upcoming/Type/About above New here" | ✅ Ordering: hero → title → Directions → BasicsRow → AboutSection → FirstTimerCallout → GuideSection → UpcomingList |
| "Collapsed returner needs accent color emphasis" | ✅ Accent-tinted card with preview strip; explicitly styled "so it's noticeable even to repeat visitors" per README |
| "First-time chip clashes w/ Watching + Get Tickets colors + alignment" | ✅ Signal-tinted (not accent), right-aligned to page edge, lives in the venue row (not the CTA row) |
| "Admin: add Insider Tips chip surfaced highest — separates us from other apps" | ✅ Insider tip is the hero: `SURFACED FIRST` badge, accent-tinted panel, positioned above accessibility (which is required but still second); admin help copy explicitly emphasizes it |

---

## Voice authenticity audit (Sour Patch bar #782)

Sample chip content lifted from `ROXY_GUIDE_COPY`:

- ✅ **Specific > generic:** `"Paid lot on Blake, $15 cash. Street usually opens up a block over on Walnut after 7."`
- ✅ **Never brochure-y:** `"18+ to get in, 21+ with a wristband to drink. They check IDs on the sidewalk, so have it out before the line."`
- ✅ **Callout is a question:** `"First time at Roxy?"` — works for anonymous + signed-in
- ✅ **Honest thin state:** `"Here's what we've got so far."` — not `"we've got tons of tips!"`
- ✅ **Vibe line personality:** `"Roxy runs loud — grab earplugs at the bar if you forgot. The line's rough after 8:30, come early. Sound's best dead center, about ten feet back off the rail."`
- ✅ **Grepped:** no `"fraud"`, no `"last chance"`, no `"we miss you"` anywhere in the handoff

Admin field placeholders also modeled voice-first (`"e.g. $15 cash, Blake St."` beats generic hint copy). The `voiceReminder` strip on the admin block reinforces the bar at authoring time.

---

## Completeness sweep (per `feedback_audit_completeness_not_just_brief.md`)

Discipline: cross-check the brief against schema + eng infra + tier lifecycles,
not just check off brief items. Applying it here:

### Schema completeness
- ✅ **Venue basics** — address / capacity / venueType / about / neighborhood already exist on `venues` table. Handoff correctly keeps them OUT of the guide surface (they live in `BasicsRow` / `AboutSection`).
- ✅ **New surface** — 8 chip types + 1 vibe line is the eng-side data model to add. Design keys (`accessibility`, `parking`, `age`, `bag`, `coat`, `entry`, `food`, `transit`) are the enum values; eng-planning agent picks the final storage shape (per-chip table vs. JSONB column).
- 🟡 **Chip state derivation** — `blank | authored | honest_placeholder` is a client-side derived state. Eng maps to `body IS NULL/empty` + `is_placeholder BOOLEAN` (only valid on accessibility). Called out for the plan PR to spec.
- ✅ **Publish gate** — accessibility satisfaction (`body.length > 0 OR is_placeholder = true`) — handoff models the derived state correctly.

### Eng infra completeness
- ✅ Current venue page at `apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx` uses `MapPlaceholder`, `StatPill` (Capacity/Upcoming), About section, Upcoming list — matches Design's structure lift exactly. Map removal is the only substantive change.
- ✅ Admin surface at `apps/web/src/components/admin/VenueDetailsClient.tsx` — existing `AdminButton`, `StatusBadge`, `Panel` primitives (imported by handoff) all present under `@/components/admin/primitives`.
- ✅ Concert History (`attending_at`) is NOT yet wired in `apps/web/src/` — confirms the brief's sequencing note. Section can ship independent of callout (progressive enhancement).

### Tier / user lifecycle completeness
- ✅ Anonymous → callout fires (canvas Section 4 confirms)
- ✅ Signed-in first-timer → callout fires (Section 1)
- ✅ Signed-in returner → callout suppresses, section collapsed (Section 3)
- ✅ Event detail: first-timer chip / returner baseline (Section 5)
- ✅ No missing states — all four user permutations designed

### Voice / brand completeness
- ✅ All 9 themes covered via Tweaks panel; canvas Section 8 shows 3 (Electric / Jade / Light)
- ✅ Token-only on consumer surface (no ad-hoc hex in guide-consumer.jsx)
- ✅ A11y: `aria-expanded` on returner button, `aria-pressed` on chip picker toggles, `aria-hidden` on decorative icons, ≥44px tap targets, accessibility chip pinned first + never hidden

---

## Prototype polish deferred to plan PR integration

Non-blocking items eng resolves during plan PR spec / build:

1. **Chip key naming** — Design uses short keys: `entry` (brief: `will_call`),
   `age` (brief: `age_policy`), `bag` (brief: `bag_check`), `coat` (brief:
   `coat_check`), `food` (brief: `food_drink`). Labels unchanged. Eng-planning
   agent picks final enum values; the design keys are display-only in the
   canvas. Recommendation: use the more descriptive brief names (`will_call`,
   `age_policy`, etc.) in the schema enum for readability, since the eng-side
   enum is grep-searchable and shouldn't need in-context.
2. **Chip state data model** — `blank | authored | honest_placeholder` is a
   design concept; eng likely models as `(body text, is_placeholder boolean)`
   with a check constraint that `is_placeholder = true` implies `chip_type =
   'accessibility'`. Plan PR to spec.
3. **Publish state modeling** — the admin block computes `Publishable /
   Blocked / Ready to publish` from `access.trim().length > 0 || placeholderMode`.
   Not a persisted state; derived UI only. Fine.
4. **v2 hooks already scaffolded** — chip picker renders V2_CHIPS as
   ghosted `SOON · #997` chips. Eng-planning agent can wire the pool expansion
   incrementally without redesign.

None are voice, brand, or reachability regressions. Integration seams a good
plan PR resolves as part of the build.

---

## Design's own 4 gap-report items (Hugh's calls to confirm)

Design flagged these transparently in `README.md`:

1. **Venue-page scaffold framing** — informational; the surrounding page
   composition mirrors current prod (hero → basics → About → callout → guide
   → upcoming) with only the map removed. No confirmation needed unless Hugh
   wants a different composition.
2. **Thin-guide vibe line left blank (`ROXY_THIN_VIBE = null`)** — Design's
   read: honest > prompted. A thin venue has no vibe intel yet; don't fake
   one. **Recommendation: keep blank.** Matches the voice authenticity
   principle exactly.
3. **Admin surface desktop-first (not drawn at 320)** — matches sibling
   admin handoffs (`admin_venues`, `admin_events`). The block is responsive
   (fields stack) but no explicit mobile artboard. **Recommendation: OK for
   v1.** Admin authoring is a desktop task; if Hugh does mobile admin
   editing, a follow-up pass adds mobile artboards.
4. **"Can't document yet" toggle vs. publish-dialog checkbox** — Design's
   pattern: inline toggle in the accessibility field, always visible. Reads
   clearer than a modal checkbox and lets admin see the placeholder preview
   inline. **Recommendation: keep the toggle.** Cleaner interaction.

---

## What eng picks up

- Component structure ready to translate (guide-consumer.jsx → React components in `apps/web/src/components/consumer/`)
- Copy in `ROXY_GUIDE_COPY`, `CALLOUT_COPY`, `EVENT_CHIP_COPY`, `PLACEHOLDER_COPY`, `ADMIN_COPY` ready for lift into `apps/web/src/components/consumer/definitions/copy.ts`
- Admin block components ready to slot into `apps/web/src/components/admin/VenueDetailsClient.tsx`
- All 9 themes supported via `var(--*)` tokens; zero ad-hoc hex on consumer surface
- A11y (aria-expanded / aria-pressed / aria-hidden / min 44px tap targets) already implemented
- Sequencing: section ships independent of callout (progressive enhancement); callout depends on Concert History `attending_at IS NOT NULL` query from #55

---

**Reviewer:** Claude (design-track persona)
**Date:** 2026-07-18
**Handoff shipped:** 2026-07-18 (this PR)
**Brief referenced:** PR #999 (merged 2026-07-17)

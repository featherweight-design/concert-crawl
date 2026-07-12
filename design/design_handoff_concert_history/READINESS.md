# Readiness Review — Concert History (Passport) · Track 1 Audit

**Verdict:** 🟢 Green (post-addendum, 2026-07-12) — all three blockers resolved. See "Post-audit resolutions" section directly below.
**Original verdict:** 🟡 Yellow (2026-06-26) — plan PR blocked by two sequencing dependencies (schema for Going + Supporter tier) and one scope-boundary decision (Passport share card ownership). Design work itself is tight; the blockers lived outside the handoff.
**Audited:** 2026-06-26

---

## 🟢 Post-audit resolutions (2026-07-12)

Hugh walked the three blockers and made calls. Recording them here so the plan PR can open without re-litigating.

### 1. 📦 Data-contract sequencing → **Option (a): add `attending_at`**

- **Decision:** Add a nullable `attending_at timestamptz` column to the existing `user_events` table (DB column is snake_case; TS/API field is `attendingAt` per repo naming convention). Derive `going` at read-time from `attending_at IS NOT NULL`. The existing `userEventUniqueIdx` on `(userId, eventId)` is preserved.
- **Why:** Keeps the schema flat, avoids a new join table, and matches the memory rule — Watching ≠ Attending is a *field on the same row*, not a separate concept. Retroactive "I went, actually" writes `attending_at = now()` from the settings micro-action later.
- **Impact on plan PR:** Migration is a single `ADD COLUMN` (expand-only, safe). API surface adds `attendingAt: string | null` to `UserEvent`; the handoff's `goingMarkedAt` prop maps to `attendingAt` — no drawing changes required. The plan should also lock the write path: new Going commitments only set `attending_at`; `status = 'going'` is not written going forward (existing `'going'` values stay in the enum for backfill/rollback, and the plan's contract phase will migrate them into `attending_at` and drop the value from writes).

### 2. 💳 Supporter tier → **already resolved via monetization eng infra spec (PR #878)**

- **Verified:** `packages/db/src/schema/commerce.ts` shows `subscription_tier` enum now includes `supporter` + `founder` alongside `free` and `premium`. Expand-only migration per monetization eng infra spec Part 1 §1.
- **Impact on plan PR:** The paywall gate for History detail can key off `tier === 'supporter' || tier === 'founder'` immediately. No sequencing wait remaining — this blocker is fully cleared.

### 3. 🎫 Passport scope → **moves to shareable_cards handoff**

- **Decision:** Passport card (compact 320×500 + share 1080×1080) is out of scope for this build. Concert History ships with the `<PassportTeaser>` teaser link only — a small "See your Passport →" affordance at the bottom of the History page. Full Passport card design + build moves to `design/design_handoff_shareable_cards/`.
- **Why:** Passport is the marquee share artifact for the whole app, not just History. Owning it in shareable_cards keeps concert_history's scope tight (three primary surfaces + teaser), and lets Passport get the full share-card treatment (OG image gen, download path, dimensions parity with other cards) alongside its siblings.
- **Impact on plan PR:** Drop `<PassportCard>` from the build inventory. Keep `<PassportTeaser>` (link only). shareable_cards handoff picks up the full-card work as a new item.
- **Downstream:** shareable_cards Readiness Review (next in Yellow → Green sequence) now inherits Passport as an added scope item — its own audit will confirm whether Design has drawn Passport to shareable-cards' fidelity bar or needs a small extension.

**Plan PR unblocked as of 2026-07-12.** All prerequisites in place; the plan can enumerate: (1) `attending_at` migration, (2) `user_events` API surface update, (3) three History surfaces + teaser (no full Passport), (4) Supporter tier gate on detail view.

---

> ⏳ **Everything below is the original 2026-06-26 Yellow audit, preserved as historical context.** Statements about schema state (e.g., `subscription_tier` lacking `supporter`/`founder`, `attending_at` not yet existing) reflect the codebase at audit time and have since been resolved — see the Post-audit resolutions section above for current state. Do not treat the following as a live description of the system.

---

**Auditor:** Claude (Track 1 pre-plan-PR Readiness Review, single-round audit)
**Audited handoff:** `design/design_handoff_concert_history/` (originally merged pre-2026-06-23, no prior READINESS.md)
**Source ticket:** [#55](https://github.com/HartiganHM/concert-crawl/issues/55) (Concert History — Watching page tab, per pre-beta status memory)
**Related concept memory:** `project_concert_history_attending.md` — Watching ≠ Attending; History requires an explicit "I'm going!" action, self-reported, not derived from watched shows.
**Plan PR target:** `docs/superpowers/plans/<date>-concert-history-plan.md`. Cannot open until the two schema-level blockers below resolve.

## Summary

The handoff is **design-complete and internally coherent.** Three surfaces (Going CTA, Watching nudge, History page) + one stretch surface (Passport card) are drawn to a level Design typically only reaches after two review rounds. The visual system is unified — a single "stub stamp" motif runs Event Detail → Watching row → History row → Passport card, all deterministic from an artist-name hash. Voice is Sour Patch throughout. Token discipline is real, not annotated: every color reads from `var(--*)` in the sample components. Mobile + desktop routes are both drawn.

**Why Yellow, not Green:** three cross-cutting concerns need Hugh's explicit call before a plan PR can open — none of them are Design's fault, all of them are load-bearing for the build.

1. **📦 Data-contract sequencing.** The handoff assumes `goingMarkedAt: string | null` as a per-row timestamp. Today's `user_events.status` enum is `['going', 'interested', 'watching']` — a single mutually-exclusive status field with no timestamp for the going commitment specifically. Also, the current `userEventUniqueIdx` enforces one row per `(userId, eventId)`, so "watching + going" cannot be two separate rows. The plan PR needs to pick: (a) add an `attending_at` timestamp column to the existing single row and derive `going` from `attending_at != null` (keeps the unique index; the `status` enum can stay watching-focused), or (b) split into a new `user_event_attendance` table with its own `(user_id, event_id)` — decoupling the concerns entirely. Either is fine; Design doesn't get to decide, but the plan can't proceed without a decision.
2. **💳 Supporter tier doesn't exist yet.** `subscription_tier` enum is `['free', 'premium']` — no `supporter`, no `founder`. The whole locked/paywall path in the handoff assumes Supporter as the gate. The monetization vertical brief locks Supporter at $2/mo and Concert History as the marquee Supporter perk. Concert History cannot ship until the monetization DB migration lands. This is a **sequencing hard-block**, not a Design change.
3. **🎫 Passport card scope boundary.** The handoff draws `<PassportCard>` in full detail (compact 320×500 + share 1080×1080). A separate `design_handoff_shareable_cards/` folder exists. Design + eng need to confirm whether Passport is (a) owned by *this* build (History's stretch surface, ships with it) or (b) owned by shareable-cards (History gets a `<PassportTeaser>` link only, full card ships later). The handoff hedges — Passport is labeled "Stretch" but drawn to full fidelity.

Design's shape is right. Every open item in "Open questions for eng" is thoughtful and doesn't leak scope. The three blockers above sit at the seams between this handoff and the monetization + schema tracks — Track 1 audit's job is to name them, not to solve them.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Three primary surfaces + one stretch clearly enumerated in the README opener with intent (`I'm going!` CTA / Watching nudge / History page / Passport stretch).
- ✅ Source-of-truth rules pinned at the top of the README: "A show enters History when `goingMarkedAt != null && dateISO < now`. Server-authoritative." Matches the memory verbatim.
- ✅ **Watching ≠ attendance is stated explicitly** at three separate levels: README top-of-doc rule, `history-data.jsx` file header comment, and in the `<GoingButton>` "Why a new component, not a second Watch button" JSX comment. This is exactly the level of anchoring the memory calls for.
- ✅ Retroactive "I went, actually" affordance (`<GoingPostShowState>`) is drawn but explicitly deferred to a settings micro-action, not v1 primary surface. Prevents scope creep at build time.
- 🟡 **Passport scope is unresolved.** README labels it "Stretch" but `history-routes.jsx` implements `<PassportCard>` + `<PassportInner>` + `<PassportStamp>` + `<PassportStat>` at full fidelity in both compact (320×500 sidebar/teaser) and share (1080×1080 social) modes. Meanwhile a separate `design/design_handoff_shareable_cards/` folder exists. Needs Hugh's call: does this build ship the full Passport card, or just the `<PassportTeaser>` link with the full card deferred to shareable-cards?

### 🎭 State coverage

- ✅ Going CTA covers all four locked states: `default` · `going` · `past-yes` · `past-no`. Each has drawn treatment + copy in `going-cta.jsx:77-178`.
- ✅ Watching nudge ships one interactive state with three exit paths (Yes / Not me / Dismiss). Persistence keyed per-show in localStorage; won't re-fire. Matches memory's "asking before is honest, asking after is interrogation."
- ✅ History page renders **three route-level states**: locked (Free tier), empty (Supporter with no past shows), populated (Supporter with 3 / 8 / 18-show variants sliced from `H_SHOWS`). `<HistoryRoute>` + `<HistoryRouteDesktop>` both handle the swap.
- ✅ Empty state is tonally aligned with Watching's "Crickets." — headline "Nothing's behind you yet." + explicit onboarding path via the CTA copy.
- ✅ Locked state honors monetization voice locks: headline "Keep the nights." + footer "Free tier keeps everything else. No paywalls in the way of seeing shows." Sour Patch anchor preserved.
- ✅ Density variants (compact / cozy / roomy) exist for `<HistoryItem>` — consistent with the Watching row pattern.
- 🟡 **No error state drawn.** If the "I'm going!" mutation fails, the CTA should have an error / retry treatment. Not blocking (eng typically handles at the mutation layer with a toast) but worth flagging.

### 🔌 Data contract

- ✅ `HistoryShow` type is fully specified in README (`id / artist / venue / neighborhood? / dateISO / dateLabel / showTime? / priceFinal? / genre / goingMarkedAt`). Sensible defaults for optional fields.
- ✅ `h_stats(shows)` return shape documented (`nights / venues / artists / topGenre / topVenue / first / last / totalSpent`) — single source of truth for all summary surfaces.
- ✅ `h_isInNudgeWindow(show)` predicate is unambiguous: `daysUntil >= 0 && daysUntil <= 7 && !show.goingMarkedAt`. Matches README's "7 days away AND not marked."
- 🔴 **`goingMarkedAt` is a per-row timestamp, not a status enum value.** Current DB (`packages/db/src/schema/social.ts:13-42`):
  ```ts
  export const userEventStatusEnum = pgEnum('user_event_status', [
    'going', 'interested', 'watching',
  ])
  status: userEventStatusEnum('status').notNull(),  // single mutually-exclusive value per (userId, eventId) via userEventUniqueIdx
  ```
  The handoff's model is orthogonal (a user can be both watching AND going for the same show, at different times). Today's schema forces one status per row via `userEventUniqueIdx: uniqueIndex('user_events_user_event_idx').on(table.userId, table.eventId)`. Plan PR must land a migration that either:
  - **(a)** adds `attending_at timestamptz nullable` to `user_events` and keeps `watching` as `status`, with going as a `attending_at != null` predicate, OR
  - **(b)** splits attendance into a new `user_event_attendance` table with `user_id + event_id + attending_at + declined_at + dismissed_at`.
  Design is agnostic; the memory names both options. This is a Hugh-decision-required gate.
- 🔴 **Supporter tier doesn't exist in `subscription_tier` enum.** Current DB (`packages/db/src/schema/commerce.ts:11-14`):
  ```ts
  export const subscriptionTierEnum = pgEnum('subscription_tier', [
    'free', 'premium',
  ])
  ```
  The whole locked/paywall path in `<HistoryLocked>` gates on Supporter. Monetization locked matrix (persona §Locked decisions) puts Supporter at $2/mo with Concert History as the marquee perk. Concert History **cannot ship** until the monetization migration adds `supporter` to this enum. Note: Founder is currently modeled as a `founder: boolean` column on the `subscriptions` table (`packages/db/src/schema/commerce.ts:27`), not an enum value — whether that stays as a boolean flag or gets promoted into `subscription_tier` is a #775 spec decision, not a hard gate for this handoff. Sequencing gate.
- ✅ `dateLabel`, `showTime` pre-formatted on the row — Design is treating date formatting as data, not copy, per project convention.
- ✅ Every color / animation / rotation is deterministic from stable inputs (`h_accentFor(artist)`, `h_glyphFor(artist)`, show-id hash for rotation). Same artist → same stamp forever. No runtime randomness. Server-side rendering safe.
- 🟡 Passport `handle="hugh"` default is a placeholder — eng needs the real handle field from the user record. Not a Design gap; just flagging.

### 🧱 Codebase fit

- ✅ **Zero drift risk from shipped code** — no `GoingButton`, no `HistoryRoute`, no `PassportCard` exists in `apps/web/src/components/consumer/`. Clean slate for build. Grepped for `going`, `attend`, `concert.history`, `imGoing` and matched only the shipped `WatchShowButton.tsx` (which is the eye button the handoff explicitly preserves).
- ✅ `<WatchingEye>` in the handoff mirrors the shipped `WatchShowButton.tsx` affordance exactly: 28×28 accent-outlined square with an eye icon, `aria-pressed`, no confirm on toggle. Handoff explicitly says "we re-use that exact affordance here." Correct.
- ✅ Token-only colors verified across `going-cta.jsx`, `history-screens.jsx`, `history-routes.jsx`. Every accent reads from `var(--*)`. Spot-checked `--signal` (CTA primary), `--accent` (Supporter chip + brand-presence), `--surface-1/2`, `--border-strong`, `--fg-muted/subtle`, `--fg-on-accent`. Passport uses hardcoded hex only inside the share-card gradient background (`#1F1538 → #08050F`, `#7AE6FF`, `#FF7BD4`) — which is correct because share cards render outside the app's theme system.
- ✅ CTA token rule respected: `--signal` for forward actions (Become a Supporter, Browse tonight's shows), `--accent` for Supporter brand-presence chip. Never a verb on a red button.
- ✅ **Theme parity** — README claims "Verified across Electric · Jade · Light" but the token-only discipline means all 9 themes will inherit correctly. No hardcoded hex in the in-app surfaces.
- ✅ Mobile + desktop **both drawn in the same handoff** (`<HistoryRoute>` mobile, `<HistoryRouteDesktop>` desktop 2-column with sticky right-rail Passport + calendar-export). Parity honored.
- 🟡 **All customer-facing copy is hardcoded in JSX** across `going-cta.jsx`, `history-screens.jsx`, `history-routes.jsx`. Plan PR must externalize to `apps/web/src/components/consumer/definitions/copy.ts` per `feedback_definitions_copy_rule`. Not Design's fault (shared handoff convention across the whole codebase); flagging for the plan.
- 🟡 The `SUPPORTER` locked-state PerkRow list in `history-routes.jsx:184-195` inlines three perks (Concert history / Calendar export / Passport card). Per the monetization locked matrix (`monetization-shared.jsx` SUPPORTER entry from #781 R6 amendment), the plan PR should source this list from the canonical `monetization-shared.jsx` — not re-declare it inline — to prevent the exact drift class Copilot caught on #820. Flag for plan PR.

### ♿ Cross-cutting

- ✅ `<GoingButton>` ships `aria-pressed` reflecting `going` state; `disabled` prop for `past-*` states with `cursor: "default"`.
- ✅ `<WatchingEye>` ships `aria-pressed` + descriptive `aria-label` (`"Stop watching"` / `"Watch this show"`) + `title` tooltip.
- ✅ `<GoingNudge>` dismiss button ships `aria-label="Dismiss"` + `title`. All three action buttons are real `<button>` elements.
- 🟡 **No focus trap / focus management annotation** for the locked state modal-shaped card. The `<HistoryLocked>` card looks modal-y (centered, shadowed, over silhouette wallpaper) but it's a route-level takeover, not a modal — no dismiss action, no focus trap needed. Worth confirming with Design that the pattern is takeover-not-modal so the plan PR doesn't accidentally build modal chrome.
- 🟡 **No `aria-live` region on the nudge banner** for the entrance announcement. It appears passively when the show enters the 7-day window; a screen reader may not notice. Suggest `aria-live="polite"` treatment in the plan.
- 🟡 **No SR walkthrough scripts** for the Going state transitions or Passport share flow (the #782 handoff shipped three of these inline). Not a Design gap for Track 1 but a nice-to-have.
- ✅ Passport card contains no interactive elements below the share button — decorative stamps are `aria-hidden` on the teaser (`history-routes.jsx:330`).

### ⏰ Drift from reality

- ✅ **Watching ≠ Attending memory honored throughout** — README, `history-data.jsx` header, `going-cta.jsx` "why a new component" comment all name the distinction and reject the auto-derive path.
- ✅ **Monetization locked matrix honored** on the Supporter tier — Concert History + Calendar export are correctly named as Supporter-tier features (matches persona §Locked decisions Watching-is-Free amendment where Attending / History / Alerts = paid tier).
- 🟡 **Tier vocabulary mismatch in `<HistoryLocked>` PerkRow list** — the locked card lists three perks (Concert history / Calendar export / Passport card). The monetization locked matrix has Supporter as concert history + calendar export; Passport card is Premium-ish territory (shareable summary sits alongside "Watchparty invites" and other social features). Ask: does the Supporter tier include Passport share, or does Passport belong to Premium? Track 1 audit flag; a Hugh call.
- ✅ Voice: Sour Patch anchors preserved — "Nothing's behind you yet." (empty), "Keep the nights." (locked headline), "Still going? In 4 days." (nudge), "You went · Oct 14, 2026" (past-yes), "Didn't make it" (past-no). No slang, no whining, honest.
- ✅ **Calendar-export mechanism reference** — README §Open Q2 defers `.ics` feed vs. point-in-time download to eng. Sensible; both need infra (subscribable feed URL vs. one-shot generate). Plan PR must pick one for v1.
- ✅ Retroactive "I went actually" affordance is drawn as `<GoingPostShowState>` but explicitly deferred to a settings micro-action. Doesn't leak into v1 primary surfaces.

### 📝 Decision log

Design's "Open questions for eng" section explicitly names 5 items:
1. **Nudge dismiss persistence** — localStorage v1, sync-to-user for v2. Design defers to eng. ✅ Sensible.
2. **Calendar export format** — `.ics` feed vs. point-in-time. Design offers both, eng picks. ✅ Sensible.
3. **Retroactive "I went, actually" affordance** — deferred. ✅ Sensible.
4. **Free-tier stat preview** — locked state hides everything today; open for A/B. ✅ Reasonable to build v1 as-hidden, revisit post-launch.
5. **Passport download** — DOM → PNG via `html-to-image` (existing setup) OR SVG handoff. ✅ Sensible.

**None of the five open questions block Design's shape.** All are eng-implementation choices that the plan PR should call. Track 1 audit doesn't require Design to answer them.

**Missing from the decisions log** (needs plan-PR-owner + Hugh call, not Design):
- 🔴 Attending schema decision (add `attending_at` column vs. new `user_event_attendance` table). Blocks plan PR.
- 🔴 Supporter tier existence in `subscription_tier` enum. Blocks build shipping.
- 🟡 Passport card scope — this build vs. shareable-cards handoff. Needs a call.

## Deliberate exclusions

- ✅ Retroactive "I went, actually" post-show survey — out of v1 primary surface, sketched only as a quiet settings escape hatch.
- ✅ Post-show "did you go?" prompt — explicitly rejected by design principle ("asking before is honest, asking after is interrogation").
- ✅ Editing / removing past attendance — no remove affordance in `<HistoryItem>`; "past attendance isn't editable in v1" per file header.
- ✅ Adding Going to Browse rows — explicitly out per `<WatchingEye>` header comment: "Browse stays eye-only." Reasoning documented (Browse is triage; Going needs event-detail context).
- ✅ Threading, comments, watchparty invites — nothing surfaced on History or Passport. Stays a solo keepsake.
- ⏳ Passport share card — TBD whether this build owns it or shareable-cards does.

## Inherited decisions honored

From `project_concert_history_attending.md`:
- ✅ Watching ≠ Attending — explicit in three places.
- ✅ "I'm going!" as the explicit action — the CTA copy is verbatim.
- ✅ Self-reported, not verified — server-authoritative on the timestamp only.
- ✅ History powered by attendance records only, not by watched-shows-whose-dates-passed — `goingMarkedAt != null` predicate is the sole entry gate.

From the persona §Locked decisions (monetization vertical):
- ✅ Watching is Free (eye affordance stays for signed-in Free users).
- ✅ Attending / concert history = paid tier (History gates on Supporter).
- ✅ Supporter voice — "Keep the nights." / "Free tier keeps everything else." matches the Sour-Patch honesty rail.
- 🟡 Supporter tier feature list — inline in `<HistoryLocked>` PerkRow instead of sourced from canonical monetization-shared. Flag for plan PR to prevent the drift class Copilot caught on #820.

From `feedback_definitions_copy_rule`:
- 🟡 Copy is hardcoded in JSX. Plan PR must externalize (shared convention violation, not Design's fault).

From `feedback_mobile_desktop_parity`:
- ✅ Mobile + desktop drawn in the same handoff. Both routes ship together.

From CLAUDE.md CTA token rule:
- ✅ `var(--signal)` for CTAs; `var(--accent)` for Supporter brand-presence chip.

## Open observations (no addendum required from Design)

- The `<PassportTeaser>` share button is rendered but unwired (no `onClick` handler). Eng wires the modal / route to the full `<PassportCard>` at integration.
- The `<HistoryRoute>` and `<HistoryRouteDesktop>` both accept `themeKey` / `density` / `shows` props — designer-friendly for canvas storyboarding but plan PR should route these through URL params + auth context, not props.
- The nudge's copy includes `"Tonight."` and `"Tomorrow."` special-cases via `h_daysUntil` — nice detail, needs to survive the copy externalization.
- No `role="status"` or transition annotation for the CTA state change (default → going animation). Design ships the visual (`transition: "background 160ms, border-color 160ms, color 160ms"`) but SR announcement of the state change isn't wired. Plan PR should add.

## Next step

Design is done. The handoff is at Green quality on scope / state coverage / codebase fit / drift / decisions log. Verdict is 🟡 Yellow because **the plan PR cannot open until Hugh calls three things:**

1. Attending schema — `attending_at` column vs. new `user_event_attendance` table.
2. Monetization migration lands first, adding `supporter` + `founder` to `subscription_tier`.
3. Passport card scope — owned by this build, or by shareable-cards handoff.

Once (1) and (3) are answered and (2) has a target date, the plan PR path is clear: `docs/superpowers/plans/<date>-concert-history-plan.md`. No re-audit is needed on Design's side; the shape is right and the drift is external.

This verdict lands as the canonical Track 1 audit for this handoff per `docs/superpowers/design-pipeline.md`.

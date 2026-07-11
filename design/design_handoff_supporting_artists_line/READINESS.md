# Readiness Review — Supporting Artists Line (#643 · Round 1)

**Verdict:** 🟢 Green — ready for eng plan
**Audited:** 2026-07-12
**Auditor:** Claude (Track 2 Readiness Review, single round)
**Audited handoff:** `design/design_handoff_supporting_artists_line/` (Round 1)
**Source brief:** `docs/superpowers/specs/2026-07-11-supporting-artists-title-separator-design.md` (PR [#869](https://github.com/HartiganHM/concert-crawl/pull/869), merged 2026-07-11)
**Related ticket(s):** [#643](https://github.com/HartiganHM/concert-crawl/issues/643) — beta-feedback rendering fix. Related-but-separate: [#84](https://github.com/HartiganHM/concert-crawl/issues/84) (Support Act Spotlight — future).
**Plan PR target:** `docs/superpowers/plans/<date>-supporting-artists-line-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

## Summary

Design nailed the brief in one pass and made a **smart departure** worth calling out: rather than the brief's speculative "italic + em-dash below the headliner" for the tour name, Design lifted the tour name to a **mono uppercase KICKER above the headliner**. This is the audit's favorite call in the handoff — the brief's below-headliner treatment would have collided with the openers line at overflow (where both concerns compete for the row below the headliner); moving the tour to a kicker above the headliner puts the two concerns on **different rows** and the collision disappears. Every subsequent state (overflow, empty, cancelled) inherits this structural clarity.

Every "Open for Design to call" item from the brief is resolved with a starred pick + rationale, alternates preserved in Tweaks:

- **Separator:** middot `·` inside a mono lead-word ("with"), 6px air either side ✅ matches brief convention lock
- **Tour name:** mono uppercase kicker above headliner (subtitle + hidden shown as Tweaks alternates)
- **Overflow:** truncate + honest `+N more` — wrap / marquee / fade-out explicitly rejected with rationale
- **Empty / single / tour-only / solo:** scaffolding never renders without data (single opener drops separator; tour-only skips billing line)
- **Cancelled / postponed:** status pill in the kicker row + block dims + `--danger` strike on cancelled headliner — the openers line stays coherent
- **Forward-compat with #84:** `interactive` flag on opener nodes → chips become tap targets with no re-layout
- **A11y:** `role="group"` + natural-language `aria-label` ("with A, B, and C") — screen readers hear the **complete roster** even when the eye sees `+N more`. Beautiful touch.

Token discipline is real: `supporting-line.jsx` + `event-cards.jsx` render entirely through `var(--*)` (`--fg`, `--fg-muted`, `--fg-subtle`, `--border-strong`, `--danger`, `--signal`, `--warning`). All 9 themes (`CC_THEME_KEYS = electric / jade / light / pulse / forge / bluenote / drip / cedar / gloss`) render in `Supporting Artists Line.html`. Mobile + desktop parity is **behavioral** — one `EventTitleBlock`, one `RAMP` size map, each surface differs only by ramp step.

Verdict is Green with three small observations captured in "Open observations" — none blocking a plan PR.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Handoff scope matches brief exactly: rendering fix across every surface that shows `event.title`. Three integration sites named — `<EventCard>`, `<HeroEventCard>`, `<DetailHeader>` — rebuilt on the shared `<EventTitleBlock>`. Nothing else touched.
- ✅ Out-of-scope items from the brief (#84 Support Act Spotlight clickable openers, data migration / backfill of legacy titles, genre chips / price / watch state on cards) explicitly named as out-of-scope in README §"Out of scope."
- ✅ Data-first fix path preserved: Design proceeds against `supportingArtists: string[]` + `tourName: string | null` on `Event`, no client-side parsing of the legacy run-on `title`.

### 🎭 State coverage

- ✅ All 8 brief deliverables present in the canvas map (§0 Live through §10 A11y).
- ✅ **Empty:** solo headliner renders name alone, no empty div.
- ✅ **Single opener:** drops the separator (`with Hotline TNT`).
- ✅ **Tour-only:** kicker renders, billing line skipped.
- ✅ **Multiple openers within limit:** joined by `·` in `--fg-subtle`, lead word `with`.
- ✅ **Overflow (4+ openers at 320px):** truncate + `+N more` count in `--fg-subtle`, row height constant.
- ✅ **Cancelled:** `--danger` strike on headliner + block dim + `[CANCELLED]` pill in kicker row.
- ✅ **Postponed:** `[POSTPONED]` pill in kicker row + block dim, no strike.
- ✅ **Chips variant (Variant B):** provided as a Tweak alternative to the middot-joined text, tap-forward-friendly for #84.

### 🔌 Data contract

- ✅ **Matches brief's data assumption verbatim:** `supportingArtists: string[]` (order-preserved, headliner-excluded) + `tourName: string | null`. Design proceeds against these exact fields.
- ✅ Component API is clean: `<EventTitleBlock artist tourName supportingArtists status surface lead interactive>` — each prop maps to a single locked concern. `surface` drives the RAMP; `lead` is the mono lead-word scaffolding string; `interactive` is the #84 forward-compat hook.
- ✅ **Fallback posture during backfill preserved:** the brief specified `title !== artist` fallback to raw `title` while re-crawl catches up. The handoff doesn't render this fallback path itself (out of visual scope), but the component structure makes the fallback a one-line branch at integration — no layout change needed.

### 🧱 Codebase fit

- ✅ **One component, three surfaces** — `EventTitleBlock` composes across `EventCard.tsx` (browse, watching), `HeroEventCard.tsx`, and `events/[id]/page.tsx`. Each swaps the existing `event.title !== event.artist && <p>{event.title}</p>` pattern with a `<EventTitleBlock>` call and moves on. Drop-in replacement.
- ✅ **`RAMP` handles surface scaling** without duplicating markup: card / hero / detail get different `nameSize`, `sepSize`, `leadSize`, `tourSize`, `tourGap`, `headlineSize`. Same component, different constants. Mobile + desktop share the same component (visual differences fall out of the ramp; behavior is identical).
- ✅ **`SEPARATORS` map** allows the character choice to be swapped at integration if a future beta-feedback pass reveals a better fit (`·` is starred; `/` and `,` are alternates preserved for grep-ability).
- ✅ **`SUPPORT_COPY` scaffolding strings** (`with`, `+N more`, alternates `plus / feat. / also playing`) externalize at integration to `apps/web/src/components/consumer/**/definitions/copy.ts` per the copy rule — the handoff calls this out explicitly in README §"Voice."

### ♿ Cross-cutting

- ✅ **A11y is real, not annotation-only:** `role="group"` on the openers wrapper with a computed `aria-label` from `supportingA11yLabel()` — a natural-language list ("with A, B, and C") that reads the **complete** roster to screen readers even when the visual truncates to `+N more`. Glyphs are `aria-hidden`. Tour kicker carries `aria-label="Tour: {name}"`. This is the audit's second-favorite touch (after the kicker call).
- ✅ **Token-only across all 9 themes.** Product surfaces (`supporting-line.jsx` + `event-cards.jsx`) render entirely through `var(--*)`. Hardcoded hex values in `design-canvas.jsx` + `ios-frame.jsx` are canvas / device-frame scaffolding shared verbatim across every handoff — not the surfaces being audited.
- ✅ **Mobile + desktop parity is behavioral.** One `EventTitleBlock` handles both viewports. `RAMP` scales the type; the component tree is identical.
- ✅ **`--danger` on cancelled + `--fg-muted` dim on both cancelled/postponed** — the block visually recedes without hiding info. Openers line "stays coherent — quieter, never fighting the badge."
- ✅ **Rejected treatments are named + rationalized:** wrap (breaks list rhythm), marquee (motion tax + a11y hostile), fade-out (hides the count). This is a design-review skill for future audits to inherit.

### ⏰ Drift

- ✅ **Data assumption matches brief** exactly. No silent widening (e.g., no requesting `openingActRole` or `tourStartDate` — Design stayed on the two locked fields).
- ✅ **Voice matches brief:** Sour Patch scaffolding, `+N more` is deadpan-honest. Never fluffy.
- ✅ **Reference surfaces align** with what the brief locked as integration sites — no drift into surfaces the brief called out of scope.
- ✅ **`event.title` legacy string left untouched** at the DB / API level — the fix is additive per the brief's expand/contract data model rule.

### 📝 Decisions log

- ✅ Every "Open for Design to call" item from the brief resolved with a starred pick + rationale in README §"The deliverables — calls made."
- ✅ Rejected alternatives named with reasons (wrap / marquee / fade / italic-below-instead-of-mono-kicker-above).
- ✅ Alternates preserved in Tweaks so they can be resurrected if beta feedback pushes back.

## Open observations (no addendum required from Design)

Not blocking. Fair to fold into the eng plan or leave as follow-up notes.

1. **Lead word "with" is a voice call worth Hugh's eyeball.** Design provides alternates in Tweaks (`plus`, `feat.`, `also playing`). "with" reads as billing-lingo-clean, but "feat." is a common concert-poster convention that some Denver venues use verbatim. Cheap to swap post-hoc via `SUPPORT_COPY.lead` — a one-line change in `copy.ts` at integration. Design's rec ("with") is fine; flagging only because the alternates are conspicuously well-considered.
2. **`maxInline` (overflow cap) is a mock knob.** Design used a count knob for the prototype; the README says "eng tunes it to measured width." The eng plan should call out **which width measurement** (container `resizeObserver` per card? a static per-surface constant? viewport-driven breakpoint?). Small implementation call, but the design assumes a runtime width read is possible.
3. **Kicker + status pill layout at hero surface** deserves a quick spot-check when the eng plan renders. The kicker row hosts both the tour eyebrow AND the status pill (cancelled/postponed). At the hero surface (`HeroEventCard`), that row may be visually competing with a hero image treatment. The handoff didn't ship a "hero cancelled with tour" variant — likely a fine gap, but worth verifying at build time.

## Plan-PR carries (things to fold into the eng plan)

- **Overflow measurement strategy** — `resizeObserver` on the openers container vs. per-surface static constant. Design defers to eng.
- **`SEPARATORS` + `SUPPORT_COPY` externalization** to `apps/web/src/components/consumer/**/definitions/copy.ts` at integration.
- **Kicker rendering condition** — kicker is only shown if `tourName != null`. When null, headline sits alone. Handoff assumes this branch; eng plan should make it explicit in the component.
- **Fallback posture during backfill** — from the brief: when `supportingArtists === [] && tourName === null && title !== artist`, render the raw `title` string on a single line. Handoff doesn't include this branch (correctly out of visual scope), but the eng plan should specify it as the transitional-render posture.

## Decisions inherited

From the brief (PR #869) and the persona's locked decisions:

- **Data-first fix path:** structured `supportingArtists: string[]` + `tourName: string | null` on `Event`. Legacy `title` string preserved during transition (expand/contract).
- **Separator character = middot** `·` (matches event-card metadata convention app-wide).
- **Overflow at 320px = truncate + count** (wrap / marquee / fade rejected).
- **Forward-compat with #84 Support Act Spotlight:** opener names live in stable nodes so the click affordance is a targeted swap when #84 ships.
- **Sour Patch voice on scaffolding strings.** Artist names + tour names are data, not copy — never styled voice.
- **9-theme token-only.**
- **Mobile + desktop parity** non-negotiable.

## Cross-references

- **Source brief:** `docs/superpowers/specs/2026-07-11-supporting-artists-title-separator-design.md`
- **Source ticket:** [#643](https://github.com/HartiganHM/concert-crawl/issues/643)
- **Forward-compat target:** [#84](https://github.com/HartiganHM/concert-crawl/issues/84)
- **Existing surfaces to integrate against:** `apps/web/src/components/consumer/event-card/EventCard.tsx`, `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`, `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`
- **Existing separator convention referenced:** middot `·` on event-card metadata (`venue · date · price`)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`

## Recent activity (since brief merge 2026-07-11)

| PR | Title | Merged | Assessment |
|---|---|---|---|
| #869 | Supporting artists title separator design brief | 2026-07-11 | Source of truth for this audit. ✅ Fully honored. |
| Other 2026-07-11 activity | See `docs/superpowers/design-pipeline-status.md` recently-shipped table | — | No drift into #643's surfaces. |

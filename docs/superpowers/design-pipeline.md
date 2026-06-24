# Concert Crawl — Design Pipeline

The Concert Crawl product runs a structured design pipeline that ensures every shipped feature comes with a workshopped design brief, a readiness-audited handoff, and a Copilot-reviewed implementation plan — before any production code is written. This document is the canonical reference for the workflow. CLAUDE.md links here.

Established 2026-06-23 in a dedicated design-track session.

> **Note for readers viewing this on GitHub:** This document references several Claude memory notes inline (filenames matching `feedback_*.md`, `project_*.md`, `user_*.md`, `reference_*.md`). These live outside the repo at `~/.claude/projects/.../memory/` and are loaded into Claude Code sessions automatically. They are not browsable in the repo. See the "Related memory" section at the bottom for the canonical cross-reference list.

---

## Why this exists

Past failures we're guarding against:

- **Design handoff has technical gaps** (missing states, undefined data contracts, untested assumptions about backend capability) → discovered late in implementation, wastes cycles.
- **Implementation plan misses non-obvious cases** → discovered in code review or QA.
- **Stale designs ship without re-validation** → produced before a major architectural change (Vercel/Neon migration, schema evolution, new admin patterns) and reference reality that no longer exists.
- **Roadmap unpredictable** when designs lag implementation → engineering blocks waiting for design, or implementation drift outpaces design intent.

The fix is a two-track pipeline with explicit gates between phases.

---

## The two tracks

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│         TRACK 1                 │   │         TRACK 2                 │
│   Design done, build pending    │   │   Design needed                 │
│                                 │   │                                 │
│  ┌────────────────────────┐    │   │  ┌────────────────────────┐    │
│  │ Design Readiness       │    │   │  │ Ticket workshop        │    │
│  │ Review (audit)         │    │   │  │ with Hugh              │    │
│  └────────────┬───────────┘    │   │  └────────────┬───────────┘    │
│               │                 │   │               │                 │
│        ┌──────┴──────┐         │   │  ┌────────────▼───────────┐    │
│        │             │         │   │  │ Handoff prompt         │    │
│        ▼             ▼         │   │  │ (per template)         │    │
│  ┌──────────┐  ┌──────────┐   │   │  └────────────┬───────────┘    │
│  │ Green /  │  │ Orange / │   │   │               │                 │
│  │ Yellow   │  │ Red      │   │   │  ┌────────────▼───────────┐    │
│  └────┬─────┘  └────┬─────┘   │   │  │ Design produces        │    │
│       │             │         │   │  │ handoff                │    │
│       │       ┌─────▼──────┐ │   │  └────────────┬───────────┘    │
│       │       │ Addendum   │ │   │               │                 │
│       │       │ ticket →   │ │   │  ┌────────────▼───────────┐    │
│       │       │ Track 2 ───┼─┼───┼─→│ Iterative review       │    │
│       │       └────────────┘ │   │  │ with Hugh              │    │
│       │                       │   │  └────────────┬───────────┘    │
│       ▼                       │   │               │                 │
│  ┌──────────────────────┐    │   │  ┌────────────▼───────────┐    │
│  │ Plan PR (workshop    │    │   │  │ Merged handoff →       │    │
│  │ with Hugh)           │    │   │  │ design/design_handoff_X│    │
│  └────────┬─────────────┘    │   │  └────────────┬───────────┘    │
│           │                  │   │               │                 │
│  ┌────────▼─────────────┐    │   │  ┌────────────▼───────────┐    │
│  │ Copilot review loop  │    │   │  │ Design Readiness       │    │
│  │ (min 2 successful,   │    │   │  │ Review (parity gate)   │    │
│  │ no Crit/High/Med)    │    │   │  └────────────┬───────────┘    │
│  └────────┬─────────────┘    │   │               └─→ to Track 1   │
│           │                  │   └─────────────────────────────────┘
│  ┌────────▼─────────────┐    │
│  │ Merge plan PR        │    │
│  │ → implementation     │    │
│  │ (separate PR or /    │    │
│  │ complete-and-ship)   │    │
│  └──────────────────────┘    │
└──────────────────────────────┘
```

Both tracks converge on the same plan-PR-and-Copilot-review step. Track 2 designs go through Readiness Review at the end as a parity gate — even handoffs produced through the new workflow get audited before they exit the design phase.

---

## Cadence rules

- **No WIP limit on design tickets.** Hugh wants Design throughput high so the roadmap stays predictable and eng work doesn't block on design. Instead, track *throughput* (designs merged per week) as a health signal — if backpressure shows up, revisit.
- **Plan PR Copilot review exit criteria:** min 2 successful Copilot reviews (errored reviews don't count); merge bar = no Critical / High / Medium remaining. Apply valid Low / Nits, skip invalid ones, do NOT iterate to zero. See `feedback_copilot_review_multi_round.md`.
- **Plan PRs live in `docs/superpowers/plans/`.** Keep after the feature ships — they make valuable session-start context.
- **Traceability chain:** design ticket → design handoff folder → plan PR → implementation PR(s). All cross-linked in PR bodies and GH issue references.
- **Update the changelog on user-facing PRs** — per `feedback_release_notes_on_major_pr.md`, any PR shipping a meaningful user-facing feature must add an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch.

---

## Design Readiness Review

The gate between design handoff and plan PR. Audits a design folder against seven dimensions and outputs a verdict.

### Audit dimensions

| Dimension | What we check |
|-----------|---------------|
| 🗺️ **Scope clarity** | Boundary defined? Non-goals stated? Open questions logged? |
| 🎭 **State coverage** | Loading / error / empty / auth states? Edge cases? Mobile + desktop parity per `feedback_mobile_desktop_parity.md`? |
| 🔌 **Data contract** | Backend exists to support this? Schema / endpoint gaps? Props / types clear? Per `feedback_api_contract_before_ui.md` — every named state must be reachable. |
| 🧱 **Codebase fit** | Uses `var(--*)` tokens? Leverages existing components? Follows `definitions/copy.ts` / `definitions/constants.ts` conventions? Arrow functions, no single-char vars, etc. |
| ♿ **Cross-cutting** | A11y addressed? Performance implications? Analytics / telemetry expectations? |
| ⏰ **Drift from reality** | Was this designed before major changes (Vercel/Neon migration, schema changes, new admin patterns, beta feedback)? Referenced files / components still accurate? |
| 📝 **Decision log** | Key decisions documented in the handoff README? Locked vs. tentative clearly marked? |

### Verdicts

| Verdict | Meaning | Next step |
|---------|---------|-----------|
| ✅ **Green** | Ready as-is | Move to plan PR |
| 🟡 **Yellow** | Ready with eng-side clarifications | Plan PR addresses gaps in implementation notes |
| 🟠 **Orange** | Small Design round-trip needed | Open `type: design` addendum ticket, light scope |
| 🔴 **Red** | Significant gaps | Open new design ticket, full Track 2 workshop |

### Output: READINESS.md

Lives at `design/design_handoff_X/READINESS.md`. For design folders that span multiple feature additions over time (e.g., a parent design that ships once and later receives field additions or extensions via separate tickets), addendum audits may live alongside the general audit as `READINESS_<issue>.md` — e.g., `design/design_handoff_admin_venues/READINESS_506.md` audits the #506 field-addition extension while a future general `READINESS.md` would audit the parent design itself.

Structure:

```markdown
# Readiness Review — <Feature Name>

**Verdict:** ✅ Green / 🟡 Yellow / 🟠 Orange / 🔴 Red
**Audited:** YYYY-MM-DD
**Related ticket(s):** #N (and any addenda)
**Plan PR target:** <repo-relative path or "TBD">

## Summary

One paragraph: what's ready, what's not, what we're doing about it.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅/🟡/🟠/🔴] <observation>
- ...

### 🎭 State coverage
...

(repeat for all seven dimensions)

## Gaps requiring Design round-trip (Orange/Red only)

- Gap 1: <description, what to ask Design>
- Gap 2: ...

## Eng-side clarifications (Yellow only)

- Item 1: <decision eng will make in plan PR>
- Item 2: ...

## Decisions inherited

Anything locked in the handoff or via prior Hugh conversation that the plan PR must respect.
```

### When to run

- **Track 1** — before opening a plan PR for any handoff that predates the iterative workflow (i.e., merged before 2026-06-23).
- **Track 2** — after merging the new handoff, before opening the plan PR (parity gate).
- **Re-audit** if the handoff changes after an addendum cycle.

### Dispatching

- Small / likely-Green audits → dispatch general-purpose subagents in parallel.
- Large / likely-Red audits (monetization, anything cross-cutting) → dedicated session.
- Per `feedback_surface_long_running_issues.md`, if a subagent stalls 2-3+ minutes, investigate rather than re-dispatching blindly.

---

## Handoff prompt template (Track 2 → Design)

The brief we hand to Design when opening a new design ticket. Optimized for Claude Design specifically — see `feedback_design_handoff_style.md`.

```markdown
## Problem (objective)

<One paragraph stating the user-visible problem, ideally with a real scenario.
No solution language. No "decisions needed" section.>

## App context (reminders for Design)

- Where this lives in the product (e.g., "event detail page, below the price block")
- Related shipped features (e.g., "interacts with Watching, Submit-a-price, EventReport")
- Constraints from the existing system (e.g., "consumer surface uses var(--*) tokens; admin shares the same system; mobile-first")
- What user(s) this affects (free vs. paid, signed-in vs. anonymous, admin)

## Technical requirements

- Data we have today (link to types, schemas)
- Data we don't have (and whether we'd build it for this)
- Auth / role requirements
- Performance / scale considerations (if any)

## What's out of scope

<Explicit non-goals. Critical for keeping Design focused.>

## Deliverables we expect

- Hi-fi mockups for required states (list them)
- Mobile + desktop both required (per `feedback_mobile_desktop_parity.md`)
- Decisions log in the handoff README
- Component handoff with token references
```

**Key principles** (per `feedback_design_handoff_style.md`):

- Don't pre-decide: page sizes, control shapes, mobile patterns, "decisions needed" sections.
- Leave design decisions to Design.
- Be objective in the problem statement — describe the user pain, not the proposed remedy.
- Include app-context reminders because Claude Design doesn't have active codebase access.

---

## Roles & artifacts

| Role | Artifact | Lives at |
|------|----------|----------|
| Hugh + me workshop | Design ticket | GitHub Issues |
| Design produces | Design handoff folder + README | `design/design_handoff_X/` |
| Hugh + me audit | Readiness Review | `design/design_handoff_X/READINESS.md` |
| Hugh + me workshop | Implementation plan | `docs/superpowers/plans/<feature>.md` (plan PR) |
| Copilot reviews | Review threads on plan PR | GitHub PR |
| Eng builds | Implementation PR(s) | GitHub PR — references plan PR |
| Eng adds | Changelog entry | `apps/web/src/lib/definitions/releases.ts` (same branch as impl PR) |

---

## Status snapshot (as of 2026-06-23)

Living state — moves to `project_design_pipeline.md` memory after this initial setup; this section will be removed once the pipeline is steady-state.

**Track 1 (designs done, build pending):**
- 404 page (pilot — Beta wk 2)
- Admin Venue Form API fields (#506)
- Price source + multi-tier (#641 + #644 — eng sign-off 6/17)
- Monetization (Red verdict expected)
- Concert history (Beta wk 4)
- Shareable cards (Beta wk 5)

**Track 2 (need design — open tickets):**
- #642 Calendar month/week jump picker
- #643 Supporting artists separators

**Tickets to open (Beta gap features):**
- Who else is watching
- Spotify sync (Beta wk 7 — heavy brainstorm)
- Venue first-timer guide

---

## Related memory

These are Claude memory notes (not in-repo) living at `~/.claude/projects/.../memory/`. Cross-referenced here for use within Claude sessions:

- `project_design_pipeline.md` — current state + workflow summary
- `feedback_design_readiness_review.md` — when the audit is required
- `feedback_design_handoff_style.md` — handoff prompt principles
- `feedback_design_session_voice.md` — communication style for design-track sessions
- `feedback_release_notes_on_major_pr.md` — changelog rule
- `feedback_mobile_desktop_parity.md` — parity is non-negotiable
- `feedback_api_contract_before_ui.md` — state reachability gate
- `feedback_copilot_review_multi_round.md` — review loop exit criteria
- `user_designer_background.md` — visual quality bar
- `project_monetization_high_rigor.md` — monetization-specific notes

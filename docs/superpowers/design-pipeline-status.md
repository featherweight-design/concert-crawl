# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the two-stage pipeline (brief → handoff → build). Updated as items move between stages.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`
> **Persona + locked decisions:** `memory:feedback_design_track_persona` — this lives outside the repo in Claude's per-project memory store (not repo-browsable); referenced here by filename convention used across other docs.
> **Sister trackers:** `docs/superpowers/progress.md` (phase tracker), `docs/runbooks/` (ops runbooks)

---

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | Ready for implementation (2-stage design track complete, plan PR / build not yet started) |
| 🎨 | Design in flight (brainstorm / brief drafting / handoff iteration / audit) |
| 🚦 | Paused (mid-brainstorm; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog (design cycle not started) |
| ⏳ | Ready for design (labelled `type: design`, not yet workshopped) |
| ✅ | Fully implemented + shipped |

---

## 🟢 Ready for implementation (2-stage design complete)

Design brief has landed AND the visual handoff / brief is signed off. Awaiting an eng plan PR to open. These are the concrete backlog items an eng-track session should pick from.

| # / vertical | Design brief | Handoff | Verdict | Build unblocked? | Notes |
|---|---|---|---|---|---|
| **Monetization vertical** (#780, #781, #782, #783) — tier picker, lifecycle, failure states + a11y + microcopy, email touchpoints | PRs #817, #813, #823, #846 | 4 handoffs (`design_handoff_monetization_*/`) | 4 × 🟢 Green | ⚠️ Gated on **#775 eng infra spec** + **#849 Resend ownership resolution** | Execution plan PR #854 lays out 8 phases / 19 PRs + Founder build-ahead trick |
| **#642** Calendar month/week jump picker | PR #862 | (Direct brief; no handoff cycle needed — awaiting Claude Design when Hugh briefs) | 🟢 brief-locked | ✅ Ready | Small addition to WeekStrip; picker shape locked |
| **#752** Price-source dispute-affordance hiding rule | PR #865 (doc addendum) | Already shipped in PR #788 (Consumer UI) | ✅ Shipped | n/a | Feature was already built; PR #865 documents the rule in the handoff README |

**Track 1 handoffs awaiting Readiness Review** (audit in flight, not yet in 🟢 above):

- `design_handoff_concert_history/` — audit dispatched 2026-07-11 (sub-agent)
- `design_handoff_shareable_cards/` — audit dispatched 2026-07-11 (sub-agent)

---

## 🎨 In flight

Currently active. May be an audit, a brainstorm, or a brief being drafted.

| Task | Stage | Owner | Notes |
|---|---|---|---|
| **`design_handoff_concert_history/` Track 1 audit** | Audit in progress | Sub-agent (autonomous) | Verdict TBD; will land as `READINESS.md` + PR |
| **`design_handoff_shareable_cards/` Track 1 audit** | Audit in progress | Sub-agent (autonomous) | Verdict TBD; will land as `READINESS.md` + PR |
| **#643** Supporting artists title separator | Assessing (fix vs brief) | Sub-agent (autonomous) | Small beta-feedback ticket; sub-agent decides shape then ships |
| **This tracker doc** | Being written 2026-07-11 | Main session | Merges when this PR clears Copilot review |

---

## 🚦 Paused (mid-brainstorm)

| # | Stage | Notes | Resume when |
|---|---|---|---|
| **#763** Spotify sync connect flow | Brainstorm paused mid-stream | Was in-flight before the monetization vertical took priority | Hugh's morning session 2026-07-11 |

---

## 🕰️ Backlog (design cycle not started)

Ordered by beta-phase urgency + adjacency to already-locked verticals.

| # | Phase | Priority | Adjacency / notes |
|---|---|---|---|
| **#762** Who else is watching — social signal on event detail | Beta | Normal | Adjacent to concert-history + attending vocabulary |
| **#764** Venue first-timer guide surface | Beta | Normal | Rich texture — parking, age limits, loading dock vs front door |
| **#506** Admin Venue Form mocks refresh for API provider fields | Beta | Normal | Existing-handoff refresh; smaller cycle |
| **#794** Logged-out app UX — navigation, header, browse-only shape | Launch | Normal | Adjacencies with monetization paywalls — worth pairing with eng infra work |

---

## ⏳ Ready for design (not in this session's scope)

Open `type: design` issues surfaced by triage but not scheduled — usually fresh beta feedback or new sub-projects. Currently empty; new tickets land here first.

---

## ✅ Recently shipped design work (last ~2 weeks)

For context on session-start "what's the state of the project" reads. Full history lives in `docs/superpowers/progress.md`.

| Shipped | # | What |
|---|---|---|
| 2026-07-11 | #752 | Price-source dispute-affordance hiding rule documented in handoff README (PR #865) |
| 2026-07-11 | — | Design-track persona consolidated to a single memory file (memory-only, no PR) |
| 2026-07-11 | #642 | Calendar jump picker brief (PR #862) |
| 2026-06-27 | — | Monetization execution plan (PR #854) — 8 phases / 19 PRs / Founder build-ahead mechanism |
| 2026-06-27 | #783 | Email touchpoints design brief (PR #846) — 10 templates locked |
| 2026-06-27 | #782 | Failure states + a11y + microcopy R2 handoff + Readiness Review (PR #839, R2 audit 🟢 Green) |
| 2026-06-26 | #782 | Failure states + a11y + microcopy design brief (PR #823) |
| 2026-06-26 | #780 | Lifecycle + management R2 handoff + Readiness Review (PR #820) |
| 2026-06-25 | #780 | Lifecycle + management design brief (PR #817) |
| 2026-06-24 | #781 | Tier states + entitlements matrix design brief + R6 handoff (PR #813) |
| 2026-06-24 | — | Design pipeline workflow established (PR #753) |

---

## 📋 Immediate TODOs (this session's continuation into next)

- [ ] **Autonomous batch running now** (2026-07-11): 2 audits (`concert_history`, `shareable_cards`) + #643 fix, dispatched as background sub-agents
- [ ] **This tracker doc** (in progress) — merges via its own PR
- [ ] **#763 Spotify sync brainstorm** — Hugh's morning session 2026-07-11 (resume mid-brainstorm)
- [ ] Once #763 lands: pick next Track 2 ticket per priority order (#762 Who else is watching → #764 Venue first-timer → #506 Admin Venue Form → #794 Logged-out UX)

---

## Maintenance rules

**When to update this file:**

- A design brief / handoff PR merges → move ticket from 🎨 to 🟢 (or ✅ if the vertical closes)
- A build PR ships against a 🟢 item → move that entry to `progress.md` and remove from this file
- A new `type: design` ticket opens → add to ⏳
- A brainstorm starts or pauses → 🎨 or 🚦 as appropriate
- A Readiness Review verdict lands → update the Track 1 sub-list

**When NOT to update:**

- Copilot review round churn (doesn't change stage)
- Small ops adjustments (branch renames, worktree cleanup)
- Anything already covered by `progress.md`'s substantive-only rule

**Concurrent-edit hygiene:** new entries in the "Recently shipped" table go at the **top** of the table (newest-first, so the most recent context is at eye level). In-flight tables are edited in place when state changes. Rebase-friendly on merge.

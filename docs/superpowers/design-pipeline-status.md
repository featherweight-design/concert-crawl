# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the two-stage pipeline (brief → handoff → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`
> **Persona + locked decisions:** `memory:feedback_design_track_persona` — lives outside the repo in Claude's per-project memory store (not repo-browsable); referenced here by filename convention used across other docs.
> **Sister trackers:** `docs/superpowers/progress.md` (phase tracker), `docs/runbooks/` (ops runbooks)

---

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | Ready for implementation (2-stage design track complete AND verdict Green — plan PR / build not yet started) |
| 🟡 | Audit complete, verdict Yellow — needs a light Design addendum pass to flip Green |
| 📐 | Brief locked, awaiting Claude Design handoff production (mocks, components, canvas) |
| 🎨 | Design in flight (brainstorm / brief drafting / handoff iteration / audit) |
| 🚦 | Paused (mid-brainstorm; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog (design cycle not started) |
| ⏳ | Ready for design (labelled `type: design`, not yet workshopped) |
| ✅ | Fully implemented + shipped |

---

## 🟢 Ready for implementation (2-stage design complete, Green)

Design brief has landed AND the visual handoff is signed off Green. Awaiting an eng-planning agent to write the implementation plan.

| # / vertical | Brief | Handoff | Verdict | Notes |
|---|---|---|---|---|
| **#642** Calendar month/week jump picker | PR #862 (2026-07-10) | `design/design_handoff_calendar_jump_picker/` | 🟢 Green (PR #894, 2026-07-11) — one-pass audit, all 4 R-rounds Low/Nit floor | Design nailed the light-brainstorm scope in one pass. Ready for eng-planning agent. |
| **#643** Supporting artists title separator | PR #869 (2026-07-11) | `design/design_handoff_supporting_artists_line/` | 🟢 Green (PR #903, 2026-07-11) — one-pass audit, 3 R-rounds; audit's favorite call: mono uppercase kicker above the headliner (instead of the brief's speculative italic + em-dash below), prevents opener-vs-tour row collision at overflow | Data-layer + UI workstreams. Eng-plan carries logged (aria-hidden conditional on interactive, overflow measurement strategy, fallback posture during backfill). |
| **Concert History (Passport teaser)** | — (pre-existing handoff) | `design/design_handoff_concert_history/` | 🟢 Green (PR #916, 2026-07-12) — flip via addendum after Hugh walked the three Yellow blockers | Locked: (1) `attending_at timestamptz` on `user_events` (TS/API `attendingAt`; derive `going` from `attending_at IS NOT NULL`; `status = 'going'` not written going forward); (2) Supporter tier already resolved via PR #878; (3) Passport card scope moves to `shareable_cards` — History ships teaser link only. Ready for eng-planning agent. |

The monetization vertical (previously here) moved into active build 2026-07-11 — see `docs/superpowers/progress.md` and the execution plan (PR #854). Phases 1 → 3.2 already merged (PRs #873, #878, #879, #880, #885, #886); Phases 3.3 → 7 remaining.

When 🟡 Yellow items flip Green after Design addenda land, they move here.

---

## 🟡 Awaiting Design addendum (audit Yellow, one light pass to flip Green)

Handoff audit is done and the design shape is right; verdict flagged specific gaps for Design to close in a short direct-write addendum. Once addenda merge + a re-review lands Green, these move to 🟢.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|
| **`design/design_handoff_shareable_cards/`** | PR #871 (2026-07-11) | (1) tier gate for share is undefined — handoff pre-dates monetization by 6 weeks; (2) anonymous URL contract undefined — event pages live under `(protected)/(main)`; (3) README references non-existent `POSTER_TAGLINES` constant; **(4) NEW: inherits Passport card scope from concert_history (compact 320×500 + share 1080×1080)** — concert_history's Yellow → Green addendum (PR #916) moved Passport ownership here | ~30-min direct-write addendum + Passport scope confirmation |

Both audits' full findings are in their respective `READINESS.md`.

---

## 📐 Brief locked, awaiting Claude Design handoff production

Design brief has merged; Claude Design needs to produce the hi-fi handoff (mocks, components, canvas). Top of the list = closest to eng handoff (smallest remaining Design + build path).

| Rank | Ticket | Brief PR | Path to eng handoff | Why this rank |
|---|---|---|---|---|
| 1 | **#763** Spotify sync connect flow | PR #893 (2026-07-11) | Design → connect flow + auto-watch opt-in modal + "you follow" highlight + Settings > Connections + Discovery surface + weekly digest email + push alert copy + taste-informed filter + empty/failure states → audit → build | Big Track 2 surface — 7 locked decisions across free/premium tier split. Also asks Design for a **browse card hierarchy audit** (mobile is dense). Sequencing deps flagged in brief: #737 (push alerts) + #783 email family (digest). Hugh handed the handoff prompt to Design 2026-07-11. |

**Maintenance note:** when Design produces the handoff, move to 🎨 (audit in flight) → then 🟡 / 🟢 based on verdict.

---

## 🎨 In flight

Currently active. Handoff iteration or audit is mid-stream.

_Currently empty — the two most recent audits landed 2026-07-11 (both in 🟡 above), and #642 + #643 moved to 📐 above._

---

## 🚦 Paused (mid-brainstorm)

_Currently empty — #763 Spotify brainstorm completed 2026-07-11, brief merged (PR #893), moved to 📐 above._

---

## 🕰️ Backlog (design cycle not started)

Ordered by beta-phase urgency + adjacency to already-locked verticals.

| # | Phase | Priority | Adjacency / notes |
|---|---|---|---|
| **#762** Who else is watching — social signal on event detail | Beta | Normal | Adjacent to concert-history + attending vocabulary |
| **#764** Venue first-timer guide surface | Beta | Normal | Rich texture — parking, age limits, loading dock vs front door |
| **#506** Admin Venue Form mocks refresh for API provider fields | Beta | Normal | Existing-handoff refresh; smaller cycle (Track 1 addendum shape) |
| **#794** Logged-out app UX — navigation, header, browse-only shape | Launch | Normal | Adjacencies with monetization paywalls — worth pairing with eng infra work |

---

## ⏳ Ready for design (not in this session's scope)

Open `type: design` issues surfaced by triage but not scheduled — usually fresh beta feedback or new sub-projects. Currently empty; new tickets land here first.

---

## ✅ Recently shipped design work (last ~2 weeks)

For context on session-start "what's the state of the project" reads. Full history lives in `docs/superpowers/progress.md`. Newest at the top.

**Big context change 2026-07-11:** while the design track was running the autonomous audit batch overnight, Hugh's build agent shipped the entire monetization eng infra spec (**#775 closed, PR #873**) plus **#849 Resend fold-in resolved**, plus execution plan Phases 1 → 3.2 (PRs #873, #878, #879, #880, #885, #886). Monetization is now in **active build**, not "waiting for eng to pick." Progress carried in `docs/superpowers/progress.md`; this tracker no longer lists it.

| Shipped | # | What |
|---|---|---|
| 2026-07-12 | — | Tracker refresh #4 — concert_history flipped 🟡 → 🟢 (this PR) |
| 2026-07-12 | — | `design/design_handoff_concert_history/READINESS.md` addendum merged (PR #916) — 🟢 Green post-addendum verdict; all three Yellow blockers resolved (attending_at schema, Supporter tier via #878, Passport moved to shareable_cards) |
| 2026-07-11 | — | This tracker doc refreshed post-#903 audit (PR TBD — this PR) |
| 2026-07-11 | — | `design/design_handoff_supporting_artists_line/READINESS.md` merged (PR #903) — 🟢 Green verdict, one-pass, ready for eng-planning. Handoff files committed alongside verdict. |
| 2026-07-11 | — | Session pickup memory `project_pickup_2026_07_11_design_track.md` written for continuity |
| 2026-07-11 | — | Tracker refresh #3 (post-#894 audit + #893 Spotify brief, PR #899) |
| 2026-07-11 | — | `design/design_handoff_calendar_jump_picker/READINESS.md` merged (PR #894) — 🟢 Green verdict, one-pass, ready for eng-planning |
| 2026-07-11 | #763 | Spotify sync design brief (PR #893) — full 7-question brainstorm; 7 locked decisions; Free tier + Premium 4-feature suite |
| 2026-07-11 | — | Design-track persona: added Scope section (design vs eng-planning boundary) + handoff-prompts-in-terminal rule (memory-only) |
| 2026-07-11 | — | Plan PRs #890 (#642) + #891 (#643) closed — violated persona scope (design should not write eng plans) |
| 2026-07-11 | — | Design pipeline tracker refreshed with 📐 state + post-#775 (PR #888) |
| 2026-07-11 | #849 | Resend infra ownership resolved (folded into #775) |
| 2026-07-11 | #775 | Monetization eng infra spec + PRs 2.1 → 3.2 shipped (spec PR #873; build PRs #878/#879/#880/#885/#886) — see progress.md |
| 2026-07-11 | — | Design pipeline tracker refreshed post-audit-batch (PR #882) |
| 2026-07-11 | — | Design-track persona `feedback_design_track_persona.md` — added "optimistic tracker maintenance" section (memory-only) |
| 2026-07-11 | — | `design/design_handoff_shareable_cards/READINESS.md` merged (PR #871) — 🟡 Yellow verdict |
| 2026-07-11 | — | `design/design_handoff_concert_history/READINESS.md` merged (PR #870) — 🟡 Yellow verdict |
| 2026-07-11 | #643 | Supporting artists title separator design brief (PR #869) |
| 2026-07-11 | — | Design pipeline status tracker (this file) landed (PR #868) |
| 2026-07-11 | #752 | Price-source dispute-affordance hiding rule documented in handoff README (PR #865) |
| 2026-07-11 | — | Design-track persona consolidated to a single memory file (memory-only, no PR) |
| 2026-07-10 | #642 | Calendar jump picker brief (PR #862) |
| 2026-06-27 | — | Monetization execution plan (PR #854) — 8 phases / 19 PRs / Founder build-ahead mechanism |
| 2026-06-27 | #783 | Email touchpoints design brief (PR #846) — 10 templates locked |
| 2026-06-27 | #782 | Failure states + a11y + microcopy R2 handoff + Readiness Review (PR #839, R2 audit 🟢 Green) |
| 2026-06-26 | #782 | Failure states + a11y + microcopy design brief (PR #823) |
| 2026-06-26 | #780 | Lifecycle + management R2 handoff + Readiness Review (PR #820) |
| 2026-06-25 | #780 | Lifecycle + management design brief (PR #817) |
| 2026-06-24 | #781 | Tier states + entitlements matrix design brief + R6 handoff (PR #813) |
| 2026-06-24 | — | Design pipeline workflow established (PR #753) |

---

## 📋 Immediate TODOs

- [ ] **#642 + #643 + concert_history eng plans** — Three Green audits landed. Eng-planning agent picks up, writes implementation plans against the audited handoffs. concert_history's plan enumerates: (1) `attending_at` migration, (2) `user_events` API surface update, (3) three History surfaces + PassportTeaser (no full Passport), (4) Supporter tier gate on detail view.
- [ ] **#763 Design handoff** — Hugh routed prompt to Design 2026-07-11; awaiting handoff for audit.
- [ ] **shareable_cards Yellow → Green** — direct-write addendum needs to close: tier gate, anonymous URL contract, `POSTER_TAGLINES` reference, **plus newly inherited Passport card scope** (full compact + share dimensions from concert_history).
- [ ] **Backlog priority order** (after #763 handoff work): #762 Who else is watching → #764 Venue first-timer → #506 Admin Venue Form → #794 Logged-out UX

---

## Maintenance rules

**Update optimistically inside the same PR that changes state** — don't wait for a "cleanup" loop-back. Tracker freshness is what makes it useful; a stale tracker is a lie about what's ready to pick.

**When to update:**

- A design brief merges → move ticket from 🎨 (brainstorm) to 📐 (awaiting Design handoff production) + add ✅ Recently shipped entry for the brief PR
- Claude Design produces a handoff → move from 📐 to 🎨 (audit in flight)
- A Readiness Review verdict lands → move handoff to 🟢 (Green), 🟡 (Yellow), or leave in 🎨 (Red / re-pass needed)
- A Yellow verdict flips Green after an addendum → move from 🟡 to 🟢
- A build PR ships against a 🟢 (or 🟡/📐) item → remove from this file and let `progress.md` carry it
- A new `type: design` ticket opens → add to ⏳
- A brainstorm starts, pauses, or resumes → 🎨 ↔ 🚦

**When NOT to update:**

- Copilot review round churn on any of the above (doesn't change stage)
- Small ops adjustments (branch renames, worktree cleanup)
- Anything already covered by `progress.md`'s substantive-only rule

**PR shape for tracker updates:** doc-only, no Copilot review required. Merge on green CI. Copilot rigor is for briefs / handoffs / audits, not for keeping the tracker in sync with reality.

**Concurrent-edit hygiene:** new entries in the "Recently shipped" table go at the **top** of the table (newest-first, so the most recent context is at eye level). In-flight tables are edited in place when state changes. Rebase-friendly on merge.

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
| 🎨 | Design in flight (brainstorm / brief drafting / handoff iteration / audit) |
| 🚦 | Paused (mid-brainstorm; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog (design cycle not started) |
| ⏳ | Ready for design (labelled `type: design`, not yet workshopped) |
| ✅ | Fully implemented + shipped |

---

## 🟢 Ready for implementation (2-stage design complete, Green)

Design brief has landed AND the visual handoff is signed off Green. Awaiting an eng plan PR to open.

| # / vertical | Design brief | Handoff | Verdict | Build unblocked? | Notes |
|---|---|---|---|---|---|
| **Monetization vertical** (#780, #781, #782, #783) — tier picker, lifecycle, failure states + a11y + microcopy, email touchpoints | PRs #817, #813, #823, #846 | 4 handoffs (`design/design_handoff_monetization_*/`) | 4 × 🟢 Green | **No** — gated on **#775 eng infra spec** + **#849 Resend ownership resolution** | Execution plan PR #854 lays out 8 phases / 19 PRs + Founder build-ahead trick |

**Note:** #642 (Calendar jump picker) and #643 (Supporting artists title separator) both have briefs but no handoffs yet — Design hasn't picked them up. Not 2-stage complete, so they live in "🎨 In flight" below.

---

## 🟡 Awaiting Design addendum (audit Yellow, one light pass to flip Green)

Handoff audit is done and the design shape is right; verdict flagged specific gaps for Design to close in a short direct-write addendum. Once addenda merge + a re-review lands Green, these move to 🟢.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|
| **`design/design_handoff_concert_history/`** | PR #870 (2026-07-11) | (1) schema call — `attending_at` column on `user_events` vs new `user_event_attendance` table; (2) Supporter tier depends on monetization migration adding `supporter` to `subscription_tier` enum; (3) Passport card scope boundary — owned by concert_history or shareable_cards handoff? | Hugh call + light Design addendum |
| **`design/design_handoff_shareable_cards/`** | PR #871 (2026-07-11) | (1) tier gate for share is undefined — handoff pre-dates monetization by 6 weeks; (2) anonymous URL contract undefined — event pages live under `(protected)/(main)`; (3) README references non-existent `POSTER_TAGLINES` constant | ~30-min direct-write addendum |

Both audits' full findings are in their respective `READINESS.md`.

---

## 🎨 In flight

Currently active. Brief landed but handoff cycle hasn't started, or handoff iteration is mid-stream.

| Task | Stage | Owner | Notes |
|---|---|---|---|
| **#642** Calendar month/week jump picker | Brief locked; awaiting Claude Design pickup for handoff | Hugh briefs when ready | PR #862 (brief merged 2026-07-10); no handoff cycle started yet |
| **#643** Supporting artists title separator | Brief locked; awaiting Claude Design pickup for handoff | Hugh briefs when ready | PR #869 (brief merged 2026-07-11); needs data-layer work + Design's separator/overflow/tour-name calls |

---

## 🚦 Paused (mid-brainstorm)

| # | Stage | Notes | Resume when |
|---|---|---|---|
| **#763** Spotify sync connect flow | Brainstorm paused mid-stream | Was in-flight before the monetization vertical took priority | Hugh's next design session |

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

| Shipped | # | What |
|---|---|---|
| 2026-07-11 | — | This tracker doc refreshed post-audit-batch (PR TBD — this PR) |
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

- [ ] **#763 Spotify sync brainstorm** — Hugh's next design session (resume mid-brainstorm)
- [ ] **concert_history + shareable_cards Yellow → Green** — light Design addenda to close the flagged blockers, then re-review
- [ ] **Once #763 lands:** pick next Track 2 ticket per priority order (#762 Who else is watching → #764 Venue first-timer → #506 Admin Venue Form → #794 Logged-out UX)

---

## Maintenance rules

**Update optimistically inside the same PR that changes state** — don't wait for a "cleanup" loop-back. Tracker freshness is what makes it useful; a stale tracker is a lie about what's ready to pick.

**When to update:**

- A design brief merges → move ticket from 🎨 to ✅ Recently shipped (and add its next-stage entry to 🎨 or 🟢 as appropriate)
- A Readiness Review verdict lands → move handoff to 🟢 (Green), 🟡 (Yellow), or leave in 🎨 (Red / re-pass needed)
- A Yellow verdict flips Green after an addendum → move from 🟡 to 🟢
- A build PR ships against a 🟢 item → remove from this file and let `progress.md` carry it
- A new `type: design` ticket opens → add to ⏳
- A brainstorm starts, pauses, or resumes → 🎨 ↔ 🚦

**When NOT to update:**

- Copilot review round churn on any of the above (doesn't change stage)
- Small ops adjustments (branch renames, worktree cleanup)
- Anything already covered by `progress.md`'s substantive-only rule

**PR shape for tracker updates:** doc-only, no Copilot review required. Merge on green CI. Copilot rigor is for briefs / handoffs / audits, not for keeping the tracker in sync with reality.

**Concurrent-edit hygiene:** new entries in the "Recently shipped" table go at the **top** of the table (newest-first, so the most recent context is at eye level). In-flight tables are edited in place when state changes. Rebase-friendly on merge.

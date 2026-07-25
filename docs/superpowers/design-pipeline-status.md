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
| **#70** Concert History (Passport teaser) | — (pre-existing handoff) | `design/design_handoff_concert_history/` | 🟢 Green (PR #916, 2026-07-12) — flip via addendum after Hugh walked the three Yellow blockers | Locked: (1) `attending_at timestamptz` on `user_events` (TS/API `attendingAt`; derive `going` from `attending_at IS NOT NULL`; `status = 'going'` not written going forward); (2) Supporter tier already resolved via PR #878; (3) Passport card scope moves to `shareable_cards` — History ships teaser link only. Ready for eng-planning agent. Source ticket is **#70** "Concert history (attended shows)" (Beta · Normal) — earlier rows in this file mis-referenced it as #55, which is the long-closed "Saving shows (Watching)" ticket. Passport teaser links to **#85**. |
| **#72** Shareable cards (IdentityArt) + Passport | — (pre-existing handoff) | `design/design_handoff_shareable_cards/` | 🟢 Green (PR #948, 2026-07-14) — flip post-addendum after Hugh locked tier gate + URL contract; Design added Passport (inherited from concert_history) in the same pass | Locked: (1) tier gate = **Free** (Watching drives share virality); (2) URL contract = public `/e/:eventId` mirror route (paywall on secondary actions only); (3) `POSTER_TAGLINES` bank added with de-blamed voice pass; (4) **Passport card in scope** — compact 320×500 (in-app) + share 1080×1080 (social), inherited from concert_history addendum. Related: **#85** Concert passport. |
| **#764** Venue first-timer guide surface | PR #999 (2026-07-17) | `design/design_handoff_venue_first_timer_guide/` | 🟢 Green (PR #1008, 2026-07-18) — one-pass audit; Hugh's R1 + R2 iteration fully applied by Design before shipping; every locked decision honored, both design principles (voice authenticity + admin-side automation) demonstrated across all surfaces | 4-state consumer surface (populated / thin / returner / anonymous) across mobile + desktop; 3-state admin block (populated / empty / validation) + chip-state legend; all 9 themes supported via `var(--*)` tokens; a11y (aria-expanded/aria-pressed/aria-hidden/44px min tap targets) baked in. Insider tip surfaced first per R2. Sequences with **#70** Concert History for first-timer detection; section ships independent of callout. 4 prototype-polish items deferred to plan PR (chip-key naming, chip-state data model, publish-state derivation, v2 chip hooks). |
| **#762** Who else is watching — event-detail social signal | PR #1097 (2026-07-19) | `design/design_handoff_who_else_is_watching/` | 🟢 Green (PR #1117, 2026-07-19) — one-pass audit; all 9 brief locks honored; both design principles (don't-fake-identity + honest-over-cute) demonstrated across all surfaces; Design's 6 gap-report items all defensible confirmations, no addendum needed | 3 authored code files (`watchers-data.jsx` / `watchers-surface.jsx` / `watchers-context.jsx`) plus shared infra + README + READINESS. Covers 4 populated states (1 named / 2–3 named / named+others / all-others-no-names) + loading skeleton + adjacency spec + roster expansion + anatomy + theme parity across Electric / Jade / Light. `WATCHERS_COPY` externalized for `copy.ts` lift. `NAMED_CAP = 3`. Alerts hint rehomed under inactive Watch button (Q6 improvement). Ships independent of a follow graph. ⚠️ **Ticket #762 is closed in GitHub** — auto-closed 2026-07-19 by the handoff PR #1117 before any eng build landed. The design work is done; the *build* is not. Reopen #762 (or file a build ticket) before eng-planning picks this up. |

The monetization vertical (previously here) moved into active build 2026-07-11 — see `docs/superpowers/progress.md` and the execution plan (PR #854). Phases 1 → 3.2 already merged (PRs #873, #878, #879, #880, #885, #886); Phases 3.3 → 7 remaining.

When 🟡 Yellow items flip Green after Design addenda land, they move here.

---

## 🟡 Awaiting Design addendum (audit Yellow, one light pass to flip Green)

Handoff audit is done and the design shape is right; verdict flagged specific gaps for Design to close in a short direct-write addendum. Once addenda merge + a re-review lands Green, these move to 🟢.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|
| **#737** In-app notification surface — `design/design_handoff_in_app_notifications/` (Beta · Normal) *(target path — folder uncommitted while R2 iterates)* | PR #1173 (2026-07-24) | **Two Green-gate items.** (1) **Row layout against real title lengths** — fixtures used ~21-char titles, production emits ~76 (`packages/push/src/definitions/copy.ts`); needs a clamp/growth decision at 320px, with knock-ons to the day-divider rhythm and page-size-20. (2) **Category set** — R1's `CATEGORY_MAP` was keyed on four invented underscore strings with **zero** overlap against the shipped 8-value Zod union, so every production row fell through to the fallback; needs rekeying, a treatment for `contest.needs_info`, and an explicit collapse-or-split call on the four `watch.*` sub-types. Ride-alongs: gap-report renumbering, broken Files table, a false `CLAUDE.md` claim, 4 copy keys, 2 sub-44px rows, a `--shadow` token. | One light Design pass. Keyboard gaps (Escape / focus management / 5 missing `onKeyDown`) are **eng-owned**, recorded in the brief's §9 — not part of this addendum. |

Full audit findings for each handoff live in that handoff's `READINESS.md`.

---

## 📐 Brief locked, awaiting Claude Design handoff production

Design brief has merged; Claude Design needs to produce the hi-fi handoff (mocks, components, canvas). Top of the list = closest to eng handoff (smallest remaining Design + build path).

| Rank | Ticket | Brief PR | Path to eng handoff | Why this rank |
|---|---|---|---|---|
| 1 | **#1115** Dedicated Artist UI — Spotify embed + upcoming shows + follow (Launch · Normal) | PR #1172 (2026-07-24) | Design produces the artist page in `design/design_handoff_artist_page/` covering 6 states (Spotify-known · no-Spotify fallback · no-upcoming-shows · many-upcoming · loading · follow states) × 3 themes × mobile 320 + desktop. Hardest call: integrating the un-themeable Spotify iframe across all 3 themes. Then Readiness Review → 🟢 → eng-planning. | Only item left in this state — **#737** produced its R1 and moved to 🟡 on 2026-07-24. Zero eng infra blockers: `user_artist_follows` (#763) and discrete supporting-artist names (#643) already shipped, and the embed needs no Web API quota. |

**Maintenance note:** when Design produces the handoff, move to 🎨 (audit in flight) → then 🟡 / 🟢 based on verdict.

---

## 🎨 In flight

Currently active. Handoff iteration or audit is mid-stream.

_Currently empty — the two most recent audits landed 2026-07-11 (both in 🟡 above), and #642 + #643 moved to 📐 above._

---

## 🚦 Paused

Currently paused: brief exists but awaiting an external dependency (Hugh input, third-party engagement, upstream feature ship). Not "mid-brainstorm" — that state uses this section too but is a different substate.

| # / vertical | Brief | Paused-since | Reason |
|---|---|---|---|
| **#1114** Bespoke per-venue imagery | PR #1129 (2026-07-19), amended PR #1142 (2026-07-20) | 2026-07-20 | Claude Design's initial handoff landed 🔴 Red — AI-drawn samples don't hit the visual bar. Brief amended (§10) to skip AI iteration entirely; illustration is now human-commissioned from day one. Awaiting Hugh's illustrator engagement per `docs/runbooks/commissioning-illustrators.md`. Ticket resumes when first illustrator's work is in hand → moves to 🎨 In flight → then Readiness Review. |

---

## 🕰️ Backlog (design cycle not started)

Ordered by beta-phase urgency + adjacency to already-locked verticals. Consolidated clusters (PWA) count as one workstream even when they span multiple issues — expand the notes column to see the component tickets.

| # | Phase | Priority | Adjacency / notes |
|---|---|---|---|
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
| 2026-07-24 | — | Tracker refresh #29 — **#737** flips 📐 Brief locked → 🟡 Awaiting Design addendum (this PR). R1 handoff audited 🟡 Yellow; verdict at `design/design_handoff_in_app_notifications/READINESS.md` (uncommitted — lands with the folder when R2 flips Green). Brief-locked count 2 → 1 (**#1115** promoted to rank 1). Yellow count 0 → 1, so the 🟡 table is restored after being empty since #72 flipped Green on 2026-07-14. |
| 2026-07-24 | **#737** | **Design brief corrected in two places by the R1 audit** (this PR). (1) **Q2 category set** — the lock named four invented underscore keys (`watch_update`, `price_drop`, `contest_resolved`, `spotify_new_show`) that exist nowhere in the codebase. The real closed set is 8 dot-namespaced values enforced by a Zod union at `packages/push/src/notification-categories.ts:16-25`; overlap with the brief's four was **zero**, so R1 built a `CATEGORY_MAP` under which every production row fell through to its neutral fallback. Q2 now enumerates all 8, names `contest.needs_info` (which ships today and had no design), and hands Design an explicit collapse-or-split call on the four `watch.*` sub-types since `cancelled` and `backonsale` carry opposite valences. (2) **§5 `last_seen_at` host** — the brief recommended a `user.last_seen_notifications_at` field, but there is **no `users` table**; identity is Clerk and local tables key off `text('user_id')`. Now points at `user_profiles` / `user_notification_preferences` as the candidate hosts. Also added to §2: admin and consumer rows share one table so the consumer query must filter `type` **and** `userId`; and per-row `title`/`body` come from the writers, not the panel, at ~70–80 chars in production. §9 gained keyboard completion and the contest-copy-revoice question as eng locks. Root cause worth remembering: the brief asserted a data contract without reading the schema, and the audit was the first thing to check it. |
| 2026-07-24 | — | Tracker refresh #28 — **#1115** flips 🕰️ Backlog → 📐 Brief locked; brief document at `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md`. Backlog count 2 → 1 (only **#794** Logged-out UX remains). Brief-locked count 1 → 2 (**#737** rank 1 on Beta phase, **#1115** rank 2). |
| 2026-07-24 | **#1115** | Dedicated Artist UI design brief (this PR) — Track 2 brainstorm through 8 questions locked with Hugh: (Q1) Spotify **artist** embed, not a "This is ARTIST" playlist — the playlist search endpoint is gone and artist embeds need no Web API call at all; (Q2) **confidence-gated auto-match** rather than admin-verified linking — Hugh's review capacity is the binding constraint, so high-confidence matches auto-approve and only ambiguous/low-confidence ones queue for admin; (Q3) plain no-Spotify fallback while a match is unresolved, so the page never blocks on the queue; (Q4) one Follow button = watch-all-shows, writes `source: 'manual'` into `user_artist_follows`, never writes to Spotify; (Q5) light history line off our own data, source-agnostic so a licensed backfill swaps in without a redesign; (Q6) Free tier by precedent (#72, #762); (Q7) no-upcoming-shows is a **designed** state — the majority case and the strongest conversion moment, not a degraded one; (Q8) entry points limited to event detail + search results. Research findings folded into the brief: Spotify's Feb 2026 purge removed `/artists/{id}/top-tracks` and `/artists/{id}/related-artists` and dropped `followers`/`popularity` from the artist object, which invalidates 3 of the ticket's own design prompts. Follow-ups filed: **#1170** (setlist.fm commercial-use license — gates deep history *and* the never-fed `SetlistPreview` component) and **#1171** (artist links on browse cards + discovery shelf — nested tap-target problem). Backlog count 2 → 1. Brief-locked count 1 → 2. |
| 2026-07-24 | — | Tracker refresh #27 — source-ticket ref corrections surfaced by a `design-status` label fetch (this PR). (1) Concert History's ref was **#55**, which is actually the long-closed "Saving shows (Watching)" ticket; the real source ticket is **#70** "Concert history (attended shows)" (Beta · Normal, open). Corrected in the 🟢 row and the #764 sequencing note; the mis-ref traces back to refresh #6 (PR #939), so its phase/priority read as `Pre-beta · Blocker` for eleven days. (2) **#762** is 🟢 Green but the *ticket* was auto-closed by handoff PR #1117 on 2026-07-19 — design done, build not started. Flagged in the row so eng-planning reopens it (or files a build ticket) rather than building against a closed issue. Historical ✅ rows below are left as-written; this row is the correction of record. |
| 2026-07-21 | — | Tracker refresh #26 — **#737** flips 🕰️ Backlog → 📐 Brief locked (this PR); brief document at `docs/superpowers/specs/2026-07-21-737-in-app-notification-surface-design-brief.md`. Backlog count 3 → 2 (**#1115** rank 1, **#794** rank 2). Brief-locked count 0 → 1. Also fixes a stale PR ref in the 🚦 Paused row (`PR #1130` → `PR #1142` for the #1114 amendment). |
| 2026-07-21 | **#737** | In-app notification surface design brief (this PR) — Track 2 brainstorm through 4 strategic questions locked with Hugh: (Q1) placement is Design's call, brief constraint "no new persistent nav slots" (header + bottom-nav already crowded with PWA install slot + offline pill); (Q2) 4 categories at v1 — `watch_update`, `price_drop`, `contest_resolved`, `spotify_new_show` — extensible via category-map **[superseded 2026-07-24 by refresh #29: these four keys were invented and exist nowhere in the codebase; the real set is the 8-value Zod union at `packages/push/src/notification-categories.ts`]**; (Q3) mark-read semantics = panel-open clears pip via `last_seen_at`, per-item read on click; (Q4) existing `lastAdminActionAt` pill on event detail coexists with the bell as different jobs (passive history vs active alert). Follow-up **#1150** filed for preferences UI v2. Backlog count 3 → 2. Brief-locked count 0 → 1. Same PR fixes a stale ref in the 🚦 Paused row (`PR #1130` → `PR #1142` for the #1114 amendment). |
| 2026-07-20 | **#1114** | Path A pivot after 🔴 Red verdict on Claude Design's initial handoff (PR #1142). The AI-drawn samples of both facade bases and overlay marks read as placeholder-grade, not shippable-grade — Hugh's read: *"the illustrations I'm looking for can't be done by AI."* Brief amended in §10 to skip the AI-assisted iteration entirely: v1 is now human-commissioned illustration from photo reference. `docs/runbooks/commissioning-illustrators.md` filed as the reusable playbook (Where to look → Shortlist → Brief → 3-phase commission → Rights → Cold outreach → Anti-patterns → Concert Crawl specifics). System-level design (riso recipe, safe-zone composition, overlay grammar, fallback pattern) from the Red handoff preserved as reference thinking. #1128 (v2 follow-up) superseded by the amendment and to be closed. #1114 moves 📐 → 🚦 Paused. |
| 2026-07-19 | **#1114** | Bespoke per-venue imagery design brief (this PR) — Track 2 brainstorm through 6 questions locked with Hugh: (Q1) hybrid template + per-venue signature for v1, artist collaboration on the table, fully bespoke as v2 (**#1128**); (Q2) facade/exterior signature as recognizability anchor; (Q3) photo base + illustrated overlay technique for v1; (Q4) theme-independent — one image per venue works across all 3 themes; (Q5) one source per venue with safe-zone composition + focal-point coordinate (adds `image_url` + `focal_x`/`focal_y` to venue table); (Q6) system pattern + venue mark for fallback state. Follow-up **#1128** filed for fully-illustrated v2 (blocked on v1 + house artist). |
| 2026-07-19 | — | Tracker refresh #24 — **#1114** flips 🕰️ Backlog → 📐 Brief locked (this PR); brief document at `docs/superpowers/specs/2026-07-19-1114-bespoke-per-venue-imagery-design-brief.md`. Backlog count 4 → 3 (**#737** rank 1, **#1115** rank 2, **#794** rank 3). Brief-locked count 0 → 1. |
| 2026-07-19 | — | Tracker refresh #23 — **#763** Spotify sync and **PWA cluster** (#971 + #969 + #970) drained off 🟢 Green: both eng builds are complete and in test per Hugh (PR #1125). Spotify: full 11-PR epic merged 2026-07-19 — closing PRs include the Following highlighting (PR #1059), taste filter (PR #1066), discovery shelf (PR #1067), web push settings toggle (PR #1068), new-show fan-out (PR #1069) and progress-tracker wrap-up (PR #1071). PWA cluster: install slot (PR #1056), offline pill (PR #1057), push infra (PR #1060), and downstream watch-update fan-out (PR #1102) all shipped. Design track's job on both is done; feature-level status lives in `docs/superpowers/progress.md` from here. Green count 6 → 4. |
| 2026-07-19 | **#762** | Who else is watching handoff — Green one-pass (PR #1117). Design landed `design/design_handoff_who_else_is_watching/` with 3 authored code files (`watchers-data.jsx` / `watchers-surface.jsx` / `watchers-context.jsx`) + shared infra + README + READINESS. All 9 brief locks honored; both design principles (don't-fake-identity + honest-over-cute) demonstrated; 4 populated states + loading + adjacency + roster expansion + anatomy + theme parity across Electric/Jade/Light. `WATCHERS_COPY` externalized. `NAMED_CAP = 3`. Alerts hint rehomed under inactive Watch button (Q6 improvement). Design's 6 gap-report items all defensible confirmations, no addendum needed. Green count 5 → 6. Brief-locked queue back to empty. |
| 2026-07-19 | — | Tracker refresh #22 — **#762** flips 📐 → 🟢 (PR #1117). Backlog additions in the same PR: **#1114** Bespoke per-venue imagery (Launch · Normal, rank 2) + **#1115** Dedicated Artist UI (Launch · Normal, rank 3), both new `type: design` tickets Hugh filed today. Backlog count 2 → 4. Order per Hugh: #737 stays rank 1 (Beta), venue-images ahead of Artist UI per his stated priority. |
| 2026-07-19 | — | Tracker refresh #21 — **#737** In-app notification surface added to 🕰️ Backlog as rank 1 (this PR); relabeled from `type: feature` → `type: design` to route through the pipeline. Push infra (PR #1060) is already writing rows for it to read passively — this is the consumer-side surface Hugh flagged today. Ticket body already carries a rich design prompt (bell placement, panel anatomy, mark-read semantics, categories, empty state, mobile-first, action affordances). Backlog count 1 → 2. |
| 2026-07-19 | **#762** | Who else is watching design brief (this PR) — Track 2 brainstorm through 9 questions locked with Hugh: (Q1) watching-only this cycle, attending as v2 in **#1096**; (Q2) handle-gated visibility, no separate opt-out; (Q3) named handles up to a cap + "and N others" fold-in; (Q4) hide surface entirely at 0 other watchers; (Q5) signed-out deferred to #794; (Q6) new surface replaces button's count text; (Q7) exclude self, surface is "others" only; (Q8) colored initials + handle text using existing `avatarColor` atom; (Q9) Free tier. Follow-up **#1096** filed for attending-signal v2 (blocked on #55 shipping). Backlog count 2 → 1; Brief-locked 0 → 1. |
| 2026-07-19 | — | Tracker refresh #20 — **#762** flips 🕰️ Backlog → 📐 Brief locked (this PR); brief document lives at `docs/superpowers/specs/2026-07-19-762-who-else-is-watching-design-brief.md`. Backlog count 2 → 1 (only **#794** Logged-out UX remains). |
| 2026-07-18 | — | Tracker refresh #19 — **PWA cluster** flips 📐 → 🟢 (this PR); handoff at `design/design_handoff_pwa_cluster/` with 12 files (5 authored code + 1 vendored settings copy + 4 shared infra + README + READINESS), covers 14 state artboards across 3 surfaces × mobile 320 + 390 + desktop + theme parity × 3 themes (Electric/Jade/Light — this project ships 3, not 9). `NotificationsSection` slots into real `SettingsRoute` / `SettingsRouteDesktop`. Brief-locked queue back to empty. Green count 4 → 5. |
| 2026-07-18 | **PWA cluster** | `design/design_handoff_pwa_cluster/READINESS.md` merged (this PR) — 🟢 Green one-pass verdict; every Q1–Q6 lock from brief (PR #1039) honored; voice authenticity + web-first principles demonstrated across every surface; grepped clean of brochure copy / "fraud" / "last chance" / "we miss you"; 4 prototype-polish items deferred to plan PR (AppBar shared-component decision, cached-shortcuts data source, prefs data model, `profile-settings-screens.jsx` review-as-diff). Design's 8 open-brief calls all reasonable, no addendum needed. Depends on PWA Tier B PR2 (SW + app shell) before eng-planning can start. |
| 2026-07-18 | **PWA cluster** | Design brief merged (PR #1039) — Track 2 brainstorm through 6 questions locked with Hugh: (Q1) web-first register + splash of earned escalation for push; (Q2) install prompt = persistent header slot dismissible + iOS "Here's how" sheet; (Q3) offline = header pill + full-page fallback with cached shortcuts; (Q4) push permission = two-step contextual sheet on first watch, no auto re-asks; (Q5) push categories v1 = watch updates + price drops only (contest/admin stay in bell); (Q6) prefs = master + per-category sub-toggles at Settings → Notifications. 3 v2 follow-ups filed: **#1036** device management, **#1037** new-artist push category, **#1038** send-frequency batching. Brief covers all three tickets (#969 + #970 + #971); handoff may split into per-ticket production if surfaces diverge. |
| 2026-07-18 | — | Tracker refresh #18 — **PWA cluster** flips 🕰️ Backlog → 📐 Brief locked (PR #1039); brief document lives at `docs/superpowers/specs/2026-07-18-pwa-cluster-design-brief.md`. Backlog workstream count 3 → 2. |
| 2026-07-18 | — | Tracker refresh #17 — **actually consolidated** the PWA cluster into a single "PWA cluster" row in the 🕰️ Backlog (replacing three separate rows for #971 + #969 + #970). Priority = High (inherited from #971). The consolidation reflects the workflow decision from refresh #16 in the tracker's row structure itself, not just an annotation. Backlog workstream count 5 → 3; ticket count unchanged at 5. #762 still highest-value next design pull. |
| 2026-07-18 | — | Tracker refresh #16 — annotated the 🕰️ Backlog PWA cluster (#971 · #969 · #970) with an explicit "workshop together" note per Hugh's call: the three surfaces share too much DNA (voice, install/permission prompt patterns, on-brand offline treatment) for split brainstorms. Practical shape TBD when the session starts — expected: one brainstorm → one brief PR covering shared decisions → then split into per-ticket handoffs if surfaces diverge (#971 carries more eng infrastructure than #969/#970). Backlog count unchanged at 5; #762 still the highest-value next design pull. |
| 2026-07-18 | — | Tracker refresh #15 — drain shipped items off 🟢 Green: **#642** Calendar month/week jump picker (shipped as PR #987, 2026-07-17, closed) and **#643** Supporting artists title separator (shipped as PRs #994 data + #995 UI, 2026-07-17, closed — the 2-PR execution plan). Both had lived on Green post-verdict for less than a week before eng-planning picked them up. Green count 6 → 4; remaining eng-plan pickups: #55 concert_history, #763 Spotify, #72 shareable_cards, #764 venue guide. |
| 2026-07-18 | — | Tracker refresh #14 — **#764** flips 📐 → 🟢 (this PR); handoff at `design/design_handoff_venue_first_timer_guide/` with 12 files (4 authored code + 6 shared infra + README + READINESS), covers 4-state consumer surface × mobile + desktop + 3-state admin block + chip-state legend + all 9 themes. Hugh's R1 + R2 iteration fully applied by Design (About kept, map dropped, Capacity/Type hoisted above callout, Insider tip surfaced first, returner accent-tinted with preview strip, event chip signal-tinted + right-aligned). Brief-locked queue back to empty. Green count 5 → 6. |
| 2026-07-18 | **#764** | `design/design_handoff_venue_first_timer_guide/READINESS.md` merged (this PR) — 🟢 Green one-pass verdict; every Q1–Q9 lock from brief (PR #999) honored; voice authenticity + admin-side automation principles demonstrated across every surface; grepped clean of brochure copy / "fraud" / "last chance" / "we miss you"; 4 prototype-polish items deferred to plan PR (chip-key naming, chip-state data model, publish-state derivation, v2 chip hooks). Design's own 4 gap-report items reviewed — all reasonable, no addendum needed. |
| 2026-07-17 | **#764** | Venue first-timer guide design brief merged (PR #999) — Track 2 brainstorm through 9 questions locked with Hugh; brief captures surface pattern (persistent section + first-timer callout), content shape (structured chips + free-form vibe line), voice authenticity + automation principles (admin-side only, display 100% voice-passed), per-venue curated chips + accessibility always-on, event-detail chip anchor to venue-page callout, honest empty-state adaptation, returner collapsed-state persistence. 3 follow-ups filed: **#981** community-submitted tips (v2), **#996** draft-generation automation (v2), **#997** chip pool expansion (v2). |
| 2026-07-17 | — | Tracker refresh #13 — **#764** flips 🕰️ Backlog → 📐 Brief locked (PR #999); brief document lives at `docs/superpowers/specs/2026-07-17-764-venue-first-timer-guide-design-brief.md`. Backlog count 6 → 5. |
| 2026-07-17 | — | Tracker refresh #12 — drain shipped items off 🟢 Green: **#506** Admin Venue Form API provider fields (shipped as PR #958, 2026-07-16, closed) and **#783** Monetization emails brand pass (shipped as PR #964, 2026-07-16, closed). Both had lived on Green post-verdict; eng build agent picked them up same-week. Green count 7 → 5; remaining eng-plan pickups: #642, #643, #55, #763, #72. |
| 2026-07-17 | — | Tracker refresh #11 — 🕰️ Backlog gains three PWA-cluster tickets: **#971** Web push notification stack (PWA Tier C, Launch · High — closes consumer-notification gap in #737), **#969** PWA install-prompt UI polish (Launch · Normal), **#970** PWA offline-state UI polish (Launch · Normal). Anchor context lives in pickup memory (`project_pickup_pwa_native.md`) — PWA Tier B plan in PR #968 awaiting Hugh review + Copilot; native/Capacitor deferred. Cluster ordered ahead of #794 since #971 is High priority and the three are related. |
| 2026-07-12 | — | Tracker refresh #10 — #783 monetization emails flipped 📐 → 🟢 (this PR) after one-pass audit; hi-fi templates cover all 10 emails with DNA inheritance from `digest-email.jsx`; 2 prototype-polish nits deferred to build (annual SKU, placeholder sample values). Dunning cadence copy, plain-text URL literal, plain-text placeholder collision, and Founder receipt subject extraction all fixed inline across R2–R4. |
| 2026-07-12 | #783 | `design/design_handoff_monetization_emails/READINESS.md` merged (this PR) — 🟢 Green verdict; per-template guardrail checks pass across all 10 templates; hi-fi pass also fixes prod dunning-3 subject voice-lock violation ("Last chance" prohibited by #782) |
| 2026-07-15 | — | Tracker refresh #9 — #783 email touchpoints moved into 📐 Brief locked; brief has been merged since PR #846 (2026-06-27) but Design handoff was never produced (emails shipped as basic Resend placeholders). Tracker-invisible until Hugh flagged the current state (this PR) |
| 2026-07-15 | — | Tracker refresh #8 — #506 flipped 🟡 → 🟢 as-is per audit recommendation (Path A, no Design round); tracker corrected — was in 🕰️ Backlog by mistake (PR #953) |
| 2026-07-15 | #506 | `design/design_handoff_admin_venues/READINESS_506.md` addendum — 🟢 Green as-is per original audit's "eng can proceed without Design round-trip" recommendation. Plan PR gets 8 locked defaults; Design polish (4 gaps) deferred as follow-ups. Blocks eng #505 |
| 2026-07-14 | — | Tracker refresh #7 — shareable_cards #72 flipped 🟡 → 🟢 (PR #948); Passport card added in-scope via inherited concert_history addendum |
| 2026-07-14 | #72 | `design/design_handoff_shareable_cards/READINESS.md` addendum merged — 🟢 Green post-addendum; tier gate = Free, URL contract = public `/e/:eventId` mirror; `POSTER_TAGLINES` bank added + Sour Patch voice pass (de-blamed the soldout line); Passport card added (compact 320×500 + share 1080×1080), inherited from concert_history |
| 2026-07-13 | — | Tracker refresh #6 — added source ticket refs to pre-existing handoffs (#55 concert_history, #72 shareable_cards, #85 concert passport related); enables `design-status` skill to fetch phase/priority labels directly (PR #939) |
| 2026-07-13 | — | Tracker refresh #5 — Spotify sync #763 flipped 🎨 → 🟢 (PR #925) |
| 2026-07-13 | #763 | `design/design_handoff_spotify_sync/READINESS.md` merged (PR #925) — 🟢 Green post-addendum; R1 + R2 + addendum committed in one PR; gating locked at `premium || founder`; 11 prototype-polish items deferred to build |
| 2026-07-12 | — | Tracker refresh #4 — concert_history flipped 🟡 → 🟢 (PR #918) |
| 2026-07-12 | — | `design/design_handoff_concert_history/READINESS.md` addendum merged (PR #916) — 🟢 Green post-addendum verdict; all three Yellow blockers resolved (attending_at schema, Supporter tier via #878, Passport moved to shareable_cards) |
| 2026-07-11 | — | Tracker refresh post-#903 audit (PR #904) |
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

- [ ] **4 eng plans ready for eng-planning agent:** **#70** concert_history · #72 shareable_cards + Passport · **#764** Venue first-timer guide · **#762** Who else is watching. **#763 Spotify** and **PWA cluster** drained 2026-07-19 (refresh #23) — both eng builds complete + in test, feature-level status in `docs/superpowers/progress.md`.
- [ ] **#737** Design R2 addendum — R1 produced and audited 🟡 Yellow 2026-07-24; verdict at `design/design_handoff_in_app_notifications/READINESS.md` (uncommitted, see below). Two Green-gate items: row layout against real (~76-char) title lengths, and rekeying the category set to the shipped 8 values plus a `contest.needs_info` treatment. R2 prompt delivered in chat (not committed). The handoff folder stays **uncommitted** until R2 flips it Green, then folder + READINESS.md land in one PR.
- [ ] **#1114** paused, awaiting Hugh's illustrator engagement (offline). Claude Design's initial handoff landed 🔴 Red on 2026-07-20; brief amended to skip AI iteration entirely (see §10 of the brief). Playbook for finding + commissioning an illustrator: `docs/runbooks/commissioning-illustrators.md`. When the first illustrator's work is in hand, ticket resumes → moves to 🎨 In flight → Readiness Review → 🟢 → eng-plan wires it in per Q5/Q6 (venue-table fields + fallback rendering unchanged from the amended brief).
- [ ] **#1115** design handoff production — Claude Design produces the artist page at `design/design_handoff_artist_page/`; source brief at `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md`. Handoff prompt delivered in chat (not committed). Hardest single call in the brief: how the un-themeable Spotify iframe sits inside all 3 themes without reading as a bug.
- [ ] **Backlog workstream order:** only **#794** Logged-out UX (Launch · Normal) remains. Its paywalls adjacency suggests pairing with monetization eng infra work.
- [ ] **Spotify Development Mode now requires Premium and caps test users** (effective 2026-03-09 for existing client IDs) — worth a comment on **#1070**, since extended quota is now load-bearing for the whole Spotify vertical, not just sync scale.

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

**Source ticket references:** every row's **leading column** (whether it's labelled `# / vertical`, `# / handoff`, or `#` depending on the section) should lead with the source GitHub issue number — e.g., `**#72** Shareable show cards ...` — even for pre-existing handoffs. This lets the `design-status` skill fetch phase/priority labels without an extra title-search step. When a handoff has no direct source ticket, note "— (no source ticket)" in the leading column and inline the phase/priority manually in the row's **trailing narrative column** (labelled `Notes` in the 🟢 Ready table, `Blockers to close` in the 🟡 Yellow table, and `Adjacency / notes` in the 🕰️ Backlog table).

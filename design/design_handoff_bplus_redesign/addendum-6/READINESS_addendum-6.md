# Readiness Review — B+ and admin, addendum 6 (design batch 2, items 15–43)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14
**Related:** PR #590 (`design/design_handoff_bplus_redesign/addendum-6/`), prompt `~/Downloads/fwd-handoff/plans/design-prompt-batch-2-2026-11-14.md`
**Plan PR target:** TBD
**Method:** cold read of PR head (`pr590-ro`) against `origin/main` schema (`packages/db/src/schema`) and API routes. No code checked out; main checkout untouched.

## Summary

All 24 prompt items are answered: 16 with boards, 8 by ruling (24, 25, 29, 30, 31, 33, 34, 35; 33 also has a board). Both of Hugh's rulings (18, 22) are drawn as ruled. No Design round-trip is needed: every gap below is an eng-side clarification or backend work that the drawn pattern already settles. Two decisions are handed back to Hugh by the addendum (32, 40c). Two more behaviour questions surfaced by this audit are worth a Hugh ruling before the plan PR (16 draft/published split, 43 Undo vs fan-out). One item (16) needs an expand-only migration. The PR touches only `design/` (77 files: README, manifest, 37 HTML boards, 37 JPGs); no code, no imports from `design/`, no legal content.

## Item mapping

| # | Answered? | Hands back to Hugh | Data / migration |
|---|---|---|---|
| 15 | ✅ `15/sheet-short-phone` (rule for all B+ sheets, desktop dialogs too) | — | None (CSS/layout) |
| 16 | ✅ `16/guide-tab-d`, `guide-panel-d`, `guide-m` | Audit flag: changes product behaviour (see below) | **Migration.** `venue_guide_chips` holds one body per chip and `venues.insider_tip` one tip; `PUT /v1/admin/venues/:id/guide` writes them live, so once `guide_published_at` is set every Save draft is public. "Fans still see the published guide" and the per-section Draft / Edited / Published pill need a separate draft (or published-snapshot) column/table plus publish-copies logic. Expand-only. |
| 18 | ⚠️ `18/*` drawn per Hugh's ruling. Missing: what Reader shows for `platform = 'aeg' / 'livenation'` venues, and for `extraction_strategy = 'manual'`; whether Back to Automatic clears an aeg/livenation platform | — | None (`crawl_mode` null = Automatic, `extraction_strategy` structured_data/llm, `platform = 'detail-page'` all exist) |
| 19 | ✅ `19/event-edit-hidden-header` (phone in text + board) | — | None (`hidden_from_consumer` + `is_concert_review_needed` give BY ADMIN / UNSURE) |
| 20 | ✅ `20/tier-price-check` | — | None (`price_submissions.tier` + `disputed_submission_id`). Clarify: checks on crawled tiers vs submitted tiers |
| 21 | ✅ ruling + `21/hidden-tag-contrast` (10px mono `--fg-muted` #9AA8C7, matches globals.css) | — | None |
| 22 | ✅ `22/hidden-venue-menu`, per Hugh's ruling | — | None (`crawl_paused_at` is independent of `active`) |
| 23 | ✅ `23/checks-resolved-m`, `checks-resolved-detail-m` | — | No migration. **API extension:** `ResolvedCheck` (checks-api.ts) has one `price`, `decidedBy` handle, no Told / Note / ticket URL / both prices / PersonAvatar colours. Resolve reason is stored (min 10 chars); "Told" source needs confirming |
| 24 | ✅ ruling, no board | — | None |
| 25 | ✅ ruling, no board | — | None |
| 29 | ✅ ruling, no board | — | None |
| 30 | ✅ ruling, no board | — | None |
| 31 | ✅ ruling, no board | — | None |
| 32 | ✅ `32/poster-preview-m`, `poster-enlarged-m` | **Yes:** ship the enlarged poster (rec.) or drop "tap to enlarge" | None |
| 33 | ⚠️ `33/emails-states`. "N failed" claims Resend refusals **or bounces**; `email_send_log.status` is sent/failed/suppressed and no bounce webhook exists, so bounces aren't counted | — | None for as-built; bounce counting would need a Resend webhook (text column, no migration) |
| 34 | ✅ ruling, no board | — | None |
| 35 | ✅ ruling, no board | — | None |
| 36 | ✅ `36/past-d`, `past-status-menu-d`, `past-m`, `past-show-m`, `postponed-passed-d`. Phone variant of postponed-passed not drawn (follows `past-show-m`) | — | None (`events-browse` has `when: past`; Played derived; `delisted_at` = No longer listed; "N went" from `user_events.attending_at`). Status filter needs a derived Played mapping in the API |
| 37 | ✅ `37/*` (desktop + phone) | — | No migration. `audit-log.ts` already takes `since/until/actorHandle/area/cursor`; new aggregates needed: days-with-changes for the month dots, per-admin today's count |
| 38 | ✅ `38/trust-tones` (`--trust-community/boxoffice/resale`, per-theme overrides) | — | None (CSS tokens; themes in `apps/web/src/theme/themes.ts`, admin.css) |
| 40 | ⚠️ `40/where-its-sold`: (a) and (b) drawn; (c) not decided | **Yes:** 40c keep resale in both price card and Where it's sold (rec.) or hide it from Where it's sold | None |
| 41 | ✅ `41/crew-coming-up` (six states) | — | None ("I'm in" = existing Yes, going → `attending_at`) |
| 42 | ✅ `42/code-ended-way-back` (desktop in text) | — | None (`/auth/code`, `CodeEnded.tsx` exist) |
| 43 | ⚠️ `43/*` all states drawn. **Undo has no backing:** PATCH `/submissions/:id` accepts only corroborated/disputed/stale (no return to pending), approval runs cred + pricedrop fan-out, and the Needs-you kit deliberately makes notifying answers non-undoable (`before: null`). The toast says "The fan who sent it is told" and offers Undo | Audit flag (see below) | No migration (`pending` is in the enum). Needs an undo/revert endpoint and a decision on fan-out timing |

**Counts:** ✅ 20 · ⚠️ 4 (18, 33, 40, 43) · ❌ 0.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Every item numbered to the prompt; 17, 26–28, 39 explicitly out of batch. Boards declared to win over earlier ones; earlier rulings stand.
- ✅ Build-vs-design check (320/390/1280; item 15 at 320×568) stated.

### 🎭 State coverage
- ✅ 43 draws menu, in-flight, success, failure, phone. 41 draws six states. 37 draws empty result via existing pattern.
- 🟡 Phone parity drawn or described for every surface except 36 postponed-passed (desktop only) and 42 desktop (described, follows centred column). Both settle from the nearest drawn pattern.
- 🟡 18 omits aeg/livenation platform venues and `manual` extraction strategy in the Reader.

### 🔌 Data contract
- 🟡 16 needs a draft/published split (migration). 23 and 37 need API extensions. 43 Undo needs a new revert path. 33 "bounced" is not recorded.
- ✅ 18, 19, 20, 22, 36, 40, 41, 42 map to existing columns and endpoints.

### 🧱 Codebase fit
- ✅ Uses `StatusChip`, `PersonAvatar`, `StatusBadge`, existing tokens (`--fg-muted`, `--surface-2/3`, `--signal/warning/danger`). 38 adds three tokens with defaults so five themes don't change.
- ✅ Boards load only Google Fonts; no imports from or into code.

### ♿ Cross-cutting
- ✅ 21 and 38 fix contrast with printed ratios (AA small text). 15 keeps the main action reachable on short phones.
- 🟡 37 day-picker popover and 32 full-screen viewer need focus trap / Escape (per the admin-dialog memory, the trap must exclude `[disabled]`); not stated.

### ⏰ Drift from reality
- ✅ Named code exists on origin/main: `SubmittedTab.tsx`, `source-rules.ts` / `SourceAdvanced.tsx`, `PriceChecksTab.tsx`, `audit-log.ts`, `/auth/code/CodeEnded.tsx`, crews route, themes.
- 🟡 16 assumes a draft model the code doesn't have (drafts are live after first publish).

### 📝 Decision log
- ✅ Hugh's rulings 18 and 22 recorded and drawn. Two Hugh decisions stated with a recommendation. "All new wording is draft, goes through copy-review" stated.

## Eng-side clarifications (Yellow)

1. **18:** Reader for aeg/livenation venues: show the platform as a read-only forced chip; Back to Automatic leaves aeg/livenation alone unless Hugh says otherwise. `manual` reads as a forced chip.
2. **20:** apply the tier-row check look to submitted tiers only, as the disputed card does today.
3. **23:** extend `ResolvedCheck` with both prices, ticket URL, note, told, decider colours.
4. **33:** keep as built (failed = Resend refusal); drop "or bounced" from the copy or add a bounce webhook later.
5. **36:** postponed-passed on phone follows `past-show-m` with the amber banner on top.
6. **37:** add month-dots and per-admin-count aggregates to the audit-log route.
7. **32/37:** dialogs/popovers get Escape and the focus trap.

## Raised for Hugh (audit, not in the addendum)

- **16:** Building "Fans still see the published guide" changes live behaviour (today, edits to a published guide go live on save) and needs a migration. Confirm the draft/published split is wanted.
- **43:** Undo after approve can't recall price-drop pushes or the fan's notice. Options: hold fan-out until the undo window closes, or drop Undo (then the "no confirm because undoable" rationale goes too).

## Decisions handed back by the addendum

- **32:** ship the enlarged poster (recommended) or drop "tap to enlarge".
- **40c:** keep resale in both places (recommended) or hide it from Where it's sold.

## Flags requested

- **Locked vocabulary:** no contradictions. "Following" appears beside an artist (TOKiMONSTA) only; "GOING" in crew rows and "N went" / "marked I went" on admin past shows are not names for the Concerts tab. "Price check" used throughout; "disputed card" appears only in design notes. Copy-review should still glance at "GOING" and "went".
- **Imports from `design/`:** none (boards reference only fonts.googleapis.com; no code in the PR).
- **Legal content:** none.
- **Files outside `design/`:** none.

## Decisions inherited

Hugh 18 (keep Reader + Back to Automatic in the Source panel); Hugh 22 (Pause/Resume stays on a hidden venue's menu); addendum 2 §29; addendum 3 rulings 18, 26, 3a #13; addendum 5 #1, #4, `04/past-show-d`; README rule 12 (PersonAvatar everywhere); one `StatusChip` per status.

## Rulings

The orchestrator's decisions under Hugh's delegation, 2026-11-14. Hugh can override any of them.

- **32:** ship the full-screen enlarged poster (`32/poster-enlarged-m`).
- **40c:** keep the resale price in both places, the price card and Where it's sold.
- **16:** no draft/published split. Hugh ruled on 2026-11-14 that Publish is fine as it is, so this is signposting only, with no migration. The Guide tab keeps writing live, and the item drops out of the migration list above.
- **43:** Approve without Undo. Price-drop pushes and the fan notice cannot be recalled, so the toast offers no Undo and the "no confirm because undoable" rationale goes with it.
- **33:** "N failed" counts failed sends (`email_send_log.status = failed`), not bounces. No bounce webhook is built; drop "or bounced" from the copy.
- **18:** AEG, Live Nation and manual Reader rows are shown read-only, reusing the drawn Reader row (🔸 resolved from the nearest drawn pattern). Back to Automatic clears a forced platform.

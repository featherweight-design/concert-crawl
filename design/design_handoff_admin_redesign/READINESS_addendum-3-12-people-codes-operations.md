# Readiness Review — Admin Redesign, Addendum 3 §12 (People, codes, operations)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14
**Related ticket(s):** addendum-3 (`addendum-3/README.md`, rows 5a#15/17/19–23, 4d#10/12, 5b#1/12/14, 5d#10/11/18/19, top 15); questions in `QUESTIONS-2026-11-12.md` (person-menu rows)
**Plan PR target:** the 5a/5b/5d sections of `docs/superpowers/plans/2026-11-11-admin-redesign.md`

**Scope:** only `addendum-3/boards/12-people-codes-operations/` (9 boards and screens) and the README rows that point at them. The rest of addendum 3 is not audited here.

## Summary

Section 12 answers the 5a/5b/5d minor questions with nine boards: the desktop person ⋯ menu, the Sign out everywhere confirm and done toast, Code taken, the fan's "This code has ended", Reopen on a Done feedback item, and three Reply states. Two of these are already shipped and match their boards: Sign out everywhere (`POST /v1/admin/people/:userId/sign-out-everywhere`, with confirm, toast and failure copy in `components/admin/definitions/copy.ts`) and Code taken (`code_taken` with a suggested free code). The menu's new item, **See their Submitted prices**, can be built now. The API already filters by exact `handle=`, the person detail already returns `stats.submittedPrices`, and `SubmittedTab` already draws the "@handle · N" chip. The only missing piece is web-side: a deep-link parameter that opens the tab with the chip already set. The other menu lines are held on Hugh (Message them, Copy their profile link) or dropped (Block). The fan "code has ended" screen needs `validate-code` to stop answering a revoked code with `notfound`. Reopen and Reply ride with the 5d Operations rebuild, which hasn't started. Reply stays held on Hugh's top-15 ruling and has no storage or endpoint. Nothing here needs Design: every gap is an eng decision or a ruling Hugh already owns.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The folder table (README line 35) names exactly what §12 settles. Every board traces back to a numbered row: 5a#17/21/22, 5b#1/14, 5d#11/18.
- [✅] The non-goals are explicit. Block is dropped (5a#23, a Hugh ruling). Flagged is dropped (5d#12). Message them (5a#19) and the profile link (5a#15/20) are Hugh calls and aren't drawn on desktop.
- [🟡] The manifest note on `person-menu-d` says "The phone menu's lines", but the desktop board draws only two of the phone board's five (`boards/07-people-flags-operations/person-menu.html`). They differ by exactly the held or dropped lines, so this reads as "the lines that survive", not a contradiction. See clarification 3.

### 🎭 State coverage

- [✅] Sign out everywhere: the ask and the done states are drawn. The failure state isn't drawn, but it's already built under rule 10 (`signOut.failed`).
- [✅] Reply: sending, couldn't send (text kept, Try again) and sent are all drawn. Row 5d#18 covers a reporter who has left, or has no email: Reply is hidden.
- [🟡] See their Submitted prices: zero prices, and a person with no handle, aren't drawn. The filter works on the handle, and the ruling for a fan with no handle is "A fan" with no link (4d#10). Clarification 2.
- [🟡] The fan's "code has ended" screen is drawn only for the phone (`code-ended-fan-m`). Desktop follows the existing centered `/auth/code` column. Clarification 5.
- [🟡] There are no phone boards for Reopen or the Reply compose. Decision 1 (sheets) and 5d#17 (Mark done, Reply and GitHub pinned) cover them.
- [✅] Loading for People, codes and Posters is marked "Fine" or reuses 5b (5a#28, 5b#16/17).

### 🔌 Data contract

- [✅] The menu hint "4 prices" comes from `stats.submittedPrices` (`apps/api/src/routes/admin/lib/people-detail.ts:309`), which counts every `price_submissions` row for the userId. The Submitted tab's "all" state left-joins and filters on the whole handle (`apps/api/src/routes/admin/prices.ts`, `handleQuerySchema`/`handleClauseOf`). The menu count and the chip's `counts.all` therefore agree.
- [🟡] **There's no deep link into the fan filter.** `SubmittedTab` keeps `fan` in local state (`SubmittedTab.tsx:181`), and `app/(protected)/admin/prices/page.tsx` reads only `?tab=`. The fix is web-only: read `handle` beside `tab`, pass it to `PricesClient` and then `SubmittedTab` as the starting fan, and drop it from the URL when the chip is cleared. The API needs no change. Clarification 1.
- [🟡] **"This code has ended" can't be reached for a revoked code.** `apps/api/src/routes/auth/validate-code.ts:64-76` answers revoked with `notfound` (404), expired with `expired` (410) and full with `used` (409). Admin copy already promises that a revoked code's link "Shows 'This code has ended'" (`copy.ts:3178`, `:3262`). Clarification 4.
- [🟡] **Reopen's done line** ("by @hugh, Nov 3 · replied") needs who resolved the item and when. `feedback` has no `resolved_by` or `resolved_at` column (`packages/db/src/schema/social.ts:130`), and 5d#10 makes the column an Eng call. Reopen itself is the existing `PATCH /v1/admin/feedback/:id` with `status` set back to `unread`. Clarification 6.
- [🟡 held on Hugh, not a Design gap] **Reply has no API and no storage.** `feedback.ts` has no reply route, there's nowhere to store the reply text or its sent time, and delivery (an in-app notice plus email) is Phase 6. The README holds it on Hugh (top 15, 5d#3/#19) and draws the disabled fallback (`10/venue-blocked-before-3c`). This doesn't make the handoff Orange: the boards are complete, and the gap is the product ruling.
- [✅] Code taken: `codeTakenResponse` with `suggestFreeCode` is shipped (`apps/api/src/routes/admin/invite-codes.ts:67-97`). The length and character rules are Eng (5b#1), and the field hint already states them.

### 🧱 Codebase fit

- [✅] The menu reuses `RowMenu` with `MENU_ICONS` (`components/admin/invite-codes/code-menu-icons.ts`). The board's tag glyph for See their Submitted prices is the existing `MENU_ICONS.edit` (`Tag`). The board's hex values are the approved admin kit, which the code maps to `var(--…)` tokens.
- [✅] The fan chip, its count and its clear button are already in `SubmittedTab` (4d#12), as is the precedent of hiding "other prices" when `row.handle === null` (`SubmittedTab.tsx:302`).
- [🟡] `PersonClient.tsx:191` hides the whole ⋯ on your own page, with the comment that its other item "waits on 4d (HOLD)". 4d has shipped, so the comment is stale and self needs a call. Clarification 2.
- [✅] Copy lives in `components/admin/definitions/copy.ts` (`person.menu`, `person.signOut`, `codesPage…codeTaken`). The new strings go in the same blocks.

### ♿ Cross-cutting

- [✅] The menu trigger already has an accessible name (`COPY.menu.label(name)`, "More for {name}"). The new item is a link-style row in the same keyboard-navigable `RowMenu`.
- [✅] Sign out everywhere writes an audit row through the existing route. Reopen's PATCH sets `auditAction: 'feedback.update'`. A Reply send must audit too (principle: every admin action is audited).
- [✅] There's no performance concern. The deep link adds one query parameter to an endpoint that already supports it.
- [✅] No telemetry is expected beyond the audit log.

### ⏰ Drift from reality

- [✅] The routes and files named still exist: `/admin/people/:id`, `/admin/prices?tab=submitted`, `/admin/invite-codes`, `/auth/code`, and Operations › Feedback.
- [🟡] The 5d Operations page (Feedback with To read and Done, plus Emails and Activity log) isn't rebuilt yet. `components/admin/feedback/` is still the old `FeedbackRow` and `FeedbackExpanded`. So Reopen and the Reply states build with the 5d PR, not alone.
- [🟡] The fan screen says "Concert Crawl is still open to everyone". The live `/auth/code` page still has "Don't have a code? Join the waitlist". Whether that's true at the time it ships is a fact for copy-review, and for Hugh if copy-review can't settle it. Copy item.

### 📝 Decision log

- [✅] README "Decided with Hugh (2026-11-12)", the per-row rulings, and the open Hugh items are each marked (top 15 is still open). Block (dropped), Flagged (dropped) and Reply hidden after sending are locked.
- [✅] All new wording is marked draft and sent to copy-review (README line 12).

## Eng-side clarifications (Yellow)

1. **Deep link for the fan filter.** The menu item links to `/admin/prices?tab=submitted&handle=<handle>`. `page.tsx` reads `handle` with the same tolerant parse as `tab` (a leading "@" is ignored, matching the API). `PricesClient` passes it to `SubmittedTab` as the starting `fan`, so the chip renders on first paint with "@handle · N". Clearing the chip, or typing a search (which already replaces the fan), calls `router.replace` without `handle`. The legacy `/admin/prices/submissions` redirect keeps any `handle` it was given. Follows: the drawn 4d#12 chip.
2. **When the item shows.** Show See their Submitted prices only when the person has a handle and `stats.submittedPrices > 0`, and hide it otherwise. This is the same rule `SubmittedTab` uses for its own "other prices" line, plus 4d#10 ("A fan", no link). Keep your own page without a ⋯ for now: the Prices tab and Recent already reach your prices, and "See their…" reads wrong on yourself. Update the stale HOLD comment at `PersonClient.tsx:189`. The hint is "{N} prices", or "1 price" for one, through copy-review.
3. **Menu order and phone parity.** Use one order on both breakpoints, the desktop addendum's: Sign them out everywhere…, then See their Submitted prices (the addendum wins over a board it contradicts). The phone menu shows the same two lines. Message them and Copy their profile link stay out until Hugh rules. Block never ships.
4. **Revoked codes reach "This code has ended".** Have `validate-code` answer revoked, expired and full with one `ended` result, or keep the three codes and map all three to the ended screen on the web. Keep `notfound` for a code that never existed. Revoked codes are real codes that were once handed out, so naming them leaks nothing a guesser could use. The miss counter must not count them (the existing test "never counts a real code that is full or expired as a miss" grows a revoked case).
5. **Desktop "code has ended".** Use the existing centered `/auth/code` column with the phone board's content and order: title, body, See what's on in Denver, Sign in.
6. **Reopen's done line.** Either add expand-only `resolved_by` and `resolved_at` columns to `feedback`, or derive both from the newest `feedback.update` audit row that set `resolved`. If neither ships with 5d, drop the "by @handle, date" clause and keep "Done". Reopen PATCHes `status` back to `unread`, so the item returns to To read, and audits it. "· replied" shows only once Reply exists.
7. **Reply is held.** Build the three Reply boards only after Hugh's top-15 ruling. Until then, Send reply uses the disabled-with-a-line pattern (`10/venue-blocked-before-3c`). When it ships, it needs reply storage (text, sender, sent time), a send endpoint that audits, and a delivery path. Mark done is optional (the "Also mark this done" checkbox).

## Person ⋯ menu: what can be built and what's held

| Line (phone board order) | Status |
|---|---|
| Message them | **Held:** Hugh (5a#19). No API and no compose form. Not on the desktop board. |
| Copy their profile link `/u/…` | **Held:** Hugh (5a#15/20). No `/u/` route. Not on the desktop board. |
| See their Submitted prices · N prices | **Can be built now:** web-only deep link (clarifications 1 to 3). |
| Sign them out everywhere… | **Shipped:** matches `sign-out-everywhere-d` and `signed-out-everywhere-d`. |
| Block… | **Dropped:** Hugh ruling (5a#23). Never build it. |

## Decisions inherited

- Block is dropped. Flagged on feedback is dropped. Not useful shows only on items with a venue (not §12, but it shares the menu pattern).
- A person with no handle shows as "A fan" in subtle, with no link (4d#10).
- Reply is a single reply, not a conversation. It's hidden after it's sent, and hidden when the reporter has left or has no email (5d#18).
- Posters: a code with more than one seat. Status order: Revoked > Expired > Full > Active (5b#3/#5).
- Undo lasts 6 s and writes a second audit row (5a#26).
- All §12 wording is draft until copy-review. Copy is the copy writer's call, never a Design round-trip.

## Copy for copy-review

- New: "See their Submitted prices", the hint "{N} prices" / "1 price".
- New fan screen: "This code has ended", the body "It was for a limited group, and it isn't taking new people now. Concert Crawl is still open to everyone." (check this is true against the waitlist footer), "See what's on in Denver", "Sign in".
- New (5d): the Reopen footnote "Reopen moves it back to To read. It was a single reply, so Reply stays off."; the done line "by @{handle}, {date} · replied"; "Replied just now"; "YOUR REPLY · SENT {date}"; "In the app and by email."; the Reply compose strings ("Reply to @{handle}", "About “{title}”", "Also mark this done", the delivery note, "Send reply", "Sending…"); "Couldn't send the reply / Your text is still here. Nothing was sent. / Try again"; the toast "Reply sent to @{handle} / Marked done."
- Already shipped and matching the boards: the Sign out everywhere confirm and toast, and "{CODE} is already a code. Try {SUGGESTION}."

# Copy audit 07 — Concert History (#70)

Mode: **propose**. Nothing was edited. Findings only.

This slice was missed by audits 01–06. It is one file, but it is the paywall copy for the
first Supporter-gated feature, so a wrong promise here is a wrong promise at the moment
someone decides to pay.

## Files covered

| File                                                           | Strings |
| -------------------------------------------------------------- | ------- |
| `apps/web/src/components/consumer/history/definitions/copy.ts` | 36      |
| **Total**                                                      | **36**  |

String count by group: `tabs` 3, `header` 12 (eyebrow, range, `since`, 9 stat labels),
`item` 1, `empty` 4, `locked` 5, `calendar` 7, `passport` 4.

## Adjacency (Process step 3)

Every render site of `HISTORY_COPY` was opened:

- `HistoryContent.tsx` — the three-state switch (locked / empty / list) and the
  `<aside>` rail ordering, which is what puts `SaveCalendarRow` and `PassportTeaser`
  directly under `HistoryHeader` on mobile
- `MyShowsTabs.tsx` — the `Watching · History` nav that renders **above every one of the
  three states**, which is the adjacency that drives two findings below
- `HistoryHeader.tsx` — `historyTilesFor()`, the eyebrow row `{eyebrow} · {range}`, and the
  `since <Month Year>` line
- `HistoryEmpty.tsx` — passes `empty.*` into the shared `EmptyState`
- `HistoryLocked.tsx` — the tier chip (`{tier.name} · {tier.priceText}`), the perk `<ul>`
  resolved from the entitlements matrix, the CTA, the footer
- `HistoryItem.tsx` — the roomy-density `genre · paid $N` detail line
- `SaveCalendarRow.tsx` — the `detail` ternary (`failed` → `downloading` → `empty` → count)
- `PassportTeaser.tsx` — eyebrow / headline / summary / link stacked in one card
- `apps/web/src/lib/history.ts` — the only consumer of `calendar.fileName`
- `apps/web/src/components/consumer/going/definitions/copy.ts` — to verify `"I'm going!"`
  is quoted accurately by two History strings (it is: `going/copy.ts:10`)
- `apps/api/src/routes/history.ts` — to check what the `.ics` endpoint actually returns

## Verdict tally

| Verdict | Count |
| ------- | ----- |
| CUT     | 3     |
| TIGHTEN | 1     |
| STALE   | 1     |
| DEAD    | 1     |
| DEFECT  | 1     |
| RENAME  | 0     |
| KEEP    | 29    |

**Mechanical vs editorial:** only **one** em-dash is in scope in this file
(`locked.body`, line 51). The other three at lines 38, 54 and 77 are two code comments
(out of scope per rule 4) and one null-value glyph. So the em-dash inventory here is
1 rendered sentence dash, and it rides along with a substantive finding rather than being
one. Nothing in this slice is a punctuation-only row.

Class split across the 7 non-KEEP rows: Chrome 4, Teaching 1, Data 2.

Cut ratio: 3 CUT / 36 strings = **8%**, well inside the 30% gate. (`DEAD` is exempt.)

**No vocabulary violations found.** `tabs.watching: 'Watching'`, `tabs.ariaLabel:
'My shows'` and `tabs.history: 'History'` all match the locked table exactly, and the word
"saved" appears nowhere in the file.

---

## Findings

| File            | String                                                                                                                                                                              | Class    | Verdict           | Replacement                                                                                                                                             | Adjacency note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| history/copy.ts | `locked.body: "Every show you tap I'm going! lands here after the date — same artist art, same dates, no work on your end. **You also get a calendar feed you can subscribe to.**"` | Teaching | **STALE**         | `"Every show you tap I'm going! lands here after the date. Same artist art, same dates, no work on your end. You can export the lot to your calendar."` | ⚠️ **Highest-value finding in the slice.** The plan that built this feature explicitly answered handoff open question #2 the other way: `docs/superpowers/plans/2026-07-27-70-concert-history.md:391` — _"point-in-time `.ics` download for v1, **not a subscribable feed**"_, because a subscribe URL needs a long-lived unauthenticated token. `apps/api/src/routes/history.ts` sends `Content-Disposition: attachment`, and `SaveCalendarRow` renders `label: 'Export to calendar'` with a `.ics` badge and a one-shot download. So the **paywall page promises a subscribable feed the product does not ship**, and it is the last sentence a user reads before tapping `Pick Supporter`. The handoff's original wording (`history-routes.jsx:181`) said the same thing, so this leaked in verbatim and predates the plan decision that overruled it. A fact change, not an edit. Fixing it also clears the file's only in-scope em-dash (rule 4). |
| history/copy.ts | `header.range: 'all time'`                                                                                                                                                          | Chrome   | **CUT**           | (delete key; render the eyebrow alone)                                                                                                                  | `HistoryHeader.tsx:~74` renders `{COPY.eyebrow} · {COPY.range}` → **`HISTORY · all time`**. There is no range switcher anywhere in this build — `range` was a designer knob in `history-routes.jsx:278` (`range="all time"`), and the shipped component hardcodes it. It labels a distinction the user cannot experience (rule 1). Worse, the real time anchor is already on screen: `COPY.since(...)` renders **`since January 2026`** ~3 elements below the same tiles. One inert label, one accurate one. `HistoryHeader.test.tsx:~30` asserts the composed `${eyebrow} · ${range}` string, so this is a one-line test edit.                                                                                                                                                                                                                                                                                                                        |
| history/copy.ts | `passport.eyebrow: 'Passport'`                                                                                                                                                      | Chrome   | **CUT**           | (delete key)                                                                                                                                            | `PassportTeaser.tsx` stacks four lines in one small card: eyebrow **`Passport`**, headline `Your stamp book.`, the stat summary, then link **`See your Passport →`**. The word "Passport" appears twice in ~60px of vertical space, and the link is the string that has to survive (it is locked, and it is the affordance). Rule 3: the eyebrow adds no location the card does not already announce. The handoff had `Passport · 2026` (`history-routes.jsx:319`), where the year was doing the work; the year was dropped in the build and the bare noun is what is left.                                                                                                                                                                                                                                                                                                                                                                            |
| history/copy.ts | ~~`header.eyebrow: 'HISTORY'` and `empty.eyebrow: 'HISTORY'`~~                                                                                                                      | Chrome   | **CUT — APPLIED** | Both keys deleted                                                                                                                                       | ✅ The 🔒 is spent. `header.eyebrow` is gone, and `empty.eyebrow` (by then reading `CONCERTS` after #1357) was deleted in #1529 along with Watching's, once `EmptyState.eyebrow` was made optional. The original note, kept for the reasoning: recorded as a proposal, not an edit. `MyShowsTabs` renders on **all three** History states, immediately above the content, with the `History` tab carrying `aria-current="page"`, bold weight and a filled `--surface-3` pill. The eyebrow directly beneath it says `HISTORY` again. On the empty state a user reads `History` → `HISTORY` → `Nothing's behind you yet.` in three consecutive elements. Rule 3: when two layers collide the title survives and the eyebrow re-scopes to location — but the tab _is_ the location, so there is nothing left to re-scope to. Counted once in the tally.                                                                                                   |
| history/copy.ts | `calendar.detail: \`${count} nights · iCal · Google · Apple\``                                                                                                                      | Chrome   | **TIGHTEN**       | `` `${count} ${count === 1 ? 'night' : 'nights'} · .ics download` `` — or drop the tail entirely and leave the count                                    | Renders as the subtext of a button whose label is already `Export to calendar`, with a `.ics` badge pinned to the button's right edge. Three vendor names read as three integrations; there is one file. Nothing negotiates with Google or Apple — `downloadHistoryIcs` creates an object URL and clicks a link. This is machinery dressed as a credential (rule 6), and the `.ics` badge one flex-child away already answers "what format". If the vendor list is deliberate reassurance that the file opens anywhere, keep the intent but say so once rather than as a three-item list next to a badge saying the same thing.                                                                                                                                                                                                                                                                                                                        |
| history/copy.ts | `calendar.detailEmpty: 'Nothing to export yet'`                                                                                                                                     | Chrome   | **DEAD**          | (delete key, plus the `empty` branch in `SaveCalendarRow`)                                                                                              | Unreachable. `SaveCalendarRow` computes `const empty = count === 0`, but `HistoryContent.tsx` returns `<HistoryEmpty />` and never mounts the rail when `history.shows.length === 0` — the only call site passes `count={history.shows.length}` from inside the `length > 0` branch. So `empty` is always `false`, and the row's `disabled` state is unreachable for the same reason. `rg -F "Nothing to export yet"` hits the copy file only; the sole other reference is `SaveCalendarRow.test.tsx`, which reaches it by rendering `<SaveCalendarRow count={0} />` directly — a state the app cannot produce. Reported, not fixed: deleting it is a component change.                                                                                                                                                                                                                                                                                |
| history/copy.ts | `passport.summary: \`… · ${topGenre ?? '—'}\``                                                                                                                                      | Data     | **DEFECT**        | (no copy change; make the teaser drop the segment when `topGenre` is null)                                                                              | Two components on the same screen disagree about the same null. `HistoryHeader.tsx` deliberately **hides** the genre tile when `stats.topGenre === null`, and its own header comment states the reason: _"a Supporter whose rows carry no genre shouldn't see a 'top genre — ' tile."_ `PassportTeaser`, ~20px below in the same rail, renders exactly that: `12 nights · 7 venues · —`. The copy file encodes the placeholder the sibling component was written to avoid. The em-dash here is a null glyph rather than prose, so rule 4 is not the issue; the contradiction is.                                                                                                                                                                                                                                                                                                                                                                       |

### Not a copy row, but found by the adjacency pass

- `HistoryContent.tsx:~117` renders the month-bucket count as a hardcoded `· {bucket.shows.length}` string concatenation, and `bucket.label` comes from `./lib/buckets`, not from `HISTORY_COPY`. Minor, but the month-header row is customer-facing text assembled outside `definitions/`.
- `SaveCalendarRow.tsx` has no `role="status"` on the detail line. The `failed` and `downloading` states change that text in place with no live region, and the component comment explains why there is no `aria-label` (it would mask the detail) — but nothing announces the change. An a11y finding, not a copy one.

## Locked strings I did not touch

The #70 plan (`docs/superpowers/plans/2026-07-27-70-concert-history.md:689`) lists verbatim
strings, and `design/design_handoff_concert_history/READINESS.md:72,73,130,170` records the
voice verdict on the same set. These are locks, so anything below is a proposal at most:

- **`header.eyebrow` / `empty.eyebrow` `'HISTORY'`** — locked; the CUT above is proposed
  against the lock because the tab bar that creates the duplication was not on the page when
  the string was chosen.
- **`empty.headline: "Nothing's behind you yet."`** — locked, and named in READINESS:130 as
  a Sour-Patch anchor. Tonal sibling of Watching's `Crickets.`. KEEP.
- **`locked.headline: 'Keep the nights.'`** — locked, READINESS:73 and :170. KEEP.
- **`locked.footer`** = `'Free tier keeps everything else. No paywalls in the way of seeing shows.'`
  — locked, READINESS:73. Two sentences, at the Teaching cap, and it is the honesty rail
  on a paywall. KEEP.
- **The nine `header.stats` labels** (`night`/`nights`, `venue`/`venues`,
  `artist`/`artists`, `top genre`, `top venue`, `spent`) — locked, one or two words each,
  Data-adjacent tile labels. KEEP.
- **`calendar.label: 'Export to calendar'`** — locked ("calendar row label"). KEEP even
  though it breaks the 3-word button cap: it is the accessible name of the button and
  `Export` alone would not say what is exported.
- **`passport.link: 'See your Passport →'`** — locked, and additionally load-bearing for
  #72/#85, which cite the exact string in two plan docs as the affordance PR-5 wires up.
  KEEP.
- **`empty.cta: "Browse tonight's shows"`** — not in the #70 lock list, but byte-identical
  to `consumer/definitions/copy.ts:watchingEmptyCta` and to the Watching handoff. Changing
  it here alone would fork two sibling empty states. KEEP.
- **`tabs.history: 'History'`** — ~~checked against **#1357**; that rename has not
  shipped, so this is current, not stale.~~ **SUPERSEDED.** #1357 shipped: the sub-tab now
  reads `Concerts` and the list is split into Upcoming and Past. `MyShowsTabs.TABS` carries
  `{ key: 'history', label: COPY.concerts }`, and the code identifier stays `history`
  everywhere on purpose. The two edit points this note predicted were the right ones.

## Self-check

- [x] Every CUT literal grepped with `rg -F`. `'Nothing to export yet'` → copy file only
      (the component and its test reach it by property access). `'iCal · Google · Apple'` →
      copy file + the handoff jsx. `'Your stamp book.'` → copy file + handoff jsx.
      `'all time'` → copy file + `history-routes.jsx:278`. No E2E or snapshot asserts
      any of them; the one test coupling is `HistoryHeader.test.tsx`, which composes
      `` `${COPY.eyebrow} · ${COPY.range}` `` and is a same-change edit.
- [x] Cut ratio 3/36 = 8%, under the 30% per-file gate.
- [x] No two replacements share an opening construction (one starts `Every show`, one is a
      count template, two are deletions).
- [x] Every replacement re-read aloud.
- [x] No DEFEND row changed without a reason. The single Teaching row (`locked.body`) is
      changed because it states a fact the product does not implement, not for brevity, and
      the replacement keeps every promise that is actually true.
      `calendar.failed: "Couldn't build the file. Try again."` is Recovery and is left
      exactly as written — it names the failure without naming the internal cause, which
      is what rule 6 asks for.
- [x] Nothing locked was overruled. The two `'HISTORY'` eyebrows are the only locked strings
      I would change, and they are recorded as a proposal with the lock named.
- [x] Rewrite ratio: 0 of the 7 rows is a taste rewrite. Each is triggered by a named
      condition — a shipped-past fact, an unreachable branch, a duplicated layer, an inert
      label, or two components contradicting each other.

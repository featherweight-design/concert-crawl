# Copy audit 01 — consumer core

**Mode:** propose (findings only, no files edited).

**Files covered (complete, not sampled):**

- `apps/web/src/components/consumer/definitions/copy.ts`
- `apps/web/src/lib/definitions/copy.ts`

**Strings enumerated:** ~700 leaf strings across the two files (927 keyed lines in the
consumer file, minus nested-object and href/testId keys). The lib file carries 5 strings,
all Data (relative-time units + `Just now`); all 5 are KEEP.

Enumeration was split from judgment per Process step 1. Adjacency was recorded by opening
the rendering components: `WatchingContent.tsx`, `WatchingEmpty.tsx`, `WatchingSignedOut.tsx`,
`events/page.tsx`, `CalendarView.tsx`, `FilterBar.tsx`, `ReleasePage.tsx`,
`FeedbackModal.tsx`, `SubmitPriceModal.tsx`, `venues/page.tsx`, `VenuesIndexClient.tsx`,
`WatchZone.tsx`, `UserMenu.tsx`, `EmptyState.tsx`.

## Verdict tally

| Verdict | Count |
| ------- | ----- |
| CUT     | 9     |
| TIGHTEN | 7     |
| RENAME  | 2     |
| TOOLTIP | 1     |
| KEEP    | ~681  |

Self-check: no surface loses more than 30% of its strings. The largest loss is
`venuesPage` (5 of 6), but that block is a duplicate of `venuesIndex` rather than a
surface of its own, and the finding is explicitly raised as a structural/design finding
below rather than applied as an edit.

---

## Findings

| File             | String                                                                                                                                 | Class       | Verdict                      | Replacement                                                                       | Adjacency note                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| consumer/copy.ts | ~~`watchingEmptyBody`: "Add a show to follow it. Soon, we'll watch the price for you and notify you of drops, spikes, or sell-outs."~~ | Teaching    | RENAME — **APPLIED (#1391)** | Now reads "Watch a show and it lands here. We track the price from then on."      | The row's premise is spent. Both defects it recorded are gone: the "follow" rule-10 violation, and the "Soon" that contradicted `WatchZone.tsx`'s present-tense watch hint. Kept for the record, not as an open finding.                                                                                                                                                                   |
| consumer/copy.ts | ~~`watchingEmptyEyebrow`: "Watching"~~                                                                                                 | Chrome      | CUT — **APPLIED**            | Key deleted; `EmptyState.eyebrow` is now optional and `WatchingEmpty` passes none | The prop-signature change this row flagged as the blocker has been made, so the cut landed as written. `HistoryEmpty`'s `CONCERTS` eyebrow went with it for the same rule-3 reason: `MyShowsTabs` renders the `Watching` and `Concerts` tab labels directly above both empty states.                                                                                                       |
| consumer/copy.ts | `releaseNotes.page.description`: "Everything we've shipped, in one place. Spotted a bug or got an idea?"                               | Chrome      | CUT (first sentence)         | "Spotted a bug or got an idea?"                                                   | `ReleasePage.tsx:99` renders `page.heading` = "What we shipped." immediately above at 46px/900. The body's first sentence is the headline restated in more words. Rule 3: if the body only elaborates the title, cut the body. The second sentence survives because it sets up the inline feedback button at :123 and is the only clause doing work.                                       |
| consumer/copy.ts | `feedback.modal.statusRail.successLabel`: "Got it · beta channel"                                                                      | Chrome      | CUT                          | —                                                                                 | Dead string. `StatusRail` (FeedbackModal.tsx:1194) has exactly one call site, `:792`, hardcoded to `tone="error"`. The success branch is unreachable. It is also byte-identical to `headerRail.success`, which _is_ rendered on success at :1140.                                                                                                                                          |
| consumer/copy.ts | `feedback.modal.statusRail.successCode`: "200 · OK"                                                                                    | Chrome      | CUT                          | —                                                                                 | Same unreachable branch as above.                                                                                                                                                                                                                                                                                                                                                          |
| consumer/copy.ts | `feedback.modal.statusRail.errorLabel`: "Didn't send · beta channel"                                                                   | Chrome      | CUT                          | —                                                                                 | On the error screen the modal renders `headerRail.error` ("Beta channel · stalled" + code `ERR`) at the top **and** this rail at `:792`. Two mono status rails, same accent colour, same fact, one screen. Keep the header rail (it renders in all four states and is therefore the consistent one); the duplicate below the heading goes.                                                 |
| consumer/copy.ts | `feedback.modal.statusRail.errorCode`: "ERR · 503"                                                                                     | Chrome      | CUT                          | —                                                                                 | Falls with `errorLabel`. Also a fabricated status code: the rail hardcodes 503 regardless of what the request actually returned.                                                                                                                                                                                                                                                           |
| consumer/copy.ts | `venuesPage.pageTitle`: "Venues"                                                                                                       | Chrome      | CUT                          | reuse `venuesIndex.pageHeading`                                                   | `venues/page.tsx` renders an entirely parallel header (`:39` `copy.pageTitle`, `:51` `copy.zeroCountLabel`) for the zero-venue branch, while the populated branch renders `VenuesIndexClient` which has its own `pageHeading` + `venueCountSuffix` at `:68`/`:79`. Same page, two copy blocks, two headings that must be kept in sync by hand.                                             |
| consumer/copy.ts | `venuesPage.zeroCountLabel`: "0 in Denver"                                                                                             | Data/Chrome | CUT                          | reuse `venuesIndex.venueCountSuffix` with a literal `0`                           | Same duplication. The count is already interpolated in the index client; hardcoding the zero form as its own string is how the two drift.                                                                                                                                                                                                                                                  |
| consumer/copy.ts | `venuesPage.emptyEyebrow`: "No venues"                                                                                                 | Chrome      | CUT                          | —                                                                                 | Eyebrow restates the title "Nothing here yet" sitting directly beneath it in `EmptyState`. Rule 3: eyebrow is location or kind, not the point.                                                                                                                                                                                                                                             |
| consumer/copy.ts | `venuesPage.emptyTitle`: "Nothing here yet"                                                                                            | Chrome      | TIGHTEN                      | "Nothing here yet."                                                               | Every sibling empty-state title in this file terminates with a period ("Crickets.", "Nothing on this day.", "Nothing booked yet.", "No venues match."). This is the one that does not, and they render through the same `EmptyState` component.                                                                                                                                            |
| consumer/copy.ts | `venuesPage.emptyBody`: "Venues will appear here once they're added."                                                                  | Chrome      | TIGHTEN                      | "We're still adding rooms. Check back."                                           | Passive, and it explains the mechanism of a database rather than telling the visitor anything. Rule 1: neither clarifies nor colours.                                                                                                                                                                                                                                                      |
| consumer/copy.ts | `emptyCalEyebrow`: "No shows"                                                                                                          | Chrome      | RENAME                       | the selected date (e.g. "Tue · May 6")                                            | `CalendarView.tsx:144-146` stacks eyebrow "No shows" over title "Nothing on this day." Two layers, one fact. Rule 3 says the title survives and the eyebrow is re-scoped to location — and here there is a genuine location available: the day the user picked, which the empty state currently never names.                                                                               |
| consumer/copy.ts | `emptyTonightBody`: "Slow night on the calendar. Browse the rest of the week, things usually pick up by the weekend."                  | Chrome      | TIGHTEN                      | "Slow night on the calendar."                                                     | Two sentences against a 1-sentence empty-state cap, and the second sentence instructs the user to do exactly what the button underneath it does: `events/page.tsx:437` renders `emptyTonightCta` = "View this week". Rule 8 across elements.                                                                                                                                               |
| consumer/copy.ts | `emptyFilteredBody`: "Nothing found with these filters. Drop one, or stretch the dates and try again."                                 | Chrome      | TIGHTEN                      | "Drop a filter, or stretch the dates."                                            | Two sentences against the 1-sentence cap. "Nothing found with these filters" restates the eyebrow ("Filtered") and the state the user is visibly in; "and try again" restates "Drop one".                                                                                                                                                                                                  |
| consumer/copy.ts | `filterBar.locationLine`: "Denver · This week"                                                                                         | Chrome      | TIGHTEN                      | "Denver"                                                                          | `FilterBar.tsx:207` renders this as a fixed string directly above the When chip, which at `:663-666` can read Tonight / This weekend / This week / Next week. The eyebrow asserts a date range it does not track, so it contradicts the control 40px below it whenever the user picks anything but "This week". Rule 3: eyebrow = where you are. "Denver" is the part that is always true. |
| consumer/copy.ts | `feedback.modal.success.body`: "Thanks for the feedback! We'll reach out if we need more information."                                 | Chrome      | TIGHTEN                      | "We'll reach out if we need more."                                                | Rule 9: exclamation point in system copy. It also sits under `success.heading` "Loud and clear.", which already is the thank-you — the heading carries the warmth, so the body repeating it flattens both.                                                                                                                                                                                 |
| consumer/copy.ts | `watching.signedOut.facts[2].body`: "Watching is on the Free tier. No card, no trial."                                                 | Teaching    | TIGHTEN                      | "No card, no trial."                                                              | `WatchingSignedOut.tsx` renders `fact.title` "Free, and it stays free." immediately above `fact.body` at `FactList`. "Watching is on the Free tier" is the title restated in product-plan vocabulary. Rule 8. The second clause survives because it is the concrete fact the title cannot carry.                                                                                           |
| consumer/copy.ts | `settings.watchlistComingSoon`: "Coming soon"                                                                                          | Chrome      | CUT                          | —                                                                                 | Dead string: `rg -F "watchlistComingSoon"` returns only the definition. `settings.watchlistRow` ("Watching") is likewise defined and never read. Both are leftovers from a settings row that no longer renders.                                                                                                                                                                            |
| consumer/copy.ts | `pendingCardB.imminentTooltip`                                                                                                         | Teaching    | TOOLTIP                      | (unchanged)                                                                       | Recorded, not acted on. It is a 30-word parametrised sentence rendered inline next to a 2-word tag ("Days away"). It is genuinely useful-but-hideable and is the canonical case for a tooltip treatment — but no tooltip primitive exists, and rule 5 forbids inventing one or reaching for native `title=`. Leave inline and unchanged.                                                   |

### Grep evidence (Process step 5)

Every CUT and RENAME literal was searched with `rg -F` (fixed string, no shell globs).
**No test, snapshot, or E2E selector references any of them.** Non-source hits, all of
which are prose or prototype rather than runtime:

- `"Add a show to follow it. Soon, …"` → `design/design_handoff_logged_out_ux/lo-watching.jsx`
- `"Everything we've shipped, in one place."` → `design/design_handoff_release_notes/release-notes.jsx`, `design/design_handoff_spotlight_heroes/release-notes.jsx`
- `"Got it · beta channel"`, `"200 · OK"` → `design/design_handoff_feedback_modal/**`, `docs/superpowers/plans/2026-05-10-feedback-modal-user-menu.md`
- `"Nothing here yet"`, `"Venues will appear here once they're added."` → `docs/superpowers/plans/2026-05-20-venues-index-redesign.md`
- `"Denver · This week"` → `design/design_handoff_logged_out_ux/lo-shell.jsx`
- `"Coming soon"`, `"0 in Denver"`, `"No shows"` → prototypes and specs only; the specific
  keys audited here (`settings.watchlistComingSoon`, `venuesPage.zeroCountLabel`,
  `emptyCalEyebrow`) have no second runtime caller.

Two of these are also locks, and are listed below rather than treated as clear.

### Non-findings worth recording

- **Em-dashes.** The file carries roughly two dozen in rendered strings
  (`accessibilityPlaceholder`, `venueGuide.thinFooter`, `watching.signedOut.lede`,
  `submitPrice.success.body`, `submitPrice.error.*`, `counterSubmitSheet.errorBody`,
  `share.shareFailed`, `priceRegion.disputeRace409Toast`,
  `watchers.countOnlyHonest`, `watchShowButton.ariaWatchSignedOut`,
  `userMenu.ariaLabels.accountMenuSignedOut`, `watching.watchingItem.staleTooltip`, and
  the `provenance.ariaLabel*` family). Rule 4's blast-radius clause is explicit: untouched
  neighbours stay untouched, and no standalone repo-wide sweep PR. **Not filed as rows
  here.** This is the backlog the rule says to raise as an issue, and it should be one
  issue covering this file, not 24 table rows.
- `releaseNotes.page.endOfLog`: `'— end of log —'` and `modal.founderSignFallback`:
  `'— Hugh'` are the narrow rule-4 exception (log rule, attribution marker). KEEP.
- `venueGuide.returner.preview`'s bare `+N` and `accessibilityNotDocumented` carry inline
  comments explaining the deliberate choice. Both read as correct. KEEP.
- The `priceDisplay.communityGapBody` machinery ("Ticketing APIs don't share prices with
  us") is rule 6's own worked example of machinery that must stay. KEEP, defended.

---

## Locked strings I did not touch

Named rather than overruled, per the self-check.

1. **`share.taglines.*`** — marked `⚠️ VERBATIM` in the file: signed-off output of the
   #782 voice pass, recorded in the #72 handoff README voice table. All three are
   lowercase and unpunctuated in a way this persona would otherwise correct. Untouched.
2. **`priceRegion.faceValue.*`, `priceRegion.contributeFaceValue.*`,
   `priceRegion.soldOutNoListingCaption`, `priceRegion.mtListChip.resaleTag`,
   `priceRegion.dispute.counterPointerLabel`** — each carries an explicit
   `LOCKED §9 Q1/Q2/Q3 (Appendix A.x)` marker from a merged plan doc. `resaleTag` is
   additionally flagged NON-NEGOTIABLE. Untouched, including the duplicated
   `ladderBoxofficeSub` / `ladderBoxofficeRight` / `caption` strings shared across the two
   blocks, which I would otherwise have raised under rule 7.
3. **`vendors.venueBoxOffice` / `vendors.otherVendor`** — "Round-3 locked decision #2".
   The stored-value wording ("another seller") is deliberately different from the picker's
   "Somewhere else"; both are correct and neither is drift.
4. **`appHeader.nav.tabs` "My shows" and `bottomNav.nav.tabs` "my shows"** — locked by the
   #70 handoff README §3 and restated in CLAUDE.md's vocabulary table. The casing
   difference between the two navs is intentional (bottom nav is lowercase throughout).
   Not a finding.
5. **`watching.signedOut.exampleAlt`** — A11y class, exempt from cuts, and the component
   comment states it is load-bearing (mistaking the sample rows for real shows is the
   page's worst failure). Untouched.
6. **`filterBar.locationLine`** — my TIGHTEN row above conflicts with
   `design/design_handoff_logged_out_ux/lo-shell.jsx`, which ships the same
   `Denver · This week` string. Proposed, not applied; the handoff needs the call.
7. **`venuesPage.emptyTitle` / `emptyBody`** — both appear verbatim in the merged plan
   `docs/superpowers/plans/2026-05-20-venues-index-redesign.md`. The plan does not mark
   them locked and does not appear to have anticipated the two-header duplication, but it
   is a merged plan listing verbatim strings, so it is named here rather than overruled.

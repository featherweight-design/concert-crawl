# Copy audit 03 — notifications, nudges, reporting, back chip, PWA, onboarding

Mode: **propose**. Nothing was edited. Findings only.

## Files covered

| File | Strings |
|---|---|
| `apps/web/src/components/consumer/notifications/definitions/copy.ts` | 29 |
| `apps/web/src/components/consumer/lifecycle-nudges/definitions/copy.ts` | 15 |
| `apps/web/src/components/consumer/reporting/definitions/copy.ts` | 92 |
| `apps/web/src/components/consumer/back-chip/definitions/copy.ts` | 1 |
| `apps/web/src/components/pwa/definitions/copy.ts` | 37 |
| `apps/web/src/components/onboarding/definitions/copy.ts` | 69 |
| **Total** | **243** |

Adjacency (Process step 3) was read from: `NotifHeader.tsx`, `NotifBody.tsx`, `NotifStates.tsx`,
`InboxStrip.tsx`, `MenuNotifRow.tsx`, `NotifMenuPanel.tsx`, `TrialEndedTakeover.tsx`,
`DayThirteenBanner.tsx`, `PastDueBanner.tsx`, `ReportFooterLink.tsx`, `ReportSheet.tsx`,
`EvidenceForm.tsx`, `ConfirmReportSheet.tsx`, `PendingSoldOutCard.tsx`,
`PendingReportBanner.tsx`, `LiveReportBanner.tsx`, `ReportTypeMark.tsx`, `BottomSheet.tsx`,
`IosHowToSheet.tsx`, `PostWatchSheet.tsx`, `CachedShortcuts.tsx`, `OfflineFallback.tsx`,
`OfflinePill.tsx`, `InstallSlot.tsx`, `onboarding/steps/*`, `SkipRail.tsx`.

## Verdict tally

| Verdict | Count |
|---|---|
| CUT | 9 |
| TIGHTEN | 14 |
| RENAME | 3 |
| TOOLTIP | 1 |
| KEEP | 216 |

Class split across the 27 non-KEEP rows: Chrome 12, Recovery 5, Teaching 7, A11y 2, Data 1.

Cut ratio per surface (self-check gate, 30% max): notifications 4/29 = 14%, reporting 5/92 = 5%,
onboarding 2/69 = 3%, lifecycle 0/15, PWA 0/37. No surface is over the line.

---

## Findings

| File | String | Class | Verdict | Replacement | Adjacency note |
|---|---|---|---|---|---|
| notifications | `emptyHint: 'Watch a show and this fills up fast.'` | Chrome | CUT | (delete key) | Dead. No render site anywhere; `NotifBody.test.tsx:92` asserts it must *not* render. `rg -F` hits only the copy file, the design table, and the handoff jsx. |
| notifications | `slowRetry: 'Still loading. Try again?'` | Recovery | CUT | (delete key) | Dead. No property access in any component. The panel has no slow-load state; the loading skeleton never escalates. |
| notifications | `unreadTag: 'New'` | Chrome | CUT | (delete key) | Dead. `NotifItem` marks unread with a left border + `--signal` colour, no tag. |
| notifications | `pipLabel: "You've got unread notifications"` | A11y | CUT | (delete key) | Dead. `NotifPip.tsx:4` documents that the pip is `aria-hidden` and `bellLabel(count)` carries the accessible name. An unused A11y string is not an A11y string. |
| notifications | `errorBody: "Poll failed. Nothing's lost — it's all still on the server."` | Recovery | TIGHTEN | `"Nothing's lost. It's all still on the server."` | Renders directly under `error: "Couldn't reach the crawl."` in `NotifStates.NotifError`. The title already says something broke, so `Poll failed.` is the internal name for it (rule 6: translate, don't surface). Em-dash goes (rule 4). Diagnosis + reassurance both survive. |
| notifications | `actionFailed: "That didn't stick. Nothing changed — try again."` | Recovery | TIGHTEN | `"That didn't stick. Nothing changed, so try again."` | Renders in `NotifBody`'s `role="alert"` notice strip under the header, right where the unread count just snapped back. Em-dash only (rule 4); the diagnosis is defended. |
| notifications | `loading: 'Checking what you missed…'` | A11y | TIGHTEN | `'Checking for new notifications…'` | Sr-only inside `NotifLoading`'s `role=status`. It repeats `panelTitle: 'What you missed'`, which is already the panel's `aria-label` on the list — a screen reader hears the same phrase twice within one region. |
| lifecycle-nudges | `takeover.eyebrow: 'Premium trial · done'` | Chrome | TIGHTEN | `'Premium trial'` | ⚠️ LOCKED (see below). `RailHeader` renders the eyebrow immediately above `headline: "Trial's done. Pick a lane."`, and `code: '14/14'` sits on the same rail. Three elements say "over". Rule 3: title survives, eyebrow re-scopes to location. |
| lifecycle-nudges | `takeover.subhead: "…browsing and your saved shows stay put…"` | Teaching | RENAME | `"…browsing and the shows you're watching stay put…"` | ⚠️ LOCKED. **Vocabulary violation (rule 10).** "Saved shows" does not exist in this product. Highest-severity finding in the slice: it teaches the wrong noun at the exact moment a user is deciding whether to pay. |
| lifecycle-nudges | `takeover.ariaLabel: 'Trial ended — pick a plan'` | A11y | TIGHTEN | `'Trial ended. Pick a plan.'` | Rule 4 is in scope for `aria-label`. It is the `role="dialog"` name on the full-bleed takeover; nothing else changes. |
| lifecycle-nudges | `banner.sub: '— lock it in?'` | Chrome | TIGHTEN | `'Lock it in?'` | ⚠️ LOCKED. Rendered as a separate `<span>` baseline-aligned after `title: 'Trial ends tomorrow'` in `DayThirteenBanner`, so the dash is doing layout work that flex `gap: 8` already does. On a 320px wrap the dash orphans onto its own line. |
| lifecycle-nudges | `pastDueBanner.sub: '— give it a refresh?'` | Chrome | TIGHTEN | `'Give it a refresh?'` | Same two-span shape in `PastDueBanner`, same wrap orphan. Sibling of the row above — sweep both or neither. |
| reporting | `reportFooterLink.subtitle: 'Is the show sold out, cancelled, or postponed? Let fans know!'` | Chrome | TIGHTEN | `'Sold out, cancelled, or postponed? Tell the room.'` | Sits under `title: 'Report a status change'` inside the same button, under `eyebrow: 'Spot something off?'`. Three question-shaped layers. Exclamation point in system copy is a rule 9 tell. |
| reporting | `reportFooterLink.subtitleHasStatus` (`…as ${statusLabel} — if there's new information, let the people know!`) | Chrome | TIGHTEN | `` `A fan reported this show as ${statusLabel}. Know different?` `` | Em-dash + exclamation (rules 4, 9). Renders under `titleHasStatus: 'Tickets still available?'`, which already asks the question the tail restates. |
| reporting | `reportSheet.eyebrowContext: 'Status report'` | Chrome | CUT | (delete key; keep `eyebrow`) | Byte-identical to `reportSheet.eyebrow`. `ReportSheet.tsx:311` branches `liveStatus !== null ? copy.eyebrowContext : copy.eyebrow` — a live ternary between two identical strings. Dead branch, not a copy choice. |
| reporting | `reportSheet.subtitleByStatus` (3 entries, `…marked as X. Tell us what you saw — we'll route it to other fans to confirm.`) | Teaching | TIGHTEN | One template: `` `This show is marked ${label}. Tell us what you saw and we'll route it to other fans.` `` | Three strings differing by one word, each carrying the same em-dash. Renders under `headingContext: 'What changed?'` with `currentlyLive` + a `ReportTypeMark` for the same status *directly below* — the status is stated three times on one sheet. |
| reporting | `reportSheet.footnote` (`We'll ask how you know on the next step. An email from the venue, an artist's social post, or a venue announcement all count — anything we can point other fans at.`) | Teaching | TIGHTEN | `"We'll ask how you know next. A venue email, an artist's post, or a venue announcement all count."` | Em-dash (rule 4) and the trailing clause restates "all count" (rule 8). The three examples are then re-listed verbatim as the five `evidenceOptions` on the very next screen (rule 7: promise once, at the highest level). |
| reporting | `evidenceForm.submitButton: 'File report — pending confirmation'` | Chrome | TIGHTEN | `'File report'` | Em-dash, and 4 words against the 3-word in-app button cap. The status it conveys is already printed as the line directly under the button (`Live after 2 fan confirms · or admin promotion`, hardcoded at `EvidenceForm.tsx:352`). |
| reporting | `evidenceForm.imminentWarning`: `` `This show is in ${daysUntil} days — reports need 3 confirms instead of 2.` `` | Recovery | TIGHTEN | `` `This show is in ${daysUntil} days, so reports need 3 confirms instead of 2.` `` | ⚠️ **Contradiction, not just an em-dash.** This banner renders in the same modal as the hardcoded footer `'Live after 2 fan confirms · or admin promotion'`. On an imminent show the two lines state different thresholds ~400px apart. The footer string is the one that's wrong; it needs the imminent branch. Flagged as a code defect, not a copy edit. |
| reporting | `evidenceForm.evidenceOptions.wasThere.label: 'I was at / called the venue'` | Chrome | TIGHTEN | `'I asked the venue'` | The slash reads as a form field, not a person. `description: 'First-hand knowledge'` renders directly under it and already carries the "I saw it myself" half. |
| reporting | `confirmReportSheet.subtitle: 'Confirm what you know about this event.'` | Chrome | CUT | (delete key) | Renders between `heading: 'Is this right?'` and the recap card + three explicitly-labelled `verifyOptions`. It restates the heading and instructs the user to do the thing the three radio buttons are already asking. Rule 3: body only elaborates the title. |
| reporting | `confirmReportSheet.counterReportLink: "This isn't right — file a counter-report."` | Recovery | TIGHTEN | `"This isn't right. File a counter-report."` | Rule 4. It is the escape hatch at the bottom of the confirm sheet and is defended otherwise. |
| reporting | `pendingReportBanner.confirmsToGo: 'to go'` | Chrome | CUT | (delete key) | Dead. No property access. `confirmsProgress(n, needed)` already renders `"2/3 confirms"`; the suffix was never wired. |
| reporting | `pendingReportBanner.reportedBy: (handle) => \`@${handle}\`` | Data | CUT | (delete key) | Dead. `PendingReportBanner` renders only `reportedAnonymously`; there is no attributed branch in the component. Named reporters silently render as "Anonymous" — flagged as a code defect. |
| reporting | `liveReportBanner.confirmsAndTime` | Data | CUT | (delete key) | Dead. `LiveReportBanner.tsx` calls only `reportedBy` and `reportedAnonymous`, both of which already carry the confirm count and timestamp. |
| pwa | `INSTALL_COPY.sheet.title: 'Put Concert Crawl on your home screen'` | Teaching | TOOLTIP → see note | TIGHTEN (blocked) | 🔒 **LOCKED** (READINESS 🟢, file header says do not rewrite). Recording the defect anyway: `IosHowToSheet` passes it to `BottomSheet title=` (rendered as the sr-only `<h2>`) *and* renders it again as the visible `<h3>`. Screen-reader users hear the sentence twice on open. The fix is structural, not editorial — give the sheet a short sr-only name, as `PostWatchSheet` already does with `srTitleIos`. |
| pwa | `OFFLINE_COPY.fallback.empty.link: 'Back to cached content'` | Chrome | RENAME | `'Try the home page'` | 🔒 LOCKED. `CachedEmpty` renders this link when there *is* no cached content, and it points at `/`, not at any cache. The label promises the one thing the state has just said does not exist. |
| onboarding | `whatItDoesntYet.items[0]`: `'Notifications.' / "No push or email alerts yet. We'll bother you when it's ready."` | Teaching | CUT | (remove the item) | **Stale.** In-app notifications shipped (#737 — the panel audited above) and the push permission ask shipped (#1062 `PostWatchSheet`). A new user is told on day one that a feature they can see in the header does not exist. |
| onboarding | `whatItDoesntYet.items[2]`: `'Artist following.' / 'Follow a band and we surface their shows before you go looking.'` | Teaching | CUT | (remove the item) | **Stale.** The artist page + Spotify follow sync (#1115 / #763) shipped. Same credibility cost, on the one screen whose entire premise is "we'd rather say so than fake it". |
| onboarding | `whatItDoesToday.items[2]: "Watch shows you're tracking — we follow the price"` | Teaching | RENAME | `"Watch a show and we'll track its price"` | Em-dash (rule 4); "watch" and "tracking" in one clause say the same thing twice (rule 8); and "we follow the price" borrows **Following**, which the locked vocabulary reserves for artists (rule 10). |
| onboarding | `nav.skip.midIntent`: `` `Skip — back to ${destination}` `` | Chrome | TIGHTEN | `` `Back to ${destination}` `` | `SkipRail` renders this link with `pending`: `` `Watching ${destination} — we'll take you back` `` **directly below it**, and `nav.finishFootnote` says `'Your show is still watched'` at the end of the same tour. Three lines promising the same return trip. Cap breach too (4 words on a link). |
| onboarding | `nav.skip.pending`: `` `Watching ${destination} — we'll take you back` `` | Chrome | TIGHTEN | `` `Still watching ${destination}.` `` | Same stack as above. Once the link says "Back to X", the `role="status"` line only needs to reassure that the watch survived. Em-dash goes either way. |

### Not a copy row, but found by the adjacency pass

Hardcoded customer-facing strings in `reporting/` that bypass the copy-in-definitions
convention (separate finding per Process step 2):

- `EvidenceForm.tsx:228` `'You must be signed in to file a report.'` (Recovery)
- `EvidenceForm.tsx:248` `'Something went wrong. Try again.'` (Recovery)
- `EvidenceForm.tsx:339` `'Submitting…'`
- `EvidenceForm.tsx:352` `'Live after 2 fan confirms · or admin promotion'` (the contradiction above)
- `EvidenceForm.tsx:259` `ariaLabel="Add evidence for your report"`, `:433` `aria-label="Evidence method"`
- `EvidenceForm.tsx:376-380` the `'Sold out' / 'Cancelled' / 'Postponed'` recap ternary
- `ReportSheet.tsx:290` `ariaLabel="Report a status change"`, `:424` `aria-label="Report type"`
- `ReportFooterLink.tsx:7-11` `STATUS_LABELS`
- `ReportTypeMark.tsx:123` the literal `" pending"` concatenated after `copy.pendingDot`

## Self-check

- [x] Every CUT/RENAME literal grepped with `rg -F`. Non-code hits are the design tables and
      handoff jsx only. **No test or E2E file asserts any of these literals verbatim** — the
      notification and reporting tests import the copy object and compare by reference, and
      `NotifBody.test.tsx` only asserts `emptyHint` is *absent*, so deleting the key means
      deleting that assertion rather than fixing it.
- [x] No surface loses more than 30% of its strings (max 14%, notifications).
- [x] No two replacements share an opening construction.
- [x] Every replacement re-read aloud.
- [x] No DEFEND/EXEMPT row changed without a stated reason. The four Recovery rows are
      em-dash-only or rule-6 translations and keep their diagnosis; the two A11y rows are a
      rule-4 fix and a dead key.
- [x] Rewrite ratio well under 20% — 23 of 27 rows are triggered by a named rule breach
      (dead key, em-dash, vocabulary, contradiction), not by taste.

## Locked strings I did not touch

- **All of `pwa/definitions/copy.ts`.** The file header states the strings passed the #782
  voice bar and were locked in the READINESS 🟢 verdict, with an explicit "do not rewrite".
  Two defects are recorded above (`sheet.title` double-announce, `empty.link` label/href
  mismatch) as proposals against the lock, not edits. Also left untouched but noted:
  `sheet.eyebrow: 'Add to Home Screen'` collides with `sheet.title` and is restated a third
  time in step 2's label (rule 3), and `POST_WATCH_COPY.default.sub` carries an em-dash.
- **All of `lifecycle-nudges/definitions/copy.ts`.** The file header and
  `docs/superpowers/design-tables/lifecycle-takeover.md` (rows 448–451) plus
  `past-due-surfaces.md` record these as verbatim design-table strings. The
  **"your saved shows" vocabulary violation is the one I would escalate anyway** — it
  contradicts a lock that outranks the design table (the locked vocabulary in `CLAUDE.md`),
  so the two locks conflict and Hugh should break the tie.
- **`notifications` row `title`/`body` text.** Not in this file; written by the backend
  fan-outs (`packages/push/src/definitions/copy.ts`,
  `apps/api/src/lib/contest-notifications.ts`) and rendered verbatim. Out of slice.
- **`back-chip/definitions/copy.ts` — `label: 'Back'`.** A11y, one word, exempt. KEEP.
- **`onboarding.founderNote` (all 5 strings).** Teaching, first-person, passes the
  read-aloud test, and nothing else on screen restates it. Untouched deliberately.
- **`onboarding.makeItYours.lede: 'Nine themes…'`.** Verified against
  `apps/web/src/theme/themes.ts` — nine themes are registered. Accurate, KEEP.

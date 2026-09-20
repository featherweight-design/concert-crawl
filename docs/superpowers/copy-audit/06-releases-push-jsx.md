# Copy audit 06 — releases.ts, push/fanout copy, hardcoded JSX

Using copy-review. Mode: **propose**. Nothing in this document has been applied.

Files covered:

- `apps/web/src/lib/definitions/releases.ts` (Part 1, frozen-record calibration only)
- `packages/push/src/definitions/copy.ts` (Part 2, full audit)
- `packages/crawler-core/src/lib/spotify-fanout/definitions/copy.ts` (Part 2, full audit)
- `apps/web/src/**/*.tsx`, excluding `admin`, tests (Part 3, convention sweep)

---

## Part 1 — Release notes (frozen record)

### Em-dash count

**72 em-dash characters across 66 lines** of `releases.ts`. (The rulebook's calibration
figure of "63 `releases.ts` entries carry em-dashes" is in the right order of magnitude;
the literal character count today is 72.)

Per rule 4's blast-radius clause and the "historical release notes are a frozen record"
clause, **none of these are findings**. No sweep PR. No issue is warranted either: the
record is intentionally immutable.

### House style for future release entries

Derived from rules 2, 4, 9 and the changelog exemption. This is the whole standard for
any entry added from here on:

1. **Headline: 14 words max.** One clause. It names the shipped thing.
2. **Item `text`: one sentence.** If a second sentence is required, it is a second item.
3. **No em-dashes anywhere in a new entry** — headline, tagline, item text, spotlight
   copy. Replace with a period by default; a colon or comma when the clause is genuinely
   subordinate. `·` only in a true metadata row (`date · venue · price`).
4. **Naming-then-explaining is allowed** (rule 9's changelog exemption). "Multi-tier price
   submission — hit Add another tier…" is the correct _shape_; only its dash is wrong.
5. **Locked vocabulary applies** (rule 10): shows are **watched**, artists are
   **followed**, **Submitted prices**, **Price check**. `releases.ts:707` ("Watching list
   — save shows you care about") is a live example of the drift the rule exists to stop.
6. **`founderSign: '— Hugh'` stays.** Rule 4's narrow attribution exception covers it.
7. No exclamation points, no hedges (simply / just / easily / seamlessly), no tricolon
   padding, no "whether you're X or Y".

### Five worst existing entries — CALIBRATION ONLY, NOT FOR FIXING

Listed to show what the house style is reacting against. **Do not edit these.**

| Line | Entry                                                                                                             | Why it calibrates                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 103  | Notifications item, ~110 words, five sentences, one em-dash, plus `It's a DOT, not a number screaming 47 at you.` | Worst single item in the file. Blows the 1-sentence item cap by 5x, and the all-caps aside is a second color line inside one item.           |
| 40   | Shareable-cards item, ~70 words, one em-dash, four-clause appositive after the dash                               | Second-longest item. The dash carries a list that a colon would carry better.                                                                |
| 76   | `Artists have their own page now — and you can follow them.`                                                      | Headline is inside the 14-word cap (11 words) but the em-dash splits it into two headlines. The canonical shape a future entry should avoid. |
| 197  | History item, three sentences, two em-dashes, and a tier disclosure buried in the tail                            | Obligation-class content ("It is a paid feature") stapled to the end of a Chrome sentence, after a dash.                                     |
| 130  | First-timer guide item, four clauses plus a second sentence containing another em-dash                            | Two em-dashes in one item; the second one is the one rule 4 calls "a dash in front of a sentence".                                           |

---

## Part 2 — Push and fan-out copy (full audit)

15 strings total. Caps: **push title 40 chars, push body 120 chars.** Interpolated
variables count as one word for word-caps, but for the char cap they carry real length —
see the rulebook gap noted at the end. Char counts below assume a mid-length
`artistAtVenue` of 29 chars ("Big Head Todd at the Fillmore") and a 15-char `venueName`.

**Adjacency:** these strings render as OS-level notifications (iOS/Android tray, Web Push).
There is no surrounding chrome, no button, no eyebrow. The title and body are the entire
surface, which is why nothing here is CUT: every string is either Recovery (cancelled,
postponed, sold out) or the whole reason the notification exists. `watchNotificationCopy`
is consumed by the #1064 watch-update fan-out switch; `spotifyNewShowCopy` by the #763
Spotify new-show fan-out. Both carry a header comment saying the strings are lifted
verbatim from a locked design mock — **that is a lock under the self-check's last box**,
so every TIGHTEN below is a proposal to be taken back to the handoff, not applied silently.

### `packages/push/src/definitions/copy.ts`

| String                                                            | Class      | Len | Verdict                         | Replacement                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ---------- | --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `${artistAtVenue} — cancelled.`                                   | Recovery   | 42  | **TIGHTEN**                     | `${artistAtVenue} cancelled` — rule 4 em-dash, and 2 over cap.                                                                                                                                                                                                                                                                         |
| `The show's off. Tap for refund details.`                         | Recovery   | 38  | **REVERSED 2026-09-20 — STALE** | Judged as writing, never checked against the product. We sell no tickets, hold no refund record, and the event page this deep-links to carries a date, a venue and a vendor link and nothing about refunds, so "tap for" pointed at a page that cannot answer it. Now `The show's off. Contact your ticket vendor for refund details.` |
| `${artistAtVenue} moved to ${dateLabel}.`                         | Recovery   | 46  | **TIGHTEN**                     | `${artistAtVenue} moved to ${dateLabel}` — drop the terminal period; still over cap on long artist strings (see gap note).                                                                                                                                                                                                             |
| `Same tickets, new night. Can't make it? Refund info inside.`     | Recovery   | 58  | **REVERSED 2026-09-20 — STALE** | Same fact: there is no refund info inside. The surviving clause is the one the title cannot say. Now `Same tickets, new night.`                                                                                                                                                                                                        |
| `${artistAtVenue} is sold out.`                                   | Recovery   | 42  | **TIGHTEN**                     | `${artistAtVenue} sold out` (39).                                                                                                                                                                                                                                                                                                      |
| `Official waitlist may open closer to the date — we'll watch it.` | Recovery   | 62  | **TIGHTEN**                     | `Official waitlist may open closer to the date. We'll watch it.` — rule 4 only; the promise stays.                                                                                                                                                                                                                                     |
| `Tickets for ${artistAtVenue} just went back on sale.`            | Chrome     | 66  | **TIGHTEN**                     | `${artistAtVenue}: back on sale` — 26 chars over cap, and "Tickets for" is recoverable from the body.                                                                                                                                                                                                                                  |
| `A batch reopened. They tend to go fast — no pressure though.`    | Chrome     | 59  | **TIGHTEN**                     | `A batch reopened. They tend to go fast, no pressure though.` — rule 4. "no pressure though" survives under rule 1 as the line's color; it passes read-aloud.                                                                                                                                                                          |
| `Tickets for ${artistAtVenue} just dropped.`                      | Chrome     | 55  | **TIGHTEN**                     | `${artistAtVenue} tickets got cheaper` — over cap, and "just" is a rule-9 hedge doing no work.                                                                                                                                                                                                                                         |
| `Cheaper than we last saw. Grab them before they go.`             | Chrome     | 50  | **KEEP**                        | Under cap, reads aloud, no tells.                                                                                                                                                                                                                                                                                                      |
| `${newPrice} tickets for ${artistAtVenue} just went on sale.`     | Obligation | 65  | **TIGHTEN**                     | `${newPrice} tickets for ${artistAtVenue}` — 25 over cap. The price is the point; the "just went on sale" tail is not. Obligation class, so the number itself is defended.                                                                                                                                                             |
| `Down from ${oldPrice}. Cheapest we've seen for this one.`        | Obligation | 57  | **KEEP**                        | A price claim, in scope for rule 4 only, and clean. The file comment already justifies the accuracy of "cheapest we've seen". Defended.                                                                                                                                                                                                |

### `packages/crawler-core/src/lib/spotify-fanout/definitions/copy.ts`

| String                                                 | Class  | Len   | Verdict     | Replacement                                                                                                              |
| ------------------------------------------------------ | ------ | ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `${artist} — new Denver date`                          | Chrome | 33–48 | **TIGHTEN** | `${artist}: new Denver date` — rule 4. Within cap for short artist names, over it above ~23 chars.                       |
| `${venueName} · ${dateLabel}. Added to your Watching.` | Chrome | 51    | **KEEP**    | `·` is a true metadata row. Vocabulary is correct: "Watching", not "Saved".                                              |
| `${venueName} · ${dateLabel}. Want in? Tap to watch.`  | Chrome | 50    | **KEEP**    | "Tap to watch" is not rule-1 obvious-labelling here: a notification has no button, so the instruction is the affordance. |

### Verdict tally

| CUT | TIGHTEN | TOOLTIP | RENAME | KEEP | REVERSED |
| --- | ------- | ------- | ------ | ---- | -------- |
| 0   | 9       | 0       | 0      | 4    | 2        |

The two REVERSED rows were `KEEP` when this audit ran, which is why the original
tally read 6. Both were reversed on 2026-09-20: they were judged as writing and
never checked against the product, which holds no refund record.

Of the 9 TIGHTENs, **6 are pure rule-4 or terminal-punctuation fixes** and 3 are genuine
over-cap trims. Zero cuts, so the 30%-of-strings self-check is trivially clear. No two
replacements share an opening construction. No locked string is proposed for a rewrite of
its meaning, only its punctuation and length.

**Rulebook gap.** The push title cap of 40 chars is **unreachable by construction** for
every `artistAtVenue` template in this file: the variable alone can exceed 40 characters
(`"Godspeed You! Black Emperor at the Mission Ballroom"` is 51), so no amount of editing
the fixed text satisfies the cap. The caps table treats interpolated variables as "one
word", which resolves word caps but says nothing about char caps on interpolated push
strings. The rule needs either a fixed-text-only char budget or an explicit truncation
convention.

---

## Part 3 — Hardcoded JSX strings (convention violations)

`CLAUDE.md` requires every customer-facing string to live in a `definitions/copy.ts`. This
is a **convention list, not a copy-quality list** — no verdicts assigned.

**Method.** All `.tsx` under `apps/web/src`, comments stripped, JSX text nodes and
`placeholder` / `aria-label` / `alt` prop literals extracted. Excluded: anything under an
`admin` path, `__tests__`, `.test.tsx`, className and non-copy prop values, and
punctuation-only glyphs.

### Totals

| Bucket                                                                                        | Count   |
| --------------------------------------------------------------------------------------------- | ------- |
| JSX text nodes, actionable                                                                    | 117     |
| Copy-bearing prop literals (`aria-label`, `placeholder`)                                      | 7       |
| **Actionable total**                                                                          | **124** |
| Decorative labels inside release-note hero art (`components/consumer/release-notes/heroes/*`) | 45      |
| **Raw total found**                                                                           | **169** |

The 45 hero-art strings (`ADMIT ONE`, `DOORS · 8 PM`, `RED ROCKS`, `RUN THE JEWELS`) are
Data class — fictional ticket-stub artwork inside spotlight illustrations, not product
copy. They are listed separately and are **not** convention violations worth chasing.

### By area

| Area                                     | Count | Notes                                                                                                           |
| ---------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| **`app/legal/*` (terms, privacy, beta)** | 44    | Largest offender. Terms 21, privacy 13, beta 10. Obligation-class content living entirely inline.               |
| **`components/settings/*`**              | 45    | `SettingsRouteDesktop.tsx` alone holds 16. Also `SettingsRoute` 6, `DeleteAccountSheet` 8, `EditProfileForm` 6. |
| **`components/consumer/*` (non-hero)**   | 21    | Spread thin across price cards, reporting sheets, submit-price modal.                                           |
| `components/onboarding/steps/*`          | 3     | Includes two `— Hugh` sign-offs (rule-4 exempt attribution).                                                    |
| `app/(protected)/(main)/*` pages         | 4     | Dispute page 2, venue page 2.                                                                                   |
| `theme/*`, `components/brand/*`          | 3     |                                                                                                                 |
| `aria-label` / `placeholder` props       | 7     | See list below.                                                                                                 |

**Worst three areas: `app/legal/*` (44), `components/settings/*` (45), and
`components/consumer/*` non-hero (21)** — together 110 of the 124 actionable strings.

### Full inline-string list

#### `app/legal/terms/page.tsx` (21)

L33 `Concert Crawl` · L36 `Terms of Service` · L39 `Last updated: [date — fill before
launch]` · L42 `These terms are a pre-launch stub and have not been reviewed by legal
counsel…` · L62 service description · L68 event-data disclaimer · L77 account
responsibility · L82 age requirement · L89 content licence · L95 false-content clause ·
L102 `You agree not to:` · L112 bullet dash · L120 IP ownership · L129 billing terms ·
L139 price-lock promise · L145 `Refunds` · L156 `hugh@featherweight.design` · L175
liability limit · L184 termination · L192 governing law · L204
`hugh@featherweight.design` · L214 `Privacy Policy →`

#### `app/legal/privacy/page.tsx` (13)

L33 `Concert Crawl` · L36 `Privacy Policy` · L39 `Last updated: [date — fill before
launch]` · L42 pre-launch stub warning · L70 `We do not sell your data. We do not use it
for advertising.` · L71 no-profiles paragraph · L79 third-party lede · L97 provider
paragraph · L108 `invite_verified` · L128 `You can:` · L145 children's-data paragraph ·
L164 `hugh@featherweight.design` · L174 `Terms of Service →`

Plus the six inline data-collection bullets at L54–L59 and five vendor bullets at L85–L89,
which are string-array literals in the same file rather than JSX text nodes — same
violation, worth folding into the same externalization.

#### `app/legal/beta/page.tsx` (10)

L18 `Concert Crawl` · L21 `Private Beta Agreement` · L24 `Effective date: May 25, 2026` ·
L47 `What to expect` · L77 `Your data` · L92 `Price information` · L104 `Feedback` · L105
`Use the in-app feedback button. We read every submission…` · L112 `Beta ends, full terms
begin` · L128 `Email Hugh directly.`

#### `components/settings/` (45)

- `SettingsRouteDesktop.tsx` (16): L194 `Profile` · L195 `What other fans see when you
submit a price.` · L224 `· joined` metadata row · L231 `anonymous fan` · L231 `. Pick a
handle if you want credit.` · L244 `Edit` · L260 `anonymous fan.` · L276 `Pick a handle`
  · L287 `My submissions` · L314 `← Back to browse` · L342 metadata row · L386 `Plan` ·
  L402 `Appearance` · L405 `Three flavors. Pick the one that hurts your eyes least.` ·
  L436 `Account` · L439 `Your account credentials are managed securely. Click any row to
update.` · L613 `Privacy Policy →` · L624 `Danger zone` · L627 `The exits.`
- `SettingsRoute.tsx` (6): L57 `← Done` · L60 `Settings` · L97 `tap to switch` · L159
  `Operations` · L186 `Admin`
- `DeleteAccountSheet.tsx` (8): L89 / L192 `Delete your account?` · L113 / L219 `DELETE` +
  `to confirm.` · L140 / L248 `Keep my account` · L121 `placeholder="DELETE"`
- `EditProfileForm.tsx` (6): L147 / L158 `← Cancel` · L162 `Edit profile` · L203 `Avatar
color` · L239 `Handle` · L285 `City`
- `MySubmissionsList.tsx` L37 `The next show you go to, drop the price you saw. Two fans
confirm and it goes live.`
- `SubmissionItem.tsx` L102 `+1 cred` · L107 `Someone disputed this. Tap to see what they
saw.`
- `ThemePickerInline.tsx` L56 `Theme` · L79 `tap to switch`
- `WatchingTeaser.tsx` L45 `Watching` · L72 `Coming soon`
- `AccountManagementRow.tsx` L170 `Privacy Policy →`
- `CredChip.tsx` L41 `cred`

#### `components/consumer/` non-hero (21)

`CorroborationSheet.tsx` L232 `face value · no fees` · `CounterSubmitSheet.tsx` L399 `By
submitting you confirm this is accurate to the best of your knowledge. Intentionally false
reports may result in account suspension.` · `SoldOutPriceCard.tsx` L88/L206 `Tickets`,
L132/L243 `Sold out` · `event-card/EventCard.tsx` L168 `tba` ·
`multi-tier/MixedTierCard.tsx` L54 `Tickets` · `multi-tier/MultiTierLiveCard.tsx` L66
`Tickets` · `reporting/EvidenceForm.tsx` L345 `Live after 2 fan confirms · or admin
promotion` · `reporting/PendingReportBanner.tsx` L274/L288 `VIEW`, L308 `Reported by`,
L310 `you` · `reporting/PendingSoldOutCard.tsx` L183 `Tickets` ·
`submit-price/SubmitPriceModal.tsx` L867 `pending` + `until 2 fans confirm.` ·
`watching/DeltaTag.tsx` L52 `flat`

#### Other (10)

`app/(protected)/(main)/events/[id]/submissions/[submissionId]/dispute/page.tsx` L46 `←
Cancel`, L49 `Dispute price` · `app/(protected)/(main)/venues/[slug]/page.tsx` L185
`Directions`, L218 `About` · `components/brand/cc-wordmark/CCWordmark.tsx` L19 `crawl.` ·
`components/onboarding/steps/FounderNote.tsx` L60 `— Hugh` ·
`components/onboarding/steps/WhatItDoesntYet.tsx` L48 `soon` ·
`components/onboarding/steps/YoureIn.tsx` L82 `— Hugh` · `theme/ThemeSwatch.tsx` L92
`active`, L121 `Habstrakt`

#### Copy-bearing prop literals (7)

`settings/SettingsRouteDesktop.tsx:656` `aria-label="Edit profile"` ·
`settings/DeleteAccountSheet.tsx:121` `placeholder="DELETE"` ·
`consumer/CorroborationSheet.tsx:647` `aria-label="Verification method"` ·
`consumer/reporting/ConfirmReportSheet.tsx:477` `aria-label="Confirmation method"` ·
`consumer/reporting/ReportSheet.tsx:416` `aria-label="Report type"` ·
`consumer/reporting/EvidenceForm.tsx:427` `aria-label="Evidence method"` ·
`consumer/theme-toggle/ThemeToggle.tsx:37` `aria-label="Theme"`

These are A11y class — exempt from cuts, but still convention violations.

### Inline strings that additionally contain an em-dash (rule 4, in scope)

These render to users from inline literals, so unlike `releases.ts` they are **not** a
frozen record. 12 real findings; the rest of the em-dash hits in `.tsx` are either the
`'—'` empty-value placeholder (Data class, correct) or attribution sign-offs (rule 4
exception).

| File:line                                                            | String                                                          | Note                                                                                                                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/layout.tsx:56`                                                  | `Denver concert calendar — find shows at your favorite venues.` | Site meta description. Replace dash with a period.                                                                                                           |
| `app/legal/privacy/page.tsx:39`, `app/legal/terms/page.tsx:39`       | `Last updated: [date — fill before launch]`                     | Also an unfilled placeholder shipping to users. Worth its own issue.                                                                                         |
| `app/legal/privacy/page.tsx:54–59`                                   | Six data bullets, each `X — reason`                             | Colon reads better than the dash in every one.                                                                                                               |
| `app/legal/privacy/page.tsx:85–89`                                   | Five vendor bullets, each `Vendor — role`                       | Same shape.                                                                                                                                                  |
| `components/consumer/watching/SourcePill.tsx:12`                     | `Resale price — secondary market, not face value`               | Obligation class; rule 4 still applies. Comma.                                                                                                               |
| `components/consumer/watching/SourcePill.tsx:13`                     | `Community price — submitted by a fan`                          | Comma.                                                                                                                                                       |
| `components/settings/ProfileEntryAvatar.tsx:19`                      | ``aria-label={`@${handle} — settings`}``                        | A11y; rule 4 explicitly covers `aria-label`s.                                                                                                                |
| `components/consumer/filter-bar/TasteUpsellSheet.tsx:81`             | `— {bullet.sub}`                                                | A dash in front of a sentence, i.e. the case rule 4 names as _not_ attribution.                                                                              |
| `app/legal/beta/page.tsx:52,59,67`, `privacy:62,92,137`, `terms:112` | `<span>—</span>` bullet glyphs                                  | Decorative list markers, not prose. Arguably out of scope, but they are read aloud by screen readers as "em dash" and would be better as real `<li>` markup. |

**Out of scope / correct as-is:** the `'—'` fallback for a missing capacity or set time
(`venues/[slug]/page.tsx:79,201`, `events/[id]/page.tsx:139`, `PublicEventDetail.tsx:71`,
`SoldOutPriceCard.tsx:117`, `VenueRow.tsx:121,191`, `VenueFeatureCard.tsx:183,345`,
`SettingsRouteDesktop.tsx:224,342`) is Data-class "no value" notation, not prose. The nine
`title: 'X — Concert Crawl'` page-metadata strings are browser-tab titles following a
single consistent pattern; flag as one decision, not nine findings. Console/log strings in
`events/page.tsx:192` and `NotificationsSection.tsx:102,187` are not user-facing.

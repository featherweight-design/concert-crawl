# Copy audit 04 — settings, auth, landing, app shell

**Mode:** propose (findings only, no files edited).

**Files covered (6, complete — no sampling):**

- `apps/web/src/components/settings/plan/definitions/copy.ts` (~71 strings)
- `apps/web/src/components/settings/plan/manage/definitions/copy.ts` (~74)
- `apps/web/src/components/settings/notifications/definitions/copy.ts` (~24)
- `apps/web/src/app/auth/code/definitions/copy.ts` (~20)
- `apps/web/src/app/_components/definitions/copy.ts` (~27)
- `apps/web/src/components/brand/landing-poster/definitions/copy.ts` (3)

**Total strings enumerated:** ~219

**Renderers opened for adjacency (Process step 3):** `PlanCard.tsx`, `ManageSheet.tsx`,
`CancelFlow.tsx`, `DowngradeFlow.tsx`, `ChangesDisclosure.tsx`,
`NotificationsSection.tsx`, `auth/code/page.tsx`, `LandingClientShell.tsx`,
`LandingPoster.tsx`.

## Verdict tally

| Verdict | Count |
|---|---|
| CUT | 3 |
| TIGHTEN | 21 |
| RENAME | 4 |
| TOOLTIP | 1 |
| KEEP | ~190 |

Class mix of the non-KEEP rows: Obligation 14, Chrome 8, Recovery 4, Teaching 3.
Rule 4 (no em-dashes) drives 17 of the 29. Rule 10 drives all 4 RENAMEs.

---

## Findings

| File | String | Class | Verdict | Replacement | Adjacency note |
|---|---|---|---|---|---|
| plan/copy.ts | All 12 `punchline` values, e.g. `'—— No drama. It just needs a working card.'`, `'—— We don't forget that.'` | Obligation / Teaching | TIGHTEN | Drop the leading `——` on all 12: `'No drama. It just needs a working card.'` | `PlanCard.tsx` renders `content.punchline` as a mono italic accent-coloured `<span>` directly under the body `<p>`, with no attribution context. Rule 4's narrow exception covers attribution (`'— Hugh'`); a dash in front of a sentence is exactly the case the rule names as a violation. The italic mono treatment already does the visual work the dash is doing. **Locked:** these are verbatim from `design_handoff_monetization_lifecycle/lifecycle-plan-cards.jsx`; proposing, not applying. |
| plan/copy.ts | `pastDue.headline`: `'Heads up — your card got declined.'` | Obligation | TIGHTEN | `'Heads up. Your card got declined.'` | Renders as the `<h2>` with the `Payment failed` chip already in the eyebrow row above it, so the "heads up" framing is the third warning signal on the card; keeping it is fine, the dash is not. |
| plan/copy.ts | `pastDue.body`: `"...We'll keep retrying for about a week — pop in a fresh card and nothing changes."` | Obligation | TIGHTEN | `"...We'll keep retrying for about a week. Pop in a fresh card and nothing changes."` | Body `<p>` sits above the `railSub` `'Stripe is retrying the charge'`, which restates the retry fact in machine terms. Rail is the Obligation-load-bearing one; body is the readable one. Both may stay, the dash may not. |
| plan/copy.ts | `gifted.body`: `"...covers everything Premium — Watching, follows, alerts, price drops, the lot..."` | Obligation | TIGHTEN | `"...covers everything Premium: Watching, follows, alerts, price drops, the lot..."` | Genuinely subordinate list clause, so a colon is the right rule-4 replacement. |
| plan/copy.ts | `trial.early.body`: `"...No card on file — we'll nudge you before it ends..."` | Obligation | TIGHTEN | `"...No card on file, and we'll nudge you before it ends..."` | The eyebrow directly above already says `· no card yet`. Rule 7 says state the promise once, but the eyebrow is a mono metadata row and the body carries the "we'll nudge you" half, so the restatement survives on the exception. Only the dash goes. |
| plan/copy.ts | `trial.endsTomorrow.eyebrow`: `'Trial ends tomorrow · lock it in'` | Chrome | TIGHTEN | `'Day 13 of 14 · no card yet'` (or reuse the `early.eyebrow` shape) | `PlanCard.tsx` renders the eyebrow row and the status rail on the same card, and `railLabel` is the literal string `'Trial ends tomorrow'`. Same fact twice, ~4 elements apart. Rule 3: the rail is the higher-signal element here, so the eyebrow re-scopes to location/state. |
| plan/copy.ts | `trial.endsToday.eyebrow`: `'Trial ends today · lock it in'` | Chrome | TIGHTEN | `'Day 14 of 14 · no card yet'` | Same defect as the row above: `railLabel` is `'Trial ends today'`. |
| plan/copy.ts | `trial.endsTomorrow.body`: `"...you drop to Free — alerts, follows, and price drops switch off..."` | Obligation | TIGHTEN | `"...you drop to Free: alerts, follows, and price drops switch off..."` | Subordinate list, colon. |
| plan/copy.ts | `cancelGrace.headline` fallback: `` `${tierName} — winding down.` `` | Obligation | TIGHTEN | `` `${tierName} is winding down.` `` | Only reachable when `periodEnd` is null (defensive path), but it still renders as an `<h2>`. The `Winding down` chip renders in the eyebrow row above it, so the headline is already echoing the chip; the dash makes it read like a fragment. |
| plan/copy.ts | `cancelGrace.body`: `"You canceled — no hard feelings..."` | Obligation | TIGHTEN | `"You canceled. No hard feelings..."` | Body `<p>`; the "no hard feelings" beat is the card's warmth and passes read-aloud, so it stays under rule 1. Dash only. |
| plan/copy.ts | `activeSupporter.body`: `"...You're chipping in for the stuff we run on existing infrastructure."` | Chrome | TIGHTEN | `"...You're chipping in for the stuff that's already paid for."` | Rule 6 machinery: "existing infrastructure" is an internal cost-model term with no trust or action payload for the user. The adjacent `activePremium.body` makes the same distinction in plain language ("the stuff that actually costs us money to run"), so the vocabulary already exists one card over. |
| plan/copy.ts | `activePremium.body`: `'Follows, alerts, price drops — the stuff that actually costs us money to run.'` | Chrome | TIGHTEN | `'Follows, alerts, price drops. The stuff that actually costs us money to run.'` | Rule 4. Keeps the trust claim (rule 6 explicitly protects cost honesty). |
| plan/copy.ts | `activeFounder.body`: `"...You showed up at the start — even when we charge new users double."` | Obligation | TIGHTEN | `"...You showed up at the start, even when we charge new users double."` | Genuinely subordinate, comma. |
| plan/copy.ts | `free.body`: `"Browse, search, save shows, submit prices — all included..."` | Chrome | RENAME | `"Browse, search, watch shows, submit prices. All included..."` | **Rule 10 violation.** "There is no 'Saved' concept in this product." Grepped `rg -F "save shows"`: 3 app hits (this file, `legal/terms/page.tsx:78`, `releases.ts:707`) plus design handoffs. No test or E2E assertion. The terms page and the frozen release entry are out of this slice's scope; only this string renders on the plan card. Dash goes in the same edit. |
| plan/copy.ts | `freePostTrial.body`: `"...Save shows, browse, submit prices — all still here..."` | Chrome | RENAME | `"...Watching, browsing, and prices are all still here..."` | Same lock. Note `CANCEL_FLOW_COPY.bodySupporter` already uses exactly this correct construction ("Watching, browsing, and prices were always free"), so the fix is a conform, not a coinage. |
| plan/copy.ts | `freePostCancel.body`: `"Browsing, saved shows, and submitting prices are still yours — always..."` | Obligation | RENAME | `"Browsing, Watching, and submitting prices are still yours, always..."` | Same lock, plus rule 4. Renders as the card body directly above the punchline `"—— Door's open. Your follows are safe for 90 days."` |
| manage/copy.ts | `MANAGE_SHEET_COPY.subtitle`: `'...Change it, pause it, or just grab a receipt.'` | Chrome | TIGHTEN | `'...Change it, cancel it, or grab a receipt.'` | **Adjacency defect, highest-value row in this file.** `ManageSheet.tsx` renders exactly six rows: Change plan, Cancel subscription, Payment method, Invoices & receipts, Billing email, Tax & region. There is no pause anywhere in the product; the subtitle advertises an action the sheet does not offer. Also carries the rule 9 hedge "just". Grepped `rg -F "Change it, pause it, or just grab a receipt"`: 2 app hits (both branches of this ternary), plus `lifecycle-manage.jsx` and `lifecycle-manage.md`. No tests. **Locked** in `docs/superpowers/design-tables/lifecycle-manage.md:182-184`; naming the lock rather than applying. |
| manage/copy.ts | `MANAGE_SHEET_COPY.eyebrow`: `` `Manage · ${tierName}` `` | Chrome | TIGHTEN | `` `Subscription · ${tierName}` `` | Rule 3 triad collision, verified in `ManageSheet.tsx`: the `RailHeader` eyebrow renders ~15px above an `<h2>` reading `Manage subscription`, and on wide the `TierBadge` renders the tier a third time in the same header row. Title survives; eyebrow re-scopes to location. |
| manage/copy.ts | `CANCEL_FLOW_COPY.bodyPremiumUp`: `"...you roll to Free — and your history, follows, and alerts stay safe for 90 days in case you come back."` | Obligation | TIGHTEN | `"...you roll to Free. Your history, follows, and alerts stay safe for 90 days in case you come back."` | Rule 4 only. This is the canonical, highest-level statement of the 90-day promise and it DEFENDS: it is a data-retention disclosure inside a destructive-action confirmation. Do not cut. |
| manage/copy.ts | `CANCEL_FLOW_COPY.retention.body`: `"...You'd switch off alerts, follows, and price drops — and your history, follows, and alerts stay safe for 90 days either way."` | Obligation | CUT (trailing clause) | `"Supporter keeps you chipping in for less. You'd switch off alerts, follows, and price drops."` | **Rule 7, confirmed on the surface.** `CancelFlow.tsx` renders `bodyPremiumUp` inside the `InfoCard`, then the retention nudge card immediately below it: the identical 90-day promise appears twice, ~80px apart, with the second copy also self-contradicting ("switch off alerts, follows" then "your follows and alerts stay safe"). The general form above already covers it; there is no stronger per-item claim here, so the exception does not apply. Grepped `rg -F "and your history, follows, and alerts stay safe for 90 days either way"`: 1 app hit, plus `lifecycle-flows.md:339/797` and `lifecycle-flows.jsx:141`. No tests, no E2E. **Locked** in the design table; propose to Design. |
| manage/copy.ts | `CANCEL_FLOW_COPY.retention.headline`: `` `If it's the ${priceText} — Supporter's $2.` `` | Obligation | TIGHTEN | `` `If it's the ${priceText}, Supporter's $2.` `` | Subordinate conditional, comma. Renders as the bold line under the `Before you go` eyebrow + Supporter `TierBadge`. |
| manage/copy.ts | `UPGRADE_FLOW_COPY.subhead`: `'The stuff that costs us money to run — switched on the second you confirm.'` | Chrome | TIGHTEN | `'The stuff that costs us money to run, switched on the second you confirm.'` | Rule 4. |
| manage/copy.ts | `UPGRADE_FLOW_COPY.math.bodyBefore`: `'Premium unlocks now. '` | Obligation | CUT | `''` (start the sentence at the interpolated amount) | Rule 7/8. On one screen `UpgradeFlow` renders, in order: subhead "switched on the second you confirm", this "Premium unlocks now", `unlocksLabel` "Unlocks right away", and `finePrint` "Effective immediately". Four statements of immediacy. The math card exists to explain the proration, not to re-announce the timing; the other three all say something the general form cannot. |
| manage/copy.ts | `CHANGES_DISCLOSURE_COPY.stays[0]`: `'Watching — your saved shows (Free, never purged)'` | Obligation | RENAME | `'Watching (Free, never purged)'` | **Rule 10 plus rule 1.** "saved shows" is the banned synonym for the term it is glossing in the same string, and the gloss labels the obvious: the row sits under a `Stays on` eyebrow in a list whose other items are self-describing ("Concert history — every show you've logged"). Grepped `rg -F "Watching — your saved shows (Free, never purged)"`: 1 app hit, plus `lifecycle-flows.md:646/747/828` and `lifecycle-flows.jsx:176`. No tests. **Locked** in the design table; propose. |
| manage/copy.ts | `CHANGES_DISCLOSURE_COPY.stays[1]`: `"Concert history — every show you've logged"` | Obligation | TIGHTEN | `"Concert history: every show you've logged"` | Rule 4. Renders in the same expanded list as the row above, so both should move together or neither. |
| manage/copy.ts | `CHANGES_DISCLOSURE_COPY.restoreNote`: `"Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared."` | Obligation | KEEP → TOOLTIP | unchanged | Useful-but-hideable: it is the third appearance of the 90-day window on the downgrade screen (`summary` collapsed label, `offLabel` "Switches off · safe 90 days", then this). It is a data-loss disclosure so it cannot be cut, but it is the natural candidate if a tooltip/disclosure treatment ever ships. Recording per rule 5; no treatment invented. |
| notifications/copy.ts | `subs[0].detail`: `"Price drops, sell-outs, date changes, cancellations — for shows you're watching."` | Chrome | TIGHTEN | `"Price drops, sell-outs, date changes, cancellations, for shows you're watching."` | Renders as the sub-line under the `Watch updates` toggle label. Vocabulary is correct ("shows you're watching"). Dash only. |
| notifications/copy.ts | `denied.sub`: `"...and we can't override that — only you can..."` | Recovery | TIGHTEN | `"...and we can't override that. Only you can..."` | Recovery DEFENDS, so the "only you can" restatement stays (rule 8 does not apply to Recovery, and it is the sentence that tells the user the fix is theirs). `NotificationsSection.tsx` renders this under a `Blocked` badge + title, with the unblock link directly below, so the path out is complete. Dash only. |
| notifications/copy.ts | `iosHint`: `"On iPhone, notifications only work from the home-screen app — which you've got. Nice."` | Chrome | TIGHTEN | `"On iPhone, notifications only work from the home-screen app. You've got it. Nice."` | Rule 4. The "Nice." is colour and passes read-aloud, so it stays. Note this only renders when `isIosSafari() && isStandalone() && !masterOn`, i.e. it congratulates the user for a state they can see. Borderline rule 1, but it is the only warmth on the section, so KEEP the beat and fix the dash. |
| notifications/copy.ts | `toggleError.subscribe`: `"Couldn't turn on push right now — something went wrong wiring up notifications. Try again in a minute; if it keeps failing, something's off on our end."` | Recovery | TIGHTEN | `"Couldn't turn on notifications right now. Try again in a minute; if it keeps failing, something's off on our end."` | Rule 4 plus rule 6 machinery: "wiring up notifications" is the diagnosis restated in internal terms and adds nothing the first clause did not. Recovery translation preserved: the user still learns what broke and what to do. Also drops the internal word "push", which does not appear anywhere else the user can see on this screen (the visible toggle label is `Push notifications`, so "push" alone is jargon). |
| notifications/copy.ts | `toggleError.generic`: `'Something went sideways turning that on. Try again; if it keeps happening let us know.'` | Recovery | TIGHTEN | `'That didn't turn on. Try again; if it keeps happening, let us know.'` | Renders in the same `role="alert"` slot as `toggleError.subscribe`, so the two must not share an opening. "Something went sideways" is cute where Recovery copy should be honest (Voice: "Your bank said no", never "Oops!"). Missing comma before "let us know" fixed in the same pass. |
| auth/code/copy.ts | `hint.empty`: `'Format: BETA-XXXX-XXXX'` | Chrome | CUT | (render nothing when the field is empty) | **Strongest adjacency finding in the slice.** `page.tsx` renders the format string three times simultaneously on an empty form: in `description` + `codeFormat` (mono span), as the input `placeholder`, and as this hint directly below the input. Rule 1: labelling the obvious. Grepped `rg -F "Format: BETA-XXXX-XXXX"`: 1 app hit (this file), 1 unrelated code comment in `apps/api/src/routes/admin/invite-codes.ts:14`, 1 historical plan doc. No tests, no E2E. `errors.invalid_format` already restates the format at the moment it actually helps. |
| auth/code/copy.ts | `description`: `'Concert Crawl is invite-only right now. Your code looks like'` | Teaching | KEEP | unchanged | Noted for the record: this is a dangling fragment completed by the JSX (`{copy.description}{' '}<span>{copy.codeFormat}</span>.`). Not a copy defect, but it means the string is unreadable in isolation and any future edit has to preserve the trailing-fragment shape. |
| landing `_components/copy.ts` | `waitlist.form.footerNote`: `"No spam. We'll only email when there's beta access."` | Teaching | TIGHTEN | `"No spam."` | Rule 8, verified on the surface: `waitlist.form.body` two elements above already says `"we'll ping you when there's room"`, and the success body says `"We'll email you the moment a beta slot opens up."` The only fact this note adds is "no spam"; the rest is the third statement of the same promise. Grepped `rg -F "No spam. We'll only email when there's beta access."`: 1 app hit plus 7 design-handoff prototypes. No tests. |
| landing `_components/copy.ts` | `waitlist.form.submitButton`: `'Add me to the list'` | Chrome | KEEP | unchanged | Flagged and dismissed: the flow says "Join the waitlist" (CTA) → "Get on the list" (heading) → "Add me to the list" (submit). Three phrasings of one idea, which reads like drift, but each sits in a different element doing a different job and the first-person submit is the voice. Within cap (4 words, button cap is 3 — **cap breach recorded, not actioned**, since rule 2 says a breach alone never justifies a cut and the alternative "Add me" loses the joke). |

---

## Locked strings I did not touch

Every row above is a proposal. These specific items carry an explicit lock and must go back to
Design rather than being edited in place:

1. **The 12 `punchline` values in `plan/copy.ts`** — verbatim from
   `design/design_handoff_monetization_lifecycle/lifecycle-plan-cards.jsx` and the #782
   failure/a11y handoff. The `——` prefix is a design device across all twelve, so this is a
   single Design decision, not twelve edits.
2. **`MANAGE_SHEET_COPY.subtitle`** — locked verbatim in
   `docs/superpowers/design-tables/lifecycle-manage.md:182-184`. The "pause it" defect is a
   product-accuracy issue and needs Design's call, not a copy edit.
3. **`CANCEL_FLOW_COPY.retention.body`** — locked in
   `docs/superpowers/design-tables/lifecycle-flows.md:339` and `:797`. The proposed CUT removes
   a clause the design table names explicitly.
4. **`CHANGES_DISCLOSURE_COPY.stays[0]`** — locked in `lifecycle-flows.md:646`, `:747`, `:828`.
   This one is worth escalating regardless of the lock, because the lock itself encodes a
   rule-10 vocabulary violation ("saved shows"), which means the design tables need the fix
   too or it will reappear.
5. **`NOTIFICATIONS_COPY.subs[*]` and the empty/denied states** — the file header states these
   passed the #782 voice bar during the 2026-07-18 design workshop and were locked in the
   READINESS review, with an explicit "do not rewrite". Only the rule-4 dash in `subs[0].detail`
   is proposed; every other locked string in that block is KEEP.
6. **`LANDING_POSTER_COPY` (all 3 strings)** — A11y class, EXEMPT FROM CUTS. `showLinkLabel`
   carries the entire offer for screen-reader users because `LandingPoster.tsx` renders the
   artist, venue and date as decorative cropped type inside an `IdentityArt` canvas. Untouched.

## Self-check

- [x] Every CUT/RENAME literal grepped with `rg -F`. Non-app references are design handoffs,
      design tables and historical plan docs only. **Zero test or E2E assertions** on any
      proposed CUT or RENAME (`PlanPanel.test.tsx` and `resolve-tier-cta.test.ts` mention
      "Manage subscription" in test *names* only, and that string is KEEP anyway).
- [x] No surface loses more than 30% of its strings. Worst case is `auth/code/copy.ts` at 1 CUT
      of ~20 strings (5%).
- [x] No two replacements share an opening construction. Checked specifically across the two
      `toggleError` rows, which render in the same alert slot.
- [x] Every replacement re-read aloud.
- [x] DEFEND rows changed only with a stated reason: all 14 Obligation changes are rule-4 or
      rule-10 (the two near-universal rules), except `retention.body` and `math.bodyBefore`,
      which are argued from rule 7 with the duplicate located on the rendered surface.
- [x] Nothing locked overruled. Six locks named above, all proposed rather than applied.
- [x] Rewrite ratio: 3 of 24 CUT/TIGHTEN rows (12.5%) touch strings that were otherwise fine
      (`activeSupporter.body`, `toggleError.generic`, `iosHint`). Under the 20% bar, so this is
      an edit rather than a rewrite.

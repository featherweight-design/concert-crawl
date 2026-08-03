# 08 — Editorial queue (Batch C)

**What this is:** the copy-audit rows that need *your* call, not an engineer's. Everything mechanical (em-dashes, punctuation) is already in flight as PRs #1400/#1401/#1402. Everything factually broken (dead keys, contradictions, unreachable states) is already filed as issues #1386–#1397. What's left is editorial: does this string earn its place, and if not, what should it say?

**How to answer:** for each row, reply with the row ID and one of

- **yes** — take the proposed replacement as written
- **no** — leave the current string alone
- **other: "…"** — your wording wins, I'll use it verbatim

**Bulk shortcuts.** Groups marked 🚀 are one decision, not N. Say `C3 all yes` and I'll take the whole group. Groups without the rocket have real variation inside — skim them.

**🔒 = locked upstream.** The string is specified verbatim in a design table or a merged handoff. Changing the code alone is not a fix: the next time that handoff is applied the violation regenerates. These need the design table edited too, so they cost roughly double. Each one names its locking file. If you're triaging by effort, do the unlocked rows first.

**Verbatim note.** Every "Current" string below is grep-verified against `origin/main` at `17d66280`. Where batch B is about to change the punctuation, the row says so — your decision is only about the *substance* underneath.

---

## Group A — Rule 7: one promise, stated once 🚀 (per cluster)

Rule 7: state a promise at the highest level it's true, once. Repeating it doesn't reassure — it signals the writer doesn't believe you heard it. Each cluster below is one decision: **keep the anchor, cut the echoes.**

### A1 — The Founder price promise, stated **five** times 🚀

The audit counted four. There's a fifth in the email atoms.

| # | File:line | Current (verbatim) | Adjacency |
|---|---|---|---|
| 1 | `apps/web/src/components/consumer/tier-picker/definitions/copy.ts:52` | `'Tap a tier to compare · cancel any time · your price never goes up'` | Sub-line directly under the picker eyebrow, above the three tier cards |
| 2 | `apps/web/src/components/consumer/tier-picker/definitions/copy.ts:136` | `'$3/mo — never goes up, ever'` | The Founder card's own price line |
| 3 | `apps/web/src/components/consumer/tier-picker/definitions/copy.ts:278` | `"You got in before the rest. $3 a month for as long as you're here — even when everyone else is paying double."` | Founder confirmation body, post-checkout |
| 4 | `apps/api/src/emails/templates/welcome-paid.ts:155` | `` `Founder #${founderSeatNumber} of 100 — $3/mo, never goes up, ever.` `` | Seat line in the welcome email body |
| 5 | `apps/api/src/emails/atoms.ts:230` | `$3 / mo — never goes up, ever` | `seatStamp` atom — renders *in the same email* as row 4, adjacent to it |

**Verdict:** TIGHTEN (cluster). Rule 7 names Founder's price lock as the one legitimate exception — it's the entire product promise — but the exception licenses repetition across *surfaces*, not four restatements on one screen and two in one email.

**Proposed:**

- Keep **#2** (the card price line) and **#3** (the confirmation, which is doing emotional work the price line can't).
- Cut the tail of **#1** → `'Tap a tier to compare · cancel any time'`
- Cut **#5**'s clause, leaving the stamp as `$3 / mo` — #4 already says "never goes up, ever" two lines away in the same email.

Batch B (#1402/#1401) already normalises the dashes in #2/#4/#5. Your call is only the deletions.

---

### A2 — The cancel-flow 90-day promise, said twice and contradicting itself 🔒

| Where | Current |
|---|---|
| `apps/web/src/components/settings/plan/manage/definitions/copy.ts` — `CANCEL_FLOW_COPY.retention.body` | states data is kept 90 days |
| same file — `CHANGES_DISCLOSURE_COPY.stays[0]` | `'Watching (Free, never purged)'` (line 142) — **already resolved in #1402**, code and design table both |

**Adjacency:** these render in the same cancel sheet, one scroll apart. One says 90 days, the other says never purged. A user reading both learns we don't know.

**🔒 Locked:** `docs/superpowers/design-tables/lifecycle-flows.md:339` and `:797` (retention body); `:646`, `:747`, `:828` (stays[0]). The lock text itself encodes the "saved shows" vocabulary violation — see B1.

**Verdict:** DEFECT-adjacent TIGHTEN. Two promises, incompatible, both load-bearing (Obligation class — these DEFEND, so neither can just be cut).

**Proposed:** make the scope explicit rather than deleting either.

- `stays[0]` → `'Watching: your watched shows (Free, never purged)'`
- retention body keeps the 90 days but scopes it: 90 days applies to *Premium* data (history, alerts, follows), not to Watching.

**This one needs a ruling from you on the actual policy before anyone writes the string.** Which is true: is Watching never purged, or is everything 90 days? Answer that and the copy follows.

---

### A3 — Trial eyebrows restating the rail 🚀

| File:line | Current |
|---|---|
| `apps/web/src/components/settings/plan/definitions/copy.ts:52` | `eyebrow: 'Trial ends tomorrow · lock it in'` |
| same file (endsToday variant) | same shape, "today" |

**Adjacency:** the eyebrow sits directly above a rail label that already says the trial is ending, plus a CTA that already says "lock it in."

**Verdict:** TIGHTEN — rule 3 (eyebrow/title/body triad; the title survives a collision, the eyebrow doesn't) plus rule 8 (restating clause).

**Proposed:** `eyebrow: 'Trial ends tomorrow'` / `'Trial ends today'`. The CTA carries the imperative.

---

### A4 — The Watching triple

Three strings on the same surface all explain that Watching is free.

| File:line | Current |
|---|---|
| `apps/web/src/components/consumer/definitions/copy.ts:812` | `'Watching is on the Free tier. No card, no trial.'` |
| `…/settings/plan/definitions/copy.ts:129` | `"Browse, search, save shows, submit prices — all included…"` |
| `…/manage/definitions/copy.ts:142` | ~~`'Watching — your saved shows (Free, never purged)'`~~ — **done in #1402**, no decision needed |

**Verdict:** TIGHTEN. Rule 7 — the free-ness of Watching is one promise.

**Proposed:** keep `:812` as the anchor (it's the teaching surface). The other two stop asserting free-ness and just list the feature. `:129` → `"Browse, search, watch shows, submit prices — all included…"` (also fixes B1).

---

### A5 — Email promise clusters 🚀

Each row is a promise restated N times inside a **single** email.

| ID | Template | Promise | Times | Proposed |
|---|---|---|---|---|
| A5a | `dunning-3-final-warning.ts` | "nothing gets deleted" | 3 | Keep the body statement (`:25`, `'Your account and saved shows stay put…'` — see B1 for the wording). Cut the subject echo and the footer echo. |
| A5b | `card-expiring.ts` | "no interruption" | 4 | Keep once, in the body. Preheader states the *action* (update your card), not the reassurance. |
| A5c | `gifting-ending-notice.ts` | eyebrow/title/body all say the gift is ending | 3 | Rule 3: title survives. Eyebrow → `Gift ending`. Body opens with what happens next, not a restatement. |
| A5d | `welcome-gifted.ts` | "just enjoy it" | 2 | Cut the second. Also rule 9 — "just" is a hedge. |
| A5e | `winback.ts` 🔒 | "no countdown / no pressure" | 2 | Keep once. **🔒 shape locked** by the winback design handoff — the cut is inside a locked block. |
| A5f | upgrade-flow emails | "takes effect immediately" | 4 across the flow | Keep in the confirmation only. The other three are pre-commitment surfaces where it reads as anxiety-management. |

---

## Group B — Vocabulary RENAMEs 🚀

Locked vocabulary (CLAUDE.md): shows are **watched**, artists are **followed**. **There is no "Saved" concept in this product.** Every row below is the same decision.

### B1 — "saved shows" / "save shows" → "watched shows" / "watch shows"

| # | File:line | Current fragment | Note |
|---|---|---|---|
| 1 | `settings/plan/manage/copy.ts:142` | ~~`'Watching — your saved shows (Free, never purged)'`~~ | ✅ **Already fixed in #1402** → `'Watching (Free, never purged)'`. Copilot caught it; the design table `lifecycle-flows.md:646/:747/:828` was edited in the same commit so it cannot regenerate. No decision needed. |
| 2 | `settings/plan/copy.ts:129` | `"Browse, search, save shows, submit prices…"` | Not in batch B at all |
| 3 | `lifecycle-nudges/copy.ts:11` | `"…browsing and your saved shows stay put; alerts, follows, and history are paused…"` | 🔒 **Two locks conflict here.** The lifecycle design table locks the string; CLAUDE.md locks the vocabulary. Only you can break the tie. |
| 4 | `spotify/copy.ts:151` | `'Anything you already saved is yours — unlinking never touches it.'` | |
| 5 | `spotify/copy.ts:186` | `"…Your saved shows are safe — we just can't spot new matches until you reconnect."` | Also rule 9: "just" |
| 6 | `spotify/copy.ts:298` | `"…Your saved shows are untouched — reconnect to bring taste back."` | |
| 7 | `spotify/copy.ts:317` | `eyebrow: 'NICE — FIRST ONE SAVED'` | |
| 8 | `emails/templates/cancellation-ack.ts:31` and `:49` | `Everything you've saved stays saved.` | 🔒 **Locked verbatim** in `docs/superpowers/design-tables/monetization-email-brand-pass.md` (both the lifecycle and notices blocks) and in two handoff prototypes. Copilot flagged it on #1401; I held it for you because the line is deliberate wordplay, not an oversight. |
| 9 | `emails/templates/gifting-ending-notice.ts:35` and `:52` | `Everything you've saved stays saved.` | same string, second template, same lock |
| 10 | `emails/templates/dunning-3-final-warning.ts:25` | `'Your account and saved shows stay put…'` | Also flagged by Copilot on #1401 |
| 11 | `apps/web/src/app/legal/terms/page.tsx:78` | hardcoded JSX | **Not in the original audit** — found on sweep |
| 12 | `apps/web/src/app/legal/privacy/page.tsx:120` | hardcoded JSX | not in the audit |
| 13 | `apps/web/src/app/legal/beta/page.tsx:85` | hardcoded JSX | not in the audit |

**Note on rows 8–10.** Copilot flagged all three during the batch-B email review (#1401) and argued they should be fixed there. I pushed back: the sentence is a designed pun (`saved stays saved`), losing it is an editorial loss, and the string is locked in a design table so a code-only fix regenerates. It belongs to you, not to a mechanical pass.

**Proposed:** mechanical substitution — `saved shows` → `watched shows`, `save shows` → `watch shows`, `first one saved` → `first one watched`, `Everything you've saved stays saved.` → `Everything you're watching stays put.`

🚀 **`B1 all yes` takes all thirteen**, including reopening the three locked design tables. If you'd rather not touch design tables this round, say `B1 unlocked only` and I'll do 2, 4–7, 11–13.

**Not changing:** `apps/web/src/lib/definitions/releases.ts:752` — `'Watching list — save shows you care about.'` Release notes are a frozen historical record.

### B2 — "follow the price" / "You follow" on shows

Following is for **artists**. Prices and shows aren't followed.

| # | File:line | Current |
|---|---|---|
| 1 | `onboarding/copy.ts:60` | `"Watch shows you're tracking — we follow the price"` |
| 2 | `consumer/copy.ts:103` | `"Add a show to follow it. Soon, we'll watch the price for you…"` |
| 3 | `spotify/copy.ts:92` | `"We'll mark matching shows with a 'You follow' badge as you browse…"` |

**Proposed:**

1. → `"Watch shows you care about — we watch the price"`
2. → `"Watch a show to track it. Soon we'll watch the price for you…"` (the "Soon" half is issue #1391, don't re-decide it)
3. → the badge is on a *show* whose *artist* you follow, so: `"We'll mark shows by artists you follow as you browse…"` — and the badge itself should read `Artist you follow`, not `You follow`.

---

## Group C — Standalone CUTs

### C1 — Dead keys 🚀

Eight keys with no reader. Not editorial in any real sense — included because deleting copy needs your nod.

| File:line | Key |
|---|---|
| `notifications/copy.ts:21` | `pipLabel` |
| `notifications/copy.ts:34` | `slowRetry` |
| `notifications/copy.ts:46` | `emptyHint` |
| `notifications/copy.ts:51` | `unreadTag` (`'New'`) |
| `reporting/copy.ts:17` | `eyebrowContext` |
| `reporting/copy.ts:141` | `confirmsAndTime` |
| `reporting/copy.ts:171` | `confirmsToGo` |
| `consumer/copy.ts:1116` | `watchlistComingSoon` (`'Coming soon'`) |

**Proposed:** delete all eight. 🚀 `C1 all yes`.

⚠️ One caveat on `watchlistComingSoon`: its sibling `watchlistRow: 'Watching'` (`:1115`) *is* live. Deleting the "Coming soon" chip means the row renders with no status hint. That's the correct outcome — the feature isn't coming soon, it's here — but flagging it so it isn't a surprise.

### C2 — The `venuesPage` duplicate-header block

`apps/web/src/components/consumer/definitions/copy.ts:980-987`

```
pageTitle: 'Venues'
zeroCountLabel: '0 in Denver'
emptyEyebrow: 'No venues'
emptyTitle: 'Nothing here yet'
emptyBody: "Venues will appear here once they're added."
```

**Adjacency:** on an empty venues page these stack vertically — the user reads "Venues" / "0 in Denver" / "No venues" / "Nothing here yet" / "Venues will appear here once they're added." Five strings, one fact.

**Verdict:** CUT (rules 3 + 8).

**Proposed:** keep `pageTitle` and one empty line. Cut `emptyEyebrow` and `emptyTitle`; `emptyBody` → `"No Denver venues yet."` The `zeroCountLabel` stays (it's Data class — it's a count, not chrome).

### C3 — Chrome exclamations and pleasantries 🚀

Rule 9: exclamations don't belong in system copy.

| File:line | Current | Proposed |
|---|---|---|
| `consumer/copy.ts:364` | `"Thanks for the feedback! We'll reach out if we need more information."` | `"Thanks — we'll reach out if we need more."` |
| `reporting/copy.ts:7` | `'Is the show sold out, cancelled, or postponed? Let fans know!'` | `'Sold out, cancelled, or postponed? Let fans know.'` |
| `consumer/copy.ts:416` | `"Everything we've shipped, in one place. Spotted a bug or got an idea?"` | `"Everything we've shipped. Spotted a bug or got an idea?"` |

---

## Group D — Standalone TIGHTENs

| ID | File:line | Current | Adjacency | Proposed |
|---|---|---|---|---|
| D1 | `settings/plan/copy.ts:103` | `"…You're chipping in for the stuff we run on existing infrastructure."` | Body under the support-tier card | `"You're chipping in for what we already run."` — the current line explains our cost structure to someone deciding whether to pay. Rule 6: cut the machinery, keep the reason. |
| D2 | `settings/plan/manage/copy.ts:112` | `bodyBefore: 'Premium unlocks now. '` | Immediately precedes an unlock list that is itself titled "Premium unlocks" | Cut. The list is the sentence. |
| D3 | `consumer/copy.ts:638` | `locationLine: 'Denver · This week'` | Sits under a header that already scopes to Denver | `'This week'` — Denver is stated on the surface above and in the nav. |
| D4 | `reporting/copy.ts:80` | `label: 'I was at / called the venue'` | Radio option in the evidence form | `'I was there or called the venue'` — the slash reads as a form field, not a choice. |
| D5 | `reporting/copy.ts:98` | `submitButton: 'File report — pending confirmation'` | Button. Cap is 3 words. | `'File report'`. The pending state belongs in the post-submit confirmation, where it already appears. |
| D6 | `reporting/copy.ts:111` | `subtitle: 'Confirm what you know about this event.'` | Directly under a title that says the same | Cut (rule 8), or `'Only what you know firsthand.'` if you want the constraint stated. |
| D7 | `auth/code/copy.ts:13` | `empty: 'Format: BETA-XXXX-XXXX'` | Empty-state hint under a code input whose placeholder already shows the format | Cut. The placeholder teaches it. |
| D8 | `app/_components/copy.ts:47` | `footerNote: "No spam. We'll only email when there's beta access."` | Under the waitlist email field | `"No spam — only beta access news."` — currently two sentences for one promise. (Batch B does not touch this file.) |
| D9 | `consumer/copy.ts:6` `emptyTonightBody` / `:13` `emptyFilteredBody` | two near-identical empty bodies | Render in the same list component under different conditions | Differentiate: the *filtered* one should name the filter as the cause and offer clearing it; right now both read as "the city is empty." |
| D10 | `history/copy.ts:60-63` | `calendar.detail` → `${count} nights · iCal · Google · Apple` | Under an `'Export to calendar'` label | The singular/plural half of this finding **already landed on main**. What remains: `iCal · Google · Apple` is implementation detail under a button that already says "calendar." Proposed → `${count} nights`. |
| D11 🔒 | `lifecycle-nudges/copy.ts:7` | `eyebrow: 'Premium trial · done'` | Above a title that says the trial ended | 🔒 Locked in `docs/superpowers/design-tables/lifecycle-takeover.md` (`:99`, `:364`, `:448`, as the `RailHeader` eyebrow). Proposed `'Trial ended'`, or leave it; low value for a design-table reopen. |
| D12 🔒 | `pwa/copy.ts:84` | `link: 'Back to cached content'` | Offline screen | 🔒 Locked in `docs/superpowers/specs/2026-07-18-pwa-cluster-design-brief.md` and `design/design_handoff_pwa_cluster/pwa-data.jsx`. "Cached content" is our word, not the reader's. → `'Back to what works offline'`. |
| D13 🔒 | `history/copy.ts:19` and `:43` | `eyebrow: 'HISTORY'` | Renders directly above a title that says History, twice (header + empty state) | 🔒 #70 plan doc + `design/design_handoff_concert_history/READINESS.md`. Straightforward rule-3 cut, but it's double-locked. |
| D14 🔒 | `history/copy.ts:74` | `passport.eyebrow: 'Passport'` | Same pattern, above the Passport title | 🔒 same. Same call as D13 — answer once, applies to both. |
| D15 🔒 | tier-picker `:148` `eyebrow: 'Lifetime Premium · Beta'`, `:189` `cancel: 'Cancel anytime, lose nothing'` | Card eyebrow and rail | 🔒 monetization design table. `:189` restates A1's cancel promise a third time; proposed → cut `:189` entirely, the picker sub-line covers it. |
| D16 🔒 | artist-page `pastNote(since)` | crawl-window disclosure | **Renders twice on every page that shows it at all** — alongside `historyLine`, which says the same thing | 🔒 `1115-artist-page.md:450` marks it *"Load-bearing; must not be dropped as decoration."* **Needs your ruling:** which of `pastNote` or `historyLine` carries the disclosure? Both is the current state and both is wrong. |
| D17 🔒 | `emails/unlocks.ts` | feature bullet lists | 🔒 "verbatim from the design handoff PREMIUM_FEATURES / WINBACK_FEATURES" | Several bullets run over cap and two hedge with "simply." Locked hard; listed for completeness. |
| D18 🔒 | push copy (`packages/push`) | 3 genuine over-cap titles | 🔒 both push copy files carry a locked-design-mock header | Trims are mechanical once unlocked. Note: the 40-char push title cap is unreachable by construction — 25 chars are fixed prefix. That's a rulebook bug, not a copy bug. |
| D19 🔒 | `settings/plan/copy.ts` — the 12 `——` punchlines | | 🔒 `lifecycle-plan-cards.jsx` | **Not covered by batch B.** Twelve card punchlines all opening with a double-dash. Rule 4 says fix them, but the blast-radius clause means we do it once, deliberately, not as a sweep. One decision for all twelve. |

---

## Group E — TOOLTIP parking lot

Rule 5: TOOLTIP is a *finding*, not an action. These are places where copy is compensating for a missing affordance. No treatment invented, no native `title=`. Filing these as design tickets is the likely outcome — I need your nod that they're real.

| ID | Where | The problem |
|---|---|---|
| E1 | `pendingCardB.imminentTooltip` (settings/plan/manage) | Explains an imminent charge in a tooltip. A charge date is Obligation-class — it shouldn't hide behind a hover. |
| E2 | `CHANGES_DISCLOSURE_COPY.restoreNote` | The restore path is explained in passing inside a disclosure list. It's a Recovery-class string in a Chrome-class slot. |
| E3 | Receipt email, monthly subject line | The subject interpolates a period string that can exceed the 45-char cap for long month/plan combinations. Not a wording problem — a construction problem. |

---

## Tally

| Group | Rows | Locked |
|---|---|---|
| A — repeated promises | 6 clusters (16 strings) | 2 |
| B — vocabulary | 16 strings in 2 clusters | 3 |
| C — cuts | 12 strings in 3 clusters | 0 |
| D — tightens | 19 | 9 |
| E — tooltips | 3 | 0 |

Roughly **70 strings, 56 decision rows**, of which **14 are locked upstream**.

## Where the audit was wrong

1. **Founder price promise is stated five times, not four.** `apps/api/src/emails/atoms.ts:230` (`seatStamp`) renders the same clause as `welcome-paid.ts:155` in the same email. See A1.
2. **`releases.ts:752`, not `:707`.** The line drifted. Immaterial — it's a frozen record either way.
3. **`history/copy.ts calendar.detail` is half-fixed already.** The singular/plural bug the audit flagged has landed on main. Only the `iCal · Google · Apple` machinery remains. See D10.
4. **Three un-audited "saved shows" instances in hardcoded legal JSX** (`terms:78`, `privacy:120`, `beta:85`). The audit only walked `copy.ts` files. Sweep-the-class says they go with B1.

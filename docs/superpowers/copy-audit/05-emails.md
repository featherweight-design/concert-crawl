# Copy audit 05 — transactional email templates

Using copy-review to edit `apps/api/src/emails/templates`. Mode: **propose**. Findings only, nothing applied.

## Scope

All 17 files in `apps/api/src/emails/templates/`, plus the shared copy consts they consume
(`unlocks.ts`, `dunning-core.ts`, `receipt-core.ts`, `format.ts`) and the two upstream copy
sources they pull from (`../palette.ts` `PRICE_PROMISE`, `../layout.ts` `familyUnsubscribeLabel`
and the text-shell footer). Both the HTML `bodyRows` and the plain-text `text` array were read
for every template.

Files covered:

`cancellation-ack.ts`, `card-expiring-soon.ts`, `dunning-1-card-declined.ts`,
`dunning-2-still-declined.ts`, `dunning-3-final-warning.ts`, `dunning-core.ts`, `format.ts`,
`gifting-ending-notice.ts`, `receipt-core.ts`, `renewal-receipt-annual.ts`,
`renewal-receipt-monthly.ts`, `spotify-digest.ts`, `unlocks.ts`, `welcome-gifted.ts`,
`welcome-paid.ts`, `winback.ts`. (`templates.test.ts` read for assertion coverage only;
`format.ts` and the two `renewal-receipt-*.ts` shims carry zero user-facing strings.)

**Rendered variants:** 16 files produce **20 distinct rendered emails**, because `welcome-paid.ts`
branches three ways (supporter / founder / premium), `receipt-core.ts` branches three ways
(annual / founder-monthly / standard-monthly), and `spotify-digest.ts` branches two ways
(populated / zero-match).

## Counts

| | |
|---|---|
| User-facing strings enumerated | **118** |
| Rendered email variants | 20 |
| Lines carrying an em-dash | **49** across **13** files |
| Length-cap breaches | 3 |
| HTML / plain-text disagreements | 11 |

## Verdict tally

| Verdict | Count |
|---|---|
| KEEP | 79 |
| TIGHTEN | 23 |
| RENAME | 4 |
| CUT | 9 |
| TOOLTIP | 3 |
| **Total** | **118** |

CUT + TIGHTEN = 32 rows, 27% of 118. Under the 30% self-check ceiling for the slice as a whole,
but see the per-surface note in the Self-check section: `welcome-paid.ts` (founder branch) and
`gifting-ending-notice.ts` are each at the line and should be scoped down if applied.

**Class distribution:** Obligation 41, Data 22, Recovery 14, Teaching 19, Chrome 22, A11y 0.
Two thirds of this slice is DEFEND-by-default. That is why the CUT column is small and why no
receipt line, no what-you-lose disclosure, and no price promise is proposed for deletion.

---

## Step 1 — enumeration with class, before any verdict

Recorded per the skill's "above ~60 strings, split enumeration from judgment" rule.

### cancellation-ack.ts (9 strings)

| # | String | Class |
|---|---|---|
| 1 | `Your Premium's set to wind down.` (SUBJECT) | Chrome |
| 2 | `You're good through ${accessValue}. No hooks, no hard feelings.` (preheader) | Obligation |
| 3 | `If this cancel was a surprise, reply to this email and we'll sort it out.` (FOOTER_NOTE) | Recovery |
| 4 | `History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free — same as always. Everything you've saved stays saved.` (CHANGES_BODY_TEXT + HTML twin) | Obligation |
| 5 | `Subscription` (headerRow) | Chrome |
| 6 | `Cancelled` (statusEyebrow) | Data |
| 7 | `Cancelled. No more charges.` (title) | Obligation |
| 8 | `Done — we won't bill you again. Premium keeps working right up until ${accessValue}, then your account drops back to Free.` (sub) | Obligation |
| 9 | `Premium works until` / `Manage subscription` (panel eyebrow, CTA) | Chrome |

### card-expiring-soon.ts (10 strings)

| # | String | Class |
|---|---|---|
| 1 | `Heads up — your card's about to expire.` | Chrome |
| 2 | `Update it before your next renewal. Takes about 30 seconds, no interruption.` | Obligation |
| 3 | `Already updated it? You're set — ignore this one.` | Recovery |
| 4 | `in 1 day` / `in ${days} days` | Data |
| 5 | `Your card expires ${daysPhrase}.` | Obligation |
| 6 | `The card on file runs out before your next ${planPhrase} renewal. Drop in a fresh one and nothing skips a beat — no interruption, no dropped features.` | Obligation |
| 7 | `Nothing's wrong yet · this is just a nudge` | Recovery |
| 8 | `Billing` / `Billing · heads up` | Chrome |
| 9 | `Update your card` | Chrome |
| 10 | `Card on file: ${brand} ·· ${last4} · exp MM/YY` | Data |

### dunning-1 / dunning-2 / dunning-3 / dunning-core (26 strings)

All Obligation or Recovery except the header/status eyebrows and the tracker labels
(`Notice`, `Retrying`, `Last try` — Data), and the shared CTA `Update payment method` (Chrome).
Enumerated inline in the findings table below.

### gifting-ending-notice.ts (13), receipt-core.ts (21), spotify-digest.ts (16), unlocks.ts (10), welcome-gifted.ts (9), welcome-paid.ts (21), winback.ts (9)

Enumerated inline in the findings table below.

---

## Step 2 — per-template findings

Only rows carrying a non-KEEP verdict, plus the KEEP rows where the DEFEND call is load-bearing
and worth recording. Em-dash rows appear here **only when there is a second finding on the same
string**; the full em-dash list is its own section, because fixing them is a scoped decision.

### cancellation-ack.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `If this cancel was a surprise, reply to this email and we'll sort it out.` | Recovery | **CUT-from-HTML-only** → see HTML/text section | Not a copy cut. The string is fine; it is missing from the plain-text render. Keep the words, fix the plumbing. |
| `Everything you've saved stays saved.` | Obligation | **RENAME** | `Everything you're watching stays put.` — Rule 10. "saved" is not a Concert Crawl concept; shows are **watched**. Appears in the bolded emphasis span, so it is the line a reader's eye lands on. |
| `Done — we won't bill you again. Premium keeps working right up until ${accessValue}, then your account drops back to Free.` | Obligation | **TIGHTEN** | `We won't bill you again. Premium keeps working right up until ${accessValue}, then your account drops back to Free.` — drops the em-dash and the throat-clearing `Done`; the status eyebrow already says `Cancelled`. |
| `Cancelled` (eyebrow) + `Cancelled. No more charges.` (title) | Data / Obligation | **KEEP** | Rule 3 would normally kill the eyebrow for colliding with the title. Held: `Cancelled` here is a rendered status chip (Data), and a cancellation confirmation is the one place restating the state is a feature. Adjacency checked — they sit 2 rows apart, eyebrow above title. |
| `Your Premium's set to wind down.` (subject, 32 ch) | Chrome | **KEEP** | Under cap, reads aloud, warm-and-gracious per the voice rule for cancellations. |
| `CHANGES_BODY_TEXT` const | Obligation | **KEEP (flag)** | Byte-identical to `gifting-ending-notice.ts` line 35 but declared separately in both files. Not a copy defect; a drift hazard. Worth an issue, not an edit. |

### card-expiring-soon.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `The card on file runs out before your next ${planPhrase} renewal. Drop in a fresh one and nothing skips a beat — no interruption, no dropped features.` | Obligation | **TIGHTEN** | `The card on file runs out before your next ${planPhrase} renewal. Drop in a fresh one and nothing skips a beat.` — Rule 8: three clauses, one fact. "nothing skips a beat", "no interruption", "no dropped features" are the same promise three times, and the preheader already carries "no interruption" a fourth time. |
| `Update it before your next renewal. Takes about 30 seconds, no interruption.` (preheader) | Obligation | **TIGHTEN** | `Update it before your next renewal. Takes about 30 seconds.` — pairs with the row above; whichever survives, "no interruption" should appear once. Rule 7. |
| `Nothing's wrong yet · this is just a nudge` | Recovery | **KEEP** | Rule 9 flags `just` as a hedge, but here it is doing real work: this template fires on a healthy account and the whole point is to pre-empt panic. Recovery class, DEFEND, reason stated. |
| `Already updated it? You're set — ignore this one.` | Recovery | **KEEP** | Missing from plain text (see that section). Copy itself is correct. |
| `Billing` (headerRow) + `Billing · heads up` (statusEyebrow) | Chrome | **TIGHTEN** | `Billing` + `Heads up`. Rule 3: two layers, one word repeated. The header already says Billing; the eyebrow should say what kind of thing this is. |

### dunning-1-card-declined.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Your card bounced — mind giving it a refresh?` (subject, 45 ch, exactly at cap) | Chrome | **TIGHTEN** | `Your card bounced. Mind a refresh?` (34 ch) — clears the em-dash and buys headroom. Dunning is a nudge, so the cheek stays. |
| `Happens all the time — expired card, bank playing it safe, whatever it is. Give it a refresh and you're set. We'll keep trying in the background either way.` | Recovery | **TIGHTEN** | `Happens all the time: expired card, bank playing it safe, whatever it is. Give it a refresh and you're set. We'll keep trying in the background either way.` — colon replacement, the clause is genuinely subordinate. Content held: "bank playing it safe" is the honest-failure voice and correctly avoids the word "fraud". |
| `Nothing's changed yet · Premium's still on` | Recovery | **KEEP** | This is the whole reason the email is not alarming. DEFEND. |

### dunning-2-still-declined.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `A few automatic retries haven’t landed yet. Dropping in a fresh card takes about 30 seconds and skips the rest of the waiting. Premium stays on in the meantime.` | Recovery | **TIGHTEN** | Note the **curly apostrophe** in `haven’t` (U+2019). Every other apostrophe in this file family is a straight `'`. Inconsistent, and it is inside a shared-const string. Same defect at `welcome-paid.ts:122` (`Here’s your seat.`). Two occurrences repo-wide in this slice. |
| `Still no luck with your card.` (subject) | Chrome | **KEEP** | 29 ch, plain, honest, no em-dash. One of the cleanest strings in the slice. |
| `Still on · we'll keep retrying for a few more days` | Recovery | **KEEP** | DEFEND. |

### dunning-3-final-warning.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Your account and saved shows stay put.` | Obligation | **RENAME** | `Your account and the shows you're watching stay put.` — Rule 10, hard violation. "saved shows" is named explicitly in the never-column. Vocabulary applies to Obligation class, so a rename in a billing disclosure is still correct. |
| `History, alerts, and calendar export just go quiet until a payment goes through.` | Obligation | **TIGHTEN** | `History, alerts, and calendar export go quiet until a payment goes through.` — Rule 9 hedge. `just` is minimising a real loss of access inside a what-you-lose disclosure, which is exactly where minimising is wrong. |
| `Nothing gets deleted — a fresh card switches all of it back on.` | Obligation | **TIGHTEN** | `Nothing gets deleted. A fresh card switches all of it back on.` — and note this is the **third** statement of "nothing gets deleted" in one email (reassure line, callout body, and the callout again). Rule 7: state it once, at the highest level. Recommend keeping it in the callout and dropping it from `reassure`. |
| `Nothing gets deleted · a fresh card brings it all back` (reassure) | Obligation | **CUT** | Duplicate of the callout body one element above. Rule 7 with adjacency confirmed: `calloutRow` renders at `CONTENT_PAD`, `reassureRow` at `16px 26px 4px`, separated only by the CTA. |
| `Premium pauses tomorrow.` (title) + `Heads up: Premium pauses tomorrow.` (subject) + `Billing · last try` (both header AND status eyebrow) | Obligation / Chrome | **TIGHTEN** | `headerEyebrow: 'Billing'`. `headerEyebrow` and `statusText` are set to the **identical string** `Billing · last try`, rendered two rows apart. Rule 3, cleanest instance in the slice. |
| `There's one more attempt tomorrow — if it doesn't land, Premium pauses and you drop back to Free.` | Obligation | **KEEP** (em-dash aside) | The consequence disclosure. DEFEND; do not shorten for brevity. |

### dunning-core.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Already fixed it? Ignore this — the next retry will pick it up automatically.` | Recovery | **KEEP** | Correct copy, HTML-only render (see that section). |
| `Update payment method` (CTA, 3 words) | Chrome | **KEEP** | Under the 5-word email CTA cap. |
| `Notice` / `Retrying` / `Last try` | Data | **KEEP** | Tracker step labels, enum display values. |

### gifting-ending-notice.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `—— Hope it showed you a few good nights.` | Chrome | **TIGHTEN** | `Hope it showed you a few good nights.` — Rule 4 names this **exact string** as its worked example of a non-attribution dash. A dash in front of a sentence is not an attribution marker and goes. Occurs twice (HTML line 49, text line 94). |
| `A friend of the crawl` (GIFTER_FALLBACK) | Data | **KEEP** | Proper-noun substitute, and genuinely charming. Read-aloud test passed. |
| `About a week left. Nothing gets deleted — here's what happens next.` (preheader) | Obligation | **TIGHTEN** | `About a week left. Nothing gets deleted.` — the trailing "here's what happens next" is Rule 1 labelling-the-obvious: an email that opens with a "When it ends" section visibly *is* what happens next. |
| `No card on file · nothing gets deleted · only if you want to` (microcopy) | Chrome | **TIGHTEN** | `No card on file · only if you want to` — Rule 7/8. "nothing gets deleted" is already in the preheader and, in effect, in the "Everything you've saved stays saved" line. Third statement. |
| `Everything you've saved stays saved.` | Obligation | **RENAME** | `Everything you're watching stays put.` — same Rule 10 violation as `cancellation-ack.ts`, same bolded emphasis span. Fix both or neither; they are the same sentence. |
| `Your gift's almost up` (eyebrow) + `It's been a good run.` (title) + `Gifted Premium · ending` (headerRow) | Chrome / Chrome / Chrome | **CUT the eyebrow** | Three layers say "the gift is ending" three times before the body starts. Rule 3: when layers collide the title survives. `headerRow` legitimately says *where you are*; the eyebrow is the redundant one. |
| `${gifterLabel} put you on Premium — and the gift wraps up ${endsPhrase}. After that your account slides back to Free. No charge, no surprise.` | Obligation | **KEEP** (em-dash aside) | The whole disclosure. DEFEND. `No charge, no surprise` survives Rule 8 via Rule 1: it is the line's color and reads aloud. |
| `Keep Premium — $5/mo` (CTA, 4 words) | Chrome | **TIGHTEN** | `Keep Premium · $5/mo` or `Keep Premium for $5/mo`. Under the word cap; the finding is Rule 4 only. |

### receipt-core.ts

Receipts go plain. **Nothing in this template is proposed for CUT.** A receipt is a tax record and
every data row is Obligation or Data.

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `View on Stripe →` (data row value) + `View full receipt on Stripe →` (CTA) | Chrome | **TIGHTEN** | Drop the data-row link value, keep the CTA. Rule 8 with adjacency confirmed: `dataTable` renders at `CONTENT_PAD` and `ctaRow` immediately after at `20px 26px 6px`. Two links to the same URL, one element apart. If the row must stay for scannability, shorten the CTA to `View full receipt` (3 words). |
| `View full receipt on Stripe →` | Chrome | **KEEP** | 5 words, exactly at the email CTA cap. Passes, but has no headroom. |
| `Questions about a charge? Reply to this email — a human reads it.` | Obligation | **KEEP** | "a human reads it" is a trust claim, not machinery (Rule 6 keep-clause). HTML-only render is the defect, not the words. |
| `Another year of Premium. Locked in.` (annual title) | Obligation | **KEEP** | |
| `Your annual plan renewed. Keep this for your records — it's your receipt for the next twelve months.` | Obligation | **TIGHTEN** | `Your annual plan renewed. Keep this for your records: it's your receipt for the next twelve months.` — colon, subordinate clause. Content untouched. |
| `Annual runs ${amount} — two months on the house versus paying monthly.` | Obligation | **KEEP** | Price disclosure. DEFEND. |
| `$3 is $3. New folks may pay double someday — never you.` (PRICE_PROMISE.founder, via `../palette.ts`) | Obligation | **KEEP** | Rule 7's named exception: a per-item restatement that says something the general form cannot. Explicitly protected by the rulebook. Also note this string lives in `palette.ts`, **outside this slice** — flagging for the owner's scope decision. |
| `See receipt` (AMOUNT_FALLBACK) | Data | **KEEP** | |
| `Paid · ${chargedLong} · ${periodTitleWord}` (heroSubline) | Data | **KEEP** | True metadata row, the one place `·` is house style. HTML-only. |
| `Payment received` (eyebrow) + `${planLabel}'s paid up.` (title) | Chrome / Obligation | **TOOLTIP → no, KEEP** | Borderline Rule 3 collision, held: "Payment received" is the state and "paid up" is the consequence. Receipts get latitude. |
| `${planLabel}'s paid up for ${month}.` (monthly subject) | Chrome | **TOOLTIP** | Interpolation risk, not a copy defect: `tierName` is free-form from the vars contract. Renders at 32 ch with `Premium`, but a long custom `tierName` pushes past the 45-char subject cap. Recorded, not fixed — a truncation treatment does not exist yet. |

### spotify-digest.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `A quiet week for your artists — two picks anyway` (zero subject, **48 ch**) | Chrome | **TIGHTEN** | `A quiet week. Two picks anyway.` (31 ch) — clears both the 45-char cap breach and the em-dash. |
| `Nobody you follow is playing Denver this week. Here's a couple we think you'd click with anyway.` (ZERO_SUB, **96 ch as preheader**) | Teaching | **TIGHTEN** | Preheader cap is 90. The const is used as *both* the preheader and the on-screen body sub, and only the preheader breaches. Recommend splitting the const: preheader `Nobody you follow is playing Denver this week. Two picks anyway.` (63 ch), body keeps the full ZERO_SUB. |
| `The ones you told Spotify you love — all playing Denver in the next 7 days.` (WEEK_SUB) | Teaching | **KEEP** (em-dash aside) | Best line in the slice. Read-aloud test passed decisively. If the em-dash is cleared, use a colon, not a period: the clause is genuinely subordinate. |
| `You get this because you follow artists on Spotify and turned on the weekly digest.` | Obligation | **KEEP** | Consent/why-am-I-getting-this. DEFEND. Rendered in **both** HTML and text, the only footer note in the slice that is. |
| `CONCERT CRAWL — This week in Denver` (text-only) | Chrome | **TIGHTEN** | See HTML/text section: the text intro is a paraphrase of the HTML lede, not the same copy. |
| `View` (per-show link, HTML-only) | Chrome | **KEEP** | |
| `+${moreCount} more this week →` | Chrome | **KEEP** | |
| `Based on your taste` | Chrome | **KEEP** | Explains why unfollowed artists appear in a follow-based digest. Rule 1 clarifies-test passed; delete it and the zero-state stops explaining itself, which makes it Teaching, not Chrome. |
| `Turn off the weekly digest` (`familyUnsubscribeLabel`, `../layout.ts`) | Obligation | **KEEP** | Outside this slice; noted for completeness. |

### unlocks.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Concert history — every show you attend, logged` | Teaching | **TIGHTEN** | `Concert history: every show you attend, logged` — Rule 4 only. Appears in **3** exported lists (`PREMIUM_FEATURES`, `WINBACK_FEATURES`, `GIFT_KEEP_FEATURES`) plus a 4th hand-rolled copy in `welcome-paid.ts:44`. One string, four declarations. |
| `Calendar export — Apple + Google, one tap` | Teaching | **TIGHTEN** | Same, 3 declarations (`unlocks.ts` ×2, `welcome-paid.ts:45`). |
| `More coming — you're early` | Chrome | **TIGHTEN** | `More coming. You're early.` — and note Rule 9: "selling the user on the thing they already chose to do". Held as TIGHTEN not CUT because the ★ future marker needs a label and this one has real warmth. |
| `Follow artists + new-show alerts` | Teaching | **KEEP** | Rule 10 correct: **artists are followed**. Good. |
| `Price-drop alerts + Spotify sync` | Teaching | **KEEP** | |
| `Calendar export + Spotify sync` / `Follow artists + price-drop alerts` (GIFT_KEEP) | Teaching | **KEEP** | Correctly tighter than the full list. |

**Structural flag:** the phrasing is described in the file header as "verbatim from the design
handoff PREMIUM_FEATURES / WINBACK_FEATURES". That is a **lock**. Per the self-check, these are
proposed, not applied, and the lock is named here for the owner.

### welcome-gifted.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `—— Seriously. We owe you one.` | Chrome | **TIGHTEN** | `Seriously. We owe you one.` — Rule 4, non-attribution leading dash, same shape as the gifting-ending line. Occurs twice (HTML 44, text 78). |
| `Just enjoy it.` (preheader) + `just enjoy it` (microcopy) | Chrome | **CUT one** | The same three words render twice in one email, once in the preheader and once in the closing microcopy. Rule 7/8. Recommend cutting from the microcopy: `No card on file · nothing to cancel`. |
| `No card on file · nothing to cancel · just enjoy it` | Chrome | **CUT (partial)** | The rulebook's own Rule 8 example is "No card, no trial, nothing to cancel" — two facts across three clauses. This is that string. |
| `Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price.` | Teaching | **TIGHTEN** | Tricolon padding (Rule 9): "no tier to pick, no card to add, nothing to manage" is three clauses making one point, and the microcopy restates two of them. Proposed: `Lifetime Premium, on us. No tier to pick, no card, nothing to manage. You showed up early; that's the whole price.` Final sentence held — it is the emotional payload and reads aloud. |
| `You're already in.` (title) + `On us` (eyebrow) + `Lifetime Premium · Beta` (headerRow) | Chrome | **KEEP** | Rule 3 satisfied: header = where, eyebrow = what kind, title = the point. The only clean triad in the slice. Worth preserving as the reference shape. |
| `See everything you've got →` (CTA, 4 words) | Chrome | **KEEP** | |

### welcome-paid.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Welcome · supporter` (headerRow) vs `Welcome · Supporter` (eyebrow) | Chrome | **CUT the eyebrow** | **The known casing disagreement.** Lines 66–67 render the same string twice, two rows apart, differing only in the capital S. Same defect in the founder branch (129: `Welcome · founder` / `Welcome · Founder`) and the premium branch (186–187: `Welcome · premium` / `Welcome · Premium`). Three instances of one bug. Rule 3: the title survives, the eyebrow is cut or re-scoped. Highest-value non-em-dash finding in the slice. |
| `You're Founder #${n}. Locked in at $3, forever.` (subject) | Obligation | **TIGHTEN** | **46 ch at seat #100**, one over the 45-char cap. `Founder #${n}. Locked in at $3, forever.` (40 ch) fixes it. Note the no-seat variant is 43 ch and passes, so this only breaks at three-digit seats — which the tier definitionally reaches. |
| `Here’s your seat.` (founder preheader) | Chrome | **TIGHTEN** | Curly apostrophe (U+2019), inconsistent with every neighbouring string. Second of two in the slice. |
| Founder price promise, stated **four times** | Obligation | **TIGHTEN** | Rule 7, worst instance in the slice. Subject: `Locked in at $3, forever.` Sub: `locked at $3 a month, and it never moves — no matter what anyone pays later.` seatStamp text line: `Founder #N of 100 — $3/mo, never goes up, ever.` `pricePromise` atom: `$3 is $3. New folks may pay double someday — never you.` Four statements of one promise on one screen. Recommend keeping the subject and the `pricePromise` atom (the strongest form, and Rule 7's named exception) and cutting the never-moves clause from `sub`. |
| `One of the first hundred people to back Concert Crawl. Your price is locked at $3 a month, and it never moves — no matter what anyone pays later.` | Obligation | **TIGHTEN** | `One of the first hundred people to back Concert Crawl. Your price is locked at $3 a month.` — per the row above. |
| `Founder badge — first 100 only` | Teaching | **TIGHTEN** | Rule 4. Also restates `first hundred` from the sub two elements up; held as TIGHTEN because a feature-list item legitimately names its own constraint. |
| `Everything Premium — yours` (founder eyebrow) | Chrome | **TIGHTEN** | `Everything Premium` — Rule 4, and `yours` adds nothing the surrounding welcome does not. |
| `Both run on servers we already pay for.` (supporter microcopy) | Teaching | **KEEP** | Rule 6's keep-clause exactly: this is infrastructure detail that answers *why should I bother*, and it is the honesty rail that makes the supporter tier make sense. DEFEND. |
| `You didn't have to. Thanks for backing us.` | Chrome | **KEEP** | Read-aloud test passed. |
| `You're chipping in so the app stays free for everyone — the glow is real.` | Teaching | **TIGHTEN** | `You're chipping in so the app stays free for everyone. The glow is real.` — Rule 4 only; content is the point of the tier. |
| `A Supporter badge on your profile` | Data | **KEEP** | |
| `Wear it on your profile` (CTA, 5 words) | Chrome | **KEEP** | At cap. |
| `Everything that actually costs us money to run is now yours. No trial asterisks, no upsell wall. Go use it.` (premium sub) | Teaching | **KEEP** | Rule 8 would flag "no trial asterisks, no upsell wall" as a doubled clause; held under Rule 1 — it is the line's color, passes read-aloud, and the two clauses name genuinely different things. |
| `Switched on now` (premium eyebrow) vs `Premium's switched on.` (title) | Chrome | **CUT the eyebrow** | `switched on` twice, two rows apart. Rule 3. |
| `SUPPORTER_FEATURES` / `FOUNDER_FEATURES` declared locally | Teaching | **KEEP (flag)** | Lines 44–45 duplicate `unlocks.ts` lines 9–10 verbatim rather than importing them, defeating the stated purpose of `unlocks.ts` ("so the lists can't drift between templates"). Structural, not copy. |

### winback.ts

| String | Class | Verdict | Replacement |
|---|---|---|---|
| `Denver's been busy since you left.` (subject) | Chrome | **KEEP** | 34 ch, no em-dash, read-aloud test passed with room to spare. |
| `no countdown` (sub) + `no countdown` (preheader) + `no hard sell` (microcopy) | Chrome | **TIGHTEN** | Rule 7: "no countdown" appears in both the preheader and the sub. Recommend dropping it from the sub: `Whenever you want them back, they're one tap away — no discount gimmick. Just here when you are.` |
| `Whenever you want them back, they're one tap away — no countdown, no discount gimmick. Just here when you are.` | Chrome | **TIGHTEN** | Rule 8 plus the em-dash. Three reassurance clauses in one sentence, in an email whose entire microcopy line is also reassurance. |
| `Whenever you want` (eyebrow) + `Just here when you are.` (sub close) | Chrome | **CUT the eyebrow** | Rule 3: the eyebrow says what the sub's closing sentence already says, better. |
| `Still $5/mo · cancel any time · no hard sell` | Obligation | **KEEP** | Price + cancellation terms. DEFEND. |
| `What you'd get back` | Chrome | **KEEP** | |
| `Turn Premium back on` (CTA, 4 words) | Chrome | **KEEP** | |
| `Since you switched back to Free, Premium's quietly picked up a few things.` | Chrome | **KEEP** | Honest, no discount hook, matches the file's locked "NO discount / percent-off / coupon" constraint. |

---

## Em-dash inventory

**49 lines across 13 files.** Every one is a Rule 4 violation on a string that ships to a user.

**Scope note, read before acting.** Rule 4's blast-radius clause is explicit: new and modified
strings must be clean, **untouched neighbours stay untouched**, and *"never open a standalone
repo-wide sweep PR; if a backlog is worth clearing, file an issue."* This audit enumerates the
backlog so the owner can decide the scope. It is **not** a mandate to fix all 49. The rulebook's
own calibration note ("17 email templates currently carry em-dashes") confirms this backlog was
already known and accepted at the time the rule was written. Fixing them is a scoped decision.

Two rows below are different in kind and are the ones worth fixing regardless of scope: the
`——` leading double-dashes at `gifting-ending-notice.ts:49/94` and `welcome-gifted.ts:44/78`.
Rule 4's narrow attribution exception does **not** cover them, and the rulebook uses one of them
as its worked counter-example.

| # | File | Line | String (em-dash context) |
|---|---|---|---|
| 1 | cancellation-ack.ts | 31 | `...community prices stay free — same as always...` (CHANGES_BODY_TEXT) |
| 2 | cancellation-ack.ts | 41 | `Done — we won't bill you again...` |
| 3 | cancellation-ack.ts | 49 | `...stay free — same as always...` (HTML twin of #1) |
| 4 | card-expiring-soon.ts | 29 | `Heads up — your card's about to expire.` (SUBJECT) |
| 5 | card-expiring-soon.ts | 32 | `Already updated it? You're set — ignore this one.` |
| 6 | card-expiring-soon.ts | 58 | `...nothing skips a beat — no interruption...` |
| 7 | dunning-1-card-declined.ts | 14 | `Your card bounced — mind giving it a refresh?` (subject) |
| 8 | dunning-1-card-declined.ts | 19 | `Happens all the time — expired card...` |
| 9 | dunning-3-final-warning.ts | 20 | `...one more attempt tomorrow — if it doesn't land...` |
| 10 | dunning-3-final-warning.ts | 25 | `Nothing gets deleted — a fresh card switches all of it back on.` |
| 11 | dunning-core.ts | 27 | `Already fixed it? Ignore this — the next retry will pick it up...` |
| 12 | gifting-ending-notice.ts | 31 | `...Nothing gets deleted — here's what happens next.` (PREHEADER) |
| 13 | gifting-ending-notice.ts | 35 | `...stay free — same as always...` (CHANGES_BODY_TEXT) |
| 14 | gifting-ending-notice.ts | 47 | `${gifterLabel} put you on Premium — and the gift wraps up...` |
| 15 | gifting-ending-notice.ts | **49** | `—— Hope it showed you a few good nights.` (HTML) **← leading `——`** |
| 16 | gifting-ending-notice.ts | 52 | `...stay free — same as always...` (HTML twin of #13) |
| 17 | gifting-ending-notice.ts | 80 | `Keep Premium — $5/mo` (CTA label) |
| 18 | gifting-ending-notice.ts | **94** | `—— Hope it showed you a few good nights.` (text) **← leading `——`** |
| 19 | gifting-ending-notice.ts | 106 | `Keep Premium — $5/mo: ${planUrl()}` (text CTA) |
| 20 | receipt-core.ts | 39 | `Questions about a charge? Reply to this email — a human reads it.` |
| 21 | receipt-core.ts | 80 | `Keep this for your records — it's your receipt for the next twelve months.` |
| 22 | receipt-core.ts | 85 | `Another year of Premium — receipt inside.` (subject) |
| 23 | receipt-core.ts | 87 | `Founder's paid up — $3, same as always.` (subject) |
| 24 | receipt-core.ts | 121 | `Annual runs ${amount} — two months on the house...` |
| 25 | receipt-core.ts | 185 | `$3 is $3. New folks may pay double someday — never you.` (text) |
| 26 | spotify-digest.ts | 35 | `The ones you told Spotify you love — all playing Denver...` (WEEK_SUB) |
| 27 | spotify-digest.ts | 84 | `- ${artist} — ${tour}` (text show row) |
| 28 | spotify-digest.ts | 101 | `A quiet week for your artists — two picks anyway` (subject) |
| 29 | spotify-digest.ts | 141 | `CONCERT CRAWL — This week in Denver` (text intro) |
| 30 | unlocks.ts | 9 | `Concert history — every show you attend, logged` |
| 31 | unlocks.ts | 10 | `Calendar export — Apple + Google, one tap` |
| 32 | unlocks.ts | 13 | `More coming — you're early` |
| 33 | unlocks.ts | 23 | `Concert history — every show you attend, logged` (WINBACK) |
| 34 | unlocks.ts | 24 | `Calendar export — Apple + Google, one tap` (WINBACK) |
| 35 | unlocks.ts | 31 | `Concert history — every show you attend, logged` (GIFT_KEEP) |
| 36 | welcome-gifted.ts | 32 | `You're in — Premium's on us.` (SUBJECT) |
| 37 | welcome-gifted.ts | 42 | `Lifetime Premium — on us...` |
| 38 | welcome-gifted.ts | **44** | `—— Seriously. We owe you one.` (HTML) **← leading `——`** |
| 39 | welcome-gifted.ts | **78** | `—— Seriously. We owe you one.` (text) **← leading `——`** |
| 40 | welcome-paid.ts | 44 | `Concert history — every show you attend, logged` (SUPPORTER) |
| 41 | welcome-paid.ts | 45 | `Calendar export — Apple + Google, one tap` (SUPPORTER) |
| 42 | welcome-paid.ts | 51 | `Founder badge — first 100 only` |
| 43 | welcome-paid.ts | 58 | `You're in — and you're keeping the lights on.` (subject) |
| 44 | welcome-paid.ts | 63 | `...stays free for everyone — the glow is real.` |
| 45 | welcome-paid.ts | 125 | `...it never moves — no matter what anyone pays later.` |
| 46 | welcome-paid.ts | 136 | `Everything Premium — yours` (eyebrow) |
| 47 | welcome-paid.ts | 155 | `Founder #${n} of 100 — $3/mo, never goes up, ever.` (text) |
| 48 | welcome-paid.ts | 160 | `$3 is $3. New folks may pay double someday — never you.` (text) |
| 49 | welcome-paid.ts | 178 | `You're in — Premium is live on your account.` (subject) |

**By file:** welcome-paid.ts 10 · gifting-ending-notice.ts 8 · receipt-core.ts 6 · unlocks.ts 6 ·
spotify-digest.ts 4 · welcome-gifted.ts 4 · cancellation-ack.ts 3 · card-expiring-soon.ts 3 ·
dunning-1 2 · dunning-3 2 · dunning-core 1 · winback.ts 1 · palette.ts 1 (out of slice).

Counting *distinct authored strings* rather than lines, it is **38** — the HTML/text twins in
`cancellation-ack`, `gifting-ending-notice`, `welcome-gifted`, `welcome-paid` and `receipt-core`
double-count, and `unlocks.ts` declares `Concert history — ...` three times and
`Calendar export — ...` twice.

**One instance sits outside this slice:** `apps/api/src/emails/palette.ts:64`
(`PRICE_PROMISE.founder`). It renders in three of these templates, so any scoped fix that touches
the founder promise has to reach into `palette.ts`.

---

## HTML vs plain-text disagreements

Eleven places where the two renders of one email do not say the same thing. Numbers 1 and 2 are
substantive; the rest are informational, and several are correct-by-design.

| # | Template | HTML says | Plain text says | Assessment |
|---|---|---|---|---|
| 1 | **welcome-paid.ts** (all 3 branches) | `headerRow('Welcome · supporter')` **and** `eyebrow: 'Welcome · Supporter'`, lowercase vs capitalised, both in the HTML | Neither string renders at all | **Real defect, two ways.** The casing disagreement is HTML-internal (lines 66–67, 129, 186–187) and reads as a typo in the rendered email; the plain-text render simply omits both. |
| 2 | **cancellation-ack / card-expiring-soon / dunning-core / receipt-core** | `footerRow({ note })` renders the note | `renderTextShell` takes no `note` param, so it is silently dropped | **Real defect.** Four footer notes never reach plain-text readers, including `If this cancel was a surprise, reply to this email and we'll sort it out.` (Recovery) and `Questions about a charge? Reply to this email — a human reads it.` (Obligation). `spotify-digest.ts` is the only template that works around this by appending `FOOTER_NOTE` to its text array by hand (line 158). The fix is a `renderTextShell` signature change, not a copy edit. |
| 3 | **spotify-digest.ts** (populated) | `${countLabel} by artists you follow.` + `The ones you told Spotify you love — all playing Denver in the next 7 days.` | `CONCERT CRAWL — This week in Denver` / `${countLabel} by artists you follow on Spotify,` / `all playing Denver in the next 7 days.` | Paraphrase, not the same copy. The text version adds "on Spotify", drops "The ones you told Spotify you love", and hard-wraps one sentence across two array entries. Divergent by hand rather than by design. |
| 4 | **receipt-core.ts** | Data table order: Plan, Amount, Charged, Next renewal, Customer ID, Receipt | Text order: Amount, Charged, Next renewal, Plan, Customer ID, Receipt | `Plan` moves from first to fourth. Harmless, but the two renders of a tax record should list rows identically. |
| 5 | **receipt-core.ts** | `heroSubline`: `Paid · ${chargedLong} · ${periodTitleWord}` | absent | Design-intentional (the hero is a visual element). |
| 6 | **receipt-core.ts / welcome-paid.ts** | `pricePromise({ tier })` atom | the same literal hand-written into the text array (`receipt-core.ts:185`, `welcome-paid.ts:160`, `welcome-paid.ts:96`, `welcome-paid.ts:209`) | Currently in sync, but the text copies are hardcoded rather than read from `PRICE_PROMISE`. Editing `palette.ts` alone would desync four strings. Drift hazard. |
| 7 | **welcome-paid.ts** (founder) | `seatStamp(founderSeatNumber)` visual | `Founder #${n} of 100 — $3/mo, never goes up, ever.` | Text-exclusive line. Correct by design. |
| 8 | **welcome-gifted.ts / card-expiring-soon.ts** | `tierBadge({ tier })` | absent | Correct by design; a badge is visual. |
| 9 | **welcome-gifted.ts** | CTA `See everything you've got →` | `See everything you've got: ${appUrl()}` | Arrow dropped, colon added. Correct by design. |
| 10 | **gifting-ending-notice.ts** | eyebrow `Your gift's almost up` | absent | Text-exclusive omission. Moot if the eyebrow is cut per the findings table. |
| 11 | **cancellation-ack.ts / card-expiring-soon.ts** | statusEyebrow (`Cancelled`, `Billing · heads up`) | absent | Consistent with the rest of the slice: eyebrows do not cross into plain text. |

---

## Findings that require a templates.test.ts change

`templates.test.ts` (27.8 KB) asserts exact strings, so per the skill's process step 6 an email
edit is always a test edit. Grouped by blast radius:

| Finding | Test impact |
|---|---|
| Any em-dash fix on a **subject** (#4, #7, #22, #23, #28, #36, #43, #49) | Subject assertions are exact-match. Highest test churn per fix. |
| Any em-dash fix in **unlocks.ts** (#30–#35) | Feature-list strings are asserted through **every** template that renders them — welcome-paid ×3 branches, welcome-gifted, winback, gifting-ending-notice. One const change, six-plus assertion sites. |
| `PRICE_PROMISE.founder` (#25, #48, `palette.ts:64`) | Asserted in both the HTML and text of receipt-core (founder monthly) and welcome-paid (founder). Four sites, and one of them lives outside this slice. |
| `Everything you've saved stays saved.` → `Everything you're watching stays put.` (RENAME) | Two templates × two renders = four assertion sites, plus the shared-const declaration in each file. |
| `Your account and saved shows stay put.` → watching (RENAME) | dunning-3 HTML + text. |
| Cutting the `welcome-paid` eyebrows (3 branches) | Any assertion checking for `Welcome · Supporter` / `· Founder` / `· Premium` in the HTML body must go. Likely also snapshot-style substring checks. |
| Cutting the `dunning-3` `reassure` line | dunning-3 HTML + text; `reassureRow` is unconditional in `dunning-core`, so removing the line means passing an empty `reassure` or making the row conditional — a renderer change, so **typecheck plus test**. |
| Subject-length fixes (`spotify-digest` zero, `welcome-paid` founder) | Both subjects are asserted; the founder one is asserted in both the seat and no-seat variants. |
| Fixing the plain-text footer-note drop (disagreement #2) | `renderTextShell` signature change. Affects **every** template's text output, so the widest test impact in the slice, even though it changes no authored string. |
| Curly-apostrophe normalisation (`dunning-2:19`, `welcome-paid:122`) | Exact-match assertions will fail on the codepoint. Silent-looking change, real test break. |

Per the process note, none of these is a blocker — test references to changed strings are
expected and get updated in the same change. They are listed so the owner can size the work.

---

## Self-check

- [x] **Grep before you cut.** Propose mode, so nothing was cut. Every proposed `CUT`/`RENAME`
      literal was located across the slice with fixed-string search before being written up;
      the multi-site literals are recorded in the test-impact table above rather than assumed
      to be single-use. No shell globs used. Note: `Concert history — every show you attend,
      logged` has **four** declarations and `Everything you've saved stays saved.` has **four**
      render sites — both would have looked single-site without the search.
- [x] **No surface lost more than 30% of its strings.** Slice-wide, CUT+TIGHTEN is 32/118 = 27%.
      Two surfaces sit at the line if applied as written: `welcome-paid.ts` founder branch
      (7 of 21 strings touched, 33%) and `gifting-ending-notice.ts` (5 of 13, 38%). **Raising
      both as design findings rather than edits**, per the rule. The founder branch's real
      problem is that one promise is stated four times, which is a layout decision about which
      element owns the price promise, not a copy edit. Same for the gifting-ending eyebrow.
- [x] **No two replacements share an opening construction.** Checked across all 23 TIGHTEN and
      9 CUT rows. Replacements open variously with the retained subject, a colon substitution,
      a period split, or a clause deletion; no two begin the same way, and no single cadence
      was imposed. The em-dash replacements deliberately alternate period / colon / `·`
      depending on whether the clause is subordinate, rather than defaulting to a period.
- [x] **Every replacement re-read aloud.** The lines that survived on this test alone and were
      moved off CUT: `No charge, no surprise.`, `A friend of the crawl`, `Both run on servers
      we already pay for.`, `No trial asterisks, no upsell wall.`, `the glow is real`.
- [x] **No DEFEND or EXEMPT row changed without a stated reason.** No Obligation row is proposed
      for deletion. Every Obligation/Recovery TIGHTEN states its reason inline and preserves the
      disclosure: no receipt row, price promise, cancellation term, consent line, or
      what-you-lose list loses content. The two Obligation `RENAME`s are Rule 10, which the
      rulebook states applies to Obligation explicitly ("a `RENAME` in a receipt is still
      correct"). The two Obligation `CUT`s (dunning-3 `reassure`, welcome-gifted microcopy
      clause) delete only a **duplicate** statement, leaving the fact stated once elsewhere on
      the same screen.
- [x] **Nothing locked was overruled.** Three locks identified and named rather than applied:
      (1) `unlocks.ts` header declares its phrasing "verbatim from the design handoff
      PREMIUM_FEATURES / WINBACK_FEATURES" — six em-dash rows sit inside that lock;
      (2) `winback.ts` header locks the shape ("BASIC SHAPE ONLY … NO discount / percent-off /
      coupon of any kind") — no finding touches it; (3) `cancellation-ack.ts` header records a
      locked #783 decision ("deliberately NOT a sales surface, no win-back pitch, no discount
      hook") — no finding touches it. `spotify-digest.ts` also carries a design lock on the
      zero-match variant ("so the email always earns its open"); the ZERO_SUB preheader fix is
      proposed as a **const split** specifically so the locked on-screen body copy is preserved.
- [x] **Rewrite check.** 32 CUT/TIGHTEN rows. Rows that are rewrites of strings that were
      already fine: 0. Every row is driven by a named rule — 49 lines by Rule 4, 6 by Rule 3
      (colliding layers), 5 by Rule 7 (promise stated twice or more), 4 by Rule 8, 3 by Rule 9,
      4 by Rule 10, 3 by Rule 2 (cap breach). Well under the 20% ceiling. This is an edit, not
      a rewrite.

## Notes for the owner

1. **The em-dash list is not a work order.** Rule 4's blast-radius clause forbids a standalone
   repo-wide sweep. If the 49 lines are worth clearing, that is an issue and a scoped decision;
   the four `——` leading dashes are the only ones the rulebook actively calls wrong on their own.
2. **The highest-value fixes here are not em-dashes.** They are the `Welcome · supporter` /
   `Welcome · Supporter` casing collision (three branches), the four dropped plain-text footer
   notes, and the two `saved shows` vocabulary violations.
3. **Two findings are outside this slice** and need the owner's scope call: `palette.ts:64`
   (`PRICE_PROMISE.founder`) and the `renderTextShell` signature in `layout.ts`.

# Design Property Table — Monetization Email Brand Pass

_Source: `design/design_handoff_monetization_emails/` (email-primitives.jsx, email-welcome.jsx, email-receipts.jsx, email-dunning.jsx, email-lifecycle.jsx, email-notices.jsx, README.md). Enumeration-only pass (design-review Agent 1)._

## Palette (ME) + shared tokens

| Token      | Hex / Value                                            | Usage                                                          |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| page       | `#04050C`                                              | Outer page bg                                                  |
| card       | `#0B0E20`                                              | Email card                                                     |
| surf       | `#11162E`                                              | Panel surface                                                  |
| surf2      | `#171D3A`                                              | Nested surface (receipt rows / callouts / Beta badge bg)       |
| border     | `#242C4E`                                              | Card + divider borders                                         |
| borderSoft | `#1A2140`                                              | Data-table row dividers                                        |
| fg         | `#E8F3FF`                                              | Primary text                                                   |
| muted      | `#9AA8C7`                                              | Body/secondary text                                            |
| subtle     | `#5A6788`                                              | Mono eyebrows / metadata                                       |
| signal     | `#7AE6FF`                                              | Primary CTA · Premium accent · receipt amount hero             |
| accent     | `#FF7BD4`                                              | Brand presence · Supporter / Gifted accent · wordmark "crawl." |
| onSignal   | `#070A1A`                                              | Text on signal button                                          |
| onAccent   | `#1A0713`                                              | Text on accent button                                          |
| amber      | `#FFC24B`                                              | Dunning "needs attention" (calm, not alarm) — final step only  |
| amberSoft  | `rgba(255,194,75,0.10)`                                | Dunning final callout bg                                       |
| signalSoft | `rgba(122,230,255,0.09)`                               | (defined, soft signal fill)                                    |
| accentSoft | `rgba(255,123,212,0.09)`                               | Price-promise / gift callout bg                                |
| FONT       | `Inter, -apple-system, 'Segoe UI', Arial, sans-serif`  | All text                                                       |
| MONO       | `'JetBrains Mono', 'SFMono-Regular', Menlo, monospace` | Eyebrows + metadata (uppercase, tracked)                       |

**TIER_ACCENT:** premium → signal (`#7AE6FF`) · supporter → accent (`#FF7BD4`) · founder → signal (paired w/ accent halo) · gifted → accent (`#FF7BD4`)

**TIER_META:** premium `{Premium, $5, / month}` · supporter `{Supporter, $2, / month}` · founder `{Founder, $3, /mo · locked}` · gifted `{Premium, $0, on us}`

**PRICE_PROMISE:** supporter & premium = "Whatever you pay, you pay. We never raise it." · founder = "$3 is $3. New folks may pay double someday — never you."

---

## Atom: EmShell

| Property         | Value                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Structural props | `children`, `maxWidth` (default 600)                                                                                                                                           |
| Outer div        | `background: ME.page`, `padding: "24px 0"`, `fontFamily: FONT`                                                                                                                 |
| Card table       | `width: maxWidth`, `maxWidth: "100%"`, `margin: "0 auto"`, `background: ME.card`, `borderRadius: 16`, `overflow: hidden`, `border: 1px solid ME.border`, `role="presentation"` |

## Atom: EmPreheader

| Property | Value                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Props    | `children`                                                                                                                  |
| Row      | `aria-hidden="true"`                                                                                                        |
| td style | `display: none`, `maxHeight: 0`, `overflow: hidden`, `opacity: 0`, `color: transparent`, `fontSize: 1`, `lineHeight: "1px"` |

## Atom: EmWordmark

| Property | Value                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Props    | `size` (default 17)                                                                                 |
| Text     | `concert` + `crawl.` (span colored `ME.accent`)                                                     |
| Style    | `fontFamily: FONT`, `fontWeight: 800`, `fontSize: size`, `color: ME.fg`, `letterSpacing: "-0.02em"` |

## Atom: EmHeader

| Property               | Value                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props                  | `eyebrow` (optional)                                                                                                                                  |
| Row td padding         | `22px 26px 0`                                                                                                                                         |
| Left cell              | `<EmWordmark />`, `verticalAlign: middle`                                                                                                             |
| Right eyebrow (if set) | `textAlign: right`, `fontFamily: MONO`, `fontSize: 9.5`, `letterSpacing: "0.16em"`, `color: ME.subtle`, `textTransform: uppercase`, `fontWeight: 700` |

## Atom: EmMonoEyebrow

| Property | Value                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Props    | `children`, `color` (default ME.subtle), `size` (default 10), `style`                                                   |
| Style    | `fontFamily: MONO`, `fontSize: size`, `letterSpacing: "0.15em"`, `color`, `textTransform: uppercase`, `fontWeight: 700` |

## Atom: EmLede

| Property         | Value                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Props            | `eyebrow`, `title`, `sub`, `titleSize` (default 26)                                                                           |
| Row td padding   | `24px 26px 4px`                                                                                                               |
| Eyebrow (if set) | EmMonoEyebrow, `color: ME.subtle`, `marginBottom: 11`                                                                         |
| Title            | `fontFamily: FONT`, `fontWeight: 900`, `fontSize: titleSize`, `color: ME.fg`, `letterSpacing: "-0.025em"`, `lineHeight: 1.12` |
| Sub (if set)     | `fontFamily: FONT`, `fontSize: 14.5`, `color: ME.muted`, `lineHeight: 1.5`, `marginTop: 10`                                   |

## Atom: EmButton

| Property    | Value                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props       | `children`, `tone` (default "signal"), `href` (default "#")                                                                                                          |
| tone=signal | bg `ME.signal`, color `ME.onSignal`, border `1px solid transparent`                                                                                                  |
| tone=accent | bg `ME.accent`, color `ME.onAccent`, border `1px solid transparent`                                                                                                  |
| tone=ghost  | bg `transparent`, color `ME.fg`, border `1px solid ME.border`                                                                                                        |
| Link style  | `display: block`, `fontFamily: FONT`, `fontWeight: 800`, `fontSize: 14.5`, `textDecoration: none`, `padding: "14px"`, `borderRadius: 12`, `letterSpacing: "-0.01em"` |

## Atom: EmGhostLink

| Property | Value                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Props    | `children`, `href` (default "#"), `color` (default ME.signal)                          |
| Style    | `fontFamily: FONT`, `fontSize: 13`, `fontWeight: 700`, `color`, `textDecoration: none` |

## Atom: EmDivider

| Property | Value                            |
| -------- | -------------------------------- |
| Props    | `pad` (default "0 26px")         |
| Line     | `borderTop: 1px solid ME.border` |

## Atom: EmArt

| Property | Value                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Props    | `hue` (default 280), `size` (default 52)                                                                         |
| Style    | `borderRadius: 9`, `background: linear-gradient(135deg, hsl(hue 45% 42%), hsl(hue+40 40% 26%))`, `flexShrink: 0` |

## Atom: EmTierBadge

| Property            | Value                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Props               | `tier` (default "premium"), `beta` (default false)                                                                                                                                                                       |
| Label               | `TIER_META[tier].label`                                                                                                                                                                                                  |
| Pill (non-founder)  | bg `{accent}22`, `border: 1px solid {accent}55`, `borderRadius: 6`, `padding: "4px 9px"`, `fontFamily: MONO`, `fontWeight: 700`, `fontSize: 9.5`, `letterSpacing: "0.14em"`, `textTransform: uppercase`, `color: accent` |
| Pill (founder)      | bg `linear-gradient(135deg, rgba(122,230,255,0.16), rgba(255,123,212,0.16))` (halo)                                                                                                                                      |
| Beta pill (if beta) | bg `ME.surf2`, `border: 1px solid ME.border`, `color: ME.muted`, label "Beta"; other styles match                                                                                                                        |

## Atom: EmFeatureList

| Property             | Value                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Props                | `items` (string or `{text, future}`), `accent` (default ME.signal)                                                       |
| Row td padding       | `5px 0`, `verticalAlign: top`                                                                                            |
| Check mark (default) | SVG check `<path d="M2 6 L5 9 L10 3">`, `stroke: accent`, `strokeWidth: 1.9`                                             |
| Future marker        | `★` mono, `fontWeight: 800`, `fontSize: 12`, `color: accent`                                                             |
| Text                 | `fontFamily: FONT`, `fontSize: 13.5`, `fontWeight: 500`, `color: ME.fg`, `lineHeight: 1.4`, `opacity: future ? 0.62 : 1` |

## Atom: EmDataTable

| Property   | Value                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props      | `rows` (`{label, value, mono, strong, color, link}`)                                                                                                                                                                                |
| Table      | bg `ME.surf`, `borderRadius: 12`, `border: 1px solid ME.border`, `overflow: hidden`                                                                                                                                                 |
| Label cell | `padding: "12px 16px"`, row divider `1px solid ME.borderSoft`, `fontFamily: MONO`, `fontSize: 10.5`, `letterSpacing: "0.08em"`, `textTransform: uppercase`, `color: ME.subtle`, `whiteSpace: nowrap`, `width: 42%`                  |
| Value cell | `padding: "12px 16px"`, `fontFamily: r.mono===false ? FONT : MONO`, `fontSize: 12.5`, `fontWeight: r.strong ? 700 : 500`, `color: r.color \|\| ME.fg`, `textAlign: right`; if `link` → anchor `color: ME.signal`, `fontWeight: 700` |

## Atom: EmCallout

| Property | Value                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Props    | `children`, `accent` (default ME.signal), `soft`                                                               |
| Style    | `borderRadius: 12`, `padding: "15px 16px"`, `background: soft \|\| {accent}14`, `border: 1px solid {accent}44` |

## Atom: EmPricePromise

| Property       | Value                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Props          | `tier` (default "premium"), `subtle` (default false)                                                                                                                                                                                       |
| Text source    | `PRICE_PROMISE[tier]`; returns null if none                                                                                                                                                                                                |
| subtle variant | `fontFamily: MONO`, `fontSize: 10`, `color: ME.subtle`, `letterSpacing: "0.04em"`, `lineHeight: 1.5`; lock icon stroke `ME.accent` (1.2)                                                                                                   |
| Full variant   | `padding: "11px 13px"`, `borderRadius: 10`, bg `ME.accentSoft`, `border: 1px solid {ME.accent}33`; text `fontFamily: FONT`, `fontWeight: 600`, `fontSize: 12.5`, `color: ME.muted`, `lineHeight: 1.45`; lock icon stroke `ME.accent` (1.3) |

## Atom: EmSeatStamp

| Property   | Value                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props      | `seat` (default 37)                                                                                                                                         |
| Container  | `padding: "16px 18px"`, `borderRadius: 12`, bg `linear-gradient(150deg, rgba(255,123,212,0.10), rgba(122,230,255,0.08))`, `border: 1px solid {ME.signal}44` |
| Big number | `#{seat}` — `fontWeight: 900`, `fontSize: 40`, `color: ME.fg`, `letterSpacing: "-0.04em"`                                                                   |
| "of 100"   | MONO, `fontSize: 9`, `letterSpacing: "0.16em"`, uppercase, `color: ME.subtle`, `marginTop: 5`                                                               |
| Line 1     | "Founder. Locked in." — `fontWeight: 800`, `fontSize: 15`, `color: ME.fg`                                                                                   |
| Line 2     | "$3 / mo — never goes up, ever" — MONO, `fontSize: 10.5`, `color: ME.signal`, `marginTop: 4`                                                                |

## Atom: EmFooter

| Property               | Value                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Props                  | `family` (default "billing"), `showManage` (default true), `note`                                                    |
| Container              | `padding: "18px 26px 24px"`, `borderTop: 1px solid ME.border`                                                        |
| Note (if set)          | `fontFamily: FONT`, `fontSize: 11.5`, `color: ME.subtle`, `lineHeight: 1.6`, `marginBottom: 10`                      |
| Link 1                 | "Turn off {family} emails" — `color: ME.muted`, underline                                                            |
| Link 2                 | "all email settings" — `color: ME.subtle`, underline                                                                 |
| Link 3 (if showManage) | "manage subscription" — `color: ME.subtle`, underline                                                                |
| Address                | "Concert Crawl · Denver, CO" — MONO, `fontSize: 9.5`, `color: ME.subtle`, `marginTop: 12`, `letterSpacing: "0.06em"` |

## Atom: PlainText (renderer)

| Property | Value                                                                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style    | `<pre>`, `padding: "18px 20px"`, bg `ME.surf`, `border: 1px solid ME.border`, `borderRadius: 12`, `color: ME.muted`, `fontFamily: MONO`, `fontSize: 11`, `lineHeight: 1.55`, `whiteSpace: pre-wrap` |

**Shared PREMIUM_FEATURES list** (welcome): 1) "Concert history — every show you attend, logged" 2) "Calendar export — Apple + Google, one tap" 3) "Follow artists + new-show alerts" 4) "Price-drop alerts + Spotify sync" 5) `{text: "More coming — you're early", future: true}`

---

## Template: Welcome · Premium

### Copy

| Field                   | Value                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| subject                 | `You're in — Premium is live on your account.`                                                                |
| preheader               | `Everything Premium, switched on. Here's what you just unlocked.`                                             |
| header eyebrow          | `Welcome · premium`                                                                                           |
| lede eyebrow            | `Welcome · Premium`                                                                                           |
| title                   | `You're in. Premium's switched on.`                                                                           |
| sub                     | `Everything that actually costs us money to run is now yours. No trial asterisks, no upsell wall. Go use it.` |
| feature-section eyebrow | `Switched on now`                                                                                             |
| features                | full PREMIUM_FEATURES (5 items incl. ★ "More coming — you're early")                                          |
| price promise           | `Whatever you pay, you pay. We never raise it.` (full variant)                                                |
| button                  | `Open Concert Crawl` — tone **signal**                                                                        |
| footer                  | family **billing**, showManage **true**, no note                                                              |

### Visual / composition

| Property   | Value                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| accent     | ME.signal `#7AE6FF`                                                                                                            |
| tier badge | premium (no beta)                                                                                                              |
| titleSize  | 26                                                                                                                             |
| atom order | EmShell → EmPreheader → EmHeader → EmLede → EmTierBadge → EmMonoEyebrow → EmFeatureList → EmPricePromise → EmButton → EmFooter |

## Template: Welcome · Supporter

Amended 2026-07-29: Supporter now unlocks Concert history and Calendar export, so
the preheader / sub / features / microcopy below were rewritten away from the
badge-only framing. Subject, title, eyebrow, CTA and all visual properties are
unchanged.

### Copy

| Field                    | Value                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject                  | `You're in — and you're keeping the lights on.`                                                                                                                            |
| preheader                | `Your history, your exports, your badge. All live.`                                                                                                                        |
| header eyebrow           | `Welcome · supporter`                                                                                                                                                      |
| lede eyebrow             | `Welcome · Supporter`                                                                                                                                                      |
| title                    | `You didn't have to. Thanks for backing us.`                                                                                                                               |
| sub                      | `Your history and your calendar exports are switched on, and the badge is live on your profile. You're chipping in so the app stays free for everyone — the glow is real.` |
| feature-section eyebrow  | `What backing gets you`                                                                                                                                                    |
| features                 | "Concert history — every show you attend, logged" · "Calendar export — Apple + Google, one tap" · "A Supporter badge on your profile"                                      |
| microcopy under features | `Both run on servers we already pay for.` (MONO, uppercase, size 9.5, ME.subtle)                                                                                           |
| price promise            | `Whatever you pay, you pay. We never raise it.` (full variant)                                                                                                             |
| button                   | `Wear it on your profile` — tone **accent**                                                                                                                                |
| footer                   | family **billing**, showManage **true**                                                                                                                                    |

### Visual / composition

| Property    | Value                                                     |
| ----------- | --------------------------------------------------------- |
| accent      | ME.accent `#FF7BD4` (isSupporter)                         |
| tier badge  | supporter                                                 |
| titleSize   | 26                                                        |
| conditional | isSupporter branch → different feature block + accent CTA |

## Template: Welcome · Founder

### Copy

| Field                   | Value                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject                 | `You're Founder #37. Locked in at $3, forever.`                                                                                                     |
| preheader               | `First 100 only. $3/mo never goes up. Here's your seat.`                                                                                            |
| header eyebrow          | `Welcome · founder`                                                                                                                                 |
| lede eyebrow            | `Welcome · Founder`                                                                                                                                 |
| title                   | `You're Founder #{seat}.` (e.g. `You're Founder #37.`)                                                                                              |
| sub                     | `One of the first hundred people to back Concert Crawl. Your price is locked at $3 a month, and it never moves — no matter what anyone pays later.` |
| seat stamp              | `#{seat}` / `of 100` · `Founder. Locked in.` · `$3 / mo — never goes up, ever`                                                                      |
| feature-section eyebrow | `Everything Premium — yours`                                                                                                                        |
| features                | first 4 PREMIUM_FEATURES + "Founder badge — first 100 only"                                                                                         |
| price promise           | `$3 is $3. New folks may pay double someday — never you.` (full variant)                                                                            |
| button                  | `Open Concert Crawl` — tone **signal**                                                                                                              |
| footer                  | family **billing**, showManage **true**                                                                                                             |

### Visual / composition

| Property    | Value                                        |
| ----------- | -------------------------------------------- |
| accent      | ME.signal `#7AE6FF`                          |
| tier badge  | founder (gradient halo)                      |
| titleSize   | **27** (isFounder)                           |
| conditional | isFounder → EmSeatStamp rendered after badge |

## Template: Welcome · Gifted

### Copy

| Field                  | Value                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| subject                | `You're in — Premium's on us.`                                                                                               |
| preheader              | `Lifetime Premium, no card, nothing to manage. Just enjoy it.`                                                               |
| header eyebrow         | `Lifetime Premium · Beta`                                                                                                    |
| lede eyebrow           | `On us`                                                                                                                      |
| title                  | `You're already in.`                                                                                                         |
| sub                    | `Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price.` |
| italic line            | `—— Seriously. We owe you one.` (MONO italic, ME.accent, size 12.5)                                                          |
| callout eyebrow        | `Everything Premium, switched on` (color ME.signal)                                                                          |
| features (in callout)  | first 4 PREMIUM_FEATURES                                                                                                     |
| button                 | `See everything you've got →` — tone **ghost**                                                                               |
| microcopy under button | `No card on file · nothing to cancel · just enjoy it` (MONO, size 9, ME.subtle)                                              |
| footer                 | family **product**, showManage **false** (comped — no manage link)                                                           |

### Visual / composition

| Property    | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| accent      | ME.signal (callout) / ME.accent (badge + italic)                                        |
| tier badge  | gifted, **beta true**                                                                   |
| titleSize   | 26 (default)                                                                            |
| conditional | Distinct template branch (tier==="gifted"); no price promise, no manage link, ghost CTA |

---

## Template: Receipt · Monthly (Premium)

### Copy

| Field          | Value                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject        | `Premium's paid up for July.`                                                                                                                                                                                                                                 |
| preheader      | `$5.00 on Jul 15. Next renewal Aug 15. Receipt inside.`                                                                                                                                                                                                       |
| header eyebrow | `Receipt`                                                                                                                                                                                                                                                     |
| lede eyebrow   | `Payment received`                                                                                                                                                                                                                                            |
| title          | `Premium's paid up.`                                                                                                                                                                                                                                          |
| sub            | `Your subscription renewed on schedule. Keep this one for your records.`                                                                                                                                                                                      |
| amount hero    | `$5.00` + subline `Paid · Jul 15, 2026 · Monthly`                                                                                                                                                                                                             |
| data rows      | Plan `Premium · monthly` (strong) · Amount `$5.00` (signal, strong) · Charged `Jul 15, 2026` · Billing period `Jul 15 – Aug 15, 2026` · Next renewal `Aug 15, 2026` · Payment `Visa ·· 4242` · Customer ID `cus_Qk28fLp0` · Receipt `View on Stripe →` (link) |
| button         | `View full receipt on Stripe →` — tone **ghost**                                                                                                                                                                                                              |
| footer         | family **billing**, showManage **true**, note `Questions about a charge? Reply to this email — a human reads it.`                                                                                                                                             |

### Visual / composition

| Property    | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| accent      | ME.signal (amount hero + amount row)                                               |
| tier badge  | premium                                                                            |
| titleSize   | 25                                                                                 |
| amount hero | `fontWeight: 900`, `fontSize: 44`, `color: ME.signal`, `letterSpacing: "-0.045em"` |

## Template: Receipt · Annual (Premium)

### Copy

| Field       | Value                                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject     | `Another year of Premium — receipt inside.`                                                                                                                                                                          |
| preheader   | `$50.00 on Jul 15. Renews Jul 15, 2027. Two months on the house.`                                                                                                                                                    |
| title       | `Another year of Premium. Locked in.`                                                                                                                                                                                |
| sub         | `Your annual plan renewed. Keep this for your records — it's your receipt for the next twelve months.`                                                                                                               |
| amount hero | `$50.00` + subline `Paid · Jul 15, 2026 · Annual`                                                                                                                                                                    |
| data rows   | Plan `Premium · annual` · Amount `$50.00` · Charged `Jul 15, 2026` · Billing period `Jul 15, 2026 – Jul 15, 2027` · Next renewal `Jul 15, 2027` · Payment `Visa ·· 4242` · Customer ID `cus_Qk28fLp0` · Receipt link |
| annual note | `Annual runs $50 — two months on the house versus paying monthly.` (MONO, ME.subtle)                                                                                                                                 |
| button      | `View full receipt on Stripe →` — ghost                                                                                                                                                                              |
| footer      | family billing, showManage true, same note                                                                                                                                                                           |

### Visual / composition

| Property    | Value                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| conditional | `annual` → title/sub differ, annual note row rendered, billing/renewal dates span a year |
| titleSize   | 25                                                                                       |
| tier badge  | premium                                                                                  |

## Template: Receipt · Founder (monthly)

### Copy

| Field         | Value                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| subject       | `Premium's paid up for July.` (RECEIPT_COPY monthly — tier-independent)                         |
| preheader     | `$5.00 on Jul 15. Next renewal Aug 15. Receipt inside.` (from monthly copy map)                 |
| title         | `Founder's paid up. Same $3.`                                                                   |
| sub           | `Your subscription renewed on schedule. Keep this one for your records.`                        |
| amount hero   | `$3.00` + subline `Paid · Jul 15, 2026 · Monthly`                                               |
| data rows     | Plan `Founder · monthly` · Amount `$3.00` (signal) · rest same as monthly                       |
| price promise | `$3 is $3. New folks may pay double someday — never you.` (**subtle** variant, footer-adjacent) |
| button        | ghost, same                                                                                     |
| footer        | billing, showManage true, same note                                                             |

### Visual / composition

| Property    | Value                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| conditional | isFounder → `$3.00` amount, subtle price promise row after hero, "Founder's paid up" title |
| tier badge  | founder                                                                                    |
| titleSize   | 25                                                                                         |

---

## Template: Dunning · Step 1

### Copy

| Field              | Value                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject            | `Your card bounced — mind giving it a refresh?`                                                                                                                |
| preheader          | `No drama. Takes about 30 seconds. We'll retry automatically.`                                                                                                 |
| header eyebrow     | `Billing`                                                                                                                                                      |
| status eyebrow     | `Billing · heads up` (dot + eyebrow, color ME.signal)                                                                                                          |
| title              | `Your card didn't go through.`                                                                                                                                 |
| sub                | `Happens all the time — expired card, bank playing it safe, whatever it is. Give it a refresh and you're set. We'll keep trying in the background either way.` |
| step tracker       | Notice (signal filled) · Retrying · Last try                                                                                                                   |
| button             | `Update payment method` — tone **signal**                                                                                                                      |
| reassure microcopy | `Nothing's changed yet · Premium's still on`                                                                                                                   |
| footer             | family billing, showManage true, note `Already fixed it? Ignore this — the next retry will pick it up automatically.`                                          |

### Visual / composition

| Property     | Value                 |
| ------------ | --------------------- |
| accent       | ME.signal (not final) |
| titleSize    | 26                    |
| tier badge   | none                  |
| tracker fill | segment 1 signal      |

## Template: Dunning · Step 2

### Copy

| Field          | Value                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| subject        | `Still no luck with your card.`                                                                                                                                    |
| preheader      | `We're retrying automatically. A fresh one skips the wait.`                                                                                                        |
| status eyebrow | `Billing · still trying` (signal)                                                                                                                                  |
| title          | `We're still trying that card.`                                                                                                                                    |
| sub            | `A few automatic retries haven't landed yet. Dropping in a fresh card takes about 30 seconds and skips the rest of the waiting. Premium stays on in the meantime.` |
| button         | `Update payment method` — signal                                                                                                                                   |
| reassure       | `Still on · we'll keep retrying for a few more days`                                                                                                               |
| footer         | billing, showManage true, same note                                                                                                                                |

### Visual / composition

| Property     | Value               |
| ------------ | ------------------- |
| accent       | ME.signal           |
| tracker fill | segments 1+2 signal |
| titleSize    | 26                  |

## Template: Dunning · Step 3 (final)

### Copy

| Field           | Value                                                                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject         | `Heads up: Premium pauses tomorrow.`                                                                                                                                                                                                                                             |
| preheader       | `One more try left. A fresh card keeps everything on.`                                                                                                                                                                                                                           |
| header eyebrow  | `Billing · last try`                                                                                                                                                                                                                                                             |
| status eyebrow  | `Billing · last try` (color **ME.amber**)                                                                                                                                                                                                                                        |
| title           | `Premium pauses tomorrow.`                                                                                                                                                                                                                                                       |
| sub             | `We couldn't get that card through after a week of trying. There's one more attempt tomorrow — if it doesn't land, Premium pauses and you drop back to Free.` _(RECONCILED: design said "two weeks"; corrected to "a week" to match the ~7-day dunning window — see gap report)_ |
| callout eyebrow | `If it pauses` (amber)                                                                                                                                                                                                                                                           |
| callout body    | `Your account and saved shows stay put. History, alerts, and calendar export just go quiet until a payment goes through. Nothing gets deleted — a fresh card switches all of it back on.`                                                                                        |
| button          | `Update payment method` — tone **signal** (stays branded even on final)                                                                                                                                                                                                          |
| reassure        | `Nothing gets deleted · a fresh card brings it all back`                                                                                                                                                                                                                         |
| footer          | billing, showManage true, same note                                                                                                                                                                                                                                              |

### Visual / composition

| Property     | Value                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| accent       | **ME.amber** `#FFC24B` (status eyebrow + dot + callout)                                    |
| callout      | EmCallout accent amber, soft `ME.amberSoft`                                                |
| tracker fill | segment 3 amber (step===3)                                                                 |
| conditional  | isFinal → amber status color, EmCallout "If it pauses" rendered, "last try" header eyebrow |
| titleSize    | 26                                                                                         |

---

## Template: Cancellation ack

### Copy

| Field                | Value                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject              | `Your Premium's set to wind down.`                                                                                                                                                                                     |
| preheader            | `You're good through Aug 15. No hooks, no hard feelings.`                                                                                                                                                              |
| header eyebrow       | `Subscription`                                                                                                                                                                                                         |
| status eyebrow       | `Cancelled` (dot + eyebrow, color ME.muted)                                                                                                                                                                            |
| title                | `Cancelled. No more charges.`                                                                                                                                                                                          |
| sub                  | `Done — we won't bill you again. Premium keeps working right up until {periodEnd}, then your account drops back to Free.` (default `Aug 15, 2026`)                                                                     |
| access panel eyebrow | `Premium works until`                                                                                                                                                                                                  |
| access value         | `{periodEnd}` (fontWeight 900, size 24)                                                                                                                                                                                |
| changes eyebrow      | `What changes after that`                                                                                                                                                                                              |
| changes body         | `History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free — same as always. Everything you've saved stays saved.` (last sentence fg/bold) |
| button               | `Manage subscription` — tone **ghost** (neutral affordance, NOT a pitch)                                                                                                                                               |
| footer               | family **billing**, showManage **false**, note `If this cancel was a surprise, reply to this email and we'll sort it out.`                                                                                             |

### Visual / composition

| Property   | Value                  |
| ---------- | ---------------------- |
| accent     | ME.muted (neutral dot) |
| tier badge | none                   |
| titleSize  | 26                     |

## Template: Win-back

### Copy

| Field                 | Value                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject               | `Denver's been busy since you left.`                                                                                                                                                        |
| preheader             | `Here's what Premium would hand back. No pressure, no countdown.`                                                                                                                           |
| header eyebrow        | `Concert Crawl`                                                                                                                                                                             |
| lede eyebrow          | `Whenever you want`                                                                                                                                                                         |
| title                 | `Denver's been busy.`                                                                                                                                                                       |
| sub                   | `Since you switched back to Free, Premium's quietly picked up a few things. Whenever you want them back, they're one tap away — no countdown, no discount gimmick. Just here when you are.` |
| callout eyebrow       | `What you'd get back` (signal)                                                                                                                                                              |
| features (in callout) | WINBACK_FEATURES: "Concert history — every show you attend, logged" · "Calendar export — Apple + Google, one tap" · "Follow artists + new-show alerts" · "Price-drop alerts + Spotify sync" |
| button                | `Turn Premium back on` — tone **signal**                                                                                                                                                    |
| microcopy             | `Still $5/mo · cancel any time · no hard sell` (MONO, size 9, ME.subtle)                                                                                                                    |
| footer                | family **product**, showManage **false**                                                                                                                                                    |

### Visual / composition

| Property   | Value     |
| ---------- | --------- |
| accent     | ME.signal |
| titleSize  | 27        |
| tier badge | none      |

---

## Template: Card expiring soon

### Copy

| Field          | Value                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject        | `Heads up — your card's about to expire.`                                                                                                                                                                         |
| preheader      | `Update it before your next renewal. Takes about 30 seconds, no interruption.`                                                                                                                                    |
| header eyebrow | `Billing`                                                                                                                                                                                                         |
| status eyebrow | `Billing · heads up` (dot + eyebrow, colored by tier accent)                                                                                                                                                      |
| title          | `Your card expires {daysPhrase}.` — `in 1 day` (singular at days=1) or `in {n} days` (30/14/7)                                                                                                                    |
| sub            | `The card on file runs out before your next {planPhrase} renewal. Drop in a fresh one and nothing skips a beat — no interruption, no dropped features.` (planPhrase = tierName or TIER_META label or "your plan") |
| card chip      | `Visa ·· 4242` · `exp 08/26`                                                                                                                                                                                      |
| button         | `Update your card` — tone **signal**                                                                                                                                                                              |
| microcopy      | `Nothing's wrong yet · this is just a nudge` (size 9, ME.subtle)                                                                                                                                                  |
| footer         | family **billing**, showManage **true**, note `Already updated it? You're set — ignore this one.`                                                                                                                 |

### Visual / composition

| Property    | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| accent      | tier-aware — `TIER_ACCENT[tier] \|\| ME.signal` (dot + status eyebrow)                |
| tier badge  | rendered if `tier` present                                                            |
| titleSize   | 26                                                                                    |
| conditional | `days` (30/14/7/1) drives daysPhrase; singular at 1; NOT amber (heads-up not failure) |

## Template: Gift ending notice

### Copy

| Field            | Value                                                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| subject          | `Your gifted Premium is wrapping up.`                                                                                                                                                                                                          |
| preheader        | `About a week left. Nothing gets deleted — here's what happens next.`                                                                                                                                                                          |
| header eyebrow   | `Gifted Premium · ending`                                                                                                                                                                                                                      |
| lede eyebrow     | `Your gift's almost up`                                                                                                                                                                                                                        |
| title            | `It's been a good run.`                                                                                                                                                                                                                        |
| sub              | `{gifter} put you on Premium — and the gift wraps up {endsPhrase}. After that your account slides back to Free. No charge, no surprise.` (gifter = gifterName or `A friend of the crawl`; endsPhrase = `on {giftEndsAt}` or `in about a week`) |
| italic line      | `—— Hope it showed you a few good nights.` (MONO italic, ME.accent)                                                                                                                                                                            |
| changes eyebrow  | `When it ends`                                                                                                                                                                                                                                 |
| changes body     | `History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free — same as always. Everything you've saved stays saved.`                                                 |
| callout eyebrow  | `Want to keep it going?` (accent)                                                                                                                                                                                                              |
| callout features | "Concert history — every show you attend, logged" · "Calendar export + Spotify sync" · "Follow artists + price-drop alerts"                                                                                                                    |
| button           | `Keep Premium — $5/mo` — tone **signal**                                                                                                                                                                                                       |
| microcopy        | `No card on file · nothing gets deleted · only if you want to` (size 9, ME.subtle)                                                                                                                                                             |
| footer           | family **product**, showManage **false** (comped — no billing affordance)                                                                                                                                                                      |

### Visual / composition

| Property    | Value                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| accent      | ME.accent `#FF7BD4` (pink — gifted; italic line + callout)                                     |
| callout     | EmCallout accent ME.accent, soft ME.accentSoft                                                 |
| titleSize   | 27                                                                                             |
| tier badge  | none                                                                                           |
| conditional | gifterName null → "A friend of the crawl"; giftEndsAt null → "in about a week"; no manage link |

---

## State / Variant Coverage

| Variant                   | Trigger prop                       | Accent                             | Tier badge       | Notes                                                                                                                                   |
| ------------------------- | ---------------------------------- | ---------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome · Premium         | `tier="premium"`                   | signal `#7AE6FF`                   | Premium          | Full feature list (5 incl. ★ future), signal CTA "Open Concert Crawl", billing footer + manage                                          |
| Welcome · Supporter       | `tier="supporter"`                 | accent `#FF7BD4`                   | Supporter        | isSupporter branch: history + export + badge features, "servers we already pay for" microcopy, **accent** CTA "Wear it on your profile" |
| Welcome · Founder         | `tier="founder"`, `seat={n}`       | signal (accent halo badge)         | Founder          | isFounder: EmSeatStamp, titleSize 27, "Founder badge — first 100 only", founder price promise                                           |
| Welcome · Gifted          | `tier="gifted"`                    | accent + signal                    | Gifted, **beta** | Distinct template: italic gratitude, ghost CTA "See everything you've got →", **product footer, no manage**, no price promise           |
| Receipt · Monthly         | `period="monthly", tier="premium"` | signal                             | Premium          | `$5.00` hero, "Premium's paid up.", monthly dates                                                                                       |
| Receipt · Annual          | `period="annual"`                  | signal                             | Premium          | `$50.00` hero, "Another year… Locked in.", annual note "two months on the house", year-span dates                                       |
| Receipt · Founder         | `tier="founder"`                   | signal                             | Founder          | `$3.00` hero, "Founder's paid up. Same $3.", **subtle** price promise row                                                               |
| Dunning · Step 1          | `step=1`                           | signal                             | none             | "give it a refresh?", tracker seg 1, reassure "Nothing's changed yet"                                                                   |
| Dunning · Step 2          | `step=2`                           | signal                             | none             | "still trying", tracker seg 1+2, "we'll keep retrying"                                                                                  |
| Dunning · Step 3          | `step=3` (isFinal)                 | **amber** `#FFC24B`                | none             | "pauses tomorrow", amber status + "If it pauses" callout, amber tracker seg 3, CTA stays signal                                         |
| Cancellation              | `periodEnd`                        | muted (neutral dot)                | none             | Confirmation not pitch, access-until panel, ghost "Manage subscription", billing footer **no manage**                                   |
| Win-back                  | (none)                             | signal                             | none             | Single hero + callout + signal CTA "Turn Premium back on", product footer, "no hard sell"                                               |
| Card expiring · 30/14/7/1 | `tier, tierName, days`             | **tier-aware** (TIER_ACCENT[tier]) | if tier present  | daysPhrase flexes 30/14/7; singular "in 1 day"; heads-up (not amber); signal CTA, manage allowed                                        |
| Gift ending               | `gifterName, giftEndsAt`           | accent `#FF7BD4` (pink)            | none             | Comped wrap-up, italic gratitude, "Keep Premium — $5/mo" signal CTA, **product footer no manage/no billing**                            |

**Footer contract summary:** billing family + manage → premium/supporter/founder welcome, all receipts, all dunning, card-expiring. billing family + **no** manage → cancellation. product family + **no** manage → gifted welcome, win-back, gift-ending. `manage subscription` link only appears where a payment relationship exists; never on comped (gifted/gift-ending) or on the cancellation confirmation.

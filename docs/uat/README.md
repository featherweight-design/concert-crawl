# Concert Crawl — User Acceptance Testing (UAT)

These scripts are a repeatable, pass/fail checklist for the features Concert Crawl
ships. Run them after a release, before a launch, or any time you want to confirm
the app still does what it's supposed to. They're written so someone who has never
seen the codebase can follow the steps and record a result.

There are two scripts:

| Script                                 | Who runs it                                         | Covers                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`consumer-uat.md`](./consumer-uat.md) | Anyone with a normal account (hand this to friends) | Everything a signed-in user can reach — auth, browse, search, event detail, community pricing, venues, account, watching, plans, feedback & release notes, PWA |
| [`admin-uat.md`](./admin-uat.md)       | An admin (you, or a new admin being onboarded)      | The `/admin` panel — dashboard, review/moderation, venues, crawl, event editing, prices, users, feedback, inbox, invite codes, founder window, settings        |

---

## Where you're testing

**All cases run against production: [concertcrawl.app](https://concertcrawl.app).**

This is the live app with real data. That has two consequences:

1. **Event and price data is real** — what you see is what the crawler actually
   found. Some cases say "pick any upcoming event"; that's expected.
2. **Actions you take are real.** ⚠️ marks the cases that create **shared,
   admin-visible records** — submitting a price, filing a dispute, sending
   feedback, or changing a subscription (see below). Other steps still save
   changes too — signing up, onboarding, theme choice, watching list, profile
   edits — but those stay on your own account and aren't flagged.

---

## Getting an account

1. Go to [concertcrawl.app](https://concertcrawl.app).
2. Sign up with email (or a supported OAuth provider if one is offered).
3. During the private beta you may need an **invite code** — if sign-up asks for
   one and you don't have it, ask whoever invited you to test.

Beta testers are typically granted **lifetime Premium**, so the paid-tier cases
may already show you as a Premium/Founder member. That's expected — note it and
move on rather than marking a fail.

---

## How to record results

Each test case ends with a **Result** line and a **Notes** line. Fill them in.
The easiest workflow:

- Copy the script into a Google Doc, or print it, or edit the Markdown directly.
- For each case, replace the `⬜` with the outcome and add notes for anything
  that looked off.

**Result legend:**

| Mark           | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| ✅ **Pass**    | Did what the Expected result says                                             |
| ❌ **Fail**    | Did something different, broke, or errored — describe it in Notes             |
| 🚧 **Blocked** | Couldn't run the case (a precondition wasn't available, a page wouldn't load) |
| ➖ **N/A**     | Doesn't apply to you (e.g. a Premium-only case while you're on Free)          |

When you mark ❌, the most useful notes are:
**what you did, what you expected, what actually happened** — and a screenshot if
you can grab one. Reference the case ID (e.g. "SEARCH-03 failed") so it's easy to
trace back.

---

## Test-data etiquette (production!)

Cases marked **⚠️** create shared, admin-visible records (a price, a dispute,
feedback, a subscription change). Ordinary steps may still save changes to your
own account, but the ⚠️ ones are the ones others will see. For those, please:

- Use obviously-fake, harmless content — e.g. feedback text like
  "UAT test — please ignore," not real bug reports you want actioned.
- **Do not enter a real credit card** in checkout cases unless you've been
  explicitly asked to test a real payment. The cases are written so you can
  verify the flow _up to_ the card step and stop there.
- It's fine to submit a plausible ticket price for a real event — that's the
  feature working. Just don't submit deliberately wrong data.

If you're unsure whether an action is safe, mark the case 🚧 Blocked and ask.

---

## Phone and desktop

Concert Crawl is mobile-first but has full desktop layouts too. Unless a case
says otherwise, **run it on both a phone and a desktop browser.** Most cases
behave identically; a handful have genuinely different layouts (bottom tab bar
vs. top header, the settings screen, full-screen modals). Those cases call out
the difference explicitly and ask you to check both.

If a case passes on one but fails on the other, mark it ❌ and say which one.

---

## Test-case format

Every case carries the same fields — an ID and short title, a precondition, numbered
steps, an expected result, and a Result/Notes pair for you to fill in:

```markdown
### AREA-NN — Short title

**Precondition:** what must be true before you start
**Steps:**

1. Do this
2. Then this

**Expected:** what you should see if it's working
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**
```

Case IDs are prefixed by area so a failure is easy to point back to. Consumer
prefixes: `AUTH-` (auth), `EVT-` (browse), `SEARCH-` (filter/search), `DTL-`
(event detail), `PRICE-` (community pricing), `VEN-` (venues), `ACCT-`
(account/settings), `WATCH-` (watching list), `SUB-` (subscription/plans), `FB-`
(feedback/release notes), `PWA-` (PWA/mobile). Admin cases all use `ADM-`.

Expected results describe _behavior_, not exact wording — copy changes often, so
"a confirmation appears" is a pass even if the exact sentence differs from what's
written here. If the wording is confusing or wrong, note it, but don't fail the
case over copy alone.

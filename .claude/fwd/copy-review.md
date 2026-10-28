# Project binding — Concert Crawl

The app exists so people go to concerts, and every word on screen sits between the user and
a ticket.

## Voice

Slight cheek, honesty rail, warmth underneath. Honest before clever. Sounds like a person
who goes to shows, not a brand.

- Failure copy leans honest, not cute: "Your bank said no", never "Oops!"
- Never the word "fraud" in user-facing copy.
- **Receipts and legal go plain**, because a receipt is a tax record. Dunning is a nudge
  rather than a receipt, so cheek is allowed there.
- Cancellations stay warm and gracious.

## Locked vocabulary (rule 10)

| Use                                                                           | Never                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **Watching** (the list and its sub-tab; "My shows" is only the nav container) | Saved, Favorites, saved shows                  |
| **Concerts** (the nights you tapped "I'm going!" on)                          | History, **Concert History**, Attending, Going |
| **Following** (artists only)                                                  | applied to shows                               |
| **Submitted prices**                                                          | Submissions, My prices                         |
| **Price check**                                                               | Dispute, Contest, Challenge                    |

`Concerts` is customer-facing only. The code identifier is `history` everywhere and stays
that way: the `/history` route, the `/v1/history` API path, the `concert-history`
entitlement key, `HISTORY_COPY` and the `.ics` filename all carry it. Renaming a key to
chase the label is a violation in the other direction.

**Where a paywall sentence would have to read "part of Concerts,"** don't name the feature
at all. `HISTORY_COPY.locked` is the precedent: it sells the surface with `'Keep the
nights.'` and never coins a product name.

Shows are **watched**; artists are **followed**. "Add a show to follow it" and "your saved
shows" are both violations.

## Copy inventory

- `apps/web/**/definitions/copy.ts` (21 files)
- `apps/api/src/emails/templates/*.ts`
- `apps/web/src/lib/definitions/releases.ts`
- `packages/push/src/definitions/copy.ts`
- `packages/crawler-core/src/lib/artist-fanout/definitions/copy.ts`

Channels in play: in-app, email, push, release notes. All of rule 2's caps apply.

## Rule 4 calibration

17 email templates and 63 `releases.ts` entries currently carry em-dashes, so the rule is
load-bearing rather than theoretical. Historical `releases.ts` entries are a frozen record.

## Frozen areas — flag drift, never edit

- Already-merged `releases.ts` entries (a historical record).

## Adjacency note — email templates

Lede strings are shared consts consumed by both the HTML `bodyRows` and the plain-text
`text` array, but **each array also carries exclusive lines**. Read both.

## Test coupling

`apps/api/src/emails/templates/templates.test.ts` asserts exact strings, so an email edit
is always a test edit.

## Mechanical backstop

`react/jsx-no-literals` in `apps/web/eslint.config.mjs` fails the build on new inline
strings, so a clean lint means the "new string in a `.tsx`" trigger is already satisfied.

## Worked examples (moved from the generic skill)

- Rule 1 color: `'No shows tonight, grandpa.'` passes; `'These are your upcoming shows.'`
  does not. Labelling the obvious: no `EXAMPLE · NOT YOUR LIST` on a visible preview, no
  `Tap to watch` under a `Watch` button.
- Rule 2: interpolated `${artistAtVenue}` counts as one word.
- Rule 3: `eyebrow: 'Upgrade · pick a lane'` + `title: 'Pick a lane.'` fails.
- Rule 4: metadata rows use `date · venue · price`; `'—— Hope it showed you a few good
nights.'` is not an attribution and the dash goes.
- Rule 5: tooltip designs do not exist yet; record `TOOLTIP`, never invent one.
- Rule 6: machinery to cut includes the crawler and the LLM. "Ticketing APIs don't share
  prices with us" is the whole argument for submitting a price, so it stays. In Recovery,
  `'Poll failed.'` becomes `'Couldn't refresh.'`
- Rule 7: Founder's "$3/mo, locked forever" stays; "We never raise it" on all three cards
  does not.
- Rule 8: "No card, no trial, nothing to cancel" carries two facts across three clauses.
- Teaching class includes the why-submit-a-price copy.
- Copy-in-definitions convention: user-visible strings live in `definitions/copy.ts`;
  hardcoded JSX strings are a finding.

Price-region strings in `consumer/definitions/copy.ts` are not frozen: correct them like any other
copy, and update the string tests that assert them in the same PR, keeping their behavioural checks.

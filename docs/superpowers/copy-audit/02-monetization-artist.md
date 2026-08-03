# Copy audit 02 — monetization + artist surfaces

Mode: **propose**. No source file was touched.

## Files covered

| File | Leaf strings enumerated |
|---|---|
| `apps/web/src/components/consumer/tier-picker/definitions/copy.ts` | ~160 |
| `apps/web/src/components/consumer/going/definitions/copy.ts` | 18 |
| `apps/web/src/components/consumer/spotify/definitions/copy.ts` | ~180 |
| `apps/web/src/components/consumer/artist-page/definitions/copy.ts` | 39 |
| **Total** | **~397** |

Components opened for adjacency (Process step 3): `TierPickerSheet.tsx`,
`TierCardDesktop.tsx`, `TierRowMobile.tsx`, `TierCardDetail.tsx`,
`CheckoutPanel.tsx`, `GiftedThankYou.tsx`, `FounderClaimTakeover.tsx`,
`definitions/constants.ts` (tier feature assembly), `EventDetailCtaBlock.tsx`,
`GoingNudge.tsx`, `ConnectEntryCard.tsx`, `EmptyDenverMatchModal.tsx`,
`TasteUpsellSheet.tsx`, `ArtistPageContent.tsx`, `FollowBlock.tsx`,
`EmptyUpcoming.tsx`, `PastShows.tsx`, `lib/history-line.ts`.

## Verdict tally

| Verdict | Count |
|---|---|
| CUT | 2 |
| RENAME | 6 |
| TIGHTEN | 53 |
| TOOLTIP | 0 |
| **KEEP** | **~335** |
| Locked, proposed but not applied | 1 |
| Separate finding (hardcoded JSX string) | 1 |

`going/copy.ts` produced **zero** non-KEEP rows. Its only em-dashes are in code
comments, which rule 4 puts out of scope, and the surface has already been
edited down once (`EventDetailCtaBlock` deleted its standing support line).

Class split of the non-KEEP rows: 12 Obligation, 14 Recovery, 3 A11y,
16 Teaching, 16 Chrome. Nothing in the Recovery or Obligation set was cut for
brevity — every one of those rows is a rule-4 dash swap or a rule-10 rename,
both of which the rule-scope table applies to those classes.

---

## Findings

### Rules 1, 3, 7, 8, 10 — the substantive rows

| File | String | Class | Verdict | Replacement | Adjacency note |
|---|---|---|---|---|---|
| tier-picker | `tiers.founder.features[1]`: `'$3/mo — never goes up, ever'` | Obligation | **CUT** | (delete the bullet) | On one founder card, top to bottom: `priceUnit` `'/ mo · locked forever'` in the price block, this bullet, `card.pricePromise.founder` rendered as a `TierMonoNote` two elements below, and `footer.desktop` `'…your price never goes up'` on the shell rail. Four statements of one promise; five when Founder is the current plan, which adds the banner `'Your plan · locked $3/mo'`. Rule 7's exception buys the founder card exactly one restatement, and the mono note is the strongest of them. Same stack on mobile (`TierRowMobile` renders the identical `TierFeatureList` + `pricePromise` pair). |
| tier-picker | `checkout.rail.cancel`: `'Cancel anytime, lose nothing'` | Chrome | **CUT** | (delete; the legal row carries it) | `CheckoutPanel` renders `LegalBlock` → `'Auto-renews monthly. Cancel anytime…'` directly above the Subscribe button, then `BottomMonoRail` ~6px below the same button. The cancel promise appears twice inside ~60px. The legal row is Obligation and survives; the mono rail keeps only its Stripe segment. |
| tier-picker | `header.eyebrow`: `'Upgrade · pick a lane'` | Chrome | TIGHTEN | `'Upgrade'` | `RailHeader` paints the eyebrow at the top of `ModalShell`; `header.title` `'Pick a lane.'` renders in the body block immediately beneath. Both on screen at once. This is rule 3's worked example, verbatim. Title survives; eyebrow re-scopes to location. |
| tier-picker | `footer.mobile`: `'Tap a tier to compare · cancel any time · your price never goes up'` | Chrome | TIGHTEN | `'Cancel any time · billed monthly · your price never goes up'` | The mobile rows are `aria-expanded` buttons with a rotating chevron and a 2px active border. The affordance is visible; rule 1 forbids labelling it. Aligning with `footer.desktop` also stops the two rails drifting. |
| tier-picker | `gifted.body`: `"Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price."` | Teaching | TIGHTEN | `"Lifetime Premium, on us. No tier to pick. You showed up early; that's the whole price."` | `GiftedThankYou` renders body at L116 and `gifted.footer` `'No card on file · nothing to cancel · just enjoy it'` at L242 on the same panel. "no card to add, nothing to manage" and "No card on file · nothing to cancel" are the same two facts. Also a rule-9 tricolon and a rule-4 dash; one edit clears all three. Footer survives as the higher-level rail. |
| tier-picker | `gifted.eyebrow`: `'Lifetime Premium · Beta'` | Chrome | TIGHTEN | `'Lifetime Premium'` | The eyebrow renders in `RailHeader`; `gifted.beta` `'Beta'` renders as its own pill at `GiftedThankYou` L90, a few pixels below. The word ships twice on one panel. |
| tier-picker | `founderClaim.body`: `"You got in before the rest. $3 a month for as long as you're here — even when everyone else is paying double."` | Obligation | TIGHTEN | `"You got in before the rest. When everyone else is paying double, you won't be."` | The takeover already states the price three ways around this line: `headline` `'Founder. Locked in.'` (L247), `priceStamp` `'$3'` + `priceStampUnit` `'/mo'` (L295-303), `priceStampEyebrow` `'Locked forever'` (L319). The body's first clause is the stamp read aloud; the second clause is the only thing on the surface that names the future price gap. Keep the differentiator, drop the echo. |
| spotify | `autoWatchSheet.optionHighlight.sub`: `"…mark matching shows with a 'You follow' badge as you browse…"` | Teaching | **RENAME** | `"…mark matching shows with a 'Following' badge as you browse…"` | `FollowHighlight` renders `followHighlight.chip`, whose literal is `'Following'`. The copy names a UI element by a label that element has never carried. Factual defect, not taste. |
| spotify | `disconnectConfirm.bullets[1].sub`: `"No more 'You follow' flags. Your browsing goes back to plain."` | Obligation | **RENAME** | `"No more 'Following' flags. Your browsing goes back to plain."` | Same mismatch, on the what-you-lose disclosure, where naming the wrong element is worst. |
| spotify | `disconnectConfirm.bullets[2].sub`: `'Anything you already saved is yours — unlinking never touches it.'` | Obligation | **RENAME** | `"Anything you're already watching is yours; unlinking never touches it."` | Rule 10: there is no "saved" concept. Its own bullet head one line above says `"Shows you're watching stay."`, so the sub contradicts the head's vocabulary inside a single bullet. Dash goes with it. |
| spotify | `failTokenRefresh.body`: `'…Your saved shows are safe — we just can't spot new matches until you reconnect.'` | Recovery | **RENAME** | `"…The shows you're watching are safe; we just can't spot new matches until you reconnect."` | Rule 10 names "your saved shows" as a violation outright. Rendered by `ConnectionsPanel` as the token-expiry state. |
| spotify | `discovery.failure.body`: `'…Your saved shows are untouched — reconnect to bring taste back.'` | Recovery | **RENAME** | `"…The shows you're watching are untouched. Reconnect to bring taste back."` | Second instance of the same violation, on the Browse shelf failure. Deliberately not the same construction as the row above (rule: no two replacements share an opener). |
| spotify | `firstWatchNudge.eyebrow`: `'NICE — FIRST ONE SAVED'` | Chrome | **RENAME** | `'NICE. FIRST ONE WATCHED'` | The nudge fires on the user's first *watch*, so this calls the core concept "saved" at the exact moment it is introduced. Rule 10 plus rule 4 in seven words. |
| spotify | `connectEntry.sectionSub`: `"Link a service and we'll tune your browsing to what you already love. One thing so far."` | Chrome | TIGHTEN | `'One thing so far.'` | `SettingsRoute` L117 renders this, then `ConnectEntryCard` L34 renders `connectEntry.pitch` — `"Bring over the artists you already follow and play the most. We'll flag their Denver shows the moment they land."` — about 40px below. Two pitches stacked, the second strictly better. Rule 8; the surviving fragment is the line's color and passes read-aloud. |
| spotify | `tasteFilter.upsell.bullets[0].sub`: `'Filter any view to your artists in one tap'` | Teaching | TIGHTEN | `'Any view, one tap'` | `TasteUpsellSheet` renders `bodyBeforeBold` — `'Filtering Denver down to just the artists you follow is a paid perk…'` — 16px above this bullet, whose head is already the bolded `Following` from that sentence. The paywall rationale (Teaching, DEFEND) is untouched; only the bullet's restatement is squeezed. |
| artist-page | `followPitchActive`: `"You're following. Their dates live on this page."` | Chrome | TIGHTEN | `'Their dates live on this page.'` | `FollowBlock` renders `FollowButton` — whose visible label in this state is `following` = `'Following'` — directly above the pitch. "You're following." restates the button, which rule 1 forbids. The inactive `followPitch` is untouched: its first sentence says what activation *does*, which the button cannot. |
| artist-page | `emptyBody` / `emptyBodyFollowing`: `'…check back — this page is where the next one turns up.'` | Teaching | TIGHTEN | `emptyBody`: `'No dates booked that we can see. Follow them and check back.'` · `emptyBodyFollowing`: `"No dates booked that we can see. You're following, so check back."` | `ArtistPageContent` L130/140 renders `FollowBlock` (pitch: `'…Their dates live on this page.'`) in the same viewport as `EmptyUpcoming` L65. "This page is where the next one turns up" is that promise again, one column over. Rule 7: it stays at the follow affordance, where it is the reason to act. Also clears two dashes. |

### Rule 4 — em-dashes in rendered strings

Every one of these is a `TIGHTEN`, replacement per rule 4 (period by default,
colon or comma where the clause is genuinely subordinate). Listing the strings
by location rather than repeating each in full; none of them changes meaning.

**tier-picker (25 strings)**

| Lines | Strings | Class | Replacement shape |
|---|---|---|---|
| 18, 25, 32, 39 | the four `header.loggedOut.*.sub` gates — `'X is free — it just needs an account to save to.'` | Teaching | comma: `'X is free, it just needs an account to save to.'` |
| 64 | `card.pricePromise.founder` — `'…may pay double someday — never you.'` | Obligation | period: `'…may pay double someday. Never you.'` |
| 102, 112, 113, 125, 127, 156, 157 | tier + gifted feature bullets, `'Label — detail'` | Chrome | colon: `'Watching: keep an eye on any show'` etc. Sweep the whole class in one pass; leaving one behind is a wasted review round. |
| 136 | founder `'$3/mo — never goes up, ever'` | Obligation | superseded by the CUT above |
| 152 | `gifted.body` | Teaching | superseded by the TIGHTEN above |
| 153 | `gifted.signature` — `'—— Seriously. We owe you one.'` | Chrome | `'Seriously. We owe you one.'` Rule 4's narrow attribution exception explicitly does **not** cover a dash in front of a sentence. |
| 181 | `checkout.legal.autoRenew` — `'Auto-renews monthly. Cancel anytime — keeps working till the period ends.'` | Obligation | semicolon: `'Auto-renews monthly. Cancel anytime; it keeps working till the period ends.'` The disclosure itself is untouched. |
| 202, 209, 216, 223, 230, 237 | `failure.cardKeptNote` + the five decline bodies/headlines | Recovery | period or comma per clause. No diagnosis is deleted (rule 6: translate, never drop). |
| 253, 260 | `challenge.footerNote`, `challenge.kinds['3ds'].body` | Teaching | period |
| 278 | `founderClaim.body` | Obligation | superseded by the TIGHTEN above |

**spotify (20 strings)** — lines 30, 65, 122, 125, 126, 131, 134, 143, 151,
160, 170, 186, 193, 199, 251, 292, 298, 317, 319. Same treatment. Note
`connectedCard.lastSyncedNever` (L111) is a bare `'—'` used as a null value in
a data row, not prose: **KEEP**, it is Data and a screen reader skips it.

**artist-page (7 strings)** — lines 48, 55, 57, 79, 82, 99, 101. `historyOne`
and `historyMany` (55, 57) use the dash to attach a venue list, so a colon
reads best there: `` `We've caught them once: ${venue}.` ``.
`followSignedOutAria` (48) is A11y — exempt from cuts, but rule 4 still applies
and a screen reader announcing an em-dash is the whole reason: `` `Follow
${name}, sign in to follow` ``.

### Separate finding — hardcoded string outside `definitions/`

`apps/web/src/components/consumer/filter-bar/TasteUpsellSheet.tsx` L82 renders
`<span …>— {bullet.sub}</span>`. The separator is an em-dash hardcoded in JSX:
it violates the copy-in-definitions convention *and* rule 4, and it is invisible
to any audit that only reads `copy.ts`. Recommend the bullet head take a colon
in the copy file and the JSX render the sub plainly.

---

## Grep verification (Process step 5)

Every `CUT` and `RENAME` literal was searched with `rg -F` across the repo, no
globs.

| Literal | Non-source references found |
|---|---|
| `$3/mo — never goes up, ever` | `docs/superpowers/design-tables/tier-picker.md:17`, two handoff `.jsx` prototypes. **No test or E2E reference.** |
| `Cancel anytime, lose nothing` | `docs/superpowers/design-tables/checkout-legal-microcopy.md:137` ("Segment 2"), one handoff `.jsx`. **No test or E2E reference.** |
| `'You follow' badge` | `docs/superpowers/design-tables/763-spotify-connect-ui.md:671`, one handoff `.jsx`. No test reference. |
| `No more 'You follow' flags` | same design table L1000, one handoff `.jsx`. No test reference. |
| `Anything you already saved is yours` | same design table L1001, one handoff `.jsx`. No test reference. |
| `Your saved shows are safe` | same design table L1119, one handoff `.jsx`. No test reference. |
| `Your saved shows are untouched` | two handoff `.jsx`. No test reference. |
| `Upgrade · pick a lane` | four handoff `.jsx`. No test reference. |
| `Tap a tier to compare` | `docs/superpowers/design-tables/tier-picker.md:184`, two handoff `.jsx`. The shipped string **already** diverges from the table (the table's third segment is "Stripe handles cards"), so this rail is established as editable. |
| `Our record starts when the crawl did` | `docs/superpowers/design-tables/1115-artist-page.md:450` and `:557`, handoff README + `.jsx`. **Locked — see below.** |

Tests referencing these surfaces (`ConnectionsPanel.test.tsx`,
`TierPickerSheet.test.tsx`, `FollowBlock.test.tsx`, etc.) assert via the copy
constants rather than string literals, so the renames land without test edits.
The design tables and handoff prototypes are records, not runtime, and are not
swept.

## Self-check

- [x] Every CUT/RENAME literal grepped with `rg -F`; no non-test source
      references remain.
- [x] 30% budget per surface. Strings removed: tier-picker 2 of ~160 (1.3%),
      spotify 0, artist-page 0, going 0. Every other row is a rewrite in place.
- [x] No two replacements share an opening construction. The two
      "saved shows" renames were deliberately split ("The shows you're
      watching are safe;" vs "…untouched. Reconnect…").
- [x] Every replacement re-read aloud.
- [x] DEFEND classes: 12 Obligation and 14 Recovery rows changed, none for
      brevity. Reasons stated per row — rule 4 dash swaps, rule 10 vocabulary,
      and two rule-7 duplications where the *other* copy of the promise
      survives. The paywall rationale (`header.sub`, all four `loggedOut`
      gates, tier `rationale` lines, `tasteFilter.upsell` body, the Spotify
      honesty rail, every decline diagnosis) is intact.
- [x] Rewrite ratio: 0 of the CUT/TIGHTEN rows are rewrites of strings that
      were already fine. Every row cites a specific rule breach.

---

## Locked strings I did not touch

**`artist-page/copy.ts` — `pastNote(since)`**
`'Our record starts when the crawl did, ${since}. Older gigs exist; we just weren't there.'`

`docs/superpowers/design-tables/1115-artist-page.md:450` says of this line:
*"Load-bearing; must not be dropped as decoration."* That is a lock.

The finding stands as a proposal only. `ArtistPageContent` L136 renders
`historyLine()` near the top of the page, and `historyMany` already closes with
*"That's since ${since}; anything earlier they played, we missed."*
`PastShows` only mounts when past shows exist, which is exactly when
`historyOne`/`historyMany` rendered above it, so the crawl-window disclosure is
made twice on every page that shows it at all, never once. Rule 7 would put it
at the top only. Recommend Hugh or the design table owner rules on which of the
two carries it; I applied neither.

**Also locked, left alone:**

- `going/copy.ts` `button.default` — `"I'm going!"`. Rule 9 disallows
  exclamation points in system copy, but the handoff README §Voice makes it
  explicit: *"with the exclamation — it's a commitment, not a checkbox."*
  Design authority beats the rule; the file already documents this.
- `tier-picker/copy.ts` `failure.*` category eyebrows/codes/headlines. The file
  header calls them a *"verbatim copy contract"* from
  `failure-surfaces.md` (the word "fraud" never user-facing, raw decline codes
  never rendered). Only the em-dash swaps above are proposed; not one
  diagnosis, code, or headline is otherwise touched.
- `tier-picker/definitions/constants.ts` prices, names, `priceText`,
  `priceUnit` — Data, locked in design brief #781.
- `spotify/copy.ts` `honestyRail` — the three trust lines are the whole
  argument for granting OAuth (rule 6: keep the detail that answers *why should
  I trust this*). `connectEntry.footer` restates all three one tap earlier on
  the entry card, which reads like a rule-7 hit but is not: the footer is the
  reason to tap at all, and the rail is the pre-grant disclosure. Both KEEP.

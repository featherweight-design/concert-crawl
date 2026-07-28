# #794 — Design decisions log (R2)

The brief's §3 carries 12 locked decisions. This file records the calls **§8 left
open to Design**, plus anything else this drop settled. Locked decisions are not
revisited here.

---

## 1. The signed-out shell reads as *different*, not *incomplete*

**Decision.** Nothing signals absence. No dimming, no skeletons, no "sign in to
see this" placeholders, no disabled rows. Every slot renders a real, resolved
thing; the signed-out things are just different things.

**Why.** "Incomplete" is only honest if something is actually missing, and
nothing is: the whole read-only app is here (§3.1). A shell that advertises its
own gaps argues against the product's core claim. It also compounds the §3.10
problem — if the chrome looks half-built, the identical-at-rest Watch eye starts
reading as broken too.

**Why-not incomplete.** Considered a deliberately hollow account slot (dashed
ring, no glyph) as a soft conversion cue. Rejected: it makes the most-looked-at
36px in the app look like a loading failure, and `UserMenu`'s own code comment
already calls out that exact trap.

---

## 2. `/watching` teaches with copy **and** a worked example

**Decision.** Both. A two-sentence definition, then three sample rows in a dashed
container captioned `EXAMPLE · NOT YOUR LIST`, then three facts, then the CTA.

**Why.** "Watching" is two features in one word — a shortlist *and* a price
tracker. Copy alone gets the shortlist across and drops the tracker; the example
rows carry the tracker in one glance (a green `−$7`, a `flat`, a `SOLD OUT`) with
no paragraph explaining deltas. The example is also the only place a visitor sees
what the payoff looks like.

**Why-not example-only.** Too implicit about *how* it starts — the eye gesture
needs saying.

**Cost, accepted.** A fake list on a real route needs guarding: `aria-hidden`,
a text alternative, a dashed border, and a caption. Three redundant signals is
right here; a screen-reader user mistaking sample rows for their own shows is the
worst available failure on this page.

---

## 3. Sign up / Sign in sit in the identity card's position

**Decision.** The get-in card occupies the identity card's slot — same footprint,
same bottom border, top of the menu.

**Why.** Slot parity is the whole model (§3.2). "Who you are" is the first row
signed in; "become someone" is the first row signed out. It is also the first
focus stop after the trigger, which is where a keyboard user wants the primary
action, and the menu already opens from a tap that expressed account intent.

**Why-not more prominent.** There is nowhere more prominent inside a menu whose
first row is the top. Anything louder (a full-bleed banner, a colored header)
would make the theme picker below feel like an afterthought — and the theme
picker is the reason the menu still opens at all (§3.4).

---

## 4. Skip is easy by default and *louder* mid-intent

**Decision.** Skip is in the top rail on every step, same position. Default: a
quiet mono text link. Mid-intent (arrived from a gated tap): the rail states the
pending action, and Skip becomes an outlined button naming the destination —
*Skip — back to Geese*.

**Why.** Two different people are in this flow. Someone who signed up on purpose
should be able to read the tour without an exit shouting at them. Someone who was
three taps from watching a show has a job in progress, and the honest move is to
make leaving *more* attractive than continuing — they can reach the tour from the
account menu forever (§3.7).

**Why-not one weight for both.** A single loud Skip makes the tour look
skippable-because-worthless; a single quiet Skip strands the mid-intent visitor,
which is exactly the loss §3.7 exists to prevent.

---

## 5. Onboarding step order changes: theme moves before "not yet"

**Decision.** `welcome → how → today → theme → notyet → done` (was
`welcome → how → today → notyet → theme → done`).

**Why.** Post-auth, the tour's last impression matters more than it did pre-auth,
because the next thing that happens is the app. Ending on the gap list, then a
sign-off, sends someone into the product thinking about what's absent. Putting
the theme step later — the one genuinely delightful, interactive screen — means
the run-out is *pick your look → here's what's still coming → go find something*.

**Not a content change.** Both steps survive intact. This is sequence only.

---

## 6. The completed action is confirmed inline, once, for six seconds

**Decision.** An inline strip at the top of the destination: filled eye, "Now
watching Geese.", mono subline "Kept while you were signing up", a `View` link.
`role="status"` + `aria-live="polite"`, announced once, gone after 6s or on any
navigation.

**Why.** The visitor has been through three or four screens since they tapped.
The eye being filled is the real confirmation, but on a page they've never seen
signed-in it isn't legible as a *change* — the strip's job is to say "this
happened while you were away", then get out. Six seconds is long enough to read
twice at a glance and short enough that it isn't part of the page.

**Why-not a toast.** A toast implies undo and floats over content. This is not
undoable at that moment (they'd just untoggle the eye) and the page is fresh, so
covering it is pointless.

**Why-not persistent.** It would then be chrome, and it would have to be
dismissible, which is a whole state nobody needs.

---

## 7. Hero posters: whole card is one link

**Decision.** The entire card is the anchor. Rest → hover (−3px lift, `--signal`
border, arrow reveals) → focus-visible (2px `--focus`, offset 2) → press (settles,
scale .99). One accessible name per card containing artist, venue, when, price.

**Why.** The page has never had interactive content, so there is no established
vocabulary to honor — and the safest first vocabulary is the one with no ambiguity
about what's clickable. A single large target also fixes the mobile case, where a
poster is ~150px wide and any sub-target inside it would fail 44px.

**Why-not a "Details →" button on each card.** Four more targets, four more
labels, and it teaches that the poster *isn't* the link.

---

## 8. The retired CTAs' space is not absorbed — the block gets shorter

**Decision.** Two CTAs, one mono reassurance line. The poster row moves up into
the freed space. One new affordance is added *below* the posters: **See all 214
shows this week →**.

**Why.** Consistent with §3.6: nothing on this page should exist to extract an
account. The see-all line isn't a replacement CTA, it's the answer to §3.9's
*why-not posters-only* — it names the calendar behind the four cards for a visitor
who doesn't care about those four shows.

---

## 9. The landing page needs no client island at all

**Decision.** The CTA block stays entirely in the ISR shell.

**Why.** Middleware already redirects a signed-in request off `/` to `/events`, so
`/` only ever renders for a visitor with no session. There is therefore no
auth-dependent behavior on the page to island — calling `auth()` or `cookies()`
here would kill ISR to compute a branch that can never be taken. Poster hover and
press states are CSS.

**Boundary, drawn for later.** If a signed-in variant of `/` is ever wanted, the
island is the CTA block and nothing else.

---

## 10. Nav labels follow the shipped copy: `browse · venues · watching · me`

**Decision.** Tab 2 is **venues** (map-pin glyph), matching
`CONSUMER_COPY.bottomNav.nav.tabs`. Search is reached from the header at both
breakpoints.

**Why.** The shipped code and copy file are the source of truth for what's in
those four slots, and #794 is explicitly not re-planning the nav. Noted here
because the project's standing notes describe the tabs as
`browse · search · watching · me` — worth reconciling in a separate pass, but not
by silently changing a nav in this drop.

---

## 11. `loggedOutEyebrow` replacement copy

`'Save a show · sign in'` → `'Watching · free with an account'`.

**Why this phrasing.** It fixes the vocabulary violation, it names the tier fact
that removes the actual objection ("free"), and it keeps the mono eyebrow's
`noun · qualifier` shape used everywhere else in the picker. "Sign in" leaves the
eyebrow because the primary CTA signed-out is **Sign up** (§3.5) — sign-in stays
as the prompt beneath the button.

Title and sub are rewritten to match, and the footer rail states the return seam
(`we'll put you back on this show`) because that is the objection a mid-intent
visitor actually has.

---

## 12. `settings.watchlistRow: 'Saved shows'` — flagged, not designed

Found while auditing vocabulary. It is a signed-in surface and therefore outside
#794's screens, but it is the same violation class as `loggedOutEyebrow` and
should read **Watching**. Named in the inventory's *Copy to fix* group so the eng
plan can pick both up in one commit.

---

## 13. `FeedbackEdgeTabGate` is hidden signed out — not routed to sign-in

*(R2 addendum)*

**Decision.** The feedback edge tab does not render for a visitor with no session.

**Why not treat it like Submit a price.** Submit a price is *contextual*: it sits
on one show, the visitor arrived with a reason, and routing them to sign-in
preserves that reason — the return seam gives it back. The edge tab is
*omnipresent chrome*, on every screen, with nothing behind it but an auth-only
endpoint. Routing it to sign-in would turn the closest thing this app has to a
sticky element into a conversion surface, which is exactly what §3.6's
no-persistent-nudge rule exists to prevent.

**Second reason.** The tab retires with the beta artifacts, which #794 explicitly
does not own. Hiding it signed-out closes the window between public launch and
that retirement where it would otherwise ship broken — so #794 stops depending on
another ticket landing first.

---

## 14. `FeatureDropPillGate` is hidden signed out

*(R2 addendum)*

**Decision.** No feature-drop pill for a visitor with no account.

**Why.** Two locked rules point the same way: it is a persistent nudge (§3.6),
and it is a teased background feature (#781 — background features are hidden, not
teased). A pill advertising something new to someone who has nothing is also
simply bad manners; a visitor's first job is the calendar.

---

## 15. The other three protected-layout mounts are eng rows, not design calls

*(R2 addendum)*

`FirstWatchNudgeGate` and `OnboardingThemeFlush` render nothing signed-out but
mount and hold auth-dependent effects — both need an early return *before* those
effects. `LifecycleNudgesGate` already self-gates correctly and is listed as
no-change so the plan can close it fast.

Worth naming why the whole group was missed in R1: `(protected)/layout.tsx` makes
**no `auth()` call**. Gating is entirely edge middleware, so nothing in the layout
signals that its children assume a session. Broadening the public matcher mounts
all five for anonymous visitors with no other code change.

# Pre-launch manual walkthrough

A single ordered pass over every customer-facing and admin surface in Concert Crawl, for logging
bugs and improvements before public launch. Tick boxes as you go; anything that fails becomes an
intake proposal, not an issue filed on the spot (see the standing intake rule in `CLAUDE.md`).

This is a **testing** artifact, not a gate. The authority on "are we ready?" is
[`launch-bar.md`](./launch-bar.md) — an item failing here is launch-gating only if it also appears
there.

---

## Before you start

**Set up:**

- Two accounts in separate browsers: your admin user, and a second free-tier account.
- Walk every surface on **both** mobile (real device) and desktop. Settings, and several other
  routes, render from genuinely different components per breakpoint — desktop passing tells you
  nothing about mobile.
- Have the admin Feature Flags page open in a third tab; several sections below ask you to toggle.

**Three things that will invalidate results if you skip them:**

1. **Flip launch mode first, or accept that you are testing the beta shape.**
   `NEXT_PUBLIC_PUBLIC_BROWSE` decides whether `/events`, `/venues`, `/artists`, `/search`,
   `/watching`, `/sign-up`, `/e/:id` and `/share/:id` resolve for a signed-out visitor. It is
   inlined at build time, so **flipping it requires a redeploy, not an environment change.**
   Section 2 walks the signed-out shape in both modes — do that section last if you would rather
   not redeploy twice.
2. **Check `NEXT_PUBLIC_SITE_URL` is set on Vercel prod** before testing anything that shares a
   link. While it is unset, share and OG URLs emit a `*.vercel.app` host and every share test is
   measuring the wrong thing.
3. **Do not smoke-test the Vercel WAF `block-scanner-paths` rule.** Tripping it locks your own IP
   out for 15 minutes.

**One-way actions, flagged where they appear:** the founder-window cutover button, real card
charges, and account deletion. Do the destructive ones last, on a throwaway account.

---

## 1. Signed-in happy path — core browse

Start here. If this is broken, nothing else matters.

- [ ] `/events` loads, default list renders
- [ ] Infinite scroll / Load more — **confirm filters survive the fetch** (this silently dropped them once)
- [ ] Week strip navigation
- [ ] Calendar view toggle
- [ ] Jump picker + "back to today"
- [ ] Each filter individually; two or more combined; clear all
- [ ] Empty state — filter down to zero results
- [ ] Event row: long title, missing image, supporting-artist line, price chip, sold-out state
- [ ] Hero event card
- [ ] Loading skeletons appear (throttle the network)

## 2. Signed-out / first contact

Walk this section **twice** — once with launch mode off (today's beta shape), once with it on.
What must differ: with it off, `/events` and friends bounce to sign-in and sign-up demands an
invite code; with it on, both are public.

- [ ] Landing page `/` — hero, poster, CTAs
- [ ] `/sign-up` — **including the legal-consent checkbox** (new 2026-09-19; it is enforced by
      Clerk's drop-in component, so confirm it actually blocks submission)
- [ ] `/sign-in`
- [ ] Invite code `/auth/code` → `/onboarding` → `/auth/complete`
- [ ] Returning code-holder: `invite_verified` cookie set but no session → `/` redirects to onboarding
- [ ] Onboarding — every step, plus skip
- [ ] Waitlist path
- [ ] `/legal/terms`, `/legal/privacy`, `/legal/beta` reachable signed-out
- [ ] `/bot` page
- [ ] `/robots.txt` and `/sitemap.xml` resolve (both shipped inert twice — verify, don't assume)
- [ ] `/e/:id` short link, signed-out
- [ ] `/crew/join/:token` signed-out → sign-up → **lands back on the crew**, not `/events`
- [ ] Signed-out account menu, sign-in rail, anon disc
- [ ] `/changelog` signed-out

## 3. Search

- [ ] `/search` full page
- [ ] Search palette — keyboard shortcut and mobile entry
- [ ] Artist, venue and event hits
- [ ] Zero-results state
- [ ] A past-only artist is reachable by search

## 4. Event detail — `/events/[id]`

The densest surface in the app.

**Content**

- [ ] Header, image, genre chips
- [ ] Setlist preview
- [ ] Supporting-artist line
- [ ] First-timer venue guide chip → anchor scroll into the guide

**Actions**

- [ ] "Get tickets" link-out — vendor label matches the destination
- [ ] Watch show — on, then off
- [ ] "I'm going!" — on, then off; going nudge
- [ ] Who else is watching → watchers roster, avatar stack, watch zone
- [ ] Crew going line, crew patch
- [ ] Share sheet → poster card → each share target

**Price region**

- [ ] Community price chip, face-value card, stale stamp
- [ ] "Still accurate" action
- [ ] Alt-source row, ladder row, multi-source / multi-tier card
- [ ] Provenance CTA, contribute-face-value card
- [ ] Submit a price → vendor field → confirmation
- [ ] Dispute a price → counter-submit → corroboration sheet
- [ ] Sold-out CTA and sold-out price card

**Reporting**

- [ ] Report a show (sold out / cancelled) → confirm sheet → evidence form
- [ ] Pending report banner, then live report banner after admin action
- [ ] Triage fault acknowledgement surfaces

## 5. Venues

- [ ] `/venues` index — list, filtering, imagery
- [ ] `/venues/[slug]` — profile, event list, imagery
- [ ] Venue guide sections, insider tips, access placeholder rows
- [ ] Returner guide accordion
- [ ] "Still gathering" state on a thin venue

## 6. Artists

- [ ] `/artists/[slug]` — header, photo, upcoming and past shows
- [ ] Follow / unfollow
- [ ] Artist with no upcoming shows
- [ ] **Artist with no photo** — the missing-join class has re-opened three times
- [ ] Co-headliner rendering

## 7. My shows

- [ ] `/watching` — list, remove, empty state
- [ ] `/history` (labelled **Concerts**) — Upcoming and Past sections, empty state
- [ ] Calendar `.ics` export downloads and imports cleanly
- [ ] `/following` — follow shelf, bill, date lines, nudge
- [ ] `/passport` — stamps, stats, more tile, actions
- [ ] Passport share → confirm `/passport/[ratio]` PNG renders when fetched directly

## 8. Crews

- [ ] `/crews` index, empty state
- [ ] Create a crew
- [ ] Invite sheet → copy link → **second account** joins
- [ ] Crew home: hero, roster, member cluster, upcoming, nights, tabs
- [ ] Crew lens applied to the browse list
- [ ] Rename, reroll invite, options sheet
- [ ] Second account leaves → dead invite link surface
- [ ] Crew error and loading boundaries

## 9. Notifications

- [ ] Notification pip appears on new activity
- [ ] Panel opens; seen vs read behave as designed (they deliberately differ)
- [ ] Crew activity notifications
- [ ] Web push: permission prompt → subscribe → receive → unsubscribe

## 10. Settings — `/me`

Mobile and desktop are separate components. Walk both.

- [ ] Profile hero, avatar, identity art
- [ ] `/me/edit`
- [ ] Theme picker — persists across reload
- [ ] Connections → Spotify connect → return flow → sync → disconnect confirm
- [ ] Notification preferences, including crew activity and the product-email toggle
- [ ] Submitted prices list + item detail
- [ ] Account: Terms and Privacy links resolve
- [ ] Data export downloads and contains what it should
- [ ] Plan section reflects the correct tier

## 11. Monetization — real money, go carefully

- [ ] Tier picker entry → sheet → tier cards (mobile rows, desktop cards)
- [ ] Scarcity rail
- [ ] Founder claim takeover
- [ ] Checkout panel, SCA notice region, legal microcopy
- [ ] Card-less trial start
- [ ] Gifted thank-you surface
- [ ] Failure surface — use a Stripe decline card
- [ ] Stripe portal out and back
- [ ] Multi-tier: mixed-tier card, pending stack, alternate row, add-tier success
- [ ] Lifecycle nudges: day-13 banner, past-due banner, trial-ended takeover
- [ ] ⚠️ **The founder-window cutover button is one-way and unrepairable.** Do not press it as
      part of a test pass.

## 12. Tier and flag matrix

Six account states, not two. For each gated key, confirm the gate shape is what the tier intends —
`visible-active`, `paywall-on-tap`, `tier-picker-on-tap`, or `hidden`.

States: logged-out, free, supporter, premium, founder, gifted.
Keys: `watching`, `following`, `crews`, `concert-history`, `calendar-export`,
`price-drop-alerts`, `spotify-sync`.

- [ ] Free account: every gated surface shows the right gate, and **404s rather than 403s** where hidden
- [ ] No ungated endpoint leaks provenance fields to a free account
- [ ] Feature flags off: `spotify-sync`, `crews`, `release-notes` each disappear cleanly — no dead nav, no 403
- [ ] Feature flags on again: everything returns

## 13. Release notes

- [ ] `/changelog` entries render
- [ ] Spotlight heroes load
- [ ] Spotlight modal
- [ ] Feature-drop pill appears for unread, clears when read
- [ ] Version footer in the account menu

## 14. Admin — `/admin`

- [ ] Dashboard
- [ ] Events list, event edit
- [ ] Venues list, venue detail, robots audit
- [ ] Crawl: trigger one venue, run all, view runs, crawl stats
- [ ] Artists queue (note: **upcoming-scoped by default** — raw counts will not match)
- [ ] Prices, price submissions
- [ ] Review queue, contest detail
- [ ] Users list, user detail
- [ ] Feedback
- [ ] Feature flags
- [ ] Founder window
- [ ] Invite codes — generate, redeem, exhaust
- [ ] Settings / cost panel
- [ ] Admin error boundary

## 15. Feedback

- [ ] Feedback edge tab → modal → submit → appears in admin
- [ ] Sentry feedback widget

## 16. Background systems

Not clickable, but launch depends on them. Verify from admin, logs, or your inbox.

- [ ] Crawl triggers fire every 10 minutes
- [ ] Nightly crawl runs at 3 AM MT
- [ ] `/api/revalidate` fires after a crawl (it had never once fired in prod)
- [ ] `billing-daily` and `billing-daily-stripe`
- [ ] `match-artists`
- [ ] `spotify-weekly` digest
- [ ] Stripe webhooks: checkout, renewal, cancellation, payment failure
- [ ] `/health` responds
- [ ] Sentry receives a deliberate test error from each app
- [ ] Hourly prod smoke tests are green

## 17. Email

Trigger each and read it on mobile and desktop. Every one carries an unsubscribe link except the
billing family, which is transactional by design.

- [ ] Welcome — paid
- [ ] Welcome — gifted
- [ ] Renewal receipt — monthly
- [ ] Renewal receipt — annual
- [ ] Dunning 1 — card declined
- [ ] Dunning 2 — still declined
- [ ] Dunning 3 — final warning
- [ ] Card expiring soon
- [ ] Cancellation acknowledgement
- [ ] Gifting ending notice
- [ ] Winback
- [ ] Spotify digest
- [ ] Unlocks
- [ ] Unsubscribe link works and is honoured on the next send

## 18. PWA and offline

- [ ] Install prompt
- [ ] Launch from home screen
- [ ] `/~offline` page
- [ ] Manifest and every icon route resolve (`/api/pwa/icon-*`, apple-icon)
- [ ] Service worker updates rather than serving stale content — **an Android PWA shares the
      browser's service worker**, so "it's broken in both" never rules out a stale cache

## 19. Error and edge surfaces

- [ ] 404 on a bad event, venue, artist and crew slug
- [ ] Root error boundary (`app/error.tsx`)
- [ ] API-down behaviour — stop the API and reload a data-backed route
- [ ] Deep link into a gated surface while signed out → sign in → **land on the intended page**
- [ ] Return seam / return strip after an external round-trip

## 20. Cross-cutting sweeps

Do these last, across everything already walked.

- [ ] **Copy sweep** — every string against the locked vocabulary: Watching, Concerts, Submitted
      prices, Price check. No "Saved", "Favorites", "Following" for watching; no "History",
      "Attending", "Going" in customer-visible text.
- [ ] **Mobile overflow sweep** — 320px baseline, no horizontal scroll on any route
- [ ] **Dark / light mode sweep**
- [ ] **Link-out sweep** — every external ticket link resolves
- [ ] **OG / share sweep** — paste a link from each shareable surface into iMessage and Slack;
      confirm the card renders and the host is `concertcrawl.app`
- [ ] **Keyboard and screen-reader pass** on the primary flows
- [ ] **Account deletion** — absolute last, throwaway account only. One-way; it spans ~20 tables.

---

## Logging what you find

One line per finding: surface, what you expected, what happened, device. Batch them at the end of
the pass rather than filing as you go — both backlog ceilings are currently breached, so each
proposal needs to be weighed against what it displaces.

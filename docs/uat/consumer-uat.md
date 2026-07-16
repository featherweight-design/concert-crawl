# Consumer UAT — Concert Crawl

Test script for anyone with a normal (non-admin) account. Run against
**[concertcrawl.app](https://concertcrawl.app)**. Read
[`README.md`](./README.md) first — it covers accounts, the result legend, the
⚠️ test-data rule, and the phone/desktop convention.

**Cases marked ⚠️ create shared, admin-visible records** (other steps may still
save to your own account). For the ⚠️ ones, keep it fake and harmless.

---

## Contents

1. [Auth & onboarding](#1-auth--onboarding)
2. [Browse & discover](#2-browse--discover)
3. [Filter & search](#3-filter--search)
4. [Event detail](#4-event-detail)
5. [Community pricing ⚠️](#5-community-pricing)
6. [Venues](#6-venues)
7. [Account, settings, and watching](#7-account-settings-and-watching)
8. [Subscription & plans ⚠️](#8-subscription--plans)
9. [Feedback & release notes](#9-feedback--release-notes)
10. [PWA & mobile](#10-pwa--mobile)

---

## 1. Auth & onboarding

### AUTH-01 — Sign up with email

**Precondition:** Signed out. Have an invite code ready if the beta requires one.
**Steps:**

1. Go to concertcrawl.app.
2. Choose sign up / create account.
3. Enter an email and password (and invite code if prompted).
4. Complete any email verification step.

**Expected:** Account is created and you land in the app (onboarding or the events
page). No error is shown.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### AUTH-02 — Onboarding flow

**Precondition:** Fresh account, first sign-in.
**Steps:**

1. Complete the onboarding screens shown after first sign-up.
2. Make any choices offered (e.g. theme preference).

**Expected:** Onboarding completes and you reach the main app. It does not appear
again on subsequent sign-ins.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### AUTH-03 — Sign out

**Precondition:** Signed in.
**Steps:**

1. Open the user menu (avatar).
2. Choose sign out.

**Expected:** You're returned to a signed-out state; protected pages are no longer
reachable.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### AUTH-04 — Sign back in

**Precondition:** Signed out, account already exists.
**Steps:**

1. Choose sign in.
2. Enter your credentials.

**Expected:** You land back in the app with your data (watching list, theme)
intact.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### AUTH-05 — OAuth sign-in (if offered)

**Precondition:** Signed out. Only run if an OAuth button (e.g. Spotify/Google) is
shown.
**Steps:**

1. Choose the OAuth provider button.
2. Complete the provider's consent screen.

**Expected:** You're signed in and returned to the app. If no OAuth button is
shown, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### AUTH-06 — Protected route requires auth

**Precondition:** Signed out.
**Steps:**

1. Paste a signed-in URL (e.g. `https://concertcrawl.app/me`) into the address bar.

**Expected:** You're redirected to sign-in, not shown the page.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 2. Browse & discover

### EVT-01 — Landing page

**Precondition:** Signed out (open in a private window).
**Steps:**

1. Go to concertcrawl.app.

**Expected:** A landing page loads with a hero/carousel of upcoming shows and a
clear way to sign in or sign up. Event previews show artist, venue, and date.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### EVT-02 — Events list loads

**Precondition:** Signed in.
**Steps:**

1. Go to the events page (`/events` or the Browse tab).

**Expected:** A list of upcoming events appears, each card showing artist, venue,
date, time, and a price tag where available. Today's show (if any) may appear as a
larger hero card at the top.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### EVT-03 — Load more / pagination

**Precondition:** On the events list with more than one page of results.
**Steps:**

1. Scroll to the bottom of the list.
2. Trigger "load more" (button or infinite scroll).

**Expected:** Additional events load and append below without a full page reload.
No duplicates appear.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### EVT-04 — Calendar view

**Precondition:** On the events page.
**Steps:**

1. Switch to the calendar view (view toggle).
2. Use the previous/next week arrows.

**Expected:** Events appear on their correct days in a week grid; navigation moves
between weeks and updates the shows shown. A per-day count is visible.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### EVT-05 — List ↔ calendar toggle

**Precondition:** On the events page.
**Steps:**

1. Toggle between list and calendar view a few times.

**Expected:** The view switches cleanly each time; the same events are represented
in both.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 3. Filter & search

### SEARCH-01 — Filter by venue

**Precondition:** On the events list.
**Steps:**

1. Open the filter sheet/bar.
2. Select a venue.
3. Apply.

**Expected:** The list narrows to that venue's events; an active-filter indicator
appears; the result count updates.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-02 — Filter by genre / vibe

**Precondition:** On the events list.
**Steps:**

1. Open filters.
2. Select one or more genre/vibe chips.
3. Apply.

**Expected:** Results narrow to matching events; selected chips stay highlighted.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-03 — Filter by price range

**Precondition:** On the events list.
**Steps:**

1. Open filters.
2. Set a price range (slider or preset band).
3. Apply.

**Expected:** Only events priced within the range remain. Events without a known
price behave consistently (either excluded or clearly handled).
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-04 — Filter by date range

**Precondition:** On the events list.
**Steps:**

1. Open filters.
2. Choose a date preset (e.g. "This week") or a custom range.
3. Apply.

**Expected:** Only events within the chosen dates remain.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-05 — Clear all filters

**Precondition:** At least one filter applied.
**Steps:**

1. Choose "clear all" (or reset).

**Expected:** All filters drop; the full list returns; active-filter indicators
disappear.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-06 — Search by artist

**Precondition:** Signed in.
**Steps:**

1. Open the search page or search bar.
2. Type part of an artist name you can see in the listings.

**Expected:** Matching results appear as you type. Selecting one navigates to the
relevant event/detail.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-07 — Search by venue

**Precondition:** On the search page.
**Steps:**

1. Type part of a venue name.

**Expected:** Matching venues/events appear; selecting one navigates correctly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-08 — Empty / no-match search

**Precondition:** On the search page.
**Steps:**

1. Type a nonsense string (e.g. "zzzqqq").

**Expected:** A clear "no results" state appears — no crash, no infinite spinner.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-09 — Command palette (desktop)

**Precondition:** Desktop browser, signed in. **Desktop only.**
**Steps:**

1. Press Cmd+K (Mac) or Ctrl+K (Windows).
2. Type an artist or venue name.
3. Use arrow keys and Enter to select a result.

**Expected:** A search palette opens, returns results, and keyboard navigation
works. On mobile, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SEARCH-10 — Recent searches

**Precondition:** Have run at least one search this session.
**Steps:**

1. Reopen search with the box empty.

**Expected:** Recent (or popular/trending) searches are offered.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 4. Event detail

### DTL-01 — Open an event

**Precondition:** On the events list.
**Steps:**

1. Tap/click any event card.

**Expected:** The detail page opens with a hero image, artist/title, venue, date,
door/show times, and (if known) price and genre chips.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-02 — Back preserves your place

**Precondition:** Applied a filter, scrolled, then opened an event.
**Steps:**

1. From the event detail, use the app's back control.

**Expected:** You return to the list with your filters and scroll position intact
— not reset to the top with no filters.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-03 — Ticket / venue CTA

**Precondition:** On an event detail page.
**Steps:**

1. Find the primary action button and read its label.
2. Click it (a new tab / external site is fine — you can close it).

**Expected:** The button reflects reality: "Get Tickets" opens the ticket vendor;
"Visit Venue Website" opens the venue; "Sold Out" / "No Tickets Available" is
disabled. It should not, e.g., say Get Tickets and go nowhere.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-04 — Watch toggle

**Precondition:** On an event detail page.
**Steps:**

1. Tap the Watch button.
2. Tap it again to un-watch.

**Expected:** The button reflects the on/off state each time; the watching count
updates accordingly. (Cross-check with WATCH-01.)
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-05 — Genre chips are clickable

**Precondition:** On an event detail with genre chips.
**Steps:**

1. Click a genre chip.

**Expected:** You're taken to a filtered view / search for that genre.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-06 — Status banners

**Precondition:** Find an event flagged cancelled, postponed, or sold out (browse a
few if needed).
**Steps:**

1. Open it.

**Expected:** A clear banner/badge communicates the status; the ticket CTA matches
(e.g. disabled when sold out). If you can't find one, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### DTL-07 — Related shows at the venue

**Precondition:** On an event detail page for a venue with other upcoming shows.
**Steps:**

1. Scroll to the related/other-shows section.
2. Tap one.

**Expected:** Other shows at the same venue are listed and navigate correctly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 5. Community pricing ⚠️

These cases write real submissions. Submit **plausible** prices for real events;
don't submit deliberately wrong data.

### PRICE-01 — Submit a price ⚠️

**Precondition:** On an event detail page.
**Steps:**

1. Choose the submit-price action.
2. Pick a source (box office / resale / venue website).
3. Enter a price and select a tier (e.g. GA).
4. Submit.

**Expected:** A confirmation appears indicating the price is pending review. No
error.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PRICE-02 — Multi-tier submission ⚠️

**Precondition:** In the submit-price form.
**Steps:**

1. Enter one tier (e.g. GA + price).
2. Use "add another tier" to add a second (e.g. VIP + price).
3. Submit both together.

**Expected:** Both tiers submit in one go and both are confirmed. The second tier
isn't lost.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PRICE-03 — Verify someone else's price ⚠️

**Precondition:** Find an event showing a community-submitted price.
**Steps:**

1. Confirm/verify that price.

**Expected:** Your confirmation registers; the confirmation count / trust
indicator increases. If no community price exists to verify, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PRICE-04 — Dispute a price ⚠️

**Precondition:** Find an event with a community price you can dispute.
**Steps:**

1. Choose the dispute action.
2. Provide an alternate vendor + price.
3. Submit.

**Expected:** The dispute is accepted; some indication a contest is in progress
appears. If nothing is disputable, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PRICE-05 — Trust marks & resale clarity

**Precondition:** Browse events with prices.
**Steps:**

1. Look at how prices are labelled.

**Expected:** Prices carry a clear trust mark (venue official / resale / community
verified). Resale-only prices are labelled as resale, not presented as face value.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PRICE-06 — Stale/expired price indicator

**Precondition:** Find a community price older than ~7 days (or check My
Submissions for an expired one).
**Steps:**

1. Look at how it's displayed.

**Expected:** Expired/stale community prices are visibly flagged, not shown as
current. If none available, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 6. Venues

### VEN-01 — Venues directory

**Precondition:** Signed in.
**Steps:**

1. Go to the venues page.

**Expected:** Denver venues are listed with names, identity art, and an
upcoming-show count.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### VEN-02 — Venue search/filter

**Precondition:** On the venues page.
**Steps:**

1. Type part of a venue name in the venue search/filter.

**Expected:** The list narrows to matching venues.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### VEN-03 — Venue detail

**Precondition:** On the venues page.
**Steps:**

1. Open a venue.

**Expected:** The venue page shows its name, image, info (address/website where
known), and a list of its upcoming events. Following an event link works.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 7. Account, settings, and watching

Covers account profile and settings (`ACCT-*`) plus the watching list (`WATCH-01`
and `WATCH-02`), which live in this section.

### ACCT-01 — Open settings (both layouts)

**Precondition:** Signed in. **Run on phone AND desktop.**
**Steps:**

1. Go to `/me` (Account/Profile).

**Expected:** Settings load. On mobile it's a stacked/section layout; on desktop a
sidebar + content panel. Both show your profile, plan, and submissions.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ACCT-02 — Edit profile

**Precondition:** In settings.
**Steps:**

1. Go to edit profile (`/me/edit`).
2. Change your handle/display name.
3. Save.

**Expected:** The change saves and is reflected in the header/avatar. Reloading
keeps the new value.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ACCT-03 — Theme selection persists

**Precondition:** In settings (or wherever the theme picker lives).
**Steps:**

1. Switch between the available themes (e.g. Light and one of the dark themes
   like Electric or Jade).
2. Reload the page. Sign out and back in.

**Expected:** The selected theme applies app-wide immediately and survives reload
and re-sign-in (saved server-side).
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### WATCH-01 — Watching list

**Precondition:** Have watched at least one event (see DTL-04).
**Steps:**

1. Go to the Watching page/tab.

**Expected:** Events you watched appear, sorted by date. Un-watching one removes
it from the list.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### WATCH-02 — Empty watching state

**Precondition:** Un-watch everything (or a fresh account).
**Steps:**

1. Open the Watching page.

**Expected:** A friendly empty state appears (not a blank/broken page).
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ACCT-04 — My submissions

**Precondition:** Have submitted at least one price (PRICE-01).
**Steps:**

1. Open the "my submissions" area in settings.

**Expected:** Your submissions are listed with a status (pending / verified /
disputed / expired) and the related event.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 8. Subscription & plans ⚠️

If your beta account already has lifetime Premium, several of these will show you
as comped — that's expected; note it and mark N/A where a flow doesn't apply.
**Do not enter a real card** unless you've been asked to; verify the flow up to
the card step.

### SUB-01 — View plan card

**Precondition:** In settings.
**Steps:**

1. Find the "Your plan" card.

**Expected:** It shows your current plan and status (e.g. Free, Trial with days
left, Premium active, Winding down, Payment failed, or lifetime/comped for beta).
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SUB-02 — Tier picker / comparison

**Precondition:** In settings.
**Steps:**

1. Open the tier picker / plan comparison.

**Expected:** Free, Supporter, Premium, and Founder are shown side by side with
their features and a price on each paid tier. Your current plan is highlighted.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SUB-03 — Start checkout ⚠️ (stop at card)

**Precondition:** On a plan you could upgrade from. Skip if comped (mark N/A).
**Steps:**

1. Choose to upgrade to a paid tier.
2. Proceed until the card-entry step appears.
3. **Stop — do not enter a real card.**

**Expected:** An inline checkout (card form) appears without a jarring external
redirect. Close it without paying.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SUB-04 — Trial countdown / nudges

**Precondition:** Only if your account is on a Premium trial.
**Steps:**

1. Look for a trial banner or plan-card countdown.

**Expected:** The trial shows days remaining; late-trial nudges (day-13 banner,
"ends today/tomorrow") appear appropriately and are dismissible. If not on a
trial, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SUB-05 — Manage subscription

**Precondition:** On an active paid plan.
**Steps:**

1. Open "manage subscription."

**Expected:** Options to update the card, change plan, and cancel appear, along
with the next billing date. If you have no paid plan, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### SUB-06 — Cancel & resubscribe ⚠️

**Precondition:** On an active paid plan you're willing to cancel and restore.
Skip if comped or on Free (N/A).
**Steps:**

1. Cancel the plan; confirm.
2. Observe the plan card, then choose resubscribe.

**Expected:** After cancel, the card shows "winding down / access until `<date>`."
Resubscribe restores the active state without re-charging within the paid period.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 9. Feedback & release notes

### FB-01 — Submit feedback ⚠️

**Precondition:** Signed in.
**Steps:**

1. Open the feedback widget/button.
2. Enter harmless test text ("UAT test — please ignore").
3. Submit.

**Expected:** A confirmation appears; the modal closes. No error.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### FB-02 — Bug report widget

**Precondition:** Signed in.
**Steps:**

1. Trigger the bug-report path (may be the Sentry feedback widget).
2. Add a short note and submit.

**Expected:** It accepts the report and confirms. Only run once so you don't spam
real reports.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### FB-03 — Changelog page

**Precondition:** Signed in.
**Steps:**

1. Open the changelog (`/changelog`), e.g. via the release-notes pill.

**Expected:** A reverse-chronological release history loads, each entry with a
version, date, and change bullets. Spotlight entries render their hero/steps.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### FB-04 — Feature-drop pill

**Precondition:** Signed in (best right after a new release ships).
**Steps:**

1. Look for a "what's new" pill/badge.
2. Click it.

**Expected:** It links to the changelog. If no new release is pending, there may be
no pill — mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 10. PWA & mobile

### PWA-01 — Install to home screen

**Precondition:** Phone browser (or Chrome desktop with install support).
**Steps:**

1. Use the browser's "Add to Home Screen" / install option.
2. Open the app from the icon.

**Expected:** It installs with the Concert Crawl icon and opens in standalone mode
(no browser address bar).
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PWA-02 — Bottom navigation (mobile)

**Precondition:** Phone or narrow browser. **Mobile only.**
**Steps:**

1. Tap through the bottom-nav tabs (Browse, Venues, Watching, Search, Account).

**Expected:** Each tab navigates to the right area; the active tab is highlighted.
On desktop this is replaced by the top header — mark N/A there.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PWA-03 — Tap targets & layout

**Precondition:** Phone.
**Steps:**

1. Move through a few screens (list, detail, settings).

**Expected:** Buttons are comfortably tappable, nothing overflows horizontally,
text isn't clipped, images aren't broken.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### PWA-04 — Offline behavior

**Precondition:** Installed PWA, has loaded once.
**Steps:**

1. Put the device in airplane mode.
2. Reopen the app.

**Expected:** The app opens to a cached shell / previously loaded content rather
than a hard browser error. (Live data may be unavailable — that's fine.)
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## Summary tally

| Section                        | Pass | Fail | Blocked | N/A |
| ------------------------------ | ---- | ---- | ------- | --- |
| 1. Auth & onboarding           |      |      |         |     |
| 2. Browse & discover           |      |      |         |     |
| 3. Filter & search             |      |      |         |     |
| 4. Event detail                |      |      |         |     |
| 5. Community pricing           |      |      |         |     |
| 6. Venues                      |      |      |         |     |
| 7. Account, settings, watching |      |      |         |     |
| 8. Subscription & plans        |      |      |         |     |
| 9. Feedback & release notes    |      |      |         |     |
| 10. PWA & mobile               |      |      |         |     |

**Tester:** ________________ **Date:** ____________ **Device/browser:** ____________

# Admin UAT — Concert Crawl

Test script for the `/admin` panel. It doubles as an **onboarding walkthrough**:
if you've never used the admin panel, run these cases top to bottom and you'll
have seen every tool it offers and what each is for.

Run against **[concertcrawl.app](https://concertcrawl.app)**. Read
[`README.md`](./README.md) first for the result legend and conventions.

**You need an admin account.** If `/admin` redirects you away or 404s, you don't
have the admin role — ask an existing admin to grant it. Everything here acts on
**real production data**: crawls you trigger really run, a venue you pause really stops
crawling, codes you generate are really redeemable. Treat it accordingly. Cases that change
live state are marked ⚠️.

---

## Contents

1. [Access & dashboard](#1-access--dashboard)
2. [Review & moderation](#2-review--moderation)
3. [Venue management](#3-venue-management)
4. [Crawl monitoring & triggering](#4-crawl-monitoring--triggering)
5. [Event editing](#5-event-editing)
6. [Price management](#6-price-management)
7. [User management](#7-user-management)
8. [Feedback triage](#8-feedback-triage)
9. [Invite codes](#9-invite-codes)
10. [Founder window](#10-founder-window)
11. [Admin settings](#11-admin-settings)

---

## 1. Access & dashboard

The dashboard (`/admin`) is your home base. It surfaces what needs attention so
you don't have to go looking — the four stat cards and the attention feed are
meant to answer "is anything on fire?" at a glance.

### ADM-01 — Admin access gate

**Precondition:** Signed in as an admin.
**Steps:**

1. Open the user menu and find the admin dashboard link (only admins see it).
2. Go to `/admin`.

**Expected:** The dashboard loads. If you sign in as a non-admin (or open `/admin`
signed out), you're redirected/blocked — admins only.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-02 — Dashboard stat cards

**Precondition:** On `/admin`.
**Steps:**

1. Read the four summary cards: Needs Review, LLM Cost, Crawl Health, Active
   Venues.

**Expected:** Each shows a sensible number. Needs Review = flagged events +
pending price submissions. LLM Cost shows spend with a budget indicator. Crawl
Health / Active Venues show counts (with paused/blocked hints). No card shows an
error or a broken value such as "NaN".
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-03 — Needs attention (triage panel)

**Precondition:** On `/admin`.
**Steps:**

1. Read the fault rows. Every broken venue appears — the list is never truncated.
2. Read the queue aggregates below the faults (flagged events, prices).
3. Click a fault row.

**Expected:** Each fault row names a venue, a condition (blocked, failed, went
dark, ceiling suspected, coverage gap) and the evidence figure that earned it,
in one of three severity bands. Clicking a row lands on the inspector tab that
shows that condition — History for went-dark and ceiling, Diagnostics for
failed. If nothing is wrong, an all-clear state renders.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-04 — Cost panel

**Precondition:** On `/admin`.
**Steps:**

1. Find the LLM cost panel.

**Expected:** A daily-spend trend (sparkline), top-spending venues, and a budget
progress bar/percentage render without error.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 2. Review & moderation

`/admin/review` is where human-in-the-loop happens: the crawler and community
surface data, and you approve or reject it. Two tabs — flagged **events** and
pending **price submissions** — plus price **contests** when a price is disputed.

### ADM-05 — Flagged events tab

**Precondition:** On `/admin/review`.
**Steps:**

1. Open the flagged-events tab.
2. Read a flagged event and its reason/confidence.

**Expected:** Events with data-quality flags are listed with enough context to
judge them (venue, date, why it was flagged). If none are flagged, an empty state
shows.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-06 — Approve / reject a flagged event ⚠️

**Precondition:** At least one flagged event exists.
**Steps:**

1. Approve one event (or reject one you're confident is bad).

**Expected:** The action succeeds, the item leaves the queue, and the Needs Review
count drops. If nothing is safely actionable, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-07 — Price submissions tab

**Precondition:** On `/admin/review`.
**Steps:**

1. Open the price-submissions tab.

**Expected:** Pending community price submissions are listed with event, tier, and
submitted price. Coverage hints (which venues need prices) may show.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-08 — Verify / reject a price submission ⚠️

**Precondition:** A pending submission exists (you can create one via the consumer
PRICE-01 case first).
**Steps:**

1. Verify (or reject) a submission.

**Expected:** Status updates; the submission leaves the pending queue; the price's
trust mark reflects verification on the consumer side.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-09 — Price contest resolution ⚠️

**Precondition:** A disputed price / active contest exists (create one via consumer
PRICE-04 if needed). Contest detail lives at
`/admin/review/contests/<id>`.
**Steps:**

1. Open a contest.
2. Review both claims and pick the correct price.
3. Resolve.

**Expected:** Both submitted prices are shown; choosing a winner resolves the
contest (winner kept, loser expired). If no contest exists, mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 3. Venue management

`/admin/venues` is the roster of venues the crawler targets. Each venue can be
active, paused, or blocked; blocking exists because a venue may return 403/429 or
repeatedly fail, and crawl ethics require we back off (respect robots.txt, rate
limit, don't hammer a site that's blocking us).

### ADM-10 — Venues list & filters

**Precondition:** On `/admin/venues`.
**Steps:**

1. Read the stat cards (Total, Active, Paused, Blocked, Avg Health).
2. Filter by status (Active / Paused / Blocked) and search a venue name.

**Expected:** Counts look right; filtering and search narrow the table correctly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-11 — Venue detail

**Precondition:** On `/admin/venues`.
**Steps:**

1. Open a venue (`/admin/venues/<id>`).

**Expected:** Venue info (name, URL, address, timezone, active status), last crawl
status/time, recent runs with badges, and a consecutive-failure counter all
render.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-12 — Pause / resume a venue ⚠️

**Precondition:** On a venue detail page. Pick a venue you can safely toggle (and
remember to set it back).
**Steps:**

1. Toggle the venue to paused.
2. Confirm the state, then toggle it back to active.

**Expected:** The status flips both ways and persists on reload. A paused venue is
excluded from crawl sweeps.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-13 — Add a new venue ⚠️

**Precondition:** On `/admin/venues`. Only run if you actually want a new
venue in prod — otherwise read the form and mark N/A.
**Steps:**

1. Click "Add venue" to open the modal.
2. Fill in name, website URL, address, timezone.
3. Submit.

**Expected:** The venue is created and appears in the list. (If this is only a
form check, mark N/A and note you didn't submit.)
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-14 — Robots audit

**Precondition:** On `/admin/venues/robots-audit`.
**Steps:**

1. Open the robots audit tool.

**Expected:** Venues with robots.txt restrictions are listed / auditable, so you
can confirm crawl compliance per venue. No error.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 4. Crawl monitoring & triggering

`/admin/crawl` is the live view of the crawler. The daily sweep runs overnight
(around 3 AM MT), but you can trigger a venue manually here — this is the canary
you run before trusting a crawler change.

### ADM-15 — Crawl status view

**Precondition:** On `/admin/crawl`.
**Steps:**

1. Select a venue from the list.
2. Read its last-run detail (strategy used, HTTP status, duration, LLM cost,
   error if any).

**Expected:** Status indicators (success/failed/blocked/warning) are accurate and
the detail panel populates for the selected venue.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-16 — Alert filter

**Precondition:** On `/admin/crawl`.
**Steps:**

1. Filter to show only failures / blocked / warnings.

**Expected:** The list narrows to problem venues only.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-17 — Trigger a single-venue crawl ⚠️

**Precondition:** On `/admin/crawl`, a venue selected. This really hits the
venue's site — fine for a canary, do it sparingly.
**Steps:**

1. Trigger a crawl for the selected venue.
2. Wait for it to complete.

**Expected:** Progress/result is shown; on success, events-found/inserted/updated
and cost update; the last-run time refreshes.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-18 — Run-all sweep ⚠️

**Precondition:** On `/admin/crawl`. Heavy action — only run if you intend a full
sweep.
**Steps:**

1. Trigger "run all."

**Expected:** A full sweep kicks off and venues update as they complete. If you
don't want to run it, read the control and mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 5. Event editing

`/admin/events` lists flagged/low-confidence events so you can correct extraction
mistakes by hand — the manual-entry backstop when the crawler gets something
wrong.

### ADM-19 — Flagged events list

**Precondition:** On `/admin/events`.
**Steps:**

1. Read the list — note the confidence score and extraction strategy per event.

**Expected:** Flagged events render with confidence and strategy labels.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-20 — Edit an event ⚠️

**Precondition:** Open an event editor (`/admin/events/<id>/edit`).
**Steps:**

1. Change a field (e.g. fix a title or door time).
2. Save / mark verified.

**Expected:** The change saves and is reflected on the consumer event page.
Verifying removes it from the flagged queue.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 6. Price management

`/admin/prices` holds the price-tier taxonomy and a bulk review surface for
submissions — the same data as the review tab, but oriented around coverage
(which venues still lack prices).

### ADM-21 — Price tiers reference

**Precondition:** On `/admin/prices`.
**Steps:**

1. Read the standard price-tier taxonomy.

**Expected:** The tier definitions render clearly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-22 — Bulk submissions review

**Precondition:** On `/admin/prices/submissions`.
**Steps:**

1. Review the submissions table.
2. Select multiple and try a bulk verify/reject (only if there are safe test
   submissions).

**Expected:** The table lists submissions with status; bulk actions apply to the
selected rows. Coverage-per-venue analysis renders. If nothing safe to action,
mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 7. User management

`/admin/users` is the directory of registered users, with a per-user detail page
showing their submissions, disputes, and reputation — the context you'd use to
judge a user's trustworthiness or handle a support question.

### ADM-23 — Users list

**Precondition:** On `/admin/users`.
**Steps:**

1. Read the list; search by an email you know.

**Expected:** Users show with email, handle, role, and created date; search finds
the account; pagination works past the first page.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-24 — User detail

**Precondition:** On `/admin/users`.
**Steps:**

1. Open a user (`/admin/users/<id>`).

**Expected:** Profile (email, handle, plan tier), submission history, contest
history, and trust/reputation render without error.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 8. Feedback triage

`/admin/feedback` collects in-app suggestions/praise (the Sentry widget handles
bug reports separately). During beta the list is small enough to read by hand —
you can mark read, flag, open a GitHub issue, resolve, or archive.

### ADM-25 — Feedback list & filters

**Precondition:** On `/admin/feedback`.
**Steps:**

1. Filter by status (unread / flagged / issue_opened / resolved / archived) and by
   source.

**Expected:** Feedback entries render with read/unread badges; filters narrow the
list correctly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-26 — Feedback detail & actions ⚠️

**Precondition:** At least one feedback item (submit one via consumer FB-01 first).
**Steps:**

1. Expand a feedback item to read the full message and context.
2. Mark it read, then flag it, then archive it.

**Expected:** The full message, context (email, timestamp, user agent), and any
attachment show; each status action takes effect and persists.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-27 — Open GitHub issue from feedback ⚠️

**Precondition:** On a feedback item. Only run if you actually want an issue filed.
**Steps:**

1. Use the "open GitHub issue" action.

**Expected:** A GitHub issue is created and the item's status reflects
issue_opened. If you don't want a real issue, read the control and mark N/A.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 9. Invite codes

`/admin/invite-codes` gates the private beta. You generate codes, hand them out,
and revoke them if needed — this is how you control who gets in.

### ADM-28 — Invite codes list

**Precondition:** On `/admin/invite-codes`.
**Steps:**

1. Read the table: code, status (active/redeemed/expired/revoked), created and
   redeemed dates, expiration.

**Expected:** Codes render with accurate statuses.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-29 — Generate a code ⚠️

**Precondition:** On `/admin/invite-codes`.
**Steps:**

1. Create a new code (set an expiration if offered; try a small batch if
   supported).
2. Copy it.

**Expected:** New active code(s) appear in the table and copy to clipboard. The
code is genuinely redeemable at sign-up.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-30 — Revoke a code ⚠️

**Precondition:** An active, unredeemed code exists (use one you just generated).
**Steps:**

1. Revoke it.

**Expected:** Its status flips to revoked and it can no longer be redeemed.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 10. Founder window

`/admin/founder-window` controls the beta founder program — the window during
which new users are granted lifetime Premium. This is a high-impact control:
opening it changes what every new signup receives.

### ADM-31 — Founder window state

**Precondition:** On `/admin/founder-window`.
**Steps:**

1. Read the current window (start/end dates, open/closed, active beta-user count).

**Expected:** The window's state and metrics render clearly.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-32 — Adjust founder window ⚠️

**Precondition:** On `/admin/founder-window`.
**High-impact — only change this if you intend to.** Otherwise read the controls and mark N/A.
**Steps:**

1. If intended, adjust the window dates or toggle open/closed.
2. Save.

**Expected:** The change persists and the displayed state updates. Prefer N/A
unless you're deliberately managing the program.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## 11. Admin settings

`/admin/settings` holds the admin panel's own preferences and any ops tools.

### ADM-33 — Admin appearance

**Precondition:** On `/admin/settings`.
**Steps:**

1. Change the admin theme in the Appearance section (pick a different named
   theme, e.g. Light vs. Electric/Jade).

**Expected:** The admin panel theme changes and persists.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

### ADM-34 — Ops tools ⚠️

**Precondition:** On `/admin/settings`. Ops actions (resync, clear cache, etc.) are
real — read them before running anything.
**Steps:**

1. Review the available ops tools.
2. Run one only if you understand its effect (e.g. clear cache); otherwise N/A.

**Expected:** Each tool is labelled clearly enough to know what it does; any tool
you run completes and reports success.
**Result:** ⬜ Pass / Fail / Blocked / N/A
**Notes:**

---

## Summary tally

| Section                | Pass | Fail | Blocked | N/A |
| ---------------------- | ---- | ---- | ------- | --- |
| 1. Access & dashboard  |      |      |         |     |
| 2. Review & moderation |      |      |         |     |
| 3. Venue management    |      |      |         |     |
| 4. Crawl monitoring    |      |      |         |     |
| 5. Event editing       |      |      |         |     |
| 6. Price management    |      |      |         |     |
| 7. User management     |      |      |         |     |
| 8. Feedback triage     |      |      |         |     |
| 9. Invite codes        |      |      |         |     |
| 10. Founder window     |      |      |         |     |
| 11. Admin settings     |      |      |         |     |

**Tester:** ________________ **Date:** ____________ **Device/browser:** ____________

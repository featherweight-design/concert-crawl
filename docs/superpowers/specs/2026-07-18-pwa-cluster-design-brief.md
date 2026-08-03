# PWA cluster — Design brief

**Tickets:** [#969](https://github.com/HartiganHM/concert-crawl/issues/969) install-prompt UI polish · [#970](https://github.com/HartiganHM/concert-crawl/issues/970) offline-state UI polish · [#971](https://github.com/HartiganHM/concert-crawl/issues/971) web push notification stack (Tier C)
**Phase / priority:** Launch · High (inherited from #971)
**Brainstorm:** 2026-07-18 (Hugh + design agent, 6 questions locked)
**Anchor:** PWA Tier B plan [PR #968](https://github.com/HartiganHM/concert-crawl/pull/968) — executing autonomously; PR1 [#990](https://github.com/HartiganHM/concert-crawl/pull/990) manifest + icons merged 2026-07-17; PR2 (Serwist SW + app shell) next
**Follow-ups filed:** [#1036](https://github.com/HartiganHM/concert-crawl/issues/1036) multi-device management (v2), [#1037](https://github.com/HartiganHM/concert-crawl/issues/1037) new-artist push category (v2), [#1038](https://github.com/HartiganHM/concert-crawl/issues/1038) send-frequency batching (v2)

---

## Problem (recap from tickets)

Three PWA surfaces share DNA and get workshopped as one brief; each one elevates the "minimal, functional" UI from the Tier B plan into a crafted, on-brand experience.

- **#969 install-prompt polish** — Tier B ships a bare install affordance. Two paths: Android/desktop Chrome captures `beforeinstallprompt` and can fire a native prompt; iOS Safari (16.4+) has no prompt API and needs a static guided hint (Share → Add to Home Screen).
- **#970 offline-state polish** — Tier B ships a plain online/offline banner and a bare fallback page for uncached navigations. Both need to reassure, not alarm. Only public data (events, venues) is cached; authenticated routes are network-only.
- **#971 web push (Tier C, fast-follow)** — no push today; consumer notifications live in the bell at **#737** (also not yet shipped). Web push closes that gap for the highest-signal notification moments. Depends on the SW from Tier B landing first.

---

## Design principles (bind every hi-fi decision)

### 🌐 Web-first, respect the browser

The app is fundamentally a web app with PWA superpowers, not a native app that happens to run in a browser. Every ask is dismissible. No on-load takeovers. Permission slots (browser install prompt, push permission) are protected — we never fire them without earning it, because browser dismissals are hard-permanent.

### 🎯 Earned escalation for permission asks

Install prompt = understated but reachable (persistent, dismissible). Push permission = earned by engagement — asked at the moment where the payoff is the ask (first "watch this show" tap). Never nag, never re-ask automatically.

### 🎙️ Voice authenticity is the quality bar (Sour Patch, #782)

Same voice bar the venue-guide handoff, monetization emails, and digest email settled: honest > cheerful, specific > generic, never brochure-y, callouts are questions not claims. Every displayed string on every PWA surface reads as if a concert-goer wrote it. No hype, no false urgency, never "last chance!" or "we miss you."

---

## Locked decisions (from brainstorm)

### Q1 — PWA character register

**Web-first with app benefits + splash of earned escalation.**

- **Install** = understated but reachable (persistent header slot)
- **Push** = earned by engagement (asked at first "watch this show" tap)
- **Offline** = ambient reassurance (state-driven signal, not a user opt-in question)

### Q2 — Install prompt: placement + trigger

**Persistent header slot (dismissible), gated on `beforeinstallprompt`.**

- Small "Install" action lives in the top-right chrome (near the account menu), visible whenever the browser reports installability. Compresses to an icon on mobile 320px; icon + "Install" label on desktop.
- Tap = fires the native browser prompt (Android / desktop Chrome).
- Dismiss (X) respects prior dismissal — hides for N days (Design picks the exact number in the hi-fi handoff; suggested floor: 30 days, or forever if dismissed twice).
- **iOS Safari variant** — same slot, but tap opens a **"Here's how" sheet** with the Share → Add to Home Screen walkthrough (illustrated: the Share icon, the "Add to Home Screen" row, the "Add" confirm button). No native prompt fires because Safari doesn't expose one.

Ticket-locked constraints resolved by this shape: dismissible, respect prior dismissal, iOS instructional pattern.

### Q3 — Offline treatment: banner + fallback

**Header pill status + full-page fallback with cached-content shortcuts.**

- **Banner** = small persistent status pill in the header — a dot + short label (e.g., _"Offline · cached OK"_). Sits next to the account menu, doesn't claim a row. Present while `useOnlineStatus` reports offline. Non-modal, non-blocking (per ticket).
- **Fallback page** = full page rendered when the user navigates to something not in the cache while offline. Copy: _"You're offline — here's what you can still see."_ Includes **cached shortcuts** (recent events, venues, whatever's actually in the SW cache). Retry CTA + a link back to a known-cached landing route.
- **The two together tell one story** — the pill is the ambient signal; the fallback turns "you hit a wall" into "here's what you can still do."

Ticket-locked constraints: non-modal banner, full page fallback, public-only cached content.

### Q4 — Push permission: earned ask flow

**Two-step contextual sheet on first watch, no auto re-asks.**

- User taps "Watch this show." A small bottom sheet fires (delayed by a beat so it doesn't feel simultaneous with the watch action).
- Sheet content: _"Want a heads-up if tickets go on sale or the show changes? [Turn on notifications] [Not now]."_
- **Turn on** → fires the browser permission dialog. If granted, subscribes via `pushManager` + writes a row to `push_subscriptions`.
- **Not now** → dismisses; the sheet never returns automatically. Settings → Notifications carries a manual enable toggle for later opt-in.
- **The two-step is the whole point** — any "Not now" on our sheet means we never fire the browser permission dialog on an ambivalent user. Browser dismissals are often permanent; filtering with our own sheet means we only spend the browser-permission slot on users who've actively opted in.

### Q5 — Push category scope for v1

**Narrow: watch updates + price drops only.**

Push covers exactly these two categories:

1. **Watch updates** — for events the user is watching:
   - Cancelled
   - Postponed (rescheduled)
   - Sold-out
   - Back on sale (after a sold-out state, if that ever happens)
2. **Price drops** — for events the user is watching, when a price submission comes in below the user's threshold (existing `price_alerts` mechanism).

Everything else the notifications table writes — **contest_resolved, contest_filed, admin comms** — stays in-app-only, delivered to the notification bell (**#737**), never pushed.

**Rationale:** high signal-to-noise. Every push is genuinely urgent + actionable. Contest resolutions are personally interesting but rarely urgent — the bell is the right home. Keeps push high-value so users never want to turn it off.

**Not in v1** — deferred to follow-up issues:

- **New-show-from-followed-artist** ([#1037](https://github.com/HartiganHM/concert-crawl/issues/1037)) — depends on artist-follow being a first-class feature (partial via #763 Spotify sync).
- **Send-frequency batching** ([#1038](https://github.com/HartiganHM/concert-crawl/issues/1038)) — only implement if noise complaints emerge post-launch.

### Q6 — Push preferences page shape

**Master toggle + per-category sub-toggles at Settings → Notifications.**

- **Master switch** — _"Push notifications: [On / Off]"_
  - Toggle on = trigger the browser permission dialog (if not already granted) + subscribe via `pushManager`.
  - Toggle off = unsubscribe on this device. Browser permission stays granted; we just stop sending. User can re-enable without a fresh permission prompt.
- **Sub-toggles under master** (only visible when master is on):
  - **Watch updates** — default on
  - **Price drops** — default on
- **State model:** sub-toggle preferences stored server-side (per user, not per device). The push send pipeline in `apps/api` respects the sub-toggles before firing. Turning off a sub-toggle means the notification row still gets written for the bell — we just don't push it.
- **Device management** ([#1036](https://github.com/HartiganHM/concert-crawl/issues/1036)) — v2 follow-up. v1 users manage multi-device push by opting out on the device they don't want.

---

## Per-surface deliverables

### #969 Install prompt polish

- **Header slot component** — mobile (320 + 390) + desktop
  - "Installable" state (`beforeinstallprompt` captured; slot visible)
  - "Post-dismiss" state (hidden until N days elapse)
  - iOS Safari variant (slot visible; tap opens the "Here's how" sheet)
- **iOS "Here's how" sheet** — bottom sheet or centered modal (Design's call)
  - Illustrated walkthrough: Share icon → "Add to Home Screen" row → "Add" confirm
  - Copy in Sour Patch voice
- **Copy** for the slot label, the sheet header + walkthrough steps

### #970 Offline-state polish

- **Header pill component** — visible when offline
  - Dot color / shape (Design's call from the token palette; likely `--warning` or a neutral muted tone, not `--danger`)
  - Copy: _"Offline · cached OK"_ or Design's alternative
- **Fallback page component** — full page
  - Hero copy: _"You're offline — here's what you can still see"_ (Design refines)
  - Retry CTA (branded)
  - **Cached shortcuts list** — dynamic, populated from actual SW cache state
    - Recent events (whatever's cached)
    - Venues (whatever's cached)
    - A "Try the home page" link if list is empty
  - Empty state (nothing cached yet) — honest, not defeatist

### #971 Web push

- **Post-watch permission sheet** (Q4 flow) — bottom sheet
  - Copy: _"Want a heads-up if tickets go on sale or the show changes? [Turn on notifications] [Not now]"_
  - Design refines final wording
  - Delay timing (how many ms after the watch tap fires): Design's call, suggested 400–800ms
- **iOS-not-installed variant** — the same "post-watch" moment, but on non-installed iOS Safari where push can't work. Sheet becomes an **install-first flow**: _"To get notified on iPhone, add Concert Crawl to your Home Screen first. [Show me how] [Not now]."_ Show me how opens the same iOS install "Here's how" sheet from **#969**.
- **Settings → Notifications page** — master + per-category toggles (Q6)
  - Master toggle
  - Watch updates sub-toggle
  - Price drops sub-toggle
  - Empty state (never asked yet, or master off) — Design shape
  - Denied state (browser permission was denied, we can't re-ask; user has to enable in browser settings) — honest explanation + link to browser settings docs
- **Notification content per category** — Sour Patch voice, per-type shape:
  - **Cancelled:** _"Amyl and the Sniffers at Roxy — cancelled. Details inside."_
  - **Postponed:** _"Amyl at Roxy moved to [new date]. Same tickets, new night."_
  - **Sold-out:** _"Amyl at Roxy is sold out. Waitlist may open up."_
  - **Back on sale:** _"Tickets for Amyl at Roxy just went back on sale."_
  - **Price drop:** _"$32 tickets for Amyl at Roxy just went on sale."_
  - (Design refines final wording — these are shape examples, not locked copy)

---

## Voice guardrails (Sour Patch bar, #782)

Every surface + every push message obeys:

- **Specific > generic** — _"$32 tickets for Amyl at Roxy just went on sale"_ beats _"Price drop on a show you're watching"_
- **Honest > cheerful** — _"Sold out. Waitlist may open up"_ beats _"Tickets going fast!"_
- **Callouts are questions, not claims** — _"Want a heads-up if tickets go on sale?"_ beats _"Turn on notifications!"_
- **Never brochure-y** — the install sheet reads like a friend showing you the trick, not marketing collateral
- **No hype, no false urgency** — never _"last chance!"_, never _"we miss you!"_, never _"limited time!"_
- **Errors are honest** — offline pill says _"cached OK"_ not _"connection error"_; fallback says _"you're offline"_ not _"something went wrong"_

---

## Scope

### In scope for v1

Everything above.

### Out of scope for v1 (documented follow-ups)

- **Multi-device push management** ([#1036](https://github.com/HartiganHM/concert-crawl/issues/1036)) — v2
- **New-show-from-followed-artist push category** ([#1037](https://github.com/HartiganHM/concert-crawl/issues/1037)) — v2, depends on artist-follow being a first-class feature
- **Push send-frequency batching** ([#1038](https://github.com/HartiganHM/concert-crawl/issues/1038)) — v2, only if noise complaints emerge

### Out of scope permanently (from tickets)

- Native (Capacitor) push via FCM/APNs (that's the deferred native effort)
- Real-time push via SSE / websockets
- Notification preferences beyond the master + 2 sub-toggles for v1

---

## Dependencies + sequencing

- **PWA Tier B service worker** ([#968](https://github.com/HartiganHM/concert-crawl/pull/968) — executing) — required for both offline states (needs the SW) and push (needs SW `push` + `notificationclick` handlers). Do not start eng-planning on any of the three PWA cluster tickets until Tier B PR2 (Serwist SW + app shell) has landed.
- **Consumer notification bell** ([#737](https://github.com/HartiganHM/concert-crawl/issues/737)) — writes for the bell exist today (from admin contest-review #697), but the consumer bell surface isn't built yet. Push v1 doesn't strictly depend on the bell shipping first — push can deliver watch/price categories independently. But the notification history landing target (tapping a push → where do you go?) is best when the bell exists, so plan-PR sequencing should consider #737 pairing.
- **VAPID keys** — eng generates + stores per production launch runbook (env vars, never in chat).
- **`push_subscriptions` table** — Drizzle migration (expand/contract), scoped per-user + per-device (endpoint as key).

---

## Data model (informational, eng-side)

Eng-planning agent specs the actual schema; this brief informs the shape.

- **`push_subscriptions`** — new table
  - `id`, `user_id`, `endpoint` (unique per subscription), `p256dh_key`, `auth_key`, `user_agent` (for future device management #1036), `created_at`, `last_active_at`
- **`user_notification_preferences`** — new table (or JSONB column on `users`)
  - Per-user push preferences: `master_enabled`, `watch_updates_enabled`, `price_drops_enabled`
  - Send pipeline respects these before firing per-category push
- **`notifications` table (existing)** — unchanged; push is a side channel that reads the same rows the bell reads

---

## Open handoff questions for Design

Small decisions the brief leaves open for the hi-fi pass:

1. **Header pill color** — from token palette, likely `--warning` or a neutral muted tone. Not `--danger` (avoids alarm register).
2. **Install sheet shape** — bottom sheet vs centered modal for the iOS "Here's how" walkthrough
3. **Cached shortcuts list layout** — grid vs list; how many items before "show more"; behavior when cache is empty
4. **Post-watch delay timing** — how many ms after the watch tap fires before the permission sheet appears (suggested 400–800ms)
5. **Notification icon** — the small icon that shows in the OS notification tray. Concert Crawl mark, but at what size / treatment?
6. **Dismissal-persistence UX** — how many days does an install-slot dismiss last? Two dismisses = forever hidden?
7. **Denied-state copy** — for the Settings preferences page when browser has denied permission and we can't re-ask (user must enable in browser settings)

None block brief-lock. All land during hi-fi handoff.

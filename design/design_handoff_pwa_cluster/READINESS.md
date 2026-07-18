# Design Readiness Review — PWA cluster (#969 + #970 + #971)

**Verdict: 🟢 Green — ready for implementation**

Design shipped hi-fi handoff for all three PWA cluster tickets that honors every
locked decision from the brief (PR #1039), demonstrates both design principles
(web-first + voice authenticity) across every surface, and cleanly wires into
the existing eng infra (`useOnlineStatus`, `SettingsRoute`, `notifications`
table). One-pass audit — no addendum needed.

The handoff also makes 8 non-trivial design calls the brief left open (bottom
sheet format for iOS, dismissal persistence rules, `--warning` color choice,
500ms post-watch delay, post-watch as second-beat-not-blocker, denied-state
honesty, empty-cache honesty, notifications-as-settings-section). All 8 are
reasonable + defensible + in-voice.

---

## Scope validated

**12 files in the handoff directory.** Breakdown:

- **5 authored code files** by Design: `PWA Cluster.html` (canvas + Tweaks), `pwa-data.jsx` (shared atoms + copy maps + fixtures), `pwa-install.jsx` (#969), `pwa-offline.jsx` (#970), `pwa-push.jsx` (#971)
- **1 "vendored" code file**: `profile-settings-screens.jsx` (verbatim copy of the shipped settings screen from `design_handoff_profile_settings_v2` + a new `NotificationsSection` slotted in). At 931 lines it's over the ~600 review ceiling but is called out in the README as "review the diff against source, not the whole file." Reviewer should diff against `design/design_handoff_profile_settings_v2/profile-settings-screens.jsx`, not read the file cold.
- **4 shared infra files** copied from sibling handoffs, unmodified: `design-canvas.jsx`, `theme-context.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx`
- **1 meta doc**: `README.md` (DNA + inventory + gap report + a11y notes)
- **1 audit doc**: this `READINESS.md`

Every newly-authored code file is under ~600 lines for Copilot reviewability.

### Consumer surface coverage

| Surface | State | Mobile | Desktop | Verified |
|---|---|---|---|---|
| #969 Install slot · installable (native prompt) | ✓ | 390 | chrome | ✅ |
| #969 Install slot · iOS Safari (opens sheet) | ✓ | 390 | — | ✅ |
| #969 Install slot · post-dismiss (hidden + `DismissNote`) | ✓ | 390 | — | ✅ |
| #969 iOS "Here's how" sheet · 3-step walkthrough | ✓ | 320 + 390 | (mobile-native) | ✅ |
| #970 Offline pill · header (`role="status"`, `--warning` dot) | anatomy + in-context | 390 | ✓ | ✅ |
| #970 Fallback page · populated (cached shortcuts + auth note) | ✓ | 320 + 390 | ✓ | ✅ |
| #970 Fallback page · nothing-cached honest empty state | ✓ | 390 | (same) | ✅ |
| #971 Post-watch permission sheet | ✓ | 390 | (mobile-native) | ✅ |
| #971 Post-watch sheet · iOS-not-installed → install-first flow | ✓ | 390 | — | ✅ |
| #971 Settings → Notifications section · in real settings screen | ✓ | 390 | ✓ | ✅ |
| #971 Notifications section · on (master + 2 sub-toggles) | ✓ | 390 | ✓ | ✅ |
| #971 Notifications section · empty state (never asked) | ✓ | 390 | — | ✅ |
| #971 Notifications section · browser-denied edge state | ✓ | 390 | — | ✅ |
| #971 Notification cards · 5 categories (cancel/postpone/soldout/backonsale/pricedrop) | dark + light | 430 | — | ✅ |
| Theme parity · offline + post-watch across Electric / Jade / Light | ✓ | 390 | — | ✅ |

---

## Locked decisions — every one honored

| Q | Brief lock | Handoff delivery |
|---|---|---|
| Q1 Register | Web-first + splash of earned escalation | ✅ Install = header slot (understated, dismissible), push = post-watch (earned), offline = ambient pill |
| Q2 Install prompt | Persistent header slot; iOS variant opens sheet | ✅ `InstallSlot` in `AppChrome` top-right; `variant="ios"` opens `IosHowToSheet`; `DismissNote` documents persistence UX |
| Q3 Offline | Header pill + full-page fallback with cached shortcuts | ✅ `OfflinePill` (role=status), `OfflineFallback` with `CachedShortcuts` (real events + venues) + `CachedEmpty` honest empty state + `authNote` for network-only content |
| Q4 Push permission | Two-step contextual sheet on first watch, no auto re-asks | ✅ `PostWatchSheet` fires (~500ms delay per README); scrim tap and Escape both count as "Not now"; footnote reminds user Settings can re-enable |
| Q5 Push categories v1 | Watch updates + price drops only | ✅ 5 notification card shapes cover the watch-update sub-types (cancel/postpone/soldout/backonsale) + price drop; contest/admin absent (correctly in bell only) |
| Q6 Push preferences | Master toggle + per-category sub-toggles at Settings → Notifications | ✅ `NotificationsSection` in real settings screen (not a new page) with master + Watch updates + Price drops; on / empty / denied states all designed |
| Voice principle | Every string reads concert-goer voice | ✅ Grepped: no "fraud", no "last chance", no "we miss you"; specific-over-generic verified across install / offline / push copy |
| Web-first principle | Every ask dismissible, no on-load takeovers | ✅ No component fires without user action; Escape + scrim-tap always work as "Not now"; browser permission dialog only fires from Turn on tap |

---

## Voice authenticity audit (Sour Patch bar #782)

Sample lifts from `INSTALL_COPY`, `OFFLINE_COPY`, `PUSH_COPY`:

- ✅ **Callout is a question** — `"Want a heads-up if anything changes?"` (postWatch.title) not a claim
- ✅ **Specific > generic** — `"$32 tickets for Amyl at the Roxy just went on sale. Down from $48. Cheapest we've seen for this one."` beats "Price drop"
- ✅ **Honest > cheerful** — `"Sold out. Official waitlist may open closer to the date — we'll watch it."` explicitly de-hyped
- ✅ **Never brochure-y** — `"Safari won't do it for you on iPhone — here's the 10-second version."` reads like a friend showing the trick
- ✅ **No false urgency** — back-on-sale copy explicitly says `"They tend to go fast — no pressure though."` — self-defusing
- ✅ **Errors are honest** — offline pill `"Offline · cached OK"`; denied state `"You (or your phone) told the browser no, and we can't override that — only you can."`
- ✅ **Grepped clean:** no "fraud", no "last chance", no "we miss you", no "limited time"

The dismissal note is especially good: `"We'll quit asking. You can still add it from Settings whenever."` — the whole persistence UX explained in one voice-passed sentence.

---

## Completeness sweep (per `feedback_audit_completeness_not_just_brief.md`)

Discipline: cross-check the brief against schema + eng infra + tier lifecycles,
not just check off brief items.

### Schema completeness
- ✅ **`notifications` table** (existing) at `packages/db/src/schema/notifications.ts` — has `user_id`, `type`, `category`, `title`, `body`, `action_url`, `read_at`, `metadata`, `created_at`. Push reads the same rows the bell (#737) reads. Aligned with brief.
- ⚠️ **`push_subscriptions` table** — net-new; brief spec calls it out (endpoint, keys, user_id, device metadata). Eng-plan owns the migration.
- ⚠️ **Notification preferences storage** — net-new; either JSONB column on `users` OR separate `user_notification_preferences` table. Brief flagged; eng-plan picks the shape.
- ✅ **Notification category enum extension** — `cancelled`, `postponed`, `soldout`, `backonsale`, `pricedrop` values in handoff align with what push v1 covers; `contest_resolved`, `contest_filed` stay bell-only.

### Eng infra completeness
- ✅ **`useOnlineStatus` hook** at `apps/web/src/lib/hooks/useOnlineStatus.ts` — exists with tests. `OfflinePill` targets it correctly.
- ✅ **`SettingsRoute` + `SettingsRouteDesktop`** at `apps/web/src/components/settings/` — exist. `NotificationsSection` slots into their component tree. `SettingsRowGroup` / `SettingsRow` / `SectionTitle` primitives already present.
- ⚠️ **Shared `AppBar` component** — doesn't exist as a shared component yet (currently in-line in `browse-home.tsx` per handoff README). Design's `AppChrome` shows the shape; eng-plan decides whether to extract to a shared component or keep it in-line per surface.
- ⚠️ **`pushManager` wiring + SW `push` + `notificationclick` handlers** — depend on PWA Tier B PR2 (Serwist SW + app shell) landing. Handoff acknowledges this dependency explicitly.
- ⚠️ **VAPID keys generation + storage** — production-launch-runbook territory; not in handoff scope.

### Tier / user lifecycle completeness
- ✅ **Anonymous users:** install slot visible + iOS sheet accessible + offline pill + fallback all work. Push flow never fires for anon (Watch requires auth). This is the correct behavior; no state is missing.
- ✅ **Signed-in first-time watcher:** post-watch sheet fires ✓
- ✅ **Signed-in returner who dismissed post-watch:** never re-asked ✓; Settings manual enable path exists
- ✅ **Signed-in user who accepted:** master + per-category state governs send pipeline ✓
- ✅ **Browser-denied user:** designed explicitly (`Blocked` badge + honest explanation + link to unblock docs)
- ✅ **iOS Safari not-installed user:** post-watch flow becomes install-first (`PostWatchSheet variant="ios"` → opens `IosHowToSheet`); this is the correct handling for the iOS 16.4+ constraint that push requires installed PWA

### Voice / brand completeness
- ✅ Tokens across 3 themes (Electric / Jade / Light) — theme parity section covers offline + post-watch × 3
- ✅ CCMark verbatim copy from `browse-home.jsx` with source-of-truth note (avoids drift risk)
- ✅ Wordmark uses canonical lockup (matches `AppBar` from `browse-home.jsx`)
- ✅ Notification card uses CCMark as OS app icon (unrestyled, per brief)

### iOS-specific completeness
- ✅ **Install prompt (iOS)** — no `beforeinstallprompt` API; slot opens sheet instead of firing native prompt. Correct.
- ✅ **Push (iOS not-installed)** — becomes install-first flow via same `IosHowToSheet` (nice reuse). Post-watch sheet becomes a "here's the extra step" moment. Correct handling of the iOS 16.4+ constraint.
- ✅ **Push (iOS installed)** — normal post-watch sheet fires; iOS `iosHint` copy in Settings acknowledges install status. Correct.

---

## Design's 5 gap-report items (Hugh's calls to confirm)

Design flagged these transparently in `README.md`:

1. **Themes: 3, not 9.** The brief referenced 9 themes; this project ships 3 consumer themes (Electric / Jade / Light) via `theme-context.jsx`. Design confirmed with Hugh before shipping. Tokens make the extension free for future themes. ✅ **Verified & correct** — the brief's "all 9 themes" was inherited from the venue-guide brief but this project actually ships 3.
2. **Install slot lives in header chrome only.** No in-content install banner. Correct — a banner would violate "no on-load takeovers." ✅ **In-line with the web-first principle.**
3. **Desktop sheets → point at mobile column.** The iOS walkthrough and post-watch sheets are mobile-native patterns; desktop shows the install chrome + a note. Offline fallback and Settings *do* have real desktop artboards. ✅ **Correct call** — forcing a desktop sheet would fake a native pattern.
4. **Post-watch fixture "Amyl at the Roxy"** across notification shapes — matches venue-guide + shareable-cards reference set. ✅ **Consistent + templated for eng lift.**
5. **Notification cards as in-app / lock-screen style.** OS chrome (time, grouping) is suggestive; real cards drawn by the platform from payload. Handoff locks the *content*, which is what's ours to author. ✅ **Correct scope call.**

All 5 are reasonable. No addendum needed.

---

## Prototype polish deferred to plan PR

Non-blocking items eng resolves during plan PR spec / build:

1. **`AppBar` shared component decision** — Design's `AppChrome` shows the shape but eng decides whether to extract to a shared component or keep the install-slot + offline-pill wiring in-line per surface. Not a design gap; an eng architecture call.
2. **Cached shortcuts data source** — `CACHED_EVENTS` / `CACHED_VENUES` are fixtures. Real SW cache-state retrieval (probably a `getCachedEvents()` + `getCachedVenues()` helper hitting `caches.match()`) is eng territory. Handoff models the display shape; eng owns the data flow.
3. **Notification preferences data model** — brief spec calls out either JSONB column on `users` OR separate `user_notification_preferences` table. Eng-plan picks; handoff renders the same UI either way.
4. **`profile-settings-screens.jsx` review approach** — the file is 931 lines because it's a verbatim copy of the shipped settings screen (from `profile_settings_v2`) + a new `NotificationsSection`. Copilot reviewer should diff against source, not read cold. Called out in README + noted here.

None are voice, brand, or reachability regressions. Integration seams a good plan PR resolves.

---

## What eng picks up

- Copy in `INSTALL_COPY`, `OFFLINE_COPY`, `PUSH_COPY` maps in `pwa-data.jsx` — ready for lift into `apps/web/src/components/*/definitions/copy.ts`
- Component shapes ready to translate:
  - `InstallSlot` + `IosHowToSheet` + `BottomSheet` primitive + `DismissNote` → install prompt surface
  - `OfflinePill` + `OfflineFallback` + `CachedShortcuts` + `CachedEmpty` → offline surface
  - `PostWatchSheet` + `NotificationCard` + `Switch` → push surface
  - `NotificationsSection` slots into existing `SettingsRoute` / `SettingsRouteDesktop`
- All tokens (`var(--*)`) across 3 themes; zero ad-hoc hex on authored surfaces
- A11y implemented on the authored PWA surfaces (`pwa-*.jsx`): `role="dialog"` + focus trap + Escape/scrim close on all sheets, `role="status"` + `aria-live` on offline pill, `role="switch"` + `aria-checked` on toggles, 44px min tap targets, no `title=` tooltips. (Vendored `profile-settings-screens.jsx` inherits its `title=` usage from the settings handoff — inherited via the `#959` shared-infra precedent.)
- Sequencing lock: eng-planning WAITS until PWA Tier B PR2 (Serwist SW + app shell) lands. Both offline and push depend on the SW.

---

**Reviewer:** Claude (design-track persona)
**Date:** 2026-07-18
**Handoff shipped:** 2026-07-18 (this PR)
**Brief referenced:** PR #1039 (merged 2026-07-18)

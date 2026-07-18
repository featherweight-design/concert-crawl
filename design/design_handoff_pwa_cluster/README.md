# PWA Cluster — install · offline · push · design handoff

**Track 2 · #969 + #970 + #971 · July 18, 2026**

The three PWA "superpowers" surfaces, designed as one package because they share
DNA: a small dismissible install action, a quiet offline pill + fallback, and a
post-watch push ask that respects the browser. Every ask is dismissible, nothing
takes over on load, and every displayed string is voice-passed.

Open: `PWA Cluster.html`

---

## DNA statement

Built on the Concert Crawl consumer design system. **Structural rhythm** lifted
from `venue_first_timer_guide` (Section-organized canvas, Tweaks-driven §0 live
preview, mobile 320 + 390 + desktop, theme-parity closer). **Voice** is the Sour
Patch bar (#782). **Tokens only** on every consumer surface (`var(--*)`, all 3
shipped themes). **Brand mark unchanged** — `CCMark` is copied verbatim from
`browse-home.jsx` into `pwa-data.jsx` (commented as a copy, source-of-truth
noted); the notification app-icon is that same mark, unrestyled.

Two principles bind every decision:

1. **🌐 Web-first, respect the browser.** Every ask is dismissible. No on-load
   takeovers. The permission slots (install, push) only ever *offer* — the
   browser's own permission dialog is never fired without a user tap. "Not now"
   is real; push never auto-re-asks.
2. **🎙️ Voice authenticity is the quality bar.** Every string reads like a
   concert-goer wrote it. The offline pill says "cached OK", not "connection
   error". The push ask is a question, not a pitch. The denied state gives a real
   answer, not a shrug.

---

## Template inventory

| Surface | State | Mobile | Desktop |
|---|---|---|---|
| **#969** Install slot | Installable (native prompt) | 390 | chrome |
| #969 Install slot | iOS Safari (opens sheet) | 390 | — |
| #969 Install slot | Post-dismiss (hidden + note) | 390 | — |
| #969 iOS "Here's how" sheet | walkthrough (Share → Add row → Add) | 320 + 390 | (mobile-native) |
| **#970** Offline pill | header, `role=status`, --warning dot | anatomy | in fallback |
| #970 Fallback page | cached shortcuts (recent + venues) | 320 + 390 | ✓ |
| #970 Fallback page | nothing-cached empty state | 390 | (same) |
| **#971** Post-watch sheet | permission ask (~500ms after Watch) | 390 | (mobile-native) |
| #971 Post-watch sheet | iOS-not-installed → install-first | 390 | — |
| #971 Settings → Notifications | in the **real settings screen** (mobile scroll section + desktop sidebar) | 390 | ✓ |
| #971 Notifications section | on (master + 2 sub-toggles) | in context | ✓ |
| #971 Notifications section | empty (never asked) · denied (browser blocked) | in context | — |
| #971 Notification cards | 5 categories (cancel/postpone/soldout/backonsale/pricedrop) | dark + light | — |
| Theme parity | fallback + post-watch · Electric / Jade / Light | ✓ | — |

Canvas §0 is a Tweaks-driven live preview (surface · per-surface state · theme).

---

## Design calls made (not fully specified in the brief)

| Call | Decision |
|---|---|
| **iOS sheet format** | **Bottom sheet** (not centered modal) — native-feeling on iPhone, and it's reused by the push iOS-not-installed flow, so one focus-trapped pattern covers both. |
| **Dismissal persistence** | First dismiss quiets the slot **30 days**; a second dismiss **retires it for good**. Either way Settings can still re-trigger install. The `dismissNote` copy states this plainly. |
| **Offline dot color** | **`--warning`** (amber) — noticeable but calm. `--danger` was rejected (alarm register); a fully-muted neutral read as broken rather than informative. |
| **Push delay** | **500ms** after the first Watch tap — long enough that the sheet feels like a consequence of watching, short enough to stay connected to the action. |
| **Post-watch sheet host** | The Watch commit lands first (the pill flips to "Watching"); the sheet is a *second*, dismissible beat — never a blocker on the watch action itself. |
| **Denied state** | A real honest explanation ("you/your phone told the browser no, and we can't override that") + a link to unblock docs + a `Blocked` badge on the disabled master toggle. Users deserve a real answer at this edge. |
| **Empty cached state** | Honest, not defeatist: names the likely cause ("first visit, or a fresh phone?") and sets the expectation that browsing now will start filling the cache. |
| **Auth-data caveat** | The fallback says account content (watchlist, settings) is network-only in plain language — caching is public-data-only (privacy-scoped), and the page covers both cases without faking authed content offline. |
| **App shell chrome** | Mobile mocks render the real app chrome — top `AppBar` (mark + wordmark + search) hosting the install slot / offline pill top-right, and the bottom `PwaTabBar` (browse · venues · watching · account). Account lives in the tab bar, never top-right. At 320 the wordmark collapses to the mark so the offline pill never clips. |
| **Notifications discoverability** | Notifications is a **section of the existing settings screen** — an inline block in the mobile scroll (after Appearance) and a sidebar entry + panel on desktop, both built from the real settings primitives (`SettingsRoute` / `SettingsRouteDesktop`, `SettingsRowGroup`, `SettingsRow`, `SectionTitle`). It is **not** a new page. The existing settings already teased it ("Lands with notifications"); this fills that slot. `NotificationsSection` (in `profile-settings-screens.jsx`) renders the on / empty / denied states and is what lifts into prod. |

---

## Voice guardrails demonstrated

Every sample below is in the deliverable and lifts verbatim into `copy.ts`.

- **Callout is a question** — `"Want a heads-up if anything changes?"` not "Turn on notifications!"
- **Specific > generic** — `"$32 tickets for Amyl at the Roxy just went on sale."` (with "Down from $48. Cheapest we've seen") not "Price drop on a watched show."
- **Honest > cheerful** — sold-out: `"Official waitlist may open closer to the date — we'll watch it."` not "Going fast!"
- **Errors are honest** — offline pill: `"Offline · cached OK"`; fallback: `"You're offline — here's what you can still see."` not "Something went wrong."
- **Never brochure-y** — install sheet reads like a friend showing the trick: `"Safari won't do it for you on iPhone — here's the 10-second version."`
- **No false urgency** — back-on-sale even softens itself: `"They tend to go fast — no pressure though."`

---

## Copy maps (ready for `copy.ts`)

All in `pwa-data.jsx`, keyed for lift into
`apps/web/src/components/*/definitions/copy.ts`:

- `INSTALL_COPY` — slot label + aria, the sheet (`eyebrow`, `title`, `sub`, 3
  `steps`, `done`), and `dismissNote` (the persistence-UX explainer).
- `OFFLINE_COPY` — `pillLabel` / `pillAria`, and `fallback` (`eyebrow`, `title`,
  `sub`, `retry`, `shortcutsLabel`, `authNote`, and the `empty` block).
- `PUSH_COPY` — `postWatch`, `iosNotInstalled`, `settings` (master + 2 sub-toggle
  defs + `empty` + `denied` + `iosHint`), and `notifications` (the 5 category
  shapes).

---

## Files

| File | Role |
|---|---|
| `PWA Cluster.html` | canvas + Tweaks (entry point) |
| `pwa-data.jsx` | CCMark copy, wordmark, Eyebrow, BottomSheet, buttons, icon set, account glyph, **all `*_COPY` maps + fixtures** |
| `pwa-install.jsx` | `AppChrome` (shared), `InstallSlot` (installable/iOS), `IosHowToSheet`, `IosSheetRowMock`, `DismissNote` |
| `pwa-offline.jsx` | `OfflinePill`, `OfflineFallback` (populated + empty + desktop), `CachedShortcuts`, `CachedEmpty` |
| `pwa-push.jsx` | `PostWatchSheet` (+ iOS variant), `NotificationCard`, `NotificationStack`, `Switch` (shared with the settings section) |
| `profile-settings-screens.jsx` | the **real settings screen** (`SettingsRoute` / `SettingsRouteDesktop`), copied from `profile_settings_v2` + a new `NotificationsSection` (#971) slotted in — the marks fall back to `CCMark`/`Wordmark` so it loads standalone |
| `theme-context.jsx` · `ios-frame.jsx` · `design-canvas.jsx` · `tweaks-panel.jsx` | shared infra (copied, unmodified) |

Each **newly-authored** file is under ~600 lines for Copilot reviewability. `profile-settings-screens.jsx` is a verbatim copy of the shipped settings screen (from `profile_settings_v2`) — the only change is the added `NotificationsSection` (#971) and a mark-import fallback; review the diff against source, not the whole file.

---

## A11y (WCAG AA)

- **Install slot** = real `<button>`, `aria-label="Install Concert Crawl"`, ≥44px tap target.
- **iOS "Here's how" sheet** = `role="dialog"`, `aria-modal`, `aria-labelledby`, focus lands inside on mount, **Tab is trapped**, Escape closes.
- **Offline pill** = `role="status"`, `aria-live="polite"`, `aria-label="You're offline…"`; the dot is `aria-hidden` (color is never the only signal — the label carries it).
- **Fallback retry** = real button, keyboard accessible; branded `--signal` primary.
- **Post-watch sheet** = focus-trapped `role="dialog"`; Escape / scrim-tap both count as "Not now".
- **Settings toggles** = `role="switch"`, `aria-checked`, `aria-label`; the denied master is `disabled` with a text `Blocked` badge (not color alone).
- **No native `title=` tooltips** on the authored PWA surfaces (`pwa-*.jsx`); every icon is `aria-hidden` with an adjacent text label. (The vendored `profile-settings-screens.jsx` copy inherits its handful of `title=` uses from the settings handoff — inherited via the `#959` shared-infra precedent, not authored here.)
- Every color reads from `var(--*)` — parity holds across Electric / Jade / Light.

---

## Sequencing / dependencies

- **Blocked on PWA Tier B (#968 PR2 — Serwist SW + app shell).** Both offline
  states need the SW; push needs the SW's `push` + `notificationclick` handlers.
  Do **not** start eng on any of the three cluster tickets until PR2 lands.
- **VAPID keys** — eng generates + stores per the production launch runbook (env
  vars, never in chat).
- **`push_subscriptions` table** — Drizzle migration, per-user + per-device
  (endpoint as key). Eng owns the schema; this handoff only informs its shape.
- **Cached-shortcuts list is dynamic** — populated from real SW cache state at
  render. The fixtures here (`CACHED_EVENTS`, `CACHED_VENUES`) model the shape;
  the empty state is what shows when the cache is genuinely empty.

---

## Out of scope (documented v2 follow-ups)

- **#1036** Multi-device push management (device list + per-device unsubscribe) — v2.
- **#1037** New-show-from-followed-artist push category — v2 (depends on artist-follow being first-class).
- **#1038** Push send-frequency batching — v2, only if noise complaints emerge.
- Native (Capacitor) push via FCM/APNs — permanently out of scope.
- Real-time push via SSE / websockets — permanently out of scope.
- Notification preferences beyond master + 2 sub-toggles — v1 is deliberately narrow.

---

## Gap report — calls the brief didn't cover

1. **Themes: 3, not 9.** The brief referenced a 9-theme world; this project ships
   3 consumer themes (Electric / Jade / Light) via `theme-context.jsx`. Everything
   is token-based, so parity extends to any future theme for free — confirmed
   with Hugh to build the real 3.
2. **Install slot lives in header chrome only.** No in-content install banner was
   added — the brief scopes install to the top-right chrome action, and a banner
   would violate "no on-load takeovers." Flag if a within-content entry is wanted.
3. **Desktop for sheet surfaces.** The iOS walkthrough and post-watch sheets are
   mobile-native patterns; the desktop column shows the install chrome + a note
   pointing to the mobile column rather than forcing a desktop sheet. The offline
   fallback and Settings page *do* have real desktop artboards.
4. **Post-watch fixture is "Amyl at the Roxy"** across the notification shapes, to
   match the venue-guide + shareable-cards reference set. Swap freely — the copy
   map is templated on artist/venue/price/date.
5. **Notification cards are rendered as in-app/lock-screen style** (CCMark app
   icon + category tag + title + body). The OS chrome (time, grouping) is
   suggestive only — the real cards are drawn by the platform from the payload;
   these lock the *content*, which is what's ours to author.

# Native App Feasibility — iOS / Android

**Date:** 2026-07-16
**Status:** Reference / research. Not a plan. See the PWA plan (separate) for execution.
**Question:** What would it take to launch Concert Crawl as native apps on Android and iOS?

---

## TL;DR

**Recommended path: finish the PWA first, then wrap it with Capacitor for the app stores. Skip a React Native rewrite.**

The biggest issue is not technical — it is that Apple/Google want a 15–30% cut of Stripe subscriptions, and that fact should drive the whole decision. A realistic "real apps in both stores" effort is **~4–7 focused weeks**, most of it spent on the PWA foundation we are missing plus payments/push plumbing — not on "making it native."

---

## Current state (evidence-based)

apps/web is **Next.js 15.5.20, App Router**, mobile-first (Tailwind responsive, 320px baseline, viewport metadata set). React Query 5.x is already integrated.

**PWA claim is aspirational.** What actually exists vs. what a real PWA needs:

- ✅ Web app manifest (`apps/web/src/app/manifest.ts`) — name, short_name, description, start_url, standalone display, theme/background color, 192 + 512 icons
- ❌ **No service worker** (the thing that makes a PWA installable/offline). None exists in the repo — no `public/sw.js`, no Serwist/next-pwa.
- ❌ No `next-pwa`/Serwist, no caching, no offline fallback, no install prompt
- ❌ No iOS meta tags (apple-touch-icon, apple-mobile-web-app-*), no favicon set, no maskable icon
- ❌ No push infrastructure of any kind

So today it is a mobile-responsive website with a manifest file — roughly 20% of a PWA. The UI shell is in good shape.

**Auth:** Clerk — `ClerkProvider` + `clerkMiddleware` + httpOnly cookies + server-side session lookup (`apps/web/src/middleware.ts`, `layout.tsx`). Web-first; cookies + OAuth redirects (Spotify) get fiddly in a WebView.

**Payments:** Stripe web checkout — `@stripe/react-stripe-js`, `CheckoutPanel.tsx` → `/v1/billing/checkout-session`. `subscriptions` table mirrors Stripe tiers (free/premium/supporter/founder). **This is the crux for app stores (see gotcha below).**

**Push:** None. Notifications are in-app DB rows only (`packages/db/src/schema/notifications.ts`; `apps/api/.../contest-notifications.ts`). Issue #737 tracks the open consumer in-app notification surface (bell + panel + endpoints) — related but distinct from push delivery.

**Rendering:** Heavy Server Components + server actions + middleware auth + `next/image` + ISR. A WebView wrapper pointing at the deployed site keeps all of this for free; a static export would break it.

---

## The three paths

| Path | What it is | LOE | Store presence |
|---|---|---|---|
| **A. Finish the PWA** | Service worker + offline + install prompt + web push | ~1–2 wks | No store listing (browser "Add to Home Screen") |
| **B. Capacitor wrapper** | Bundle the web app in a native shell, ship to both stores | ~3–5 wks on top of A | Yes, both stores |
| **C. React Native / Expo rewrite** | Rebuild the UI natively, share only the API | ~3–6 **months** | Yes, most "native" feel |

**Path C is off the table** for a concert-browsing app — you rebuild every screen, re-implement auth, and maintain two frontends forever for a marginal gain.

**Capacitor (B) is the sweet spot** — modern successor to Cordova. The existing Next.js app runs in a native WebView; native plugins (push, deep links, IAP, camera) come via a JS bridge. One codebase → web + iOS + Android.

---

## The dominant gotcha: the app-store payment tax

Digital subscriptions sold **inside** the app must use Apple/Google's in-app purchase APIs. They take **30%** (drops to **15%** under Apple's Small Business Program / Google's first-$1M tier — we qualify). Stripe checkout inside the app = **automatic rejection**.

Options, each with tradeoffs:

1. **Native IAP** (StoreKit/Play Billing via Capacitor) reconciled back to the Stripe-shaped model. Cleanest UX, but two billing systems + 15% cut.
2. **External-link entitlement** — post-2025 Epic/Apple + DMA rulings, US apps can link out to web payment. Keeps Stripe, dodges/reduces the cut, but rules are fresh and shifting. **Verify current policy before betting on it.**
3. **"Reader app" framing** — sell nothing in-app; sign-up + pay on web only, the app just displays. Lowest-friction store entry.

**Lean for v1: option 3** — ship the app as the browsing/notification surface, keep upgrades on web. Add native IAP later if store conversion matters. This decision shapes scope more than any technical choice.

---

## Other gotchas

- **Auth (Clerk):** Cookie handling + OAuth pop-ups (Spotify) are fiddly in a WebView. Clerk has Capacitor guidance; budget real QA time.
- **Push:** Net-new. Stand up FCM (Android) + APNs (iOS) + device-token table + send pipeline (~1 wk). Worth doing anyway — also unblocks web push for the PWA and relates to #737.
- **SSR reliance:** WebView-loads-live-site keeps SSR/actions/middleware; static export would break them. Trade "true offline" for keeping server features.
- **Review + maintenance overhead:** two store accounts ($99/yr Apple, $25 once Google), review latency on every change, screenshots, privacy labels, "broke on iOS 19" tax. Permanent operational cost.
- **Deep links / universal links** for shareable event URLs need per-platform config.

---

## What native actually buys you

- **Push notifications** — the real prize. "Tickets just dropped for a show you're watching" serves the watch/attending model and #737.
- **Store discoverability** — App Store / Play search for "Denver concerts."
- **Home-screen presence + credibility.**
- **Reliable install + re-engagement** (badges, app icon, faster perceived launch).
- Minor: haptics, share sheet, calendar integration, offline caching.

**A finished PWA (Path A) gets ~70% of these** — installable, home-screen icon, and (Android + iOS 16.4+) web push — for a fraction of the effort and zero app-store tax or review friction. A store presence adds mainly discoverability and iOS push reliability.

---

## Recommended sequencing

1. **Decide the billing model** (native IAP vs. external-link vs. web-only reader app). Everything scopes off this. Lean: web-only upgrades for v1.
2. **Finish the PWA** (service worker + offline shell + install prompt + web push). ~1–2 wks, independently valuable, and lays the push groundwork that complements #737.
3. **Wrap with Capacitor** — add FCM/APNs, deep links, native auth QA. ~3–4 wks.
4. **Ship to Play first** (faster, friendlier review), then App Store.
5. Reconsider React Native only if the WebView experience proves too janky (rare for a browsing app).

**Rough total to real dual-store apps: 4–7 focused weeks**, dominated by the PWA foundation, push infra, and the billing decision.

---

## PWA gap audit (detail — the work behind Path A)

Precise gaps to close, from a full codebase pass:

1. **Manifest** (`apps/web/src/app/manifest.ts`): has name/short_name/description/start_url/display/theme+background/192+512 icons. **Missing:** maskable icon variant, screenshots (Android install prompt), shortcuts, categories, explicit scope/orientation.
2. **Icons/assets:** only `/api/pwa/icon-192` and `/api/pwa/icon-512` (Edge `ImageResponse`). **Missing:** apple-touch-icon (180), favicon set, maskable variant, splash screens. No `apps/web/public/` directory exists.
3. **Service worker:** none. Next 15.5.20 App Router — Serwist adds cleanly. `next.config.ts` only wraps `withSentryConfig` (plus `reactStrictMode` + `transpilePackages`); no conflicts.
4. **Offline surface:** React Query 5.x present (no SWR), no persistent cache. Client + server components fetch from `NEXT_PUBLIC_API_URL`. High-value offline targets: event listings, venue details, profile, notifications list.
5. **Install prompt / iOS meta:** zero `beforeinstallprompt` handling, zero "Add to Home Screen" UI, zero apple-mobile-web-app-* meta in `layout.tsx`. iOS gets no PWA affordance today.
6. **Web push:** nothing toward it (no SW, no push handler, no VAPID keys, no subscription table). Would hook into existing `notifications` table + API. iOS 16.4+ web push requires installed PWA + manifest + SW push handler + VAPID.
7. **CI/testing:** no Lighthouse/PWA check in `.github/workflows`; `apps/e2e` route-audit framework does not test install/manifest/SW.

**Work to close Path A:** (1) complete manifest + favicon/icon set, (2) Serwist + offline strategy, (3) iOS meta tags, (4) install prompt UI, (5) push infrastructure (subscription table + API + client handler + VAPID), (6) Lighthouse check in CI.

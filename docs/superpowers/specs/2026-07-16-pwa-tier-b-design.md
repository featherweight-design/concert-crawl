# PWA Tier B — Installable + Offline Browsing (Design Spec)

**Date:** 2026-07-16
**Status:** Design approved. Next step: implementation plan (`docs/superpowers/plans/`).
**Context doc:** `docs/superpowers/specs/2026-07-16-native-app-feasibility.md`
**Scope decision:** This is **Path A / Tier B** only — turn `apps/web` into a real, installable PWA with offline browsing of public data. Native (Capacitor) wrapper, app-store billing, and web push are explicitly out of scope here (push is a fast-follow; see Follow-on Work).

---

## Problem

`apps/web` (Next.js 15.5.20, App Router) ships a web app manifest but nothing else a PWA needs: no service worker, no offline support, no iOS install affordance, no complete icon set. Today it is a mobile-responsive website with a manifest file (~20% of a PWA). We want a genuinely installable, offline-capable PWA — the foundation that also de-risks a later Capacitor/native effort.

## Goals

- Installable on Android, iOS (16.4+), and desktop, with a complete icon/favicon set and correct iOS meta tags.
- Offline browsing of **public** data (events, venues) plus an app-shell + offline fallback for uncached navigations.
- A minimal, functional install affordance and offline indicator (visual polish deferred to design tickets).
- Automated verification that the app stays a valid, installable PWA (Lighthouse in CI + e2e).

## Non-Goals

- Caching authenticated / user-specific data offline (profile, watchlist, notifications). All authenticated API routes remain **network-only**.
- Web push notifications (fast-follow, Tier C — see Follow-on Work).
- Native app packaging (Capacitor) and any app-store billing changes.
- Designed/crafted install-prompt and offline-state UI (separate design tickets).

---

## Architecture

### 1. Service worker + build integration — Serwist

Use **Serwist** (`@serwist/next`), the maintained successor to Workbox/next-pwa with first-class Next 15 App Router support. `next-pwa` is effectively unmaintained and is not used.

- SW source: `apps/web/src/app/sw.ts` (Serwist's `defaultCache` + custom runtime strategies).
- Build wiring: wrap `next.config.ts` (currently Sentry + Turbo + strict mode only) with `withSerwist({ swSrc, swDest })`, output to `public/sw.js`. Create the `public/` directory (does not exist today).
- Registration: client-side registration on load (a small client component mounted in the root layout).
- Dev: Serwist disabled in development to avoid caching churn.

### 2. Manifest + icon/asset completion

Extend `apps/web/src/app/manifest.ts`:
- Add a **maskable** icon variant (`purpose: 'maskable'`), `screenshots` (Android install prompt), `shortcuts` (e.g. "Browse events", "Search"), `categories`, and explicit `scope` + `orientation`.

Extend the icon pipeline (`/api/pwa/icon-*` Edge routes):
- Emit a 180×180 apple-touch-icon and a maskable variant; add a favicon set (favicon.ico / svg).

Add to `apps/web/src/app/layout.tsx` (missing today — why iOS shows no affordance):
- `apple-touch-icon` link and `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style` / `apple-mobile-web-app-title` meta.

### 3. Offline caching strategy — public data only

Serwist runtime caching:

| Request class | Strategy | Notes |
|---|---|---|
| App shell / static build assets | Precache (cache-first, versioned) | Serwist injects the precache manifest at build |
| Navigation requests | Network-first → offline fallback page | Fallback served when offline + uncached |
| Public API GETs (events, venues) via `NEXT_PUBLIC_API_URL` | Stale-while-revalidate | Size cap + TTL; matched by URL path allowlist |
| **Authenticated API routes** | **Network-only (never cached)** | Enforced by explicit exclusion; no auth data on device |

Serwist is the **transport** cache; React Query (already integrated) remains the **in-memory UX** cache. No React Query persistence is added. The public/authenticated split is enforced by an explicit route allowlist in the SW config, defaulting to network-only for anything not on the public list.

### 4. Offline UX — functional now, polish deferred

- **Offline fallback page**: a static route (e.g. `app/~offline/page.tsx`) rendered for uncached navigations while offline.
- **Offline indicator**: a lightweight banner driven by an `useOnlineStatus` hook (`navigator.onLine` + `online`/`offline` events), copy in `definitions/copy.ts`.
- **Install affordance**: capture `beforeinstallprompt` (Android/desktop) → a simple install button; on iOS (no prompt API) show a static "Add to Home Screen" hint. Built from existing tokens/components.

These three surfaces are intentionally minimal. Their designed treatment is handled by the two design tickets (see Follow-on Work) and is NOT a blocker for this effort.

### 5. Testing + CI

- **Unit (Vitest)**: `useOnlineStatus` hook behavior; the public/authenticated route-classification helper used by the SW allowlist.
- **E2E (Playwright, `apps/e2e`)**: manifest is served and valid; SW registers; offline fallback renders when offline; a cached public route is reachable offline.
- **CI**: add a **Lighthouse** installability/PWA check (GitHub Action). Land it non-blocking first to establish a baseline, then flip to a required gate.

---

## Delivery plan (small epic, incremental PRs)

1. **PR1 — Manifest + icons + iOS meta.** Complete manifest, icon/favicon/apple-touch set, iOS meta tags. No service worker. Independently valuable and low-risk.
2. **PR2 — Serwist + app shell.** Serwist build integration, app-shell precache, offline fallback page, client registration.
3. **PR3 — Offline data + UX.** Public-data (events/venues) runtime caching, offline banner + `useOnlineStatus`, install affordance.
4. **PR4 — Verification.** Lighthouse CI check + Playwright e2e coverage.

Each PR ships independently and passes CI on its own.

---

## Follow-on Work (separate tickets, opened alongside this spec)

- **🎨 Design — install-prompt UI polish** (#969, Track 2, handoff-template framing): elevate the minimal install affordance into a crafted, on-brand experience across Android/desktop/iOS.
- **🎨 Design — offline-state UI polish** (#970): elevate the offline banner + fallback view.
- **⚙️ Feature — Tier C web-push stack** (#971, fast-follow, relates to #737): VAPID keys, `push_subscriptions` table, API send pipeline wired to the existing `notifications` table, SW push handler, permission UI. Depends on the service worker landing in this effort.

---

## Risks / gotchas

- **iOS PWA quirks**: iOS web push (later) requires an installed PWA; install is manual (no prompt) — the static "Add to Home Screen" hint mitigates.
- **Stale cache after deploy**: versioned precache + `skipWaiting`/`clientsClaim` tuned so users get fresh assets promptly; verify against the ISR landing page.
- **Auth data leakage**: the network-only default for non-allowlisted routes is the safeguard; the e2e suite should assert an authenticated route is not served from cache offline.
- **Serwist + Sentry/Turbo config interplay**: confirm `withSerwist` composes cleanly with the existing `next.config.ts` wrappers.

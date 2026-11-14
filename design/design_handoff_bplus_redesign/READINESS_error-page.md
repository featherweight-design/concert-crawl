# Readiness Review — B+ error page (addendum-2 §18 + base 12-error-page)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-13
**Related ticket(s):** B+ redesign B20a (#117); addendum-2 item 18; addendum-3 rows B20a, 17, 18, 19, 20
**Plan PR target:** TBD (`docs/superpowers/plans/`)

**Scope.** Only the error-page surface of `design_handoff_bplus_redesign`: addendum-2 §18 (README text, "Decided with Hugh" 6, boards `18-error-page/error-in-app-m` and `error-report-refused-m`), the base `12-error-page` prompt screens (`err-m-prompt`, `err-d-prompt`, `err-d-prompt-light`; there is no `boards/12-error-page/` folder, only screens), the base README's "Something went wrong" section (lines 119-130), and the rulings on it in `QUESTIONS-2026-11-12.md` and `addendum-3/README.md`. The rest of the B+ handoff is not audited here.

## Summary

Buildable as drawn. The phone boards, the README engineering rules and the addendum-3 rulings together settle every state the implementation needs: the in-app `(main)/error.tsx` that keeps the app header and bottom nav, the refused report ("Not sent." + LIMIT rail + Done, not saved, not retried), signed-in Tell us on the root error page, the error ID chip and the same-origin `/api/error-report` route. Nothing needs a Design round-trip. The plan PR has to record eight engineering decisions, three of which correct live behaviour that contradicts the handoff: the API's metadata schema would silently drop an `errorId` key, the proxy would 307 an unauthenticated POST to the new route into a fake "sent", and the client treats 429 as retryable where §18 rules it refused. New strings go through `copy-review` before the UI PR.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] §18 states how Design read the truncated question (refused report, global-error without Clerk, in-app error) and boundaries each case. "Only `global-error.tsx` is the bare page" is narrowed by addendum-3 row 19: routes outside `(main)` (`/me`, `/search`, admin) and errors thrown by the `(main)` layout itself stay bare.
- [✅] Non-goals are clear: no app header, nav or Tell us tab on the bare page; signed-out gets no card.
- [🟡] The addendum still says "whoever wrote the brief should check our reading of the truncated items (… 18 …)". QUESTIONS rows 17-20 were raised against that reading and answered in addendum-3, so the reading is treated as confirmed.

### 🎭 State coverage

- [✅] Card states drawn: prompt, form, sending, sent, failed (base, phone and desktop) and refused (addendum-2, phone). Signed-out drawn at both widths. Light drawn for prompt; every theme for prompt via `err-t-*`.
- [✅] Done on refused is ruled (addendum-3 row 17): closes the card and keeps the error ID chip.
- [✅] Status split ruled: 429 and any other 4xx rejection are refused (one message, Decided 6); 408 and 425 are temporary (addendum-3 row 18), so they take the saved/retry path with 5xx, network errors and timeouts; 401 switches to the signed-out layout.
- [🟡] **In-app error on desktop is not drawn** (only `error-in-app-m`). §18's text is width-agnostic ("the error, the Tell us card and the error ID are the same as the standalone page"; the app header replaces the logo bar), so desktop = the `err-d-prompt` split layout under the desktop `AppHeader`, with no bottom nav. Clarification 1.
- [🟡] **Refused on desktop is not drawn.** It is a body swap inside the drawn 440px desktop card, the same way `err-d-failed` swaps the failed body. Clarification 1.
- [🟡] In-app signed-out: `(main)` routes become public once launched (`isPublicOnceLaunched` in `proxy.ts`), so a signed-out visitor can hit the in-app boundary. The base signed-out pattern (no card, Try again + Go home + chip) applies. Clarification 2.
- [🟡] Signed-in on `global-error`: addendum-3 B20a confirms **Go home** (not Sign out). No board draws the body for that case: the drawn signed-in body says "or sign out and back in", which would point at a button that isn't there. Clarification 2.

### 🔌 Data contract

- [✅] `POST /v1/feedback` (`apps/api/src/routes/feedback.ts`) already takes `category: 'bug'`, `metadata.build`, `metadata.device`, `metadata.source: 'error'`, `metadata.doing`, `metadata.digest`, `metadata.sentryEventId` (ids shape-checked `^[\w-]{1,64}$`). It returns 401, 422, 429 (10/hour/user, with `Retry-After`) and 500. Every drawn state maps to a real status.
- [🟡] **The README says the route forwards `{ errorId, device, build }`, but the API has no `errorId` key**, and `metadata` is a non-strict `z.object`, so an `errorId` key would be **silently stripped**, not rejected. Either add `errorId` to the schema (expand-only, no migration: `metadata` is jsonb) or send the generated client ID under an existing key. Clarification 3.
- [🟡] **The new `/api/error-report` route is behind `auth.protect` today.** `proxy.ts` only lets `/api/webhooks`, `/api/pwa/*`, `/api/og*` and `/api/revalidate` through signed out; anything else under `/api` is 307'd to `/sign-in`. A `fetch` follows that redirect and gets a 200 HTML page, so a lost session would read as **sent** instead of switching to signed-out (the same class as the `/api/revalidate` 307 bug). Clarification 4.
- [🟡] **429 is treated as retryable in live code.** `ReportRejectedError.permanent` (`components/consumer/error-report/lib/send-report.ts`) excludes 401, 408 and 429 and includes 425. §18 + addendum-3 row 18 need: 429 → refused (permanent); 408 and 425 → temporary. `pending-report.ts`'s flush drops permanent failures, so the stored-report path follows once the class changes. Clarification 5.
- [🟡] The error ID for a client throw: live code shows the Sentry event id, and nothing when Sentry is off (local, no DSN). The README wants a generated id, tagged on the Sentry event, shown in the chip. Clarification 3.

### 🧱 Codebase fit

- [✅] Every colour on the boards exists: the LIMIT rail is `--warning` (in every theme in `theme/themes.ts`), the eyebrow `--danger`. No new token, font or component style (addendum-2 header promise holds).
- [✅] Reuses live pieces: `StandaloneError` (`components/standalone-error/`), `ErrorTellUsCard` / `ErrorReport` (`components/consumer/error-report/`), `AppHeader` and `BottomNav` from `(protected)/(main)/layout.tsx`, `useErrorBoundaryRetry`, `CONSUMER_COPY.error` / `.errorReport.card`.
- [🟡] **The card cannot render inside `global-error` as written:** `ErrorTellUsCard.send` calls Clerk `getToken()`, and `ErrorReport` gates on `useAuth().isSignedIn`. `global-error` has no ClerkProvider. The card's send has to move to the same-origin route (cookie session, no token) and its signed-in gate to a prop the boundary supplies (`__client_uat` on the bare page, `useAuth` in route boundaries). Clarification 4.
- [🟡] `__client_uat` is `0` when signed out, not absent. "Missing or unreadable → signed out" must also treat `0` (and any non-positive or non-numeric value) as signed out. Clarification 2.
- [✅] Copy conventions: the new strings contain no em-dash and belong in `CONSUMER_COPY.errorReport.card`. The rail label reuses the live `failedEyebrow` ("Didn’t send · Beta channel"), which renders uppercase like the board.

### ♿ Cross-cutting

- [✅] README: the card is a `<form>`, chips a real radio group, sent and failed move focus to their heading. The live card already does this.
- [🟡] Refused isn't named in the focus rule. It replaces the form exactly as failed does, so focus moves to "Not sent."; after Done the card unmounts, so focus has to land on the error ID chip (or the Try again button), never on `<body>`. Clarification 6.
- [✅] Performance: `keepalive` body limit (64 KB) is far above the payload (message ≤ 2000 chars). The 8s timeout (`AbortSignal.timeout(8000)`) maps to the failed (saved) state.
- [🟡] Telemetry: the generated client id has to be set as a Sentry tag on the captured event (README), or the team can't match a report to its event. Server throws keep using `digest` (already reported by `onRequestError`). Clarification 3.

### ⏰ Drift from reality

- [✅] Paths and components it names exist: `app/global-error.tsx` (bare, no card, always the signed-out layout today), `(protected)/error.tsx` (standalone + card + Sign out), `StandaloneError`, `/v1/feedback`.
- [🟡] There is **no `(protected)/(main)/error.tsx`** yet, and `(main)/crews/[crewId]/error.tsx` renders the bare `StandaloneError` inside `(main)`. The drawn in-app board is a crew page (Crews tab active), so the crew boundary must switch to the in-app layout too. Errors from the `(main)` layout itself still reach the bare `(protected)/error.tsx` (row 19). Clarification 7.
- [🟡] There is **no `/api/error-report` route** (`app/api/` has `admin`, `og`, `pwa`, `revalidate`). The live card posts cross-origin to `${NEXT_PUBLIC_API_URL}/v1/feedback` with a bearer token. `api` is already in `KNOWN_TOP_LEVEL_SEGMENTS`, so the new route won't 404 at the middleware. Clarification 4.
- [🟡] `PendingErrorReportFlush` (mounted in `(protected)/layout.tsx`) resends with a Clerk token straight to `/v1/feedback`. Clarification 8.

### 📝 Decision log

- [✅] Locked: README rules win over boards; live copy wins over board wording unless the board was drawn to change it; Decided 6 (one refused message for rate limit and rejection) approved by Hugh 2026-11-12; addendum-3 confirmations B20a (Go home), 17 (Done), 18 (408/425 temporary), 19 (bare outside `(main)`), 20 (shared wording).
- [✅] New strings are marked **(new copy)** and flagged draft for `copy-review`.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Desktop in-app error and desktop refused.** In-app desktop = the `err-d-prompt` split (copy left, 440px card right, chip under the copy) inside the live desktop `AppHeader`, no bottom nav. Refused desktop = the refused body inside the 440px card, laid out like `err-d-failed`. Pattern: §18's "same as the standalone page" rule + the drawn desktop card states. If Hugh's "nothing undrawn gets built" rule is applied strictly, a one-board addendum for in-app desktop is the only ask, and it's cheap.
2. **Signed-in detection and the second action.** Bare page: signed in only when `__client_uat` parses to a positive number; otherwise (missing, `0`, unreadable) render the signed-out layout. Route boundaries use `useAuth().isSignedIn`. Second action: in-app and `(protected)` boundaries keep **Sign out** + the "sign out and back in" body (as drawn); signed-in `global-error` gets **Go home** (addendum-3 B20a) and the live `signedOutBody` ("…Try again in a moment.") so the body never names a missing button; the card still shows. A signed-out in-app visitor gets the base signed-out layout.
3. **Client error ID.** On a client throw with no `digest`, generate a short id that passes `^[\w-]{1,64}$`, set it as a Sentry tag on the captured event, show it in the chip whether or not Sentry is enabled, and send it to the API. Decide between adding `metadata.errorId` to `feedbackSchema` (and the admin feedback reader) or reusing `digest`; never send a key the schema doesn't declare, since it would be silently stripped. Keep `sentryEventId` when Sentry is on.
4. **`/api/error-report` route.** `POST`, same-origin, added to `isAlwaysPublic` in `proxy.ts` (exact path) so the handler, not the middleware, answers a lost session with **401 JSON**; the handler calls `auth()`, returns 401 when there is no user, else gets a token and forwards to `/v1/feedback` as `bug`, **passing the upstream status through** (401, 422, 429, 5xx) so the client can classify. Client: plain `fetch`, `keepalive: true`, 8s `AbortSignal.timeout`, `redirect: 'manual'` as a belt-and-braces guard (an opaque redirect counts as 401). The card stops importing Clerk so it can live in `global-error`.
5. **Status classes.** refused (not saved, not retried) = 429 and every 4xx except 401, 408 and 425; signed-out switch = 401; failed (saved, sent on next launch) = 408, 425, 5xx, network error, timeout. Update `ReportRejectedError.permanent` and its tests (`pending-report.test.ts`) to match.
6. **Focus.** Refused moves focus to its "Not sent." heading like sent and failed; Done closes the card and moves focus to the error ID chip's copy button.
7. **Boundaries.** Add `(protected)/(main)/error.tsx` rendering the in-app layout (inside `MainLayout`, so header and bottom nav stay) and switch `(main)/crews/[crewId]/error.tsx` to it. Leave `(protected)/error.tsx`, `/me`, `/search`, admin and `crew/join` bare (row 19). Only `global-error` carries its own `<html>`.
8. **Stored-report flush.** Keep `PendingErrorReportFlush` in the signed-in shell, but send through `/api/error-report` (or keep the token path) under the same status classes, so a stored report that comes back 429 is dropped, not retried forever.

## Decisions inherited

- `StandaloneError` imports React and a plain copy object only: no Clerk hooks, ThemeProvider, next/font, images or shared CSS. Inline styles, a theme-token `<style>` keyed by `data-theme`, a pre-paint script, inline SVG mark and logo.
- The error ID is `error.digest` for a server throw; a client throw gets a generated id tagged on its Sentry event. Device is coarse ("iPhone · Safari"), never the full user agent.
- Signed-out (or a 401 on send): no card, Try again, Go home and the error ID.
- Refused: not saved, not retried; rail "Didn’t send · Beta channel" with LIMIT in `--warning`; one Done button; the error ID chip stays (Decided 6: one message for rate limit and rejection).
- In-app: the route error renders inside the app layout (header and bottom nav stay); routes outside `(main)` and `(main)` layout errors stay bare.
- Signed-in `global-error`: Go home, not Sign out (addendum-3 B20a).
- Copy is a `copy-review` call, never a Design round-trip. Strings for `copy-review`:
  - "Not sent." (new)
  - "We couldn’t take this report, so it isn’t saved. If it keeps happening, the error ID below is all we need." (new)
  - "LIMIT" (new rail code)
  - "Done" (new key on the card; reuse a live "Done" if one exists)
  - `COPY.md` row `12-error-page` still marks the base page's strings (the chips, "Anything else? (optional)", "We’ll attach these", the failed body, "Send again", "Edit", the signed-out body, "Go home") as not yet reviewed, although they are live in `CONSUMER_COPY`. Confirm they passed `copy-review`; if not, include them in the same pass.

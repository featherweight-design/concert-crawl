# Phase 8a — Landing Page, Auth Gate & Onboarding

**Date:** 2026-05-08  
**Status:** Approved  
**Branch:** `feat/phase-8-auth-onboarding`

---

## Overview

Phase 8a is the public front door for Concert Crawl's private beta. It covers:

1. **Landing page** — public entry point with gig-poster hero, waitlist modal, and invite-code CTA
2. **Waitlist** — simple email capture (no confirmation email)
3. **Invite code gate** — BETA-XXXX-XXXX validation before Clerk sign-up
4. **Onboarding** — 5-step informational flow (no preference capture in beta)
5. **Code redemption** — marks invite code as used after Clerk sign-up completes

---

## User Flow

```
Landing (/)
  ├── "Join waitlist" → WaitlistModal → POST /v1/waitlist
  └── "I have a code →" → /auth/code
        └── valid code → HttpOnly cookie set → /onboarding
              └── step 5 CTA → /sign-up (Clerk)
                    └── post-sign-up server action → POST /v1/auth/redeem-code → /events
```

Returning authenticated users bypass all gates and go directly to `/events`.

---

## Architecture & Routing

Next.js App Router route groups:

```
apps/web/src/app/
  (public)/
    page.tsx                          # Landing page
    auth/
      code/
        page.tsx                      # Invite code entry

  (onboarding)/
    layout.tsx                        # Gate: no invite cookie → redirect /auth/code
    onboarding/
      page.tsx                        # 5-step onboarding

  (auth)/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx   # Gate: no invite cookie → redirect /auth/code

  (protected)/
    events/...                        # Existing app routes
```

### Middleware logic (order matters)

1. Clerk-authenticated user → pass through (no gate check)
2. Route is `(public)` → pass through
3. Route is `(onboarding)` or `/sign-up` → verify `invite_verified` cookie; redirect to `/auth/code` if absent/invalid
4. Route is `(protected)`, unauthenticated → redirect to `/sign-in`

---

## Landing Page

**File:** `(public)/page.tsx` — server component. Redirects authenticated users to `/events`.

**Layout (mobile-first, expands to desktop two-column):**

- `CCWordmark` + `BetaPill` — top of page
- `GigPosterStack` — animated stack of 3 overlapping `IdentityArt` cards (CSS rotation + offset)
- CTA row: "Join waitlist" (opens `WaitlistModal`) + "I have a code →" link to `/auth/code`

### New components

| Component | Location | Description |
|-----------|----------|-------------|
| `CCWordmark` | `components/brand/cc-wordmark/` | Wordmark SVG, uses `--fg` token |
| `BetaPill` | `components/brand/beta-pill/` | "BETA" badge, uses `--signal` token |
| `GigPosterStack` | `components/brand/gig-poster-stack/` | 3 `IdentityArt` cards, rotated/offset, subtle CSS animation |
| `WaitlistModal` | `components/waitlist/waitlist-modal/` | Email input, calls `POST /v1/waitlist`, success/already-on-list states |

---

## Waitlist

### DB schema

New table `waitlist_entries` (Drizzle migration):

```ts
waitlistEntries = pgTable("waitlist_entries", {
  id: uuid().primaryKey().defaultRandom(),
  email: varchar({ length: 255 }).notNull().unique(),
  ip: varchar({ length: 45 }),
  createdAt: timestamp().notNull().defaultNow(),
})
```

### API endpoint

`POST /v1/waitlist` — public, no auth required.

- Zod: `{ email: z.string().email() }`
- IP rate limit: 5 attempts/hour per IP
- Returns 200 on success or 409 if already registered — both show success UI (no enumeration)
- No email confirmation sent

---

## Invite Code Gate

### UI (`/auth/code`)

Client component. 9 states matching design: `empty`, `typing`, `invalid` (format), `submitting`, `valid`, `used`, `expired`, `notfound`, `ratelimit`.

Code format: `BETA-XXXX-XXXX` — 8 alphanumeric characters after `BETA-`. Client-side format validation before submission.

On success: redirect to `/onboarding`.

### API endpoint

`POST /v1/auth/validate-code` — public, no auth required.

- Zod: `{ code: z.string().regex(/^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/) }`
- IP rate limit: 10 attempts/hour
- Looks up code in `invite_codes` table
- Typed error responses: `used`, `expired`, `notfound`, `ratelimit`
- On success: sets `invite_verified` HttpOnly cookie (signed HMAC, 1-hour TTL), returns `{ ok: true }`

### Cookie spec

| Field | Value |
|-------|-------|
| Name | `invite_verified` |
| Value | HMAC-signed `{ code, iat }` payload |
| Flags | `HttpOnly`, `Secure`, `SameSite=Lax` |
| Max-age | 3600s (1 hour) |
| Signing key | `INVITE_COOKIE_SECRET` env var |

---

## Onboarding

**File:** `(onboarding)/onboarding/page.tsx` — client component. Protected by middleware (invite cookie required).

### Steps (hard-coded, no skipping)

| Index | Key | Component | Description |
|-------|-----|-----------|-------------|
| 0 | `welcome` | `FounderNote` | Personal note from the founder ⚠️ *see pre-launch checklist* |
| 1 | `how` | `HowItWorks` | Crawls Denver venues daily, always accurate |
| 2 | `today` | `WhatItDoesToday` | Search, filter, save shows |
| 3 | `notyet` | `WhatItDoesntYet` | Honest about beta limitations |
| 4 | `done` | `YoureIn` | Final CTA: "Continue to sign-up →" → `/sign-up` |

**No DB writes.** Pure informational UI.

### Navigation rules

- Back button disabled on step 0
- No skip button
- "Next →" advances; last step CTA redirects to `/sign-up`

### Progress indicator

`ProgressDots`: active dot = 28×8 pill (`--signal`), completed = `--signal-muted`, pending = `--surface-3`.

### Layout

- Mobile: full-viewport card
- Desktop: centered card 520–620px wide × 640px tall

---

## Code Redemption

After Clerk sign-up completes, a post-sign-up server action:

1. Reads the `invite_verified` cookie (extracts signed code)
2. Calls `POST /v1/auth/redeem-code` with `userId` from the new Clerk session
3. API sets `usedBy = userId`, `usedAt = now()` on the invite code row
4. Clears the `invite_verified` cookie
5. Redirects to `/events`

### API endpoint

`POST /v1/auth/redeem-code` — requires Clerk auth.

- Idempotent: if `usedBy` already equals this `userId`, returns 200 (handles double-submit / refresh)
- Returns 409 if code was already used by a *different* user

---

## New Environment Variables

| Variable | Apps | How to create |
|----------|------|---------------|
| `INVITE_COOKIE_SECRET` | `apps/web`, `apps/api` | `openssl rand -hex 32` — use the **same value** in both apps |

Add to `.env.example` in both apps with a placeholder description. Must be set in Render (staging + prod) before deployment.

---

## Pre-launch Checklist

- [ ] **Update FounderNote copy** — `FounderNote` component uses placeholder copy. Replace with Hugh's personal message before private beta opens.

---

## Out of Scope (Phase 8b+)

- Saving shows / user profile
- Email delivery for invite codes
- Waitlist admin UI
- `user_preferences` table

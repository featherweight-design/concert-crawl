# Venues Nav + Profile Redesign & OAuth Settings

**Date:** 2026-05-19
**Issues:** #401 (Venues nav + index), #404 (Venue profile redesign), #400 (OAuth provider in settings)
**Branches:** `feat/venues` (A: #401 + #404), `feat/settings-oauth` (B: #400)

---

## Branch A — Venues (#401 + #404)

### Overview

Two tightly coupled changes: a Venues index page + nav entry, and a redesign of the existing venue profile page to match the Phase 5b mocks. The profile redesign requires schema changes (three new nullable columns), updated API endpoints, a new admin LLM-generation endpoint, and admin form additions. The index page and nav changes are lightweight additions that depend on the same data work.

### 1. Schema

New migration adds three nullable columns to `venues`:

| Column | Type | Notes |
|---|---|---|
| `capacity` | `integer` | Stored as a whole number (e.g. `9525`); displayed with comma formatting |
| `venue_type` | `text` | Free-form text, constrained by admin UI datalist; no DB-level enum |
| `about` | `text` | 1–3 sentence character description, LLM-generated or manually written |

Seed file (`packages/db/seed.ts`) gets capacity/type/about populated for all 5 local dev venues. Staging venues are populated post-deploy via the Generate button in the admin edit form.

### 2. API

**Updated public endpoints** (`apps/api/src/routes/venues-public.ts`):
- `GET /v1/venues/` — add `capacity`, `venueType`, `about` to the select projection
- `GET /v1/venues/:slug` — same additions to both the venue object and the response

**New admin endpoint** (`apps/api/src/routes/admin/venues.ts`):
- `POST /v1/admin/venues/:id/generate-about`
- Auth: admin only (existing `requireRole('admin')` middleware)
- Reads venue's `name`, `address`, `venueType` from DB
- Calls Claude Haiku with a structured prompt; requests JSON response with shape `{ capacity: number | null, venueType: string, about: string }`
- Returns that shape directly — does **not** persist to DB; admin reviews and saves from the form
- Error: if Haiku call fails, return 503 with a clear error message

**Shared types** (`packages/types`): extend `VenueListItem` and `VenueWithEvents` to include `capacity: number | null`, `venueType: string | null`, `about: string | null`.

### 3. Venue Profile Page Redesign

**File:** `apps/web/src/app/(protected)/venues/[slug]/page.tsx` and supporting components.

Layout order (top to bottom):
1. Hero (320px identity art + back button + gradient scrim) — unchanged
2. Content area (overlaps hero by 20px):
   - **Type chip** — `ChipRow` with `[venue.venueType]`; only rendered if `venueType` is set
   - **Venue name** — `h1`, 900 weight, 26px, unchanged
   - **Neighborhood + Directions** — unchanged
   - **Stats row** — three `StatPill` columns between top/bottom border rules:
     - `Capacity` — formatted number with commas (e.g. `9,525`); shows `—` if null
     - `Upcoming` — event count in `signal` color
     - `Type` — `venueType` value; shows `—` if null
     - Entire row only rendered if at least one of `capacity` or `venueType` is present
   - **About section** — mono `ABOUT` label + body paragraph; only rendered if `about` is set
   - **Map** — stays in current position (above upcoming events); no change
   - **Upcoming events list** — unchanged

New components to extract (following existing patterns):
- `StatPill` — `apps/web/src/components/consumer/venue-profile/StatPill.tsx`

### 4. Venues Index Page

**New file:** `apps/web/src/app/(protected)/venues/page.tsx`

- Server component; fetches from `GET /v1/venues/` (public endpoint, auth-gated by beta middleware)
- Renders an alphabetical list of active venues
- Each row: venue name (links to `/venues/:slug`), type chip if `venueType` is set, `city`
- Uses existing `AppHeader`, `SectionHeader`, and page chrome patterns
- Empty state if no venues returned

### 5. Navigation

**File:** `apps/web/src/components/consumer/app-header/AppHeader.tsx`

**Desktop** — add to `NAV_TABS`:
```ts
{ label: 'Venues', href: '/venues' }
```
Active state uses `pathname.startsWith('/venues')` — matches both index and profile pages.

**Mobile** — replace the search icon `<Link href="/search">` button with a `<Link href="/venues">` button using `<MapPin size={16} />` from lucide-react (matches the `<Search size={16} />` weight used in the current button). The profile/me button is kept. Search remains accessible from the Browse screen's palette.

### 6. Admin Venue Form

**Files:** `apps/web/src/app/(protected)/admin/venues/new/page.tsx` and `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx`

Three new fields added to both create and edit forms:

**Capacity** — number input, optional, placeholder `e.g. 9525`

**Venue Type** — text input with `<datalist>` of 8 curated suggestions:
- Amphitheater
- Outdoor Pavilion
- Concert Hall
- Auditorium
- Theater
- Music Hall
- Ballroom
- Bar

**About** — textarea (4 rows), optional, with a **"Generate ↗"** button alongside the label. On click:
1. Calls `POST /v1/admin/venues/:id/generate-about`
2. Button shows loading state ("Generating…")
3. On success: populates the `capacity`, `venueType`, and `about` fields in the form (admin can edit before saving)
4. On error: shows inline error message below the textarea

The Generate button is only available on the **edit** form (venue must exist in DB to have an ID). On the create form, the three fields are present but Generate is not shown — admin fills them manually at creation, or leaves them blank and generates after initial save.

---

## Branch B — OAuth Provider in Settings (#400)

### Overview

`AccountManagementRow` currently shows email and (conditionally) password. For OAuth users, no information about their connected provider is shown. This adds a row per connected account and a Clerk attribution footnote.

### Component Changes

**File:** `apps/web/src/components/settings/AccountManagementRow.tsx`

Using `user.externalAccounts` from the existing `useUser()` call.

For each external account, render a row (same layout as email/password rows):
- **Icon:** generic link/chain icon (15×15, matching existing row icon weight)
- **Label:** `"Connected Account"`
- **Value:** provider display name — derived by stripping any `oauth_` prefix, replacing underscores with spaces, then title-casing each word: `externalAccount.provider.replace(/^oauth_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())` (e.g. `"oauth_google"` → `"Google"`, `"oauth_github"` → `"Github"`)

Row order: email → connected account(s) → password (if `passwordEnabled`).

If `user.externalAccounts` is empty or undefined, nothing new renders.

**Clerk attribution footnote** — rendered below the card, not inside it:
```
Sign-in credentials and connected accounts are managed by Clerk. Privacy Policy →
```
- "Privacy Policy →" links to `https://clerk.com/legal/privacy` (`target="_blank" rel="noopener noreferrer"`) — verify exact URL during implementation
- Same mono/uppercase style as other section footnotes

### No DB / API changes

All data comes from Clerk's `useUser()` hook. Nothing is stored or read from our DB.

---

## PII Posture

For reference: Concert Crawl stores only `handle`, `city`, `avatarColor`, and `theme` per user in our DB. Email is read from Clerk's JWT at request time and never written to our database. Passwords, OAuth tokens, and external account credentials are managed entirely by Clerk.

The one exception is `waitlist_entries`, which stores `email` and `ip` for pre-signup waitlist signups — not surfaced in settings.

# Feature Flags — Design

**Date:** 2026-09-06
**Issue:** #346 (needs rewriting — see §10)
**Status:** Approved, ready for implementation planning

---

## 1. Problem

Some finished features should not be visible at launch. Spotify sync works but is capped
at five users by Spotify's dev-mode quota, so shipping it to the public promises something
we cannot deliver. That cap is five authenticated users, not the 25 recorded in
`docs/superpowers/specs/2026-07-18-spotify-sync-eng-spec.md` §63: Spotify's 2026-07-23 quota
update made 25 the per-developer-account _Client ID_ limit, a different quantity, and the
2025-05-15 criteria change put Extended Quota Mode out of reach entirely (organizations with
250k monthly active users only). Crews is complete and is a good
post-launch release rather than a launch-day one. Today the only way to hide either is to
revert code or to leave a branch unmerged, which means the launch decision is a deploy
rather than a switch.

We want a release gate: a switch in the Admin UI that hides a finished feature from
customers and locks its API, flipped without a deploy.

## 2. What this is not

**Not a kill switch, and not per-user.** An early draft included per-user overrides so a
feature could be previewed on one account before release. That was cut: staging already
covers the preview need, and per-user resolution would put a user-scoped read on the hot
path of every entitlement check.

**Not an experimentation platform.** No percentage rollouts, no cohorts, no targeting. A
flag is on or off for everybody.

**Not a graceful-degradation system.** Turning a flag off hides the feature; it does not
migrate, archive, or reconcile the data behind it. This is safe because the data in the
features being flagged is negligible — about five Spotify connections and a handful of
crews, most of them the founder's. Flipping a flag back on restores the feature with its
data intact, because nothing was deleted.

## 3. Core rules

Three rules carry most of the design. Everything below follows from them.

**A flag can only restrict, never grant.** Resolution is
`flagOff ? 'hidden' : ENTITLEMENTS_MATRIX[feature][plan]`, applied _after_ the entitlement
lookup and overriding every plan including `founder` and `gifted`. There is no way for a
flag to hand someone a paid feature by accident, and no new `EntitlementCell` value is
needed — `hidden` already exists and already renders (`alerts` and `price-drop-alerts`
resolve to it for every plan below premium today, so every consuming surface has drawn
this state since it shipped).

**A flagged-off API route returns 404, not 403.** `403 entitlement_required` is the
paywall signal: the web client reads it and routes the user to an upgrade prompt. Serving
it for a feature that does not exist yet would offer to sell something unbuyable. A
flagged-off route must be indistinguishable from a route that was never mounted.

**The registry is code; the table holds state.** Which flags exist is a TypeScript
constant. The `feature_flags` table holds a row for every key an admin has ever toggled,
and a key with no row takes its registry default. The table is therefore sparse in
practice but is not required to be: toggling a flag back to its default writes the row
rather than deleting it, because the row also carries who last changed it and when, and
deleting it would erase that. Adding or removing a flag is a code change and a reviewed
one, and a typo'd key cannot exist in the database at all.

## 4. The registry

`packages/entitlements/src/feature-flags.ts`:

```ts
export type FeatureFlagKey = 'spotify-sync' | 'crews' | 'release-notes'

export interface FeatureFlagDefinition {
  key: FeatureFlagKey
  /** Admin UI row title. */
  label: string
  /** Admin UI: what disappears for customers when this is off. */
  description: string
  /** The entitlement this flag restricts, where one exists. */
  entitlement: PremiumFeature | null
  /** Value used when the table has no row for this key. */
  defaultEnabled: boolean
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  'spotify-sync': {
    key: 'spotify-sync',
    label: 'Spotify sync',
    description:
      'Connecting Spotify, taste picks, and the weekly digest email.',
    entitlement: 'spotify-sync',
    defaultEnabled: false,
  },
  crews: {
    key: 'crews',
    label: 'Crews',
    description:
      'The Crews tab, crew pages, invites, and the Browse crew lens.',
    entitlement: 'crews',
    defaultEnabled: false,
  },
  'release-notes': {
    key: 'release-notes',
    label: 'Release notes',
    description:
      'The changelog page, the version footer, and the feature-drop pill.',
    entitlement: null,
    defaultEnabled: true,
  },
}
```

`FeatureFlagKey` is its own namespace and is deliberately **not** an alias of
`PremiumFeature`. A flag may map onto an entitlement, and two of the three initial ones do,
but the system has to be able to gate a feature that has no entitlement key and a feature
that does not exist yet. `release-notes` carries `entitlement: null` and is in the initial
set precisely to prove that path on day one rather than discover it on the fourth flag.

### Initial flags

Keys, entitlements, and defaults are the registry above; the reasoning behind each is here.

| Key             | Rationale                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `spotify-sync`  | Capped at five users by Spotify dev-mode quota. Off for a long time.                           |
| `crews`         | Complete, and a better post-launch release than a launch-day one.                              |
| `release-notes` | The no-entitlement case, and the one flag that gates surfaces no entitlement has ever covered. |

`alerts` and `price-drop-alerts` were considered and left out: both already resolve to
`hidden` for every plan below premium, so a flag buys nothing today. `watching`,
`following`, `concert-history`, and `calendar-export` are the product; flagging them off
would gut it.

## 5. Storage

```sql
CREATE TABLE feature_flags (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text NOT NULL
);
```

No foreign key to anything, no enum on `key` — the registry is the constraint, and the API
rejects any key not in it before a write is attempted. `updated_by` is the Clerk user ID of
the admin who flipped it, shown in the Admin UI as the last editor.

`DEFAULT now()` fires on insert only, so the PATCH handler sets `updatedAt` explicitly in
both branches of its upsert. No trigger: one writer touches this table, and a trigger would
hide the rule from the file that implements it.

The migration creates the table empty. The two launch flags reach their off state through
`defaultEnabled: false` in the registry, not through seeded rows, so the shipped state is
visible in a diff rather than in a database someone has to query.

### Reading

`loadFeatureFlags()` in `apps/api/src/lib/feature-flags.ts` returns
`Record<FeatureFlagKey, boolean>`, merging the registry defaults with whatever rows exist.
It memoizes for **30 seconds**. A release gate does not need to be instant, the table is at
most a handful of rows, and without the memo a route guard would put a query on nearly
every request. An admin write clears the memo in its own process; other instances pick the
change up within the TTL. The Admin UI says so in as many words, so nobody flips a switch
and concludes it is broken four seconds later.

## 6. Enforcement

The inventory of surfaces (§9) makes the shape clear: **the entitlement seams are
necessary but nowhere near sufficient.** Only 7 API routes mount `requireFeature`, and
only 14 web call sites use `useEntitlement`. Spotify's connect, sync, disconnect, and
settings surfaces are entirely ungated, and Crews gates only creation by design. So there
are three mechanisms, not one.

### 6.1 Web — entitlement seam

`useEntitlement(feature)` (`apps/web/src/lib/queries/use-entitlement.ts:31`) gains a flag
check. It does a reverse lookup of the feature in the registry; if a flag maps to it and that flag
is off, it returns `{ active: false, surface: 'hidden' }` regardless of plan. All 14 call
sites inherit it with no change of their own.

The reverse lookup is only well defined because **at most one flag may name a given
`PremiumFeature`**. That is a registry invariant, not a convention: a unit test over
`FEATURE_FLAGS` asserts the non-null `entitlement` values are unique, so a second flag
claiming an already-claimed entitlement fails CI rather than making the lookup
order-dependent. Two flags that genuinely need to gate one entitlement is a signal the
entitlement should be split, not a case to resolve at runtime.

Flags reach the client through a new `useFeatureFlags()` query. It cannot ride on
`usePlanState`, which is `enabled: !!isSignedIn` (`use-plan-state.ts:34`) and therefore
never runs logged-out — and a logged-out visitor must not see a flagged-off feature either.

While flags are loading, `surface` stays `null`, matching the hook's existing no-flash
rule: a locked treatment must never flicker before the real state arrives.

### 6.2 API — `requireFlag` middleware

A new `requireFlag(key)` middleware in `apps/api/src/middleware/feature-flag.ts`, returning
**404** with the standard not-found body when the flag is off.

Where a route has both, `requireFlag` mounts **before** `requireFeature`, so a flagged-off
feature 404s instead of 403ing. This ordering is the whole point of the 404 rule and gets
its own test.

Unlike the web seam, this is mounted per-router rather than inherited, because the routers
that need gating are mostly ungated today:

| Router            | Mount        | Why                                                                      |
| ----------------- | ------------ | ------------------------------------------------------------------------ |
| `crews.ts`        | whole router | Only `POST /v1/crews` is gated today; the other fifteen routes are open. |
| `crew-invites.ts` | whole router | Entirely ungated.                                                        |
| `spotify.ts`      | whole router | Only `taste-picks` is gated; the other seven routes are open.            |

Gating whole routers is right here because the flag hides the _feature_, not a tier of it.
That is a different question from the entitlement, which deliberately gates only part of
each (crew creation; Spotify's premium read surfaces).

### 6.3 Web — route gating

`hidden` covers elements. It says nothing about someone opening a URL directly, and both
Crews and release notes have their own routes. Server components read the flags server-side
and call `notFound()`:

| Route                | Flag            |
| -------------------- | --------------- |
| `/crews`             | `crews`         |
| `/crews/[crewId]`    | `crews`         |
| `/crew/join/[token]` | `crews`         |
| `/changelog`         | `release-notes` |

`/crew/join/[token]` is the one that deserved a decision rather than a default: it is a
public invite link, so someone may well hold a working URL when the flag goes off. It 404s.
A link that leads to a page insisting the feature does not exist is worse than a link that
is simply dead, and there is no honest third option that does not amount to building an
apology screen for a feature we chose to hide.

Alongside the routes, the surfaces that render without any entitlement check need explicit
gates: Settings ▸ Connections (`ConnectionsPanel.tsx`, which calls no entitlement hook at
all today), the Spotify OAuth handoff sheet, the crews nav entry, the crew lens on Browse,
the crew presence block on event detail (`CrewGoingZone`), and both release-notes entry
points (`UserMenuVersionFooter`, `FeatureDropPillGate`).

The two crew surfaces embedded in other pages are worth naming because they fail
differently. Browse already tolerates a crews fetch that throws and renders no lens, so it
would degrade correctly by accident — but "correct by accident" is a guarantee that lasts
until someone changes the error handling, so it gets an explicit gate. `CrewGoingZone`
renders inside the Going block on every event detail page and has no such fallback.

### 6.4 Background work

A flag being off must also stop work the user cannot see. The weekly Spotify digest sends
email; with `spotify-sync` off it must not send. `spotify-weekly` checks the flag and exits
early, logging that it did.

This is the case most likely to be missed, because nothing on screen reveals it — the first
symptom would be a customer receiving mail about a feature the product denies having.

## 7. Admin UI

`/admin/feature-flags`, mirroring `founder-window` (the closest existing precedent: an
admin surface whose only job is flipping a switch that changes what customers see, with a
confirmation step and an audit trail).

The page renders **one row per registry entry** — label, description, current state,
toggle, and last editor. There is no "create flag" button and no free-text key field. A
flag exists because it is in the registry; the Admin UI can only change the state of one
that already does.

Flipping a flag opens a confirmation modal naming what will disappear, in the shape of
`FounderLaunchConfirm`. Unlike the founder window, the action is reversible, so the confirm
is a speed bump rather than a warning and does not use the danger treatment.

**API:**

| Route                                | Behavior                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GET /v1/admin/feature-flags`        | Registry joined with overrides: key, label, description, enabled, updatedAt, updatedBy                   |
| `PATCH /v1/admin/feature-flags/:key` | Zod-validated `{ enabled: boolean }`; 404 on a key not in the registry; upserts the row; clears the memo |

Both sit under the existing admin router, so they inherit `clerkAuth` + `requireRole('admin')`
and the audit middleware. The write sets `auditAction: 'feature_flag.toggle'`,
`auditTargetId: 'feature_flag:<key>'`, and `auditMeta: { enabled }`.

`GET /v1/flags` — the public one the web client reads — is separate, unauthenticated, and
returns only the key/enabled map. It carries a short `Cache-Control` matching the memo TTL.
It deliberately does not expose labels or descriptions: those are admin copy, and a public
endpoint listing "Crews — group planning, hidden until post-launch" would announce the
roadmap.

The keys themselves are not a secret and are not treated as one. `packages/entitlements` is
imported by the web app, so `FEATURE_FLAGS` ships in the client bundle whatever the endpoint
returns; narrowing the response to overrides only would move the key list from the network
tab to the JavaScript and hide nothing. What the endpoint must not leak is the prose, which
is where the intent lives, so that is what it withholds.

## 8. Testing

- **Resolution unit tests** — flag off forces `hidden` for every plan including `founder`
  and `gifted`; flag on leaves the matrix untouched; a feature with no flag is unaffected.
- **Ordering integration test** — a route with both guards returns 404, not 403, when the
  flag is off. This is the rule most likely to regress silently, since both are "denied".
- **Router coverage** — every route on a flagged router 404s with the flag off, asserted
  per route rather than per router, so a route added later without a guard fails the suite.
- **Logged-out** — a flagged-off feature is hidden for a signed-out visitor, which is the
  case `usePlanState` structurally cannot cover.
- **Digest suppression** — the weekly job sends nothing with `spotify-sync` off.
- **Admin** — a key outside the registry 404s; a toggle writes an audit row.

## 9. Surface inventory

Gathered by reading the code, and the reason §6 has three mechanisms rather than one.

**Web entitlement call sites (14):** `OnboardingShell` (following), `CreateCrewButton`
(crews), `EventDetailCtaBlock` / `HistoryContent` / `PassportContent` (concert-history),
`SaveCalendarRow` (calendar-export), `TasteFilterChip` / `DiscoveryShelf` (spotify-sync),
`FollowFilterChip` / `SearchResultsState` / `FollowShelf` / `MyShowsArtistsContent` /
`FollowNudgeCard` / `BillFollowBlock` (following).

**API `requireFeature` mounts (7):** `POST /v1/crews`, `GET /v1/spotify/taste-picks`,
`GET /v1/history/export.ics`, `GET /v1/history`, `POST /v1/attending/*`,
`POST /v1/artists/:slug/follow`, `POST /v1/me/artist-follows/bulk`.

**Ungated Spotify surfaces:** `ConnectionsPanel.tsx` (no entitlement hook), the OAuth
handoff sheet, and seven of eight `/v1/spotify` routes.

**Ungated Crews surfaces:** fifteen of sixteen `crews.ts` routes, all of
`crew-invites.ts`, three web routes, the bottom-nav tab, the Browse crew lens, and
`CrewGoingZone` on event detail.

**Release notes:** `/changelog`, `UserMenuVersionFooter`, `FeatureDropPillGate`. No
entitlement key anywhere.

## 10. Issue #346

The existing issue proposes migrating `REQUIRE_BETA_AUTH` into a flag system. That
motivation is dead — #1240 retired `REQUIRE_BETA_AUTH`. The issue needs rewriting against
this design before it tracks the epic; the title survives, the body does not.

## 11. Out of scope

Per-user overrides, percentage rollouts, scheduled flips, a flag-change history beyond the
audit log, and any flag whose "off" state needs a customer-facing explanation. If a hidden
feature ever needs to explain itself, that is a design ticket, not a flag.

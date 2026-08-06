# Gate 1 — State reachability: #1226 Concert Crews

Run at the API→UI seam after PR-1/2/3 (API + invites) merged, before PR-4's UI build.

Legend: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced · 🚫 unreachable at runtime.

Each state is checked three ways: (1) is the triggering field in the response **type**,
(2) does the **route** compute it rather than stub it, (3) is the condition reachable at
**runtime** given how the consuming component is mounted and seeded.

## `CrewSummary` — `/crews` list (PR-4)

| State | Trigger | Verdict |
| --- | --- | --- |
| Crew of one | `memberCount === 1` | ✅ |
| At capacity | `memberCount >= CREW_MEMBER_CAP` (12) | ✅ |
| No upcoming nights | `upcomingCount === 0` | ✅ |
| Muted crew | `muted` | ✅ |
| Nullable handle | `handle === null` | ✅ |
| Entitlement gate on create | `useEntitlement('crews')` | ✅ — see note 1 |

## Crew home — roster + nights (PR-5)

| State | Trigger | Verdict |
| --- | --- | --- |
| Empty `upcoming` | `upcoming.length === 0` | ✅ |
| Empty `nights` | `nights.length === 0` | ✅ |
| Keeper badge | `isKeeper` | ✅ |
| Self row | `isYou` | ✅ |
| Handoff required on leave | 409 `CREW_HANDOFF_REQUIRED_CODE` | ✅ |
| Last member leaves | 409 `CREW_LAST_MEMBER_CODE` | ✅ |

## Invites (PR-3, shipped)

| State | Trigger | Verdict |
| --- | --- | --- |
| Live link | `GET /v1/crew-invites/:token` 200 → `PublicCrewInvite` | ✅ |
| At capacity, not dead | `isFull: true` on a 200 | ✅ |
| Expired link | 404 `reason: 'expired'` | ✅ |
| Retired link | 404 `reason: 'revoked'` | ✅ |
| Unknown token | 404 `reason: 'unknown'` | ✅ |
| Expiry countdown | `expiresAt`, `CREW_INVITE_TTL_MS` = 7d | ✅ |
| Creator sheet: no live link | `GET .../invites/current` → `null` | ✅ |
| Creator sheet: "Link retired" | `revoked` prop | ⚠️ — see note 2 |

## Notes

1. **Entitlement gating is a client hook, not a payload field.** `crews-destination.jsx:452`
   draws a gated star on the create button, and `CrewSummary` carries no entitlement field —
   correctly. The established pattern is `useEntitlement(feature)`
   (`apps/web/src/lib/queries/use-entitlement.ts`), which resolves plan state from
   `/v1/users/me` and returns `{ active, surface }`. `'crews'` is a registered
   `PremiumFeature` (`packages/entitlements/src/index.ts:18,31,120`) with Supporter
   visible-active per the 2026-08-05 decision. Server enforcement stays in
   `requireFeature('crews')` on `POST /v1/crews` (`crews.ts:169`). Not a gap.

2. **Revoked is client-local, by design.** `GET /v1/crews/:crewId/invites/current` returns
   "the live invite or `null`" (plan Task 1), so `CrewInvite` has no `revokedAt` and the
   `revoked` prop can never come from that fetch. It doesn't need to: the only way a member
   sees "Link retired" is immediately after they themselves called
   `POST /v1/crews/:crewId/invites/:id/revoke`, so the state is owned by the mutation result
   in the sheet, not by a refetch. On remount the link is simply absent, which is the
   no-live-link state above. **PR-5 must drive `revoked` from the revoke mutation and must
   not add a `revokedAt` field to the current-invite response** — surfacing revoked invites
   there would contradict the at-most-one-live-link invariant the mint transaction enforces.

## Verdict

No ❌ and no 🚫. The single ⚠️ is a PR-5 implementation constraint, recorded above rather
than a route defect. **PR-4's build is cleared to start.**

// Concert Crews (#1226) response contracts. Shared by the `/v1/crews` router
// (PR-2), the invite router (PR-3), and every web surface from PR-4 onward, so
// there is one definition of what a crew looks like on the wire.

import type { AvatarColor } from './index.js'

/**
 * Locked at 12 (handoff README §2 item 1). It lives with the wire contract
 * rather than in the API because the crew home states the cap out loud
 * ("3 of 12 spots left"), and a second copy of the number on the client is how
 * a repriced cap ships half-applied.
 */
export const CREW_MEMBER_CAP = 12

/**
 * Machine-readable 409 codes on `POST /v1/crews/:crewId/leave`. The client maps
 * these straight onto a confirm kind instead of re-deriving keeper-ness, so the
 * two sides can never disagree about whether a handoff is required.
 */
export const CREW_HANDOFF_REQUIRED_CODE = 'crew_handoff_required'
export const CREW_LAST_MEMBER_CODE = 'crew_last_member'

/**
 * The 409 on `POST /v1/crew-invites/:token/join`. Shared for the same reason as
 * the pair above: the invite landing swaps itself to the at-capacity surface on
 * this code, so both sides read one spelling of it.
 */
export const CREW_FULL_CODE = 'crew_full'

/**
 * How long an invite link lives. Here rather than in the API because the dead-
 * link surface states the number out loud ("Invites expire after 7 days") with
 * no invite payload left to derive it from — the link is dead, so there is no
 * `expiresAt` to count off. A literal in that string would quietly start lying
 * the day the TTL moves.
 */
export const CREW_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const CREW_INVITE_TTL_DAYS = CREW_INVITE_TTL_MS / (24 * 60 * 60 * 1000)

/** A crew as stored. `keeperId` moves on handoff; it is not the creator. */
export interface Crew {
  id: string
  name: string
  keeperId: string
  /**
   * Seed input for the patch artwork alongside `id`. Moves only on an explicit
   * reroll — never on rename, never on a membership change.
   */
  patchSalt: number
  createdAt: string
  updatedAt: string
}

/**
 * The minimum a member cluster needs. `handle` is nullable all the way through
 * the stack: a member without one renders as a letterless dot and is never
 * given an invented name (the #762 contract).
 */
export interface CrewMemberPreview {
  userId: string
  handle: string | null
  avatarColor: AvatarColor | null
}

/** A roster row on the crew home. */
export interface CrewMember extends CrewMemberPreview {
  joinedAt: string
  isKeeper: boolean
  isYou: boolean
}

/**
 * One row in the crews list. `memberCount` is counted at read time — there is
 * no stored counter — and `muted` is the presence of a `crew_mutes` row.
 */
export interface CrewSummary {
  id: string
  name: string
  patchSalt: number
  memberCount: number
  /** Up to 5, for the avatar cluster. */
  members: CrewMemberPreview[]
  upcomingCount: number
  isKeeper: boolean
  muted: boolean
}

/**
 * The crew home payload. Membership is the authorization boundary, so this is
 * only ever served to a member — `upcoming` and `nights` carry attendance and
 * have no business leaving that boundary.
 */
export interface CrewDetail {
  id: string
  name: string
  patchSalt: number
  memberCount: number
  isKeeper: boolean
  muted: boolean
  members: CrewMember[]
  /** Dated today or later, ≥1 member going, ascending. */
  upcoming: CrewShow[]
  /** Dated before today, ≥2 members attended, descending. */
  nights: CrewShow[]
}

/**
 * The live invite, returned to members only. `token` is the capability, so it
 * belongs in a response body and nowhere else — never a log line, a Sentry
 * breadcrumb, or an error payload (D3).
 */
export interface CrewInvite {
  id: string
  crewId: string
  token: string
  createdBy: string
  expiresAt: string
  createdAt: string
}

/**
 * The invite-landing payload. Structurally incapable of carrying attendance:
 * there is no event field to populate, so leaking one is a compile error
 * rather than a review catch. Being at capacity is not a dead link — identity
 * stays visible and the CTA swaps, which is why `isFull` lives here.
 */
export interface PublicCrewInvite {
  crewId: string
  name: string
  patchSalt: number
  memberCount: number
  invitedByHandle: string | null
  isFull: boolean
}

// The no-attendance guarantee above is only as good as something that fails
// when the interface widens. This lives in the source file, not the test file:
// `tsconfig.json` excludes `**/*.test.ts` from typecheck and vitest transpiles
// without checking types, so a type-level assertion in a test is inert here.
// Emits no runtime code — the constraint is checked when the alias is declared.
type AssertTrue<T extends true> = T

type PublicCrewInviteKeys =
  'crewId' | 'name' | 'patchSalt' | 'memberCount' | 'invitedByHandle' | 'isFull'

// Bidirectional, so an added key and a removed key both fail. Catches optional
// additions, which a runtime `Object.keys()` pass cannot see.
export type PublicCrewInviteKeysAreExact = AssertTrue<
  [Exclude<keyof PublicCrewInvite, PublicCrewInviteKeys>] extends [never]
    ? [Exclude<PublicCrewInviteKeys, keyof PublicCrewInvite>] extends [never]
      ? true
      : false
    : false
>

/**
 * A show on a crew surface. Upcoming needs ≥1 member going; past needs ≥2 —
 * the tense rule that stops a crew home degrading into a merged feed of solo
 * nights. Row surfaces render `goingCount`; the names are event-detail-only.
 */
export interface CrewShow {
  eventId: string
  /** `YYYY-MM-DD`, straight from `events.date` — no timezone conversion. */
  iso: string
  showTime: string | null
  title: string
  venue: string
  venueSlug: string
  goingCount: number
  going: CrewMemberPreview[]
}

/**
 * Event detail's crew line. The only crew payload that names people, and it
 * excludes the viewer: your own Going state is stated by the button beside it,
 * so counting yourself here would read as one friend too many. Someone shared
 * through two crews appears once.
 */
export interface EventCrewGoing {
  count: number
  going: CrewMemberPreview[]
}

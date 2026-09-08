// apps/api/src/lib/crew-shows.ts
//
// Concert Crews (#1226) — crew shows are a query, never a table (plan D1).
// A crew's shows are derived by joining crew_members against the shipped
// user_events.attending_at, which already carries the partial index
// user_events_user_attending_idx. A crew is capped at 12 members, so the
// widest possible query is a 12-way `user_id IN (...)` against that index.

import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import {
  artists,
  crewMembers,
  db,
  events,
  userEvents,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import type { CrewMemberPreview, CrewShow } from '@concert-crawl/types'
import { portraitCanonicalName } from './event-billing.js'

const MT_TIME_ZONE = 'America/Denver'

/**
 * The tense rule (locked decision 2). Upcoming needs at least one member
 * going; a past night needs at least two. This is what stops a crew home
 * degrading into a merged feed of solo nights, so both numbers live here and
 * are read by every call site rather than inlined where they can drift.
 */
export const UPCOMING_MIN_GOING = 1
export const PAST_MIN_GOING = 2

export type CrewShowTense = 'upcoming' | 'past'

// Mountain Time, not UTC: a late-evening Denver user would otherwise watch
// tonight's show cross into the past hours early. Built per call rather than
// once at module scope, so importing this module runs no drizzle template.
const todayMt = () => sql`(NOW() AT TIME ZONE ${MT_TIME_ZONE})::date`

const minGoingFor = (tense: CrewShowTense): number =>
  tense === 'upcoming' ? UPCOMING_MIN_GOING : PAST_MIN_GOING

/**
 * Every attendance row belonging to `memberIds` on one side of today, with the
 * attendee's profile fields attached. `handle` and `avatarColor` stay nullable
 * the whole way through: a member without a handle is counted and rendered as
 * a letterless dot, never given an invented name (the #762 contract).
 */
const selectAttendanceRows = async (
  memberIds: string[],
  tense: CrewShowTense,
) =>
  db
    .select({
      eventId: events.id,
      iso: events.date,
      showTime: events.showTime,
      title: events.title,
      imageUrl: events.imageUrl,
      artistPhotoUrl: artists.photoUrl,
      venue: venues.name,
      venueSlug: venues.slug,
      userId: userEvents.userId,
      handle: userProfiles.handle,
      avatarColor: userProfiles.avatarColor,
    })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    // The row imagery chain every other surface uses. canonical_name is
    // uniquely indexed, so this cannot multiply attendance rows.
    .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
    .leftJoin(userProfiles, eq(userProfiles.userId, userEvents.userId))
    .where(
      and(
        inArray(userEvents.userId, memberIds),
        isNotNull(userEvents.attendingAt),
        tense === 'upcoming'
          ? sql`${events.date} >= ${todayMt()}`
          : sql`${events.date} < ${todayMt()}`,
        eq(events.hiddenFromConsumer, false),
        // A cancelled show is not a night anyone went to, and not one anyone
        // is going to. Postponed rows stay in: the surviving date is the one
        // that matters (#1212).
        ne(events.status, 'cancelled'),
      ),
    )
    .orderBy(
      tense === 'upcoming' ? asc(events.date) : desc(events.date),
      tense === 'upcoming' ? asc(events.showTime) : desc(events.showTime),
      // Two members attending the same show produce two rows that tie on both
      // date keys, and the `going` array grouped out of them would otherwise
      // reorder between requests.
      asc(events.id),
      asc(userEvents.userId),
    )

/**
 * Crew shows for one tense, ascending for upcoming and descending for past.
 * Grouping happens in memory because the row count is bounded by 12 members'
 * attendance and the alternative is a lateral aggregate that is harder to read
 * for no measurable gain at this scale.
 */
export const loadCrewShows = async (
  memberIds: string[],
  tense: CrewShowTense,
): Promise<CrewShow[]> => {
  if (memberIds.length === 0) return []

  const rows = await selectAttendanceRows(memberIds, tense)
  const minGoing = minGoingFor(tense)
  const byEvent = new Map<string, CrewShow>()

  for (const row of rows) {
    const going: CrewMemberPreview = {
      userId: row.userId,
      handle: row.handle ?? null,
      avatarColor: row.avatarColor ?? null,
    }
    const existing = byEvent.get(row.eventId)
    if (existing) {
      existing.going.push(going)
      existing.goingCount += 1
      continue
    }
    byEvent.set(row.eventId, {
      eventId: row.eventId,
      iso: row.iso,
      showTime: row.showTime ?? null,
      title: row.title,
      imageUrl: row.imageUrl,
      artistPhotoUrl: row.artistPhotoUrl,
      venue: row.venue,
      venueSlug: row.venueSlug,
      goingCount: 1,
      going: [going],
    })
  }

  return [...byEvent.values()].filter((show) => show.goingCount >= minGoing)
}

/**
 * Who, among the people you share a crew with, is going to one event. Event
 * detail's crew line — the only crew surface that names anyone (locked
 * decision 5).
 *
 * Two properties the query has to hold and the callers rely on:
 * - the viewer is never in the result, because "3 going" beside your own Going
 *   button reading as 2 friends plus you is a miscount to the person reading it
 * - a crew-mate shared through two crews appears once, not twice
 */
export const loadCrewGoingForEvent = async (
  userId: string,
  eventId: string,
): Promise<CrewMemberPreview[]> => {
  // The crews you're in, then everyone in them. Two hops rather than a self
  // join so the "not you" filter has one obvious home.
  const mine = db
    .select({ crewId: crewMembers.crewId })
    .from(crewMembers)
    .where(eq(crewMembers.userId, userId))

  const rows = await db
    .selectDistinct({
      userId: userEvents.userId,
      handle: userProfiles.handle,
      avatarColor: userProfiles.avatarColor,
    })
    .from(crewMembers)
    .innerJoin(userEvents, eq(userEvents.userId, crewMembers.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, crewMembers.userId))
    .where(
      and(
        inArray(crewMembers.crewId, mine),
        ne(crewMembers.userId, userId),
        eq(userEvents.eventId, eventId),
        isNotNull(userEvents.attendingAt),
      ),
    )
    .orderBy(asc(userProfiles.handle), asc(userEvents.userId))

  return rows.map((row) => ({
    userId: row.userId,
    handle: row.handle ?? null,
    avatarColor: row.avatarColor ?? null,
  }))
}

/**
 * Upcoming-show counts for a set of crews, keyed by crew id. Used by the crews
 * list, where loading every crew's full show list would be wasteful. The
 * upcoming threshold is 1, so a distinct-event count is the whole answer;
 * a past count would need the >= 2 having-clause instead.
 */
export const loadUpcomingCounts = async (
  crewIds: string[],
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>()
  if (crewIds.length === 0) return counts

  const rows = await db
    .select({
      crewId: crewMembers.crewId,
      total: sql<number>`count(distinct ${events.id})::int`,
    })
    .from(crewMembers)
    .innerJoin(userEvents, eq(userEvents.userId, crewMembers.userId))
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .where(
      and(
        inArray(crewMembers.crewId, crewIds),
        isNotNull(userEvents.attendingAt),
        sql`${events.date} >= ${todayMt()}`,
        eq(events.hiddenFromConsumer, false),
        ne(events.status, 'cancelled'),
      ),
    )
    .groupBy(crewMembers.crewId)

  for (const row of rows) counts.set(row.crewId, row.total)
  return counts
}

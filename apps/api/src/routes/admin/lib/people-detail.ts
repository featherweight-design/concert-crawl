// Readers behind the admin People list and person page (redesign 5a): where a
// person came in from, their counts, and their five newest reports, prices and
// feedback. Identity (email, sign-in methods, role) is Clerk's and is read by the
// route; everything here is our own database.

import { and, count, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import {
  artistReports,
  artists,
  db,
  eventReports,
  events,
  feedback,
  inviteCodeRedemptions,
  inviteCodes,
  priceSubmissions,
  subscriptions,
  userEvents,
  venues,
} from '@concert-crawl/db';
import type { PersonJoinSource, PersonRecent } from '@concert-crawl/types';
import { displayHeadliner } from '../../../lib/event-billing.js';

const MT_TIME_ZONE = 'America/Denver';
const RECENT_LIMIT = 5;
const FEEDBACK_EXCERPT = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The ids of the invite code a caller named by its code string or its id. */
export const resolveInviteCodeIds = async (
  codeOrId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ id: inviteCodes.id })
    .from(inviteCodes)
    .where(
      UUID.test(codeOrId)
        ? or(
            eq(inviteCodes.id, codeOrId),
            eq(inviteCodes.code, codeOrId.toUpperCase()),
          )
        : eq(inviteCodes.code, codeOrId.toUpperCase()),
    );
  return rows.map((row) => row.id);
};

interface Redemption {
  userId: string;
  codeId: string;
  code: string;
  label: string | null;
  maxUses: number;
}

const redemptionsOf = async (userIds: string[]): Promise<Redemption[]> => {
  if (userIds.length === 0) return [];
  return db
    .select({
      userId: inviteCodeRedemptions.userId,
      codeId: inviteCodes.id,
      code: inviteCodes.code,
      label: inviteCodes.label,
      maxUses: inviteCodes.maxUses,
    })
    .from(inviteCodeRedemptions)
    .innerJoin(inviteCodes, eq(inviteCodeRedemptions.codeId, inviteCodes.id))
    .where(inArray(inviteCodeRedemptions.userId, userIds))
    .orderBy(inviteCodeRedemptions.redeemedAt);
};

const foundersAmong = async (userIds: string[]): Promise<Set<string>> => {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.userId, userIds),
        or(eq(subscriptions.founder, true), eq(subscriptions.tier, 'founder')),
      ),
    );
  return new Set(rows.map((row) => row.userId));
};

const sourceFrom = (
  redemption: Redemption | undefined,
  isFounder: boolean,
  isTest: boolean,
): PersonJoinSource | null => {
  if (isTest) return { kind: 'test', code: null, label: null };
  if (redemption !== undefined) {
    return {
      kind: redemption.maxUses > 1 ? 'poster' : 'code',
      code: redemption.code,
      label: redemption.label,
    };
  }
  return isFounder ? { kind: 'founder', code: null, label: null } : null;
};

/** The join source of each person on a list page, by user id. */
export const loadJoinSources = async (
  userIds: string[],
  testAccounts: ReadonlySet<string>,
): Promise<Map<string, PersonJoinSource | null>> => {
  const [redemptions, founders] = await Promise.all([
    redemptionsOf(userIds),
    foundersAmong(userIds),
  ]);
  // The first redemption is the one they joined with.
  const first = new Map<string, Redemption>();
  for (const redemption of redemptions) {
    if (!first.has(redemption.userId)) first.set(redemption.userId, redemption);
  }
  return new Map(
    userIds.map((userId) => [
      userId,
      sourceFrom(
        first.get(userId),
        founders.has(userId),
        testAccounts.has(userId),
      ),
    ]),
  );
};

export interface PersonOurSide {
  joinSource: PersonJoinSource | null;
  codeRedeemerCount: number | null;
  founder: boolean;
  stats: {
    watching: number;
    concerts: number;
    submittedPrices: number;
    feedback: number;
  };
  recent: PersonRecent[];
}

const countOf = (rows: { value: number }[]): number => rows[0]?.value ?? 0;

/** Everything on the person page that our database knows. */
export const loadPersonOurSide = async (
  userId: string,
  isTest: boolean,
): Promise<PersonOurSide> => {
  const today = sql`((NOW() AT TIME ZONE ${MT_TIME_ZONE})::date)`;
  const [
    redemptions,
    founders,
    watching,
    concerts,
    prices,
    feedbackCount,
    priceRows,
    feedbackRows,
    artistReportRows,
    eventReportRows,
  ] = await Promise.all([
    redemptionsOf([userId]),
    foundersAmong([userId]),
    db
      .select({ value: count() })
      .from(userEvents)
      .where(
        and(eq(userEvents.userId, userId), eq(userEvents.status, 'watching')),
      ),
    // A past show they marked going: the same night-has-happened rule the
    // Concerts list uses (a cancelled show is not a concert).
    db
      .select({ value: count() })
      .from(userEvents)
      .innerJoin(events, eq(userEvents.eventId, events.id))
      .where(
        and(
          eq(userEvents.userId, userId),
          isNotNull(userEvents.attendingAt),
          sql`${events.date} < ${today}`,
          sql`${events.status} <> 'cancelled'`,
        ),
      ),
    db
      .select({ value: count() })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.userId, userId)),
    db
      .select({ value: count() })
      .from(feedback)
      .where(eq(feedback.userId, userId)),
    db
      .select({
        at: priceSubmissions.createdAt,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        artist: displayHeadliner(),
        venueName: venues.name,
      })
      .from(priceSubmissions)
      .innerJoin(events, eq(priceSubmissions.eventId, events.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(priceSubmissions.userId, userId))
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(RECENT_LIMIT),
    db
      .select({ at: feedback.createdAt, message: feedback.message })
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.createdAt))
      .limit(RECENT_LIMIT),
    db
      .select({
        at: artistReports.createdAt,
        reason: artistReports.reason,
        subject: artists.name,
      })
      .from(artistReports)
      .leftJoin(artists, eq(artistReports.artistId, artists.id))
      .where(eq(artistReports.reporterId, userId))
      .orderBy(desc(artistReports.createdAt))
      .limit(RECENT_LIMIT),
    db
      .select({
        at: eventReports.createdAt,
        reason: eventReports.status,
        subject: displayHeadliner(),
      })
      .from(eventReports)
      .innerJoin(events, eq(eventReports.eventId, events.id))
      .where(eq(eventReports.reporterId, userId))
      .orderBy(desc(eventReports.createdAt))
      .limit(RECENT_LIMIT),
  ]);

  const joined = redemptions[0];
  let codeRedeemerCount: number | null = null;
  if (joined !== undefined) {
    const [row] = await db
      .select({ value: count() })
      .from(inviteCodeRedemptions)
      .where(eq(inviteCodeRedemptions.codeId, joined.codeId));
    codeRedeemerCount = row?.value ?? 0;
  }

  const recent: PersonRecent[] = [
    ...priceRows.map((row): PersonRecent => ({
      kind: 'price',
      at: row.at.toISOString(),
      priceMin: row.priceMin,
      priceMax: row.priceMax,
      artist: row.artist,
      venueName: row.venueName,
    })),
    ...feedbackRows.map((row): PersonRecent => ({
      kind: 'feedback',
      at: row.at.toISOString(),
      message:
        row.message.length > FEEDBACK_EXCERPT
          ? `${row.message.slice(0, FEEDBACK_EXCERPT)}…`
          : row.message,
    })),
    ...artistReportRows.map((row): PersonRecent => ({
      kind: 'report',
      at: row.at.toISOString(),
      about: 'artist',
      reason: row.reason,
      subject: row.subject ?? '',
    })),
    ...eventReportRows.map((row): PersonRecent => ({
      kind: 'report',
      at: row.at.toISOString(),
      about: 'event',
      reason: row.reason,
      subject: row.subject,
    })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, RECENT_LIMIT);

  return {
    joinSource: sourceFrom(joined, founders.has(userId), isTest),
    codeRedeemerCount,
    founder: founders.has(userId),
    stats: {
      watching: countOf(watching),
      concerts: countOf(concerts),
      submittedPrices: countOf(prices),
      feedback: countOf(feedbackCount),
    },
    recent,
  };
};

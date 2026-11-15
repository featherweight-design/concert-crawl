import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  db,
  eventReportConfirms,
  eventReports,
  userProfiles,
  userRoles,
} from '@concert-crawl/db';
import { activeSoldOutWhere } from '../../../lib/sold-out.js';

const avatarColorSchema = z.enum(['signal', 'accent', 'success', 'warning']);

/**
 * Event edit's WHY IT'S SOLD OUT (B+ addendum 7 §6): the active promoted
 * sold-out report, the row that makes the show Sold out. Parsed before it
 * leaves the API, so a drift in the read fails here rather than in the page.
 */
export const soldOutRecordSchema = z.object({
  reporter: z.object({
    handle: z.string().nullable(),
    avatarColor: avatarColorSchema.nullable(),
    avatarSecondColor: avatarColorSchema.nullable(),
    /** An admin or staff role in `user_roles` is Admin; anyone else, Fan. */
    kind: z.enum(['fan', 'admin']),
  }),
  evidenceMethod: z.enum([
    'bought_myself',
    'saw_listing',
    'venue_site',
    'other',
  ]),
  evidenceUrl: z.string().nullable(),
  note: z.string().nullable(),
  /** ISO: when it was reported (an admin's mark: when it was marked). */
  reportedAt: z.string(),
  /** ISO: when it was promoted, which made the show Sold out. */
  madeLiveAt: z.string(),
  /** The raw confirm-row count, as `lib/promoted-report.ts` counts it. */
  confirmsCount: z.number().int().nonnegative(),
});

export type SoldOutRecord = z.infer<typeof soldOutRecordSchema>;

/** The `user_roles` roles that read as Admin on the record. */
const ADMIN_ROLES = ['admin', 'sub_admin'] as const;

/**
 * The record, or null when the show isn't sold out. With more than one live
 * promotion the latest wins, as `loadPromotedReportSummary` picks it: that is
 * the one that set the status the page shows.
 */
export async function loadSoldOutRecord(
  eventId: string,
): Promise<SoldOutRecord | null> {
  const [report] = await db
    .select({
      id: eventReports.id,
      reporterId: eventReports.reporterId,
      evidenceMethod: eventReports.evidenceMethod,
      evidenceUrl: eventReports.evidenceUrl,
      note: eventReports.note,
      createdAt: eventReports.createdAt,
      resolvedAt: eventReports.resolvedAt,
    })
    .from(eventReports)
    .where(activeSoldOutWhere(eventId))
    .orderBy(desc(eventReports.resolvedAt), desc(eventReports.createdAt))
    .limit(1);
  if (!report) return null;

  const [[confirms], [profile], [role]] = await Promise.all([
    db
      .select({ total: count() })
      .from(eventReportConfirms)
      .where(eq(eventReportConfirms.reportId, report.id)),
    db
      .select({
        handle: userProfiles.handle,
        avatarColor: userProfiles.avatarColor,
        avatarSecondColor: userProfiles.avatarSecondColor,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, report.reporterId))
      .limit(1),
    db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, report.reporterId),
          inArray(userRoles.role, [...ADMIN_ROLES]),
        ),
      )
      .limit(1),
  ]);

  return soldOutRecordSchema.parse({
    reporter: {
      handle: profile?.handle ?? null,
      avatarColor: profile?.avatarColor ?? null,
      avatarSecondColor: profile?.avatarSecondColor ?? null,
      kind: role === undefined ? 'fan' : 'admin',
    },
    evidenceMethod: report.evidenceMethod,
    evidenceUrl: report.evidenceUrl,
    note: report.note,
    reportedAt: report.createdAt.toISOString(),
    // The active-row filter requires resolved_at; the fallback only keeps the
    // type honest.
    madeLiveAt: (report.resolvedAt ?? report.createdAt).toISOString(),
    confirmsCount: confirms?.total ?? 0,
  });
}

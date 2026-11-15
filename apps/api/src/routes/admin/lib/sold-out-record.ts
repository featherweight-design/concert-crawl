import { count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  db,
  eventReportConfirms,
  eventReports,
  userProfiles,
} from '@concert-crawl/db';
import { apiLogger } from '../../../lib/logger.js';
import {
  activeSoldOutWhere,
  ADMIN_AUTHORED_SOLD_OUT_NOTE,
} from '../../../lib/sold-out.js';

const avatarColorSchema = z.enum(['signal', 'accent', 'success', 'warning']);

/**
 * Event edit's WHY IT'S SOLD OUT (B+ addendum 7 §6): the active promoted
 * sold-out report, the row that makes the show Sold out. Checked before it
 * leaves the API; a row that doesn't fit reads as no record, so the editor
 * still loads.
 */
export const soldOutRecordSchema = z.object({
  reporter: z.object({
    handle: z.string().nullable(),
    avatarColor: avatarColorSchema.nullable(),
    avatarSecondColor: avatarColorSchema.nullable(),
    /**
     * Admin when the report is an admin's mark (it carries the mark's
     * `admin_note`, ADMIN_AUTHORED_SOLD_OUT_NOTE); any other report is a
     * fan's that was promoted.
     */
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

/**
 * The record from what was read, or null (with a warning) when it doesn't fit
 * the schema: a drifted row costs the Status card its record, never the page.
 */
export function parseSoldOutRecord(
  candidate: unknown,
  eventId: string,
): SoldOutRecord | null {
  const parsed = soldOutRecordSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  apiLogger.warn(
    { eventId, issues: parsed.error.issues },
    'admin event: sold-out record did not fit its schema; sent as none',
  );
  return null;
}

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
      evidenceMethod: eventReports.evidenceMethod,
      evidenceUrl: eventReports.evidenceUrl,
      note: eventReports.note,
      adminNote: eventReports.adminNote,
      createdAt: eventReports.createdAt,
      resolvedAt: eventReports.resolvedAt,
      handle: userProfiles.handle,
      avatarColor: userProfiles.avatarColor,
      avatarSecondColor: userProfiles.avatarSecondColor,
    })
    .from(eventReports)
    .leftJoin(userProfiles, eq(userProfiles.userId, eventReports.reporterId))
    .where(activeSoldOutWhere(eventId))
    .orderBy(desc(eventReports.resolvedAt), desc(eventReports.createdAt))
    .limit(1);
  if (!report) return null;

  const [confirms] = await db
    .select({ total: count() })
    .from(eventReportConfirms)
    .where(eq(eventReportConfirms.reportId, report.id));

  return parseSoldOutRecord(
    {
      reporter: {
        handle: report.handle,
        avatarColor: report.avatarColor,
        avatarSecondColor: report.avatarSecondColor,
        kind:
          report.adminNote === ADMIN_AUTHORED_SOLD_OUT_NOTE ? 'admin' : 'fan',
      },
      evidenceMethod: report.evidenceMethod,
      evidenceUrl: report.evidenceUrl,
      note: report.note,
      reportedAt: report.createdAt.toISOString(),
      // The active-row filter requires resolved_at; the fallback only keeps
      // the type honest.
      madeLiveAt: (report.resolvedAt ?? report.createdAt).toISOString(),
      confirmsCount: confirms?.total ?? 0,
    },
    eventId,
  );
}

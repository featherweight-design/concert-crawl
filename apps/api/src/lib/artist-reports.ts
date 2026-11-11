import { and, eq } from 'drizzle-orm';
import { artistReports, notifications } from '@concert-crawl/db';
import type { db } from '@concert-crawl/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ClosingArtist {
  id: string;
  name: string;
  slug: string;
  hidden: boolean;
  matchStatus: string;
}

// What the reporter is told depends on what the fix did. The handoff's line
// only holds when the page now points at a Spotify match; a cleared match or a
// page taken down needs its own, or the notification states something false.
const fixedNotification = (
  artist: ClosingArtist,
): { title: string; body: string } => {
  if (artist.hidden) {
    return {
      title: `We removed ${artist.name}’s page.`,
      body: 'Thanks to your report, it’s no longer listed as an artist.',
    };
  }
  if (artist.matchStatus === 'matched') {
    return {
      title: `We fixed ${artist.name}’s page.`,
      body: 'Thanks to your report, the photo and music now belong to the right artist.',
    };
  }
  return {
    title: `We fixed ${artist.name}’s page.`,
    body: 'Thanks to your report, we took the wrong photo and music off it.',
  };
};

/**
 * Close every open report on an artist, inside the caller's transaction.
 *
 * `fixed` is an identity fix: the admin changed what the page is matched to, so
 * each reporter gets one `artist.report_fixed` notification. `dismissed` (a
 * dismiss, or "Looks right" on an auto-match) closes the reports silently.
 * Returns how many reports were closed.
 *
 * The notification rides the same transaction as the fix on purpose: a fix
 * that commits without telling the reporters, or the reverse, is the worse
 * failure. The `dedupeKey` names the report, so a replay inserts nothing.
 *
 * A row hidden by the fix (Not an artist) has no page left to open, so its
 * notification says the page was removed and carries no link.
 */
export async function closeOpenArtistReports(
  tx: Tx,
  input: {
    artist: ClosingArtist;
    outcome: 'fixed' | 'dismissed';
    resolvedBy: string;
  },
): Promise<number> {
  const { artist, outcome, resolvedBy } = input;

  const closed = await tx
    .update(artistReports)
    .set({ status: outcome, resolvedAt: new Date(), resolvedBy })
    .where(
      and(
        eq(artistReports.artistId, artist.id),
        eq(artistReports.status, 'open'),
      ),
    )
    .returning({ id: artistReports.id, reporterId: artistReports.reporterId });

  if (outcome === 'fixed' && closed.length > 0) {
    await tx
      .insert(notifications)
      .values(
        closed.map((report) => ({
          dedupeKey: `artist-report:${report.id}:fixed`,
          userId: report.reporterId,
          type: 'user_notification' as const,
          category: 'artist.report_fixed',
          ...fixedNotification(artist),
          actionUrl: artist.hidden ? null : `/artists/${artist.slug}`,
          metadata: JSON.stringify({
            artistId: artist.id,
            reportId: report.id,
          }),
        })),
      )
      .onConflictDoNothing({ target: notifications.dedupeKey });
  }

  return closed.length;
}

import { and, eq } from 'drizzle-orm';
import { artistReports, artists, db } from '@concert-crawl/db';
import { closeOpenArtistReports } from '../../../lib/artist-reports.js';

/**
 * The page is right as it is: close every open report on an artist as
 * `dismissed`, without notifying the reporters. Returns null when the artist
 * does not exist, otherwise the report ids it closed.
 */
export const dismissArtistReports = async (
  artistId: string,
  resolvedBy: string,
) =>
  db.transaction(async (tx) => {
    const [artist] = await tx
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        hidden: artists.hidden,
        matchStatus: artists.matchStatus,
      })
      .from(artists)
      .where(eq(artists.id, artistId));
    if (!artist) return null;
    // The ids it is about to close, so a Needs you undo can reopen them.
    const open = await tx
      .select({ id: artistReports.id })
      .from(artistReports)
      .where(
        and(
          eq(artistReports.artistId, artistId),
          eq(artistReports.status, 'open'),
        ),
      );
    const closed = await closeOpenArtistReports(tx, {
      artist,
      outcome: 'dismissed',
      resolvedBy,
    });
    return { slug: artist.slug, closed, closedIds: open.map((row) => row.id) };
  });

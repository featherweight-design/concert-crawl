'use client';

import { useEffect, useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import type { ArtistReport, ArtistsApi } from './artists-api';

const COPY = ADMIN_COPY.artists.reportList;

const DAY_MS = 24 * 60 * 60 * 1000;

const LINE = { fontSize: 12, color: 'var(--fg-muted)' } as const;

/**
 * A reported row's open reports: reason, age and the fan's suggested artist,
 * so Looks right never dismisses evidence nobody saw. Drawn as the board's
 * reason line, expanded, one line per report.
 */
export const ReportList = ({
  api,
  artistId,
  name,
}: {
  api: ArtistsApi;
  artistId: string;
  name: string;
}) => {
  const [reports, setReports] = useState<ArtistReport[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .reports(artistId)
      .then((next) => {
        if (live) setReports(next);
      })
      .catch((err: unknown) => {
        console.error('[admin artists] reports failed', artistId, err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [api, artistId]);

  if (failed) return <div style={LINE}>{COPY.failed}</div>;
  if (reports == null) return <div style={LINE}>{COPY.loading}</div>;
  const now = Date.now();
  return (
    <ul
      aria-label={COPY.label(name)}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {reports.map((report) => {
        const days = Math.floor((now - Date.parse(report.createdAt)) / DAY_MS);
        return (
          <li key={report.id} style={LINE}>
            {COPY.meta(COPY.reason[report.reason], COPY.age(days))}
            {report.suggestedSpotifyArtistId && (
              <>
                {COPY.separator}
                <SafeExternalLink
                  href={`https://open.spotify.com/artist/${encodeURIComponent(report.suggestedSpotifyArtistId)}`}
                  style={{ color: 'var(--signal)' }}
                >
                  {COPY.suggested}
                </SafeExternalLink>
              </>
            )}
            {report.note && (
              <span
                style={{ display: 'block', color: 'var(--fg)', marginTop: 2 }}
              >
                {report.note}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

'use client';

// The expanded body of a Reported row: what the page is matched to right now,
// each open report with its suggested Spotify artist, and the dismiss action.
// It performs no write itself: Use this artist and Dismiss call back into the
// page, whose handlers (like the row's picker and Not an artist) own every
// write, so each one reconciles the counts the same way.

import { useEffect, useState } from 'react';
import { AdminButton } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';

const COPY = ADMIN_COPY.artists;
const REPORT_COPY = COPY.reports;

type ReportReason = keyof typeof REPORT_COPY.reason;

interface ArtistReportRow {
  id: string;
  reason: ReportReason;
  note: string | null;
  suggestedSpotifyArtistId: string | null;
  createdAt: string;
  reporterHandle: string | null;
}

interface ReportsResponse {
  matched: {
    name: string;
    photoUrl: string | null;
    spotifyArtistId: string | null;
    genres: string[] | null;
    nextShow: { iso: string; venue: string } | null;
    followerCount: number;
  };
  reports: ArtistReportRow[];
}

interface ReportedPanelProps {
  artistId: string;
  apiBase: string;
  getToken: () => Promise<string | null>;
  /** Point the page at the artist a reporter suggested. */
  onUse: (spotifyArtistId: string) => void;
  /** Close every open report without changing the match. */
  onDismiss: () => void;
  dismissing: boolean;
}

const ageOf = (iso: string): string => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return REPORT_COPY.age(days);
};

export const ReportedPanel = ({
  artistId,
  apiBase,
  getToken,
  onUse,
  onDismiss,
  dismissing,
}: ReportedPanelProps) => {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('no token');
        const resp = await fetch(
          `${apiBase}/v1/admin/artists/${artistId}/reports`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) throw new Error(String(resp.status));
        const body: { data: ReportsResponse } = await resp.json();
        if (!cancelled) setData(body.data);
      } catch (err) {
        console.error('[admin artists] reports load failed', err);
        if (!cancelled) setFailed(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [artistId, apiBase, getToken]);

  if (failed) {
    return <p style={{ margin: 0, fontSize: 13 }}>{REPORT_COPY.loadError}</p>;
  }
  if (data === null) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-subtle)' }}>
        {REPORT_COPY.loading}
      </p>
    );
  }

  const { matched, reports } = data;
  const label = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.08em',
    color: 'var(--fg-subtle)',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {matched.photoUrl !== null && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-only Spotify thumbnail; next/image would need the host allow-listed for a 48px preview
          <img
            src={matched.photoUrl}
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 8, objectFit: 'cover' }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={label}>{REPORT_COPY.matchedNow}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{matched.name}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            {[
              matched.genres && matched.genres.length > 0
                ? matched.genres.join(', ')
                : null,
              matched.nextShow
                ? `${matched.nextShow.iso} · ${matched.nextShow.venue}`
                : REPORT_COPY.noNextShow,
              REPORT_COPY.followers(matched.followerCount),
            ]
              .filter((part) => part !== null)
              .join(' · ')}
          </span>
        </div>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {reports.map((report) => {
          const suggestedId = report.suggestedSpotifyArtistId;
          return (
            <li
              key={report.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13 }}>
                  {REPORT_COPY.reason[report.reason]}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                  {report.reporterHandle ? `@${report.reporterHandle}` : '—'} ·{' '}
                  {ageOf(report.createdAt)}
                </span>
                {report.note !== null && (
                  <span style={{ fontSize: 12 }}>{report.note}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={label}>{REPORT_COPY.suggested}</span>
                {suggestedId === null ? (
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                    {REPORT_COPY.noSuggestion}
                  </span>
                ) : (
                  <>
                    <SafeExternalLink
                      href={`https://open.spotify.com/artist/${suggestedId}`}
                    >
                      {suggestedId}
                    </SafeExternalLink>
                    <AdminButton
                      size="sm"
                      variant="outline"
                      onClick={() => onUse(suggestedId)}
                    >
                      {REPORT_COPY.useThisArtist}
                    </AdminButton>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <AdminButton
          size="sm"
          variant="outline"
          disabled={dismissing}
          onClick={onDismiss}
        >
          {REPORT_COPY.dismiss}
        </AdminButton>
        <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
          {REPORT_COPY.closesHint(reports.length)}
        </span>
      </div>
    </div>
  );
};

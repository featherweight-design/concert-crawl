'use client';

// The preview a tap on a MusicBrainz-only search row opens (addendum 13). One
// body for the phone sheet, the palette drill-in and the desktop card. It takes
// the search row and nothing else: no request, no photo, no shows, no summary,
// because the row has none of them.

import Link from 'next/link';
import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { FollowButton } from '@/components/consumer/artist-page/FollowButton';
import { FollowErrorMessage } from '@/components/consumer/artist-page/FollowErrorMessage';
import {
  followErrorIsFinal,
  type FollowError,
} from '@/components/consumer/artist-page/lib/use-artist-follow';
import { Panel } from '@/components/consumer/image-slot';
import { SLOT_RADIUS } from '@/components/consumer/image-slot/definitions/constants';

import { ARTIST_PREVIEW_COPY } from './definitions/copy';
import { identityLine, typeLabel } from './lib/identity';

const copy = ARTIST_PREVIEW_COPY;

const PLATE_SIZE = 84;

const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface ArtistPreviewProps {
  artist: ArtistSearchAllResult;
  following: boolean;
  /** Clerk's answer is "signed out": a Follow tap goes to sign-in. */
  signedOut: boolean;
  onToggle: () => void;
  /** The last refusal: it replaces the pitch line, and a final one greys Follow. */
  error?: FollowError | null;
  /**
   * Where Open their page goes, known only once a follow has returned the new
   * slug. Null before that: the link is not drawn.
   */
  pageHref: string | null;
  /** Fired when Open their page is taken (the palette closes itself). */
  onOpenPage?: () => void;
}

const AboutRow = ({
  label,
  value,
  first,
}: {
  label: string;
  value: string;
  first: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      gap: 12,
      padding: '8px 0',
      borderTop: first ? undefined : '1px solid var(--border)',
    }}
  >
    <span
      style={{
        width: 52,
        flex: 'none',
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: '0.16em',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        paddingTop: 2,
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
      {value}
    </span>
  </div>
);

export const ArtistPreview = ({
  artist,
  following,
  signedOut,
  onToggle,
  error = null,
  pageHref,
  onOpenPage,
}: ArtistPreviewProps) => {
  const identity = identityLine(artist);
  const type = typeLabel(artist.type);
  const area = artist.area?.trim() || null;
  const about: Array<{ label: string; value: string }> = [];
  if (type) about.push({ label: copy.typeLabel, value: type });
  if (area) about.push({ label: copy.fromLabel, value: area });

  return (
    <div data-artist-preview="">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span
          style={{
            flex: 'none',
            lineHeight: 0,
            borderRadius: SLOT_RADIUS.panel,
          }}
        >
          <Panel
            name={artist.name}
            surface="artist"
            photoUrl={null}
            size={PLATE_SIZE}
            radius={SLOT_RADIUS.panel}
          />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.2em',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--signal)',
            }}
          >
            {copy.eyebrow}
          </div>
          <h2
            style={{
              margin: '3px 0 0',
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              color: 'var(--fg)',
              overflowWrap: 'anywhere',
            }}
          >
            {artist.name}
          </h2>
          {identity && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                color: 'var(--fg-muted)',
                marginTop: 6,
              }}
            >
              {identity}
            </div>
          )}
        </div>
      </div>

      {about.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {about.map((row, idx) => (
            <AboutRow key={row.label} {...row} first={idx === 0} />
          ))}
        </div>
      )}

      <p
        style={{
          margin: '14px 0 0',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        <b style={{ color: 'var(--fg)' }}>{copy.notOnABillLead}</b>{' '}
        {copy.notOnABillRest}
      </p>

      <div style={{ marginTop: 16 }}>
        <FollowButton
          name={artist.name}
          following={following}
          signedOut={signedOut}
          size="primary"
          tone="hero"
          full
          disabled={followErrorIsFinal(error)}
          onToggle={onToggle}
        />
        {error ? (
          <FollowErrorMessage
            error={error}
            variant="page"
            style={{ marginTop: 9, justifyContent: 'center' }}
          />
        ) : (
          <p
            data-follow-pitch=""
            style={{
              margin: '9px 0 0',
              textAlign: 'center',
              fontSize: 12.5,
              lineHeight: 1.45,
              color: 'var(--fg-muted)',
            }}
          >
            {following ? copy.pitchFollowing : copy.pitch}
          </p>
        )}
        {following && pageHref && (
          <Link
            href={pageHref}
            {...(onOpenPage ? { onClick: onOpenPage } : {})}
            style={{
              marginTop: 10,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              border: '1px solid var(--border-strong)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
              textDecoration: 'none',
            }}
          >
            {copy.openPage}
          </Link>
        )}
      </div>
    </div>
  );
};

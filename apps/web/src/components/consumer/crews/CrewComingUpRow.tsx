'use client';

import { useId, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CrewShow } from '@concert-crawl/types';

import { fromCrewShow } from '@/components/consumer/event-row';
import { EventImage } from '@/components/consumer/event-image';
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle';
import { MemberDot } from './MemberCluster';
import { CREWS_COPY } from './definitions/copy';
import {
  goingLine,
  isTonight,
  summariseGoing,
  tileParts,
} from './lib/coming-up';

const COPY = CREWS_COPY.comingUp;

/** The board's date tile and its photo ring: a drawn gradient, not a token. */
const TILE_GRADIENT = 'linear-gradient(160deg, #B7A6FF, #FF7BD4)';
const PHOTO_RING = '#B7A6FF';

const MONO = 'var(--font-mono)';

interface CrewComingUpRowProps {
  show: CrewShow;
  /** The viewer's user id in this crew, or null when they cannot be found. */
  viewerId: string | null;
}

/**
 * One Coming up row (`41/crew-coming-up`): the date tile, the act's photo, the
 * time and venue, and who is going. It is the crew's plan, so it names people:
 * the viewer first ("YOU, MIRA +2"). Someone going who is not you gets
 * "I'm in" on the right, which is the existing Yes, going. Tapping the row
 * opens the show.
 *
 * Tonight swaps the tile for TONIGHT. Postponed and cancelled are not here
 * yet: `CrewShow` carries no status (item 41b).
 */
export const CrewComingUpRow = ({ show, viewerId }: CrewComingUpRowProps) => {
  const router = useRouter();
  const toggle = useAttendingToggle();
  // The yes lands on the server read, so the row stays busy until the refreshed
  // page arrives; a second tap in that gap would send the yes twice.
  const [refreshing, startRefresh] = useTransition();
  const metaId = useId();
  const goingId = useId();
  const row = fromCrewShow(show);
  const summary = summariseGoing(show, viewerId, COPY.you);
  const tonight = isTonight(show.iso);
  const tile = tileParts(show.iso);

  const imIn = () => {
    toggle.mutate(
      { eventId: show.eventId, going: true },
      { onSuccess: () => startRefresh(() => router.refresh()) },
    );
  };
  const busy = toggle.isPending || refreshing;

  return (
    <div
      data-testid="crew-coming-up-row"
      data-tonight={tonight ? 'true' : 'false'}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
      }}
    >
      <div
        data-testid="crew-coming-up-tile"
        style={{
          width: 54,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 0',
          // TONIGHT is one line, but its tile is as tall as a dated one's.
          minHeight: 56,
          alignSelf: 'stretch',
          borderRadius: 11,
          background: TILE_GRADIENT,
          color: '#0A0D1C',
          textAlign: 'center',
        }}
      >
        {tonight ? (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            {COPY.tonight}
          </span>
        ) : (
          <>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}
            >
              {tile.weekday}
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
              {tile.day}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700 }}>
              {tile.month}
            </span>
          </>
        )}
      </div>

      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 10,
          boxShadow: `0 0 0 1.25px ${PHOTO_RING}, 0 0 20px rgba(183, 166, 255, 0.4)`,
        }}
      >
        <EventImage
          src={show.imageUrl}
          artistPhotoUrl={show.artistPhotoUrl}
          alt=""
          artist={show.artist}
          identityScale="tile"
          className="h-full w-full"
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* The stretched link: the whole card opens the show, while "I'm in"
            sits above it as its own control. */}
        <Link
          href={`/events/${show.eventId}`}
          // The date, venue and who is going describe the link, so a screen
          // reader hears them with the act's name; the ring is drawn round the
          // whole card the link opens.
          aria-describedby={`${metaId} ${goingId}`}
          className="after:absolute after:inset-0 after:rounded-[16px] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--focus)]"
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--fg)',
            textDecoration: 'none',
          }}
        >
          {row.headliner}
        </Link>
        <p
          id={metaId}
          style={{
            margin: 0,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: 'var(--fg-muted)',
          }}
        >
          {[row.timeLabel, row.venueName]
            .filter((part): part is string => !!part)
            .join(' · ')}
        </p>
        <div
          style={{
            marginTop: 7,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ display: 'inline-flex', paddingLeft: 7 }}>
            {summary.faces.map((member) => (
              <span
                key={member.userId}
                style={{ display: 'inline-flex', marginLeft: -7 }}
              >
                <MemberDot member={member} size={20} />
              </span>
            ))}
          </span>
          <span
            id={goingId}
            data-testid="crew-coming-up-going"
            style={{
              // A long handle gives way with an ellipsis, not past the card.
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: MONO,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--signal)',
            }}
          >
            {goingLine(show.goingCount, summary, COPY.going)}
          </span>
        </div>
        {toggle.isError && (
          <p
            role="alert"
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: 'var(--danger)',
            }}
          >
            {COPY.imInFailed}
          </p>
        )}
      </div>

      {!summary.youGoing && (
        <button
          type="button"
          onClick={imIn}
          disabled={busy}
          aria-label={COPY.imInAria(row.headliner)}
          style={{
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
            border: 'none',
            background: 'transparent',
            padding: '8px 2px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--signal)',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {COPY.imIn}
        </button>
      )}
    </div>
  );
};

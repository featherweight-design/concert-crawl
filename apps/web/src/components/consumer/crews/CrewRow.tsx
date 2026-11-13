import Link from 'next/link';
import type { CrewSummary } from '@concert-crawl/types';

import { CrewPatch } from '@/components/consumer/crew-patch';
import { MemberCluster } from './MemberCluster';
import { CREW_ROW } from './lib/styles';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY.list;

interface CrewRowProps {
  crew: CrewSummary;
  wide: boolean;
}

/**
 * One crew in the list. The whole row is a single link, not a card with a
 * nested button: there is exactly one destination, so there is exactly one
 * tab stop.
 */
export const CrewRow = ({ crew, wide }: CrewRowProps) => {
  // A crew of one can still have plans, so B+ says both halves when it does.
  const meta =
    crew.memberCount === 1
      ? crew.upcomingCount > 0
        ? COPY.metaPair(COPY.justYou, COPY.upcomingMeta(crew.upcomingCount))
        : COPY.justYou
      : COPY.upcomingMeta(crew.upcomingCount);

  return (
    <Link
      href={`/crews/${crew.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: CREW_ROW.gap(wide),
        textDecoration: 'none',
        padding: CREW_ROW.padding(wide),
        borderRadius: CREW_ROW.radius,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        minHeight: CREW_ROW.minHeight,
      }}
    >
      {/* Fixed size, not wide-scaled: the list is one column at every width
          and the name needs the room more than the patch does. */}
      <CrewPatch
        crewId={crew.id}
        patchSalt={crew.patchSalt}
        size={CREW_ROW.patch}
        scale="tile"
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: wide ? 17 : 16,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            // On a phone the avatar stack takes the room, so the name wraps
            // (two lines at most) instead of cutting to "The Usual Suspe…".
            ...(wide
              ? {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }
              : {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                  lineHeight: 1.2,
                }),
          }}
        >
          {crew.name}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            lineHeight: 1.5,
            color:
              crew.upcomingCount > 0 ? 'var(--signal)' : 'var(--fg-subtle)',
          }}
        >
          {meta}
        </span>
      </span>
      <MemberCluster
        members={crew.members}
        memberCount={crew.memberCount}
        size={24}
        max={3}
      />
      <svg
        width="8"
        height="14"
        viewBox="0 0 8 14"
        aria-hidden="true"
        focusable="false"
        style={{ flexShrink: 0, marginLeft: 2 }}
      >
        <path
          d="M1 1l6 6-6 6"
          stroke="var(--fg-subtle)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
};

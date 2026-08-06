import Link from 'next/link'
import type { CrewSummary } from '@concert-crawl/types'

import { CrewPatch } from '@/components/consumer/crew-patch'
import { MemberCluster } from './MemberCluster'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY.list

interface CrewRowProps {
  crew: CrewSummary
  wide: boolean
}

/**
 * One crew in the list. The whole row is a single link, not a card with a
 * nested button: there is exactly one destination, so there is exactly one
 * tab stop.
 */
export const CrewRow = ({ crew, wide }: CrewRowProps) => {
  const meta =
    crew.memberCount === 1
      ? COPY.justYou
      : COPY.upcomingMeta(crew.upcomingCount)

  return (
    <Link
      href={`/crews/${crew.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: wide ? 15 : 13,
        textDecoration: 'none',
        padding: wide ? '13px 15px' : '11px 12px',
        borderRadius: 12,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        minHeight: 64,
      }}
    >
      {/* Fixed sizes, not wide-scaled: the desktop list is a two-column grid
          inside a 720px column, so a wide cell (~338px) is barely roomier than
          a 320px phone. Scaling the patch and cluster up there spent the name's
          space and truncated it. */}
      <CrewPatch
        crewId={crew.id}
        patchSalt={crew.patchSalt}
        size={48}
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
            fontSize: wide ? 16 : 15,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
  )
}

import Link from 'next/link'
import type { CrewShow } from '@concert-crawl/types'

import { EmptyState } from '@/components/consumer/empty-state'
import { MemberCluster } from './MemberCluster'
import { groupInOrder, isoYear, stubDate } from './lib/format'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface StubRowProps {
  show: CrewShow
  wide: boolean
  viewerId: string | null
}

/**
 * A ticket stub, not an EventRow. Been there is a record of a night that
 * already happened, so a row built to sell a ticket would carry a price, a
 * countdown and a watch control that all mean nothing here.
 */
export const StubRow = ({ show, wide, viewerId }: StubRowProps) => {
  const { month, day } = stubDate(show.iso)
  // The going count reads differently when you were one of them, and the mono
  // line that says so is desktop-only — so the cluster carries the same words
  // for a screen reader at every width.
  const wentWith =
    viewerId !== null && show.going.some((one) => one.userId === viewerId)
  const goingLabel = (count: number) =>
    wentWith ? COPY.detail.together(count - 1) : COPY.detail.went(count)

  return (
    <Link
      href={`/events/${show.eventId}`}
      style={{
        display: 'grid',
        gridTemplateColumns: wide ? '62px 1fr auto' : '54px 1fr auto',
        alignItems: 'center',
        gap: wide ? 16 : 12,
        textDecoration: 'none',
        borderRadius: 10,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        minHeight: 70,
      }}
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          background: 'var(--surface-2)',
          // The tear line. It is what makes the left end read as a stub
          // rather than a date badge.
          borderRight: '1.5px dashed var(--border-strong)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--fg-subtle)',
          }}
        >
          {month}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: wide ? 19 : 17,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: 'var(--fg)',
          }}
        >
          {day}
        </span>
      </span>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minWidth: 0,
          padding: '10px 0',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: wide ? 15 : 14,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {show.artist}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--fg-subtle)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {show.venue}
        </span>
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          paddingRight: wide ? 14 : 10,
        }}
      >
        <MemberCluster
          members={show.going}
          memberCount={show.goingCount}
          size={wide ? 26 : 23}
          max={wide ? 5 : 3}
          label={goingLabel}
        />
        {wide && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {goingLabel(show.goingCount)}
          </span>
        )}
      </span>
    </Link>
  )
}

interface CrewNightsProps {
  shows: CrewShow[]
  wide: boolean
  viewerId: string | null
}

export const CrewNights = ({ shows, wide, viewerId }: CrewNightsProps) => {
  if (shows.length === 0) {
    return (
      <EmptyState
        state="no-data"
        density="dense"
        eyebrow={COPY.empty.noPastEyebrow}
        title={COPY.empty.noPastTitle}
        body={COPY.empty.noPastBody}
        railLabel={COPY.empty.noPastRail}
      />
    )
  }

  const groups = groupInOrder(shows, (show) => isoYear(show.iso))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--signal)',
          }}
        >
          {COPY.detail.pastStat(shows.length)}
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {COPY.detail.pastSub}
        </p>
      </div>
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--fg-subtle)',
            }}
          >
            {group.key}
          </h3>
          {group.items.map((show) => (
            <StubRow
              key={show.eventId}
              show={show}
              wide={wide}
              viewerId={viewerId}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

import type { CrewShow } from '@concert-crawl/types'

import { EventRow, fromCrewShow } from '@/components/consumer/event-row'
import { EmptyState } from '@/components/consumer/empty-state'
import { MemberCluster } from './MemberCluster'
import { groupInOrder } from './lib/format'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface CrewUpcomingProps {
  shows: CrewShow[]
  wide: boolean
}

/**
 * Coming up. Rows render at `surface="browse"` because that surface already
 * declares the date as carried context, which is exactly true here: the date
 * headers run the list. The going cluster rides the row's `footer` slot —
 * it is a crew fact, not one of the row's four contract lines.
 */
export const CrewUpcoming = ({ shows, wide }: CrewUpcomingProps) => {
  if (shows.length === 0) {
    return (
      <EmptyState
        state="no-data"
        density="dense"
        eyebrow={COPY.empty.noUpcomingEyebrow}
        title={COPY.empty.noUpcomingTitle}
        body={COPY.empty.noUpcomingBody}
        railLabel={COPY.empty.noUpcomingRail}
      />
    )
  }

  const groups = groupInOrder(shows, (show) => show.iso)

  return (
    <div className="flex flex-col gap-5">
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.detail.upcomingSub}
      </p>
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {group.items[0]
              ? fromCrewShow(group.items[0]).dateLabel
              : group.key}
          </h3>
          <div
            className={wide ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}
          >
            {group.items.map((show) => (
              <EventRow
                key={show.eventId}
                show={fromCrewShow(show)}
                surface="browse"
                footer={
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <MemberCluster
                      members={show.going}
                      memberCount={show.goingCount}
                      size={wide ? 24 : 22}
                      max={wide ? 5 : 3}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--signal)',
                      }}
                    >
                      {COPY.detail.going(show.goingCount)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

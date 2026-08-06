import type { CrewShow } from '@concert-crawl/types'

import { EventRow, fromCrewShow } from '@/components/consumer/event-row'
import { EmptyState } from '@/components/consumer/empty-state'
import { groupInOrder } from './lib/format'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface CrewLensListProps {
  crewName: string
  shows: CrewShow[]
}

/**
 * Browse's own date-grouped list, seen through a crew. The rows are the shipped
 * `EventRow` on the `crewLens` surface, not a fork: the date headers run the
 * list exactly as they do on Browse, so the surface declares the date carried
 * and the row drops it.
 */
export const CrewLensList = ({ crewName, shows }: CrewLensListProps) => {
  if (shows.length === 0) {
    return (
      <EmptyState
        state="filtered"
        eyebrow={COPY.lens.emptyEyebrow}
        title={COPY.lens.emptyTitle}
        body={COPY.lens.emptyBody(crewName)}
        railLabel={COPY.lens.emptyRail}
        secondaryCta={{ label: COPY.lens.emptyCta, href: '/events' }}
      />
    )
  }

  const groups = groupInOrder(shows, (show) => show.iso)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 15.5,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {group.items[0]
              ? fromCrewShow(group.items[0]).dateLabel
              : group.key}
          </h2>
          <div className="flex flex-col">
            {group.items.map((show, index) => (
              <div
                key={show.eventId}
                style={{
                  borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <EventRow show={fromCrewShow(show)} surface="crewLens" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

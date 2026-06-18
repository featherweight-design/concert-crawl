'use client'

import {
  AdminTable,
  ConfidenceBar,
  Panel,
  RelTime,
  StatusBadge,
  TD,
  TH,
  THead,
  TR,
} from '@/components/admin/primitives'
import { LifecycleBadge } from '@/components/admin/events/editor/LifecycleBadge'
import { VerifyMark } from '@/components/admin/events/editor/VerifyMark'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EventRowMenu, type EventRowActions } from './EventRowMenu'
import { type AllEvent } from './types'

// Selection is all-or-nothing: enabling `selectable` without the toggle
// handlers used to render no-op checkboxes. The union below makes that
// configuration unrepresentable.
type SelectionProps =
  | {
      selectable: true
      selectedIds: ReadonlySet<string>
      onToggleSelected: (id: string) => void
      onToggleAll: (next: boolean) => void
    }
  | {
      selectable?: false
      selectedIds?: undefined
      onToggleSelected?: undefined
      onToggleAll?: undefined
    }

export type EventsTableProps = {
  events: ReadonlyArray<AllEvent>
  onRowClick: (id: string) => void
  rowActions?: EventRowActions
} & SelectionProps

const VENUE_FALLBACK = '—'

const formatTime = (time: string | null): string | null => {
  if (!time) return null
  const [hh, mm] = time.split(':')
  const hours = Number.parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${minutes} ${meridiem}`
}

const GenreCell = ({ genres }: { genres: string[] | null }) => {
  if (!genres || genres.length === 0)
    return (
      <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>
        {ADMIN_COPY.review.allEvents.noGenre}
      </span>
    )
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {genres.slice(0, 2).map((tag) => (
        <StatusBadge key={tag} kind="neutral" mono>
          {tag}
        </StatusBadge>
      ))}
      {genres.length > 2 && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--fg-muted)',
            alignSelf: 'center',
          }}
        >
          +{genres.length - 2}
        </span>
      )}
    </div>
  )
}

export const EventsTable = (props: EventsTableProps) => {
  const { events, onRowClick, rowActions } = props
  const selectable = props.selectable === true
  const allSelected =
    selectable &&
    events.length > 0 &&
    events.every((event) => props.selectedIds.has(event.id))
  return (
    <Panel padding={0}>
      <AdminTable>
        <THead>
          <tr>
            {props.selectable && (
              <TH width={44}>
                <input
                  type="checkbox"
                  aria-label={
                    ADMIN_COPY.review.allEvents.bulkDock.selectAllAriaLabel
                  }
                  checked={allSelected}
                  onChange={(evt) => props.onToggleAll(evt.target.checked)}
                />
              </TH>
            )}
            <TH>{ADMIN_COPY.review.allEvents.columns.event}</TH>
            <TH>{ADMIN_COPY.review.allEvents.columns.venueDate}</TH>
            <TH>{ADMIN_COPY.review.allEvents.columns.status}</TH>
            <TH>{ADMIN_COPY.review.allEvents.columns.genre}</TH>
            <TH width={132}>
              {ADMIN_COPY.review.allEvents.columns.confidence}
            </TH>
            <TH align="right">{ADMIN_COPY.review.allEvents.columns.created}</TH>
            {rowActions && <TH width={44}> </TH>}
          </tr>
        </THead>
        <tbody>
          {events.map((event) => {
            const timeLabel = formatTime(event.showTime)
            const artist =
              event.artist && event.artist !== event.title ? event.artist : null
            const isSelected = selectable && props.selectedIds.has(event.id)
            return (
              <TR key={event.id} onClick={() => onRowClick(event.id)}>
                {props.selectable && (
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={
                        ADMIN_COPY.review.allEvents.bulkDock.rowAriaLabel
                      }
                      checked={isSelected}
                      onChange={() => props.onToggleSelected(event.id)}
                      onClick={(evt) => evt.stopPropagation()}
                    />
                  </TD>
                )}
                <TD>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--fg)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {event.title}
                  </div>
                  {artist && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                      }}
                    >
                      {artist}
                    </div>
                  )}
                </TD>
                <TD>
                  <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                    {event.venueName ?? VENUE_FALLBACK}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: timeLabel ? 'var(--fg-subtle)' : 'var(--warning)',
                      marginTop: 2,
                    }}
                  >
                    {event.date}
                    {timeLabel
                      ? ` · ${timeLabel}`
                      : ` · ${ADMIN_COPY.review.allEvents.noShowTime}`}
                  </div>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <LifecycleBadge status={event.status} />
                    {event.isSoldOut && (
                      <StatusBadge kind="accent" mono>
                        {ADMIN_COPY.editor.status.soldOut}
                      </StatusBadge>
                    )}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <VerifyMark verified={event.verified} />
                  </div>
                </TD>
                <TD>
                  <GenreCell genres={event.genre} />
                </TD>
                <TD>
                  <ConfidenceBar score={event.confidenceScore ?? 0} />
                </TD>
                <TD align="right">
                  <RelTime iso={event.createdAt} />
                </TD>
                {rowActions && (
                  <TD align="right">
                    <EventRowMenu event={event} actions={rowActions} />
                  </TD>
                )}
              </TR>
            )
          })}
        </tbody>
      </AdminTable>
    </Panel>
  )
}

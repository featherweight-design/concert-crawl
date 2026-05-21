'use client'

import { useState } from 'react'
import {
  Panel,
  StatusBadge,
  AdminButton,
  AdminTable,
  THead,
  TH,
  TR,
  TD,
} from '@/components/admin/primitives'

interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

interface PriceCoverageTableProps {
  events: PriceEvent[]
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

function isStale(lastRetrievedAt: string | null): boolean {
  if (!lastRetrievedAt) return true
  return Date.now() - new Date(lastRetrievedAt).getTime() > FORTY_EIGHT_HOURS_MS
}

export const PriceCoverageTable = ({ events }: PriceCoverageTableProps) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)

  const missingCount = events.filter((ev) => ev.priceMin === null).length
  const filteredEvents = showMissingOnly
    ? events.filter((ev) => ev.priceMin === null)
    : events

  const countBadge = (
    <StatusBadge kind="warning">{missingCount} missing</StatusBadge>
  )

  return (
    <Panel title="Price coverage" action={countBadge} padding={0}>
      {/* Filter toggle row */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <AdminButton
          variant={showMissingOnly ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowMissingOnly((prev) => !prev)}
        >
          Missing only
        </AdminButton>
        <span
          style={{
            fontSize: 12,
            color: 'var(--fg-muted)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <AdminTable>
        <THead>
          <tr>
            <TH>Event</TH>
            <TH>Venue / Date</TH>
            <TH>Source</TH>
            <TH>Price</TH>
            <TH>Updated</TH>
          </tr>
        </THead>
        <tbody>
          {filteredEvents.map((ev) => {
            const stale = isStale(ev.lastRetrievedAt)
            const priceDisplay = ev.priceMin
              ? `$${ev.priceMin}${ev.priceMax ? ` – $${ev.priceMax}` : ''}`
              : null

            return (
              <TR key={ev.eventId}>
                <TD>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg)',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ev.eventTitle}
                  </div>
                  {ev.artist && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                      }}
                    >
                      {ev.artist}
                    </div>
                  )}
                </TD>
                <TD>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {ev.venueName ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-subtle)',
                      marginTop: 2,
                    }}
                  >
                    {ev.date}
                  </div>
                </TD>
                <TD>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {ev.priceSource === 'crawled' && (
                      <StatusBadge kind="signal" variant="outline">
                        crawled
                      </StatusBadge>
                    )}
                    {ev.priceSource === 'community' && (
                      <StatusBadge kind="accent" variant="outline">
                        community
                      </StatusBadge>
                    )}
                    {ev.priceSource === 'admin' && (
                      <StatusBadge kind="warning" variant="outline">
                        admin
                      </StatusBadge>
                    )}
                    {ev.priceSource === null && (
                      <StatusBadge kind="danger">no price</StatusBadge>
                    )}
                    {ev.lastOutcome === 'miss' && (
                      <StatusBadge kind="danger" variant="soft">
                        miss
                      </StatusBadge>
                    )}
                  </div>
                </TD>
                <TD mono>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {priceDisplay ? (
                      <span>{priceDisplay}</span>
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                    )}
                    {stale && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--warning)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        STALE
                      </span>
                    )}
                  </div>
                </TD>
                <TD>
                  {ev.lastRetrievedAt ? (
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      {new Date(ev.lastRetrievedAt).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'America/Denver',
                        },
                      )}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                      —
                    </span>
                  )}
                </TD>
              </TR>
            )
          })}
        </tbody>
      </AdminTable>
    </Panel>
  )
}

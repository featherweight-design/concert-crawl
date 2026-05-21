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
  loading?: boolean
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
  ) => Promise<void>
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

function isStale(lastRetrievedAt: string | null): boolean {
  if (!lastRetrievedAt) return true
  return Date.now() - new Date(lastRetrievedAt).getTime() > FORTY_EIGHT_HOURS_MS
}

export const PriceCoverageTable = ({
  events,
  loading = false,
  onAddPrice,
}: PriceCoverageTableProps) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [addingForEventId, setAddingForEventId] = useState<string | null>(null)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const resetAddForm = () => {
    setAddingForEventId(null)
    setPriceMin('')
    setPriceMax('')
  }

  const handleSavePrice = async (eventId: string) => {
    if (!priceMin.trim() || !onAddPrice) return
    setIsSaving(true)
    try {
      await onAddPrice(eventId, priceMin.trim(), priceMax.trim() || null)
      resetAddForm()
    } finally {
      setIsSaving(false)
    }
  }

  const missingCount = events.filter((ev) => ev.priceMin === null).length
  const filteredEvents = showMissingOnly
    ? events.filter((ev) => ev.priceMin === null)
    : events

  const countBadge = loading ? null : (
    <StatusBadge kind="warning">{missingCount} missing</StatusBadge>
  )

  return (
    <Panel title="Price coverage" action={countBadge} padding={0}>
      {loading && (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--fg-muted)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Loading…
        </div>
      )}
      {!loading && (
        <>
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
              {filteredEvents.length} event
              {filteredEvents.length !== 1 ? 's' : ''}
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

                const isAddingHere = addingForEventId === ev.eventId
                const isMissingPrice = ev.priceMin === null

                if (isAddingHere) {
                  return (
                    <TR key={ev.eventId}>
                      <TD>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--fg)',
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.eventTitle}
                        </div>
                      </TD>
                      <TD>
                        <input
                          type="number"
                          placeholder="Low"
                          value={priceMin}
                          onChange={(evt) => setPriceMin(evt.target.value)}
                          min={0}
                          step={0.01}
                          style={{
                            width: 80,
                            height: 28,
                            padding: '0 8px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 6,
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', monospace",
                            outline: 'none',
                          }}
                        />
                      </TD>
                      <TD>
                        <input
                          type="number"
                          placeholder="High"
                          value={priceMax}
                          onChange={(evt) => setPriceMax(evt.target.value)}
                          min={0}
                          step={0.01}
                          style={{
                            width: 80,
                            height: 28,
                            padding: '0 8px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 6,
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', monospace",
                            outline: 'none',
                          }}
                        />
                      </TD>
                      <TD colSpan={2}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={resetAddForm}
                            disabled={isSaving}
                          >
                            Cancel
                          </AdminButton>
                          <AdminButton
                            variant="success"
                            size="sm"
                            onClick={() => void handleSavePrice(ev.eventId)}
                            disabled={isSaving || !priceMin.trim()}
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </AdminButton>
                        </div>
                      </TD>
                    </TR>
                  )
                }

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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
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
                      {isMissingPrice && onAddPrice ? (
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPriceMin('')
                            setPriceMax('')
                            setAddingForEventId(ev.eventId)
                          }}
                        >
                          + Add
                        </AdminButton>
                      ) : ev.lastRetrievedAt ? (
                        <span
                          style={{ fontSize: 12, color: 'var(--fg-muted)' }}
                        >
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
                        <span
                          style={{ fontSize: 12, color: 'var(--fg-subtle)' }}
                        >
                          —
                        </span>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </tbody>
          </AdminTable>
        </>
      )}
    </Panel>
  )
}

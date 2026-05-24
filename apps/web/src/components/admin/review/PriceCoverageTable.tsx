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

type SourceFilter = 'all' | 'crawled' | 'community' | 'admin' | null

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })
}

export const PriceCoverageTable = ({
  events,
  loading = false,
  onAddPrice,
}: PriceCoverageTableProps) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
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

  const handleSourceFilter = () => {
    const cycle: SourceFilter[] = ['all', 'crawled', 'community', 'admin', null]
    const idx = cycle.indexOf(sourceFilter)
    setSourceFilter(cycle[(idx + 1) % cycle.length] ?? 'all')
  }

  const missingCount = events.filter((ev) => ev.priceMin === null).length

  const filteredEvents = events.filter((ev) => {
    if (showMissingOnly && ev.priceMin !== null) return false
    if (sourceFilter !== 'all') {
      if (sourceFilter === null && ev.priceSource !== null) return false
      if (sourceFilter !== null && ev.priceSource !== sourceFilter) return false
    }
    return true
  })

  const missingBadge =
    !loading && missingCount > 0 ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 9px',
          borderRadius: 20,
          border: '1.5px solid var(--warning)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--warning)',
          letterSpacing: 0,
          lineHeight: 1.4,
        }}
      >
        {missingCount} missing
      </span>
    ) : null

  const panelTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      Price coverage
      {missingBadge}
    </span>
  )

  const sourceLabel =
    sourceFilter === 'all' || sourceFilter === null
      ? 'Source'
      : sourceFilter.charAt(0).toUpperCase() + sourceFilter.slice(1)

  const panelAction = !loading ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <AdminButton
        variant={sourceFilter !== 'all' ? 'outline' : 'ghost'}
        size="sm"
        onClick={handleSourceFilter}
      >
        {sourceLabel}
      </AdminButton>
      <AdminButton
        variant={showMissingOnly ? 'outline' : 'ghost'}
        size="sm"
        onClick={() => setShowMissingOnly((prev) => !prev)}
      >
        Missing only
      </AdminButton>
    </div>
  ) : null

  return (
    <Panel title={panelTitle} action={panelAction} padding={0}>
      {loading ? (
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
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          <AdminTable>
            <THead>
              <tr>
                <TH>Event</TH>
                <TH>Venue / Date</TH>
                <TH>Source</TH>
                <TH>Current Price</TH>
                <TH>Updated</TH>
              </tr>
            </THead>
            <tbody>
              {filteredEvents.map((ev) => {
                const priceDisplay = ev.priceMin
                  ? `$${ev.priceMin}${ev.priceMax ? ` – $${ev.priceMax}` : ''}`
                  : null
                const isMissingPrice = ev.priceMin === null
                const isAddingHere = addingForEventId === ev.eventId

                if (isAddingHere) {
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
                      <TD>
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
                          gap: 8,
                        }}
                      >
                        {priceDisplay ? (
                          <span>{priceDisplay}</span>
                        ) : (
                          <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                        )}
                        {isMissingPrice && onAddPrice && (
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPriceMin('')
                              setPriceMax('')
                              setAddingForEventId(ev.eventId)
                            }}
                          >
                            + Add price
                          </AdminButton>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <span
                        style={{
                          fontSize: 12,
                          color: ev.lastRetrievedAt
                            ? 'var(--fg-muted)'
                            : 'var(--fg-subtle)',
                        }}
                      >
                        {formatDate(ev.lastRetrievedAt)}
                      </span>
                    </TD>
                  </TR>
                )
              })}
            </tbody>
          </AdminTable>
        </div>
      )}
    </Panel>
  )
}

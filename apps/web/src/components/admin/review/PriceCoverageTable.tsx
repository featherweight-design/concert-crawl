'use client'

import React, { useState } from 'react'
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

type SubmissionVendor =
  | 'AXS'
  | 'Ticketmaster'
  | 'SeatGeek'
  | 'DICE'
  | 'Eventbrite'
  | 'VenueBoxOffice'
type SubmissionHowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue'

interface PriceCoverageTableProps {
  events: PriceEvent[]
  loading?: boolean
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: SubmissionVendor,
    howFound: SubmissionHowFound,
  ) => Promise<void>
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })
}

function formatEventDate(iso: string): string {
  try {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' },
    )
  } catch {
    return iso
  }
}

const inputStyle: React.CSSProperties = {
  width: 72,
  height: 32,
  padding: '0 8px',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  background: 'var(--bg-elevated)',
  color: 'var(--fg)',
  fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
  outline: 'none',
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
  const [vendor, setVendor] = useState<SubmissionVendor>('Ticketmaster')
  const [howFound, setHowFound] = useState<SubmissionHowFound>('saw_listing')
  const [isSaving, setIsSaving] = useState(false)

  const resetAddForm = () => {
    setAddingForEventId(null)
    setPriceMin('')
    setPriceMax('')
    setVendor('Ticketmaster')
    setHowFound('saw_listing')
  }

  const handleSavePrice = async (eventId: string) => {
    if (!priceMin.trim() || !onAddPrice) return
    setIsSaving(true)
    try {
      await onAddPrice(
        eventId,
        priceMin.trim(),
        priceMax.trim() || null,
        vendor,
        howFound,
      )
      resetAddForm()
    } finally {
      setIsSaving(false)
    }
  }

  const missingCount = events.filter((ev) => ev.priceMin === null).length

  const filteredEvents = events.filter((ev) => {
    if (showMissingOnly && ev.priceMin !== null) return false
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

  const panelAction = !loading ? (
    <AdminButton
      variant={showMissingOnly ? 'outline' : 'ghost'}
      size="sm"
      onClick={() => setShowMissingOnly((prev) => !prev)}
    >
      Missing only
    </AdminButton>
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
          {filteredEvents.length === 0 ? (
            <div
              style={{
                padding: '24px 18px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg-muted)',
                textAlign: 'center',
              }}
            >
              {showMissingOnly
                ? 'All events have prices — nothing missing.'
                : 'No upcoming events with price data.'}
            </div>
          ) : (
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

                  return (
                    <React.Fragment key={ev.eventId}>
                      {/* Normal row — always visible */}
                      <TR>
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
                          <div
                            style={{ fontSize: 12, color: 'var(--fg-muted)' }}
                          >
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
                            {ev.priceSource !== null &&
                              ev.priceSource !== 'community' && (
                                <StatusBadge kind="signal" variant="outline">
                                  crawled
                                </StatusBadge>
                              )}
                            {ev.priceSource === 'community' && (
                              <StatusBadge kind="accent" variant="outline">
                                community
                              </StatusBadge>
                            )}
                            {ev.priceSource === null && (
                              <StatusBadge kind="danger">no price</StatusBadge>
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
                              <span style={{ color: 'var(--fg-subtle)' }}>
                                —
                              </span>
                            )}
                            {isMissingPrice && onAddPrice && !isAddingHere && (
                              <AdminButton
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPriceMin('')
                                  setPriceMax('')
                                  setVendor('Ticketmaster')
                                  setHowFound('saw_listing')
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

                      {/* Edit panel — full-width row below */}
                      {isAddingHere && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: '0 0 2px',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                margin: '10px 14px',
                                padding: '14px 18px',
                                background:
                                  'color-mix(in oklab, var(--signal) 5%, var(--surface-1))',
                                border: '1px solid var(--border-strong)',
                                borderRadius: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                              }}
                            >
                              {/* Row 1: context + controls */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 16,
                                }}
                              >
                                {/* Context: adding price for */}
                                <div style={{ minWidth: 140, maxWidth: 200 }}>
                                  <div
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.1em',
                                      textTransform: 'uppercase',
                                      color: 'var(--fg-subtle)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    Adding price for
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: "'Inter', sans-serif",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: 'var(--fg)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {ev.eventTitle}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: "'Inter', sans-serif",
                                      fontSize: 11,
                                      color: 'var(--fg-muted)',
                                      marginTop: 2,
                                    }}
                                  >
                                    {[ev.venueName, formatEventDate(ev.date)]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </div>
                                  {ev.ticketUrl && (
                                    <a
                                      href={ev.ticketUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        marginTop: 4,
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'var(--signal)',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <span style={{ fontSize: 16 }}>↗</span>
                                      Buy tickets
                                    </a>
                                  )}
                                </div>

                                {/* LOW input */}
                                <div style={{ flexShrink: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.1em',
                                      textTransform: 'uppercase',
                                      color: 'var(--fg-subtle)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    Low
                                  </div>
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: 6,
                                      background: 'var(--bg-elevated)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <span
                                      style={{
                                        padding: '0 6px 0 10px',
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--fg-muted)',
                                      }}
                                    >
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={priceMin}
                                      onChange={(evt) =>
                                        setPriceMin(evt.target.value)
                                      }
                                      min={0}
                                      step={1}
                                      style={{
                                        ...inputStyle,
                                        border: 'none',
                                        borderRadius: 0,
                                        paddingLeft: 0,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* HIGH input */}
                                <div style={{ flexShrink: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.1em',
                                      textTransform: 'uppercase',
                                      color: 'var(--fg-subtle)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    High
                                  </div>
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: 6,
                                      background: 'var(--bg-elevated)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <span
                                      style={{
                                        padding: '0 6px 0 10px',
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--fg-muted)',
                                      }}
                                    >
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={priceMax}
                                      onChange={(evt) =>
                                        setPriceMax(evt.target.value)
                                      }
                                      min={0}
                                      step={1}
                                      style={{
                                        ...inputStyle,
                                        border: 'none',
                                        borderRadius: 0,
                                        paddingLeft: 0,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Vendor select */}
                                <div style={{ flexShrink: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.1em',
                                      textTransform: 'uppercase',
                                      color: 'var(--fg-subtle)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    Vendor
                                  </div>
                                  <select
                                    value={vendor}
                                    onChange={(evt) =>
                                      setVendor(
                                        evt.target.value as SubmissionVendor,
                                      )
                                    }
                                    style={{
                                      height: 32,
                                      padding: '0 8px',
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: 6,
                                      background: 'var(--bg-elevated)',
                                      color: 'var(--fg)',
                                      fontSize: 13,
                                      fontFamily: "'Inter', sans-serif",
                                      outline: 'none',
                                    }}
                                  >
                                    <option value="Ticketmaster">
                                      Ticketmaster
                                    </option>
                                    <option value="AXS">AXS</option>
                                    <option value="SeatGeek">SeatGeek</option>
                                    <option value="DICE">DICE</option>
                                    <option value="Eventbrite">
                                      Eventbrite
                                    </option>
                                    <option value="VenueBoxOffice">
                                      Venue box office
                                    </option>
                                  </select>
                                </div>

                                {/* How found select */}
                                <div style={{ flexShrink: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.1em',
                                      textTransform: 'uppercase',
                                      color: 'var(--fg-subtle)',
                                      marginBottom: 4,
                                    }}
                                  >
                                    How found
                                  </div>
                                  <select
                                    value={howFound}
                                    onChange={(evt) =>
                                      setHowFound(
                                        evt.target.value as SubmissionHowFound,
                                      )
                                    }
                                    style={{
                                      height: 32,
                                      padding: '0 8px',
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: 6,
                                      background: 'var(--bg-elevated)',
                                      color: 'var(--fg)',
                                      fontSize: 13,
                                      fontFamily: "'Inter', sans-serif",
                                      outline: 'none',
                                    }}
                                  >
                                    <option value="saw_listing">
                                      Saw listing
                                    </option>
                                    <option value="bought_myself">
                                      Bought tickets
                                    </option>
                                    <option value="at_the_venue">
                                      At the venue
                                    </option>
                                  </select>
                                </div>
                              </div>

                              {/* Row 2: actions */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 12,
                                }}
                              >
                                <button
                                  onClick={resetAddForm}
                                  disabled={isSaving}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--fg-muted)',
                                    padding: 0,
                                  }}
                                >
                                  × Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    void handleSavePrice(ev.eventId)
                                  }
                                  disabled={isSaving || !priceMin.trim()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 14px',
                                    borderRadius: 8,
                                    background:
                                      isSaving || !priceMin.trim()
                                        ? 'color-mix(in oklab, var(--success) 50%, transparent)'
                                        : 'var(--success)',
                                    border: 'none',
                                    color: 'var(--fg-on-accent)',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor:
                                      isSaving || !priceMin.trim()
                                        ? 'not-allowed'
                                        : 'pointer',
                                  }}
                                >
                                  {isSaving ? 'Saving…' : '✓ Save price'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </AdminTable>
          )}
        </div>
      )}
    </Panel>
  )
}

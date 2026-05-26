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
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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
  missingOnly: boolean
  hasMore: boolean
  loadingMore?: boolean
  onToggleFilter: () => void
  onLoadMore: () => void
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
  missingOnly,
  hasMore,
  loadingMore = false,
  onToggleFilter,
  onLoadMore,
  onAddPrice,
}: PriceCoverageTableProps) => {
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
      {ADMIN_COPY.review.priceCoverage.panelTitle}
      {missingBadge}
    </span>
  )

  const panelAction = !loading ? (
    <AdminButton
      variant={missingOnly ? 'outline' : 'ghost'}
      size="sm"
      onClick={onToggleFilter}
    >
      {ADMIN_COPY.review.priceCoverage.missingOnly}
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
          {ADMIN_COPY.review.priceCoverage.loading}
        </div>
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div
              style={{
                padding: '24px 18px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'var(--fg-muted)',
                textAlign: 'center',
              }}
            >
              {missingOnly
                ? ADMIN_COPY.review.priceCoverage.emptyAllPrices
                : ADMIN_COPY.review.priceCoverage.emptyNoPrices}
            </div>
          ) : (
            <>
              <AdminTable>
                <THead>
                  <tr>
                    <TH>{ADMIN_COPY.review.priceCoverage.columnEvent}</TH>
                    <TH>{ADMIN_COPY.review.priceCoverage.columnVenueDate}</TH>
                    <TH>{ADMIN_COPY.review.priceCoverage.columnSource}</TH>
                    <TH>
                      {ADMIN_COPY.review.priceCoverage.columnCurrentPrice}
                    </TH>
                    <TH>{ADMIN_COPY.review.priceCoverage.columnUpdated}</TH>
                  </tr>
                </THead>
                <tbody>
                  {events.map((ev) => {
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
                                    {
                                      ADMIN_COPY.review.priceCoverage
                                        .sourceCrawled
                                    }
                                  </StatusBadge>
                                )}
                              {ev.priceSource === 'community' && (
                                <StatusBadge kind="accent" variant="outline">
                                  {
                                    ADMIN_COPY.review.priceCoverage
                                      .sourceCommunity
                                  }
                                </StatusBadge>
                              )}
                              {ev.priceSource === null && (
                                <StatusBadge kind="danger">
                                  {
                                    ADMIN_COPY.review.priceCoverage
                                      .sourceNoPrice
                                  }
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
                                <span style={{ color: 'var(--fg-subtle)' }}>
                                  —
                                </span>
                              )}
                              {isMissingPrice &&
                                onAddPrice &&
                                !isAddingHere && (
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
                                    {ADMIN_COPY.review.priceCoverage.addPrice}
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
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--fg-subtle)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {
                                        ADMIN_COPY.review.priceCoverage
                                          .addingPriceFor
                                      }
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
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .buyTickets
                                        }
                                      </a>
                                    )}
                                  </div>

                                  {/* LOW input */}
                                  <div style={{ flexShrink: 0 }}>
                                    <div
                                      style={{
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--fg-subtle)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {ADMIN_COPY.review.priceCoverage.priceLow}
                                    </div>
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        border:
                                          '1px solid var(--border-strong)',
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
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--fg-subtle)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {
                                        ADMIN_COPY.review.priceCoverage
                                          .priceHigh
                                      }
                                    </div>
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        border:
                                          '1px solid var(--border-strong)',
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
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--fg-subtle)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {ADMIN_COPY.review.priceCoverage.vendor}
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
                                        border:
                                          '1px solid var(--border-strong)',
                                        borderRadius: 6,
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--fg)',
                                        fontSize: 13,
                                        fontFamily: "'Inter', sans-serif",
                                        outline: 'none',
                                      }}
                                    >
                                      <option value="Ticketmaster">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.ticketmaster
                                        }
                                      </option>
                                      <option value="AXS">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.axs
                                        }
                                      </option>
                                      <option value="SeatGeek">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.seatgeek
                                        }
                                      </option>
                                      <option value="DICE">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.dice
                                        }
                                      </option>
                                      <option value="Eventbrite">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.eventbrite
                                        }
                                      </option>
                                      <option value="VenueBoxOffice">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .vendorOptions.venueBoxOffice
                                        }
                                      </option>
                                    </select>
                                  </div>

                                  {/* How found select */}
                                  <div style={{ flexShrink: 0 }}>
                                    <div
                                      style={{
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--fg-subtle)',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {ADMIN_COPY.review.priceCoverage.howFound}
                                    </div>
                                    <select
                                      value={howFound}
                                      onChange={(evt) =>
                                        setHowFound(
                                          evt.target
                                            .value as SubmissionHowFound,
                                        )
                                      }
                                      style={{
                                        height: 32,
                                        padding: '0 8px',
                                        border:
                                          '1px solid var(--border-strong)',
                                        borderRadius: 6,
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--fg)',
                                        fontSize: 13,
                                        fontFamily: "'Inter', sans-serif",
                                        outline: 'none',
                                      }}
                                    >
                                      <option value="saw_listing">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .howFoundOptions.sawListing
                                        }
                                      </option>
                                      <option value="bought_myself">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .howFoundOptions.boughtMyself
                                        }
                                      </option>
                                      <option value="at_the_venue">
                                        {
                                          ADMIN_COPY.review.priceCoverage
                                            .howFoundOptions.atTheVenue
                                        }
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                {/* Row 2: save bar */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '3px 10px',
                                      borderRadius: 20,
                                      border:
                                        '1px solid color-mix(in oklab, var(--warning) 38%, transparent)',
                                      background:
                                        'color-mix(in oklab, var(--warning) 10%, var(--bg-elevated))',
                                      fontFamily: "'Inter', sans-serif",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: 'var(--warning)',
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: 'var(--warning)',
                                        flexShrink: 0,
                                      }}
                                    />
                                    {
                                      ADMIN_COPY.review.priceCoverage
                                        .addingPriceStatus
                                    }
                                  </span>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: 8,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <button
                                      onClick={resetAddForm}
                                      disabled={isSaving}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '0 4px',
                                        cursor: isSaving
                                          ? 'not-allowed'
                                          : 'pointer',
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: 'var(--fg-muted)',
                                      }}
                                    >
                                      {ADMIN_COPY.review.priceCoverage.discard}
                                    </button>
                                    <button
                                      onClick={() =>
                                        void handleSavePrice(ev.eventId)
                                      }
                                      disabled={isSaving || !priceMin.trim()}
                                      style={{
                                        background:
                                          isSaving || !priceMin.trim()
                                            ? 'color-mix(in oklab, var(--signal) 50%, transparent)'
                                            : 'var(--signal)',
                                        border: 'none',
                                        borderRadius: 8,
                                        padding: '6px 16px',
                                        color: 'var(--fg-on-accent)',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor:
                                          isSaving || !priceMin.trim()
                                            ? 'not-allowed'
                                            : 'pointer',
                                      }}
                                    >
                                      {isSaving
                                        ? ADMIN_COPY.review.priceCoverage.saving
                                        : ADMIN_COPY.review.priceCoverage
                                            .saveChanges}
                                    </button>
                                  </div>
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
              {(hasMore || loadingMore) && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? ADMIN_COPY.review.priceCoverage.loadingMore
                      : ADMIN_COPY.review.priceCoverage.loadMore}
                  </AdminButton>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  )
}

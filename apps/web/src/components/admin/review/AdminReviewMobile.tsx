'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import {
  ConfidenceBar,
  AdminButton,
  StatusBadge,
} from '@/components/admin/primitives'
import { REVIEW_COPY } from './definitions/copy'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  note?: string | null
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

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

interface AdminReviewMobileProps {
  events: EventFlag[]
  submissions: PriceSubmission[]
  priceEvents: PriceEvent[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onApproveSubmission: (id: string) => void
  onDenySubmission: (id: string) => void
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: string,
    howFound: string,
  ) => Promise<void>
  initialTab?: 'flags' | 'prices'
}

function getEventFlagChips(
  ev: EventFlag,
): { label: string; kind: 'warning' | 'signal' | 'neutral' }[] {
  const chips: { label: string; kind: 'warning' | 'signal' | 'neutral' }[] = []
  if (!ev.title) chips.push({ label: 'title missing', kind: 'warning' })
  if (!ev.artist) chips.push({ label: 'artist missing', kind: 'warning' })
  if (ev.confidenceScore !== null && ev.confidenceScore < 0.5) {
    chips.push({ label: 'low confidence', kind: 'warning' })
  }
  if (ev.extractionStrategy === 'llm') {
    chips.push({ label: 'llm source', kind: 'signal' })
  }
  if (!ev.ticketPriceMin) chips.push({ label: 'no price', kind: 'neutral' })
  return chips
}

function EventFlagCard({
  event,
  onApprove,
  onReject,
}: {
  event: EventFlag
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [reasonOpen, setReasonOpen] = useState(false)
  const chips = getEventFlagChips(event)

  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      {/* Title + venue/date */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
          lineHeight: 1.35,
          marginBottom: 2,
        }}
      >
        {event.title}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: 'var(--fg-muted)',
          marginBottom: 10,
        }}
      >
        {event.venueName ?? event.venueId} ·{' '}
        {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
        {event.showTime
          ? ` ${new Date(`1970-01-01T${event.showTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          : ''}
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 10 }}>
        <ConfidenceBar score={event.confidenceScore ?? 0} />
      </div>

      {/* Flag chips */}
      {chips.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {chips.map((chip) => (
            <StatusBadge key={chip.label} kind={chip.kind} variant="outline">
              {chip.label}
            </StatusBadge>
          ))}
          {event.genre?.map((tag) => (
            <StatusBadge key={tag} kind="neutral" variant="outline">
              {tag}
            </StatusBadge>
          ))}
        </div>
      )}

      {/* LLM reasoning disclosure */}
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setReasonOpen((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent)',
          }}
        >
          <span style={{ fontSize: 10 }}>{reasonOpen ? '▼' : '▶'}</span>
          {REVIEW_COPY.adminReviewMobile.llmReasoning}
        </button>
        {reasonOpen && (
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>
              <span style={{ color: 'var(--fg-subtle)', fontWeight: 700 }}>
                {REVIEW_COPY.adminReviewMobile.llmDetailsStrategy}{' '}
              </span>
              {event.extractionStrategy ?? '—'}
            </div>
            <div>
              <span style={{ color: 'var(--fg-subtle)', fontWeight: 700 }}>
                {REVIEW_COPY.adminReviewMobile.llmDetailsConfidence}{' '}
              </span>
              {event.confidenceScore !== null
                ? `${Math.round(event.confidenceScore * 100)}%`
                : '—'}
            </div>
            {event.sourceUrl && (
              <div>
                <span style={{ color: 'var(--fg-subtle)', fontWeight: 700 }}>
                  {REVIEW_COPY.adminReviewMobile.llmDetailsSource}{' '}
                </span>
                <span style={{ wordBreak: 'break-all' }}>
                  {event.sourceUrl}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AdminButton
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => onReject(event.id)}
        >
          {REVIEW_COPY.adminReviewMobile.rejectEvent}
        </AdminButton>
        <AdminButton
          variant="success"
          size="sm"
          fullWidth
          onClick={() => onApprove(event.id)}
        >
          {REVIEW_COPY.adminReviewMobile.approveEvent}
        </AdminButton>
      </div>
    </div>
  )
}

function NeedsPriceRow({
  event,
  onAddPrice,
}: {
  event: PriceEvent
  onAddPrice?: AdminReviewMobileProps['onAddPrice']
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [vendor, setVendor] = useState('Ticketmaster')
  const [howFound, setHowFound] = useState('saw_listing')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!priceMin.trim() || !onAddPrice) return
    setIsSaving(true)
    try {
      await onAddPrice(
        event.eventId,
        priceMin.trim(),
        priceMax.trim() || null,
        vendor,
        howFound,
      )
      setIsAdding(false)
      setPriceMin('')
      setPriceMax('')
      setVendor('Ticketmaster')
      setHowFound('saw_listing')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.eventTitle}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {event.venueName ?? '—'} ·{' '}
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
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
              <span style={{ fontSize: 14 }}>↗</span>
              {REVIEW_COPY.adminReviewMobile.buyTickets}
            </a>
          )}
        </div>
        {event.priceMin !== null ? (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--fg)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ${Math.round(parseFloat(event.priceMin))}
            {event.priceMax
              ? `–$${Math.round(parseFloat(event.priceMax))}`
              : ''}
          </span>
        ) : (
          !isAdding &&
          onAddPrice && (
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              + Add
            </AdminButton>
          )
        )}
      </div>

      {isAdding && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Row 1: price inputs + selects */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              placeholder={REVIEW_COPY.adminReviewMobile.priceLowPlaceholder}
              value={priceMin}
              onChange={(evt) => setPriceMin(evt.target.value)}
              min={0}
              step={1}
              style={{
                width: 72,
                flexShrink: 0,
                height: 30,
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
            <input
              type="number"
              placeholder={REVIEW_COPY.adminReviewMobile.priceHighPlaceholder}
              value={priceMax}
              onChange={(evt) => setPriceMax(evt.target.value)}
              min={0}
              step={1}
              style={{
                width: 72,
                flexShrink: 0,
                height: 30,
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
            <select
              value={vendor}
              onChange={(evt) => setVendor(evt.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: 30,
                padding: '0 6px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            >
              <option value="Ticketmaster">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.ticketmaster}
              </option>
              <option value="AXS">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.axs}
              </option>
              <option value="SeatGeek">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.seatgeek}
              </option>
              <option value="DICE">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.dice}
              </option>
              <option value="Eventbrite">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.eventbrite}
              </option>
              <option value="VenueBoxOffice">
                {REVIEW_COPY.adminReviewMobile.vendorOptions.venueBoxOffice}
              </option>
            </select>
            <select
              value={howFound}
              onChange={(evt) => setHowFound(evt.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: 30,
                padding: '0 6px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            >
              <option value="saw_listing">
                {REVIEW_COPY.adminReviewMobile.howFoundOptions.sawListing}
              </option>
              <option value="bought_myself">
                {REVIEW_COPY.adminReviewMobile.howFoundOptions.boughtMyself}
              </option>
              <option value="at_the_venue">
                {REVIEW_COPY.adminReviewMobile.howFoundOptions.atTheVenue}
              </option>
            </select>
          </div>
          {/* Row 2: actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <AdminButton
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setIsAdding(false)}
              disabled={isSaving}
            >
              {REVIEW_COPY.adminReviewMobile.cancel}
            </AdminButton>
            <AdminButton
              variant="success"
              size="sm"
              fullWidth
              onClick={() => void handleSave()}
              disabled={isSaving || !priceMin.trim()}
            >
              {isSaving
                ? REVIEW_COPY.adminReviewMobile.saving
                : REVIEW_COPY.adminReviewMobile.save}
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminReviewMobile({
  events,
  submissions,
  priceEvents,
  onApprove,
  onReject,
  onApproveSubmission,
  onDenySubmission,
  onAddPrice,
  initialTab = 'flags',
}: AdminReviewMobileProps) {
  const [activeTab, setActiveTab] = useState<'flags' | 'prices'>(initialTab)
  const [showMissingOnly, setShowMissingOnly] = useState(false)

  const missingPriceEvents = priceEvents.filter((ev) => ev.priceMin === null)
  const visiblePriceEvents = showMissingOnly ? missingPriceEvents : priceEvents
  const priceCount = submissions.length + missingPriceEvents.length

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 16,
      }}
    >
      {/* Tab switcher — not sticky; the component fills available height so the main scroll container never scrolls */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          padding: 4,
          background: 'var(--surface-1)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          gap: 6,
        }}
      >
        {(
          [
            {
              key: 'flags',
              label: REVIEW_COPY.adminReviewMobile.tabEventFlags,
              count: events.length,
            },
            {
              key: 'prices',
              label: REVIEW_COPY.adminReviewMobile.tabPrices,
              count: priceCount,
            },
          ] as const
        ).map(({ key, label, count }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 0',
                border: 'none',
                borderRadius: 7,
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {label}
              {count > 0 && (
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: isActive ? 'var(--signal)' : 'var(--surface-2)',
                    color: isActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Event flags tab — fills remaining height, scrolls internally */}
      {activeTab === 'flags' && (
        <div
          style={{
            ...cardStyle,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: '48px 32px',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background:
                      'color-mix(in oklab, var(--success) 16%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={24} color="var(--success)" strokeWidth={2.5} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--fg)',
                      marginBottom: 8,
                    }}
                  >
                    {REVIEW_COPY.adminReviewMobile.queueClearHeading}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: 'var(--fg-muted)',
                      lineHeight: 1.5,
                      maxWidth: 260,
                    }}
                  >
                    {REVIEW_COPY.adminReviewMobile.queueClearBody}
                  </div>
                </div>
              </div>
            ) : (
              events.map((ev) => (
                <EventFlagCard
                  key={ev.id}
                  event={ev}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Prices tab — community submissions + needs price, each fills half the available height */}
      {activeTab === 'prices' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              ...cardStyle,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Community submissions header */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 16px 10px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--fg)',
                }}
              >
                {REVIEW_COPY.adminReviewMobile.communitySubmissionsHeader}
              </span>
              <StatusBadge kind="signal">
                {submissions.length} pending
              </StatusBadge>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {submissions.length === 0 ? (
                <div
                  style={{
                    padding: '12px 16px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: 'var(--fg-subtle)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {REVIEW_COPY.adminReviewMobile.noSubmissions}
                </div>
              ) : (
                submissions.map((sub) => {
                  const formatPrice = (val: string) =>
                    `$${Math.round(parseFloat(val))}`
                  const priceDisplay = sub.priceMin
                    ? `${formatPrice(sub.priceMin)}${sub.priceMax ? `–${formatPrice(sub.priceMax)}` : ''}`
                    : '—'
                  const linkedEvent = priceEvents.find(
                    (ev) => ev.eventId === sub.eventId,
                  )
                  const eventTitle =
                    linkedEvent?.eventTitle ?? sub.eventId.slice(0, 8) + '…'
                  const venueLine = linkedEvent
                    ? [
                        linkedEvent.venueName,
                        new Date(
                          linkedEvent.date + 'T12:00:00',
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : null
                  const handle = `@${sub.userId.slice(0, 10)}`
                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
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
                            {eventTitle}
                          </div>
                          {venueLine && (
                            <div
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: 12,
                                color: 'var(--fg-muted)',
                                marginTop: 1,
                              }}
                            >
                              {venueLine}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--fg)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {priceDisplay}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginBottom: 8,
                          fontSize: 12,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            color: 'var(--accent)',
                            flexShrink: 0,
                          }}
                        >
                          {handle}
                        </span>
                        {sub.note && (
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              color: 'var(--fg-muted)',
                              fontStyle: 'italic',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            &ldquo;{sub.note}&rdquo;
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() => onDenySubmission(sub.id)}
                        >
                          {REVIEW_COPY.adminReviewMobile.denySubmission}
                        </AdminButton>
                        <AdminButton
                          variant="success"
                          size="sm"
                          fullWidth
                          onClick={() => onApproveSubmission(sub.id)}
                        >
                          {REVIEW_COPY.adminReviewMobile.approveSubmission}
                        </AdminButton>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Needs price — fills other half */}
          <div
            style={{
              ...cardStyle,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: '12px 16px 10px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--fg)',
                }}
              >
                {REVIEW_COPY.adminReviewMobile.needsPrice}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AdminButton
                  variant={showMissingOnly ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => setShowMissingOnly((prev) => !prev)}
                >
                  {REVIEW_COPY.adminReviewMobile.missingOnly}
                </AdminButton>
                <StatusBadge kind="warning">
                  {missingPriceEvents.length}
                </StatusBadge>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {visiblePriceEvents.length === 0 ? (
                <div
                  style={{
                    padding: '12px 16px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {showMissingOnly
                    ? REVIEW_COPY.adminReviewMobile.allHavePrices
                    : REVIEW_COPY.adminReviewMobile.noUpcomingEvents}
                </div>
              ) : (
                visiblePriceEvents.map((ev) => (
                  <NeedsPriceRow
                    key={ev.eventId}
                    event={ev}
                    onAddPrice={onAddPrice}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { isSafeHttpUrl } from '@/lib/is-safe-http-url'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldOff,
  Play,
  Pause,
} from 'lucide-react'
import type { VenueWithEventCount } from '@concert-crawl/types'
import type { ExtractionStrategy } from '@concert-crawl/types'
import {
  AdminButton,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
} from '@/components/admin/primitives'
import { VenueQuickView } from '@/components/admin/VenueQuickView'
import {
  bulkVerifyVenues,
  bulkUnverifyVenues,
  bulkActivateVenues,
  bulkDeactivateVenues,
} from '@/lib/actions/venues'
import {
  deriveVenueStatus,
  venueHealthPercent,
  type VenueStatus,
} from '@/lib/admin/venue-status'
import { deriveBulkVisibility } from './venue-table-bulk'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

function sourceUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

const STATUS_BADGE_KIND: Record<VenueStatus, 'success' | 'warning' | 'danger'> =
  {
    active: 'success',
    paused: 'warning',
    blocked: 'danger',
  }

function strategyLabel(strategy: ExtractionStrategy | null): string {
  if (strategy === 'structured_data') return 'structured'
  if (strategy === 'llm') return 'llm'
  if (strategy === 'manual') return 'manual'
  return 'auto'
}

function strategyKind(
  strategy: ExtractionStrategy | null,
): 'signal' | 'accent' | 'neutral' {
  if (strategy === 'structured_data') return 'signal'
  if (strategy === 'llm') return 'accent'
  return 'neutral'
}

interface Props {
  venues: VenueWithEventCount[]
}

export function VenueTableClient({ venues }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsMobile(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const allSelected = venues.length > 0 && selected.size === venues.length
  const someSelected = selected.size > 0

  const selectedVenues = venues.filter((venue) => selected.has(venue.id))
  const { showVerify, showUnverify, showActivate, showDeactivate } =
    deriveBulkVisibility(selectedVenues)

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(venues.map((venue) => venue.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function runBulkAction(action: (ids: string[]) => Promise<void>) {
    const ids = Array.from(selected)
    startTransition(async () => {
      await action(ids)
      setSelected(new Set())
    })
  }

  if (isMobile) {
    if (venues.length === 0) {
      return (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          {ADMIN_COPY.venueTableClient.empty}
        </div>
      )
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 12,
        }}
      >
        {venues.map((venue) => {
          const status = deriveVenueStatus(venue)
          const isExpanded = expandedId === venue.id

          return (
            <div
              key={venue.id}
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 12,
                border: `1px solid ${isExpanded ? 'var(--border-strong)' : 'var(--border)'}`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/admin/venues/${venue.id}`}
                    style={{
                      display: 'block',
                      fontFamily: 'var(--admin-font, Inter, sans-serif)',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--fg)',
                      textDecoration: 'none',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {venue.name}
                  </Link>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <StatusBadge kind={STATUS_BADGE_KIND[status]} dot>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </StatusBadge>
                    <StatusBadge
                      kind={strategyKind(venue.extractionStrategy)}
                      variant="mono"
                    >
                      {strategyLabel(venue.extractionStrategy)}
                    </StatusBadge>
                    {venue.lastCrawledAt && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        · <RelTime iso={venue.lastCrawledAt} />
                      </span>
                    )}
                  </div>
                </div>
                <button
                  aria-label={
                    isExpanded
                      ? ADMIN_COPY.venueTableClient.expand.collapseAriaLabel
                      : ADMIN_COPY.venueTableClient.expand.expandAriaLabel
                  }
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(venue.id)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    color: 'var(--fg-muted)',
                    transition: 'transform .15s',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <VenueQuickView venue={venue} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Filter / bulk action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {someSelected ? (
            <>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {selected.size}{' '}
                {ADMIN_COPY.venueTableClient.bulkActions.selected}
              </span>
              {showVerify && (
                <AdminButton
                  variant="success"
                  size="sm"
                  icon={ShieldCheck}
                  disabled={isPending}
                  onClick={() => runBulkAction(bulkVerifyVenues)}
                >
                  {ADMIN_COPY.venueTableClient.bulkActions.verify}
                </AdminButton>
              )}
              {showUnverify && (
                <AdminButton
                  variant="outline"
                  size="sm"
                  icon={ShieldOff}
                  disabled={isPending}
                  onClick={() => runBulkAction(bulkUnverifyVenues)}
                >
                  {ADMIN_COPY.venueTableClient.bulkActions.unverify}
                </AdminButton>
              )}
              {showActivate && (
                <AdminButton
                  variant="outline"
                  size="sm"
                  icon={Play}
                  disabled={isPending}
                  onClick={() => runBulkAction(bulkActivateVenues)}
                >
                  {ADMIN_COPY.venueTableClient.bulkActions.activate}
                </AdminButton>
              )}
              {showDeactivate && (
                <AdminButton
                  variant="danger"
                  size="sm"
                  icon={Pause}
                  disabled={isPending}
                  onClick={() => runBulkAction(bulkDeactivateVenues)}
                >
                  {ADMIN_COPY.venueTableClient.bulkActions.deactivate}
                </AdminButton>
              )}
            </>
          ) : (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg)',
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
              }}
            >
              {ADMIN_COPY.venueTableClient.configuredVenues}{' '}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: 'var(--fg-subtle)',
                }}
              >
                {venues.length}
              </span>
            </span>
          )}
        </div>
      </div>

      <AdminTable>
        <THead>
          <tr>
            <TH width={40}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ cursor: 'pointer' }}
                aria-label={ADMIN_COPY.venueTableClient.selectAll}
              />
            </TH>
            <TH width={32} />
            <TH>{ADMIN_COPY.venueTableClient.columns.venue}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.sourceUrl}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.strategy}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.schedule}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.status}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.health}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.lastCrawl}</TH>
            <TH>{ADMIN_COPY.venueTableClient.columns.events}</TH>
          </tr>
        </THead>
        <tbody>
          {venues.length === 0 && (
            <tr>
              <td
                colSpan={10}
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'var(--fg-muted)',
                }}
              >
                {ADMIN_COPY.venueTableClient.empty}
              </td>
            </tr>
          )}
          {venues.map((venue) => {
            const status = deriveVenueStatus(venue)
            const health = venueHealthPercent(venue)
            const isExpanded = expandedId === venue.id
            const hasError =
              venue.consecutiveFailures > 0 || venue.blockedAt !== null

            return (
              <React.Fragment key={venue.id}>
                <TR>
                  <TD width={40}>
                    <input
                      type="checkbox"
                      checked={selected.has(venue.id)}
                      onChange={() => toggleOne(venue.id)}
                      style={{ cursor: 'pointer' }}
                      aria-label={`${ADMIN_COPY.venueTableClient.selectVenue} ${venue.name}`}
                    />
                  </TD>
                  <TD width={32}>
                    <button
                      aria-label={
                        isExpanded
                          ? ADMIN_COPY.venueTableClient.expand.collapseAriaLabel
                          : ADMIN_COPY.venueTableClient.expand.expandAriaLabel
                      }
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpand(venue.id)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        color: 'var(--fg-muted)',
                        transition: 'transform .15s',
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </TD>
                  <TD>
                    <Link
                      href={`/admin/venues/${venue.id}`}
                      style={{
                        fontWeight: 600,
                        color: 'var(--fg)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(evt) =>
                        (evt.currentTarget.style.textDecoration = 'underline')
                      }
                      onMouseLeave={(evt) =>
                        (evt.currentTarget.style.textDecoration = 'none')
                      }
                    >
                      {venue.name}
                    </Link>
                    {hasError && venue.crawlNotes && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--danger)',
                          marginTop: 2,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {venue.crawlNotes}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {isSafeHttpUrl(venue.websiteUrl) ? (
                      <a
                        href={venue.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--fg-muted)',
                          textDecoration: 'none',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                        }}
                      >
                        <ExternalLink size={11} style={{ flexShrink: 0 }} />
                        {sourceUrl(venue.websiteUrl)}
                      </a>
                    ) : (
                      <span
                        style={{
                          color: 'var(--fg-muted)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                        }}
                      >
                        {sourceUrl(venue.websiteUrl)}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge
                      kind={strategyKind(venue.extractionStrategy)}
                      variant="mono"
                    >
                      {strategyLabel(venue.extractionStrategy)}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        fontFamily: 'var(--admin-font, Inter, sans-serif)',
                      }}
                    >
                      {ADMIN_COPY.venueTableClient.schedule}
                    </span>
                  </TD>
                  <TD>
                    {status === 'blocked' ? (
                      <Link
                        href={`/admin/crawl?venueId=${venue.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <StatusBadge kind={STATUS_BADGE_KIND[status]} dot>
                          Blocked ↗
                        </StatusBadge>
                      </Link>
                    ) : (
                      <StatusBadge kind={STATUS_BADGE_KIND[status]} dot>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </StatusBadge>
                    )}
                  </TD>
                  <TD>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background:
                            health === 100
                              ? 'var(--success)'
                              : health >= 60
                                ? 'var(--warning)'
                                : 'var(--danger)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {health}%
                      </span>
                    </div>
                  </TD>
                  <TD>
                    {venue.lastCrawledAt ? (
                      <RelTime iso={venue.lastCrawledAt} />
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                    )}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {venue.eventCount > 0 ? (
                      String(venue.eventCount)
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                    )}
                  </TD>
                </TR>
                {isExpanded && (
                  <tr key={`${venue.id}-expand`}>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <VenueQuickView venue={venue} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </AdminTable>
    </div>
  )
}

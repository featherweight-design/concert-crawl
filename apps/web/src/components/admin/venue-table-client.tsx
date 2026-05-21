'use client'

import React, { useState, useTransition } from 'react'
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
                {selected.size} selected
              </span>
              {showVerify && (
                <AdminButton
                  variant="success"
                  size="sm"
                  icon={ShieldCheck}
                  disabled={isPending}
                  onClick={() => runBulkAction(bulkVerifyVenues)}
                >
                  Verify
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
                  Unverify
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
                  Activate
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
                  Deactivate
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
              Configured venues{' '}
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
                aria-label="Select all venues"
              />
            </TH>
            <TH width={32} />
            <TH>Venue</TH>
            <TH>Source URL</TH>
            <TH>Strategy</TH>
            <TH>Schedule</TH>
            <TH>Status</TH>
            <TH>Health</TH>
            <TH>Last crawl</TH>
            <TH>Events</TH>
          </tr>
        </THead>
        <tbody>
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
                      aria-label={`Select ${venue.name}`}
                    />
                  </TD>
                  <TD width={32}>
                    <button
                      aria-label={
                        isExpanded ? 'Collapse venue' : 'Expand venue'
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
                      daily · 3 AM MT
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

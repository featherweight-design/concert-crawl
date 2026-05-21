'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VenueWithEventCount } from '@concert-crawl/types'
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
import { ShieldCheck, ShieldOff, Play, Pause, ChevronRight } from 'lucide-react'
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

function venueSubNotes(venue: VenueWithEventCount): string[] {
  const notes: string[] = []
  if (venue.robotsTxtAllowed === false) notes.push('robots.txt disallows')
  if (venue.crawlNotes) notes.push(venue.crawlNotes)
  return notes
}

const STATUS_BADGE_KIND: Record<VenueStatus, 'success' | 'warning' | 'danger'> =
  {
    active: 'success',
    paused: 'warning',
    blocked: 'danger',
  }

interface Props {
  venues: VenueWithEventCount[]
  currentFilter: string | undefined
}

export function VenueTableClient({ venues, currentFilter }: Props) {
  const router = useRouter()
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
            <TH width={36} />
            <TH width={40}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ cursor: 'pointer' }}
                aria-label="Select all venues"
              />
            </TH>
            <TH>Venue</TH>
            <TH>Source URL</TH>
            <TH>robots.txt</TH>
            <TH>Status</TH>
            <TH>Health</TH>
            <TH>Last crawl</TH>
            <TH>Events</TH>
          </tr>
        </THead>
        <tbody>
          {venues.map((venue) => {
            const status = deriveVenueStatus(venue)
            const notes = venueSubNotes(venue)
            const health = venueHealthPercent(venue)
            const isExpanded = expandedId === venue.id

            return (
              <React.Fragment key={venue.id}>
                <TR>
                  <TD width={36}>
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
                  <TD width={40}>
                    <input
                      type="checkbox"
                      checked={selected.has(venue.id)}
                      onChange={() => toggleOne(venue.id)}
                      style={{ cursor: 'pointer' }}
                      aria-label={`Select ${venue.name}`}
                    />
                  </TD>
                  <TD>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <ShieldCheck
                        size={13}
                        style={{
                          flexShrink: 0,
                          color: venue.verified
                            ? 'var(--success)'
                            : 'var(--fg-subtle)',
                        }}
                        aria-label={venue.verified ? 'Verified' : 'Unverified'}
                      />
                      <Link
                        href={`/admin/venues/${venue.id}`}
                        style={{
                          fontWeight: 500,
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
                    </div>
                    {notes.map((note, idx) => (
                      <div
                        key={`${venue.id}-note-${idx}`}
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-subtle)',
                          marginTop: 2,
                          paddingLeft: 19,
                        }}
                      >
                        {note}
                      </div>
                    ))}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    <a
                      href={venue.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--signal)', textDecoration: 'none' }}
                    >
                      {sourceUrl(venue.websiteUrl)}
                    </a>
                  </TD>
                  <TD>
                    {venue.robotsTxtAllowed === null ? (
                      <StatusBadge kind="neutral">unchecked</StatusBadge>
                    ) : venue.robotsTxtAllowed ? (
                      <StatusBadge kind="success" dot>
                        allowed
                      </StatusBadge>
                    ) : (
                      <StatusBadge kind="danger" dot>
                        blocked
                      </StatusBadge>
                    )}
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
                    <td colSpan={9} style={{ padding: 0 }}>
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

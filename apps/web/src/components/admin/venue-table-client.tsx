'use client'

import { useState, useTransition } from 'react'
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
import { ShieldCheck, ShieldOff, Play, Pause } from 'lucide-react'
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

  const allSelected = venues.length > 0 && selected.size === venues.length
  const someSelected = selected.size > 0

  const selectedVenues = venues.filter((venue) => selected.has(venue.id))
  const anyUnverified = selectedVenues.some((venue) => !venue.verified)
  const anyVerified = selectedVenues.some((venue) => venue.verified)

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

  function handleFilterChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const val = evt.target.value
    if (val) {
      router.push(`/admin/venues?status=${val}`)
    } else {
      router.push('/admin/venues')
    }
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
              {anyUnverified && (
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
              {anyVerified && (
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
              <AdminButton
                variant="outline"
                size="sm"
                icon={Play}
                disabled={isPending}
                onClick={() => runBulkAction(bulkActivateVenues)}
              >
                Activate
              </AdminButton>
              <AdminButton
                variant="danger"
                size="sm"
                icon={Pause}
                disabled={isPending}
                onClick={() => runBulkAction(bulkDeactivateVenues)}
              >
                Deactivate
              </AdminButton>
            </>
          ) : (
            <span
              style={{
                fontSize: 12,
                color: 'var(--fg-subtle)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Configured venues{' '}
              <strong style={{ color: 'var(--fg-muted)' }}>
                {venues.length}
              </strong>
            </span>
          )}
        </div>

        <select
          aria-label="Filter by status"
          value={currentFilter ?? ''}
          onChange={handleFilterChange}
          style={{
            height: 32,
            padding: '0 28px 0 10px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="blocked">Blocked</option>
        </select>
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
            <TH>Venue</TH>
            <TH>Source URL</TH>
            <TH>robots.txt</TH>
            <TH>Status</TH>
            <TH>Health</TH>
            <TH>Last crawl</TH>
            <TH>Events</TH>
            <TH></TH>
          </tr>
        </THead>
        <tbody>
          {venues.map((venue) => {
            const status = deriveVenueStatus(venue)
            const notes = venueSubNotes(venue)
            const health = venueHealthPercent(venue)

            return (
              <TR key={venue.id}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    <span style={{ fontWeight: 500 }}>{venue.name}</span>
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
                <TD>
                  <Link href={`/admin/venues/${venue.id}`}>
                    <AdminButton variant="ghost" size="sm">
                      Edit
                    </AdminButton>
                  </Link>
                </TD>
              </TR>
            )
          })}
        </tbody>
      </AdminTable>
    </div>
  )
}

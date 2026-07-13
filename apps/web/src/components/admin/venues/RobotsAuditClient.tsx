'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { VenueRobotsStatus } from '@concert-crawl/types'
import {
  Panel,
  SectionHead,
  StatCard,
  StatusBadge,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  RelTime,
} from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  ROBOTS_STATUS_KIND,
  countRobotsStatuses,
  deriveRobotsStatus,
  isHttpUrl,
  safeHostname,
  type RobotsStatusFilter,
} from '@/lib/admin/robots-audit'

const COPY = ADMIN_COPY.robotsAudit

const FILTER_RAIL: ReadonlyArray<RobotsStatusFilter> = [
  'all',
  'allowed',
  'blocked',
  'unchecked',
]

interface RobotsAuditClientProps {
  // null signals a first-paint load failure — the SSR fetch swallows the error
  // and hands null so the route still renders with a recoverable banner.
  venues: VenueRobotsStatus[] | null
}

export const RobotsAuditClient = ({ venues }: RobotsAuditClientProps) => {
  const [filter, setFilter] = useState<RobotsStatusFilter>('all')

  const rows = useMemo(() => venues ?? [], [venues])
  const counts = useMemo(() => countRobotsStatuses(rows), [rows])

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? rows
        : rows.filter((venue) => deriveRobotsStatus(venue) === filter),
    [rows, filter],
  )

  const backLink = (
    <Link
      href="/admin/venues"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        textDecoration: 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <ArrowLeft size={14} />
      {COPY.page.backButton}
    </Link>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {backLink}
      <SectionHead
        eyebrow={COPY.page.eyebrow}
        title={COPY.page.title}
        subtitle={COPY.page.subtitle}
      />

      {venues === null ? (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border:
              '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
            background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
            fontSize: 13,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {COPY.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label={COPY.stats.total}
              value={String(counts.total)}
              iconName="ShieldCheck"
              kind="neutral"
              noChip
            />
            <StatCard
              label={COPY.stats.allowed}
              value={String(counts.allowed)}
              iconName="Check"
              kind="success"
            />
            <StatCard
              label={COPY.stats.blocked}
              value={String(counts.blocked)}
              iconName="Ban"
              kind={counts.blocked > 0 ? 'danger' : 'neutral'}
            />
            <StatCard
              label={COPY.stats.unchecked}
              value={String(counts.unchecked)}
              iconName="CircleHelp"
              kind={counts.unchecked > 0 ? 'warning' : 'neutral'}
            />
          </div>

          <div
            role="group"
            aria-label={COPY.filters.ariaLabel}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            {FILTER_RAIL.map((key) => {
              const active = filter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  style={{
                    height: 30,
                    padding: '0 12px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                    background: active ? 'var(--signal)' : 'var(--surface-1)',
                    border: `1px solid ${
                      active ? 'var(--signal)' : 'var(--border-strong)'
                    }`,
                  }}
                >
                  {COPY.filters[key]}
                </button>
              )
            })}
          </div>

          <Panel padding={0}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  color: 'var(--fg-muted)',
                  fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {COPY.empty}
              </div>
            ) : (
              <AdminTable minWidth={640}>
                <THead>
                  <TR>
                    <TH>{COPY.table.venue}</TH>
                    <TH>{COPY.table.website}</TH>
                    <TH>{COPY.table.status}</TH>
                    <TH>{COPY.table.checked}</TH>
                  </TR>
                </THead>
                <tbody>
                  {filtered.map((venue) => {
                    const status = deriveRobotsStatus(venue)
                    return (
                      <TR key={venue.id}>
                        <TD>{venue.name}</TD>
                        <TD>
                          {isHttpUrl(venue.websiteUrl) ? (
                            <a
                              href={venue.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                color: 'var(--signal)',
                                textDecoration: 'none',
                                fontSize: 13,
                              }}
                            >
                              {safeHostname(venue.websiteUrl)}
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span
                              style={{
                                fontSize: 13,
                                color: 'var(--fg-muted)',
                              }}
                            >
                              {safeHostname(venue.websiteUrl)}
                            </span>
                          )}
                        </TD>
                        <TD>
                          <StatusBadge kind={ROBOTS_STATUS_KIND[status]} dot>
                            {COPY.status[status]}
                          </StatusBadge>
                        </TD>
                        <TD>
                          {venue.robotsTxtCheckedAt ? (
                            <RelTime iso={venue.robotsTxtCheckedAt} />
                          ) : (
                            <span style={{ color: 'var(--fg-subtle)' }}>
                              {COPY.neverChecked}
                            </span>
                          )}
                        </TD>
                      </TR>
                    )
                  })}
                </tbody>
              </AdminTable>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

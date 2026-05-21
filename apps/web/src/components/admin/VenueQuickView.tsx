'use client'

import Link from 'next/link'
import {
  ExternalLink,
  RefreshCw,
  Settings,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { VenueWithEventCount } from '@concert-crawl/types'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { useTriggerVenueCrawl } from '@/lib/queries/use-admin-crawl-trigger'
import { useState, useRef, useEffect } from 'react'

interface Props {
  venue: VenueWithEventCount
}

const TICKET_VENDOR_LABELS: Record<string, string> = {
  axs: 'AXS',
  ticketmaster: 'Ticketmaster',
  seatgeek: 'SeatGeek',
  dice: 'Dice',
  eventbrite: 'Eventbrite',
  venue_box_office: 'Box Office',
  unknown: 'Unknown',
}

function formatStrategy(strategy: string | null): string {
  if (strategy === 'structured_data') return 'structured'
  if (strategy === 'llm') return 'llm'
  if (strategy === 'manual') return 'manual'
  return 'auto'
}

function strategyKind(
  strategy: string | null,
): 'signal' | 'accent' | 'neutral' {
  if (strategy === 'structured_data') return 'signal'
  if (strategy === 'llm') return 'accent'
  return 'neutral'
}

function failureColor(count: number): string {
  if (count >= 3) return 'var(--danger)'
  if (count > 0) return 'var(--warning)'
  return 'var(--fg)'
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
  marginBottom: 6,
}

export function VenueQuickView({ venue }: Props) {
  const triggerCrawl = useTriggerVenueCrawl()
  const [crawlState, setCrawlState] = useState<
    'idle' | 'triggering' | 'queued' | 'error'
  >('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleRunCrawl() {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    setCrawlState('triggering')
    try {
      await triggerCrawl.mutateAsync(venue.id)
      setCrawlState('queued')
      timeoutRef.current = setTimeout(() => setCrawlState('idle'), 4000)
    } catch {
      setCrawlState('error')
      timeoutRef.current = setTimeout(() => setCrawlState('idle'), 3000)
    }
  }

  const crawlLabel =
    crawlState === 'triggering'
      ? 'Triggering…'
      : crawlState === 'queued'
        ? 'Queued ✓'
        : crawlState === 'error'
          ? 'Error — retry?'
          : 'Run crawl now'

  const vendorLabel = venue.ticketVendor
    ? (TICKET_VENDOR_LABELS[venue.ticketVendor] ?? venue.ticketVendor)
    : null

  return (
    <div
      style={{
        padding: '18px 22px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Info grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 18,
          marginBottom: 14,
        }}
      >
        {/* Ticket Vendor */}
        <div>
          <div style={SECTION_LABEL}>Ticket vendor</div>
          {vendorLabel ? (
            <div>
              <div
                style={{
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 4,
                }}
              >
                {vendorLabel}
              </div>
              {venue.priceUrl && (
                <a
                  href={venue.priceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: 'var(--signal)',
                    textDecoration: 'none',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={10} />
                  {venue.priceUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          ) : (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--fg-subtle)',
              }}
            >
              —
            </span>
          )}
        </div>

        {/* Crawl Schedule */}
        <div>
          <div style={SECTION_LABEL}>Crawl schedule</div>
          <div
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--fg)',
              marginBottom: 4,
            }}
          >
            daily · 3 AM MT
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
            }}
          >
            0 0 3 * * *
          </div>
        </div>

        {/* Extraction Strategy */}
        <div>
          <div style={SECTION_LABEL}>Extraction strategy</div>
          <StatusBadge
            kind={strategyKind(venue.extractionStrategy)}
            variant="mono"
          >
            {formatStrategy(venue.extractionStrategy)}
          </StatusBadge>
        </div>

        {/* Consecutive Failures */}
        <div>
          <div style={SECTION_LABEL}>Consecutive failures</div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              color: failureColor(venue.consecutiveFailures),
            }}
          >
            {venue.consecutiveFailures}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-muted)',
              marginLeft: 4,
            }}
          >
            of 4
          </span>
        </div>

        {/* Robots.txt */}
        <div>
          <div style={SECTION_LABEL}>robots.txt</div>
          {venue.robotsTxtAllowed === null ? (
            <StatusBadge kind="neutral">unchecked</StatusBadge>
          ) : venue.robotsTxtAllowed ? (
            <StatusBadge kind="success" variant="outline">
              allowed
            </StatusBadge>
          ) : (
            <StatusBadge kind="danger" variant="outline">
              disallowed
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Error banner */}
      {(venue.consecutiveFailures > 0 || venue.blockedAt !== null) &&
        venue.crawlNotes && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 14,
              background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--danger) 28%, transparent)',
            }}
          >
            <AlertCircle
              size={14}
              style={{ flexShrink: 0, color: 'var(--danger)' }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: 'var(--danger)',
                fontWeight: 500,
              }}
            >
              {venue.crawlNotes}
            </span>
          </div>
        )}

      {/* Action shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <AdminButton
          variant={crawlState === 'queued' ? 'success' : 'primary'}
          size="sm"
          icon={RefreshCw}
          disabled={crawlState === 'triggering' || crawlState === 'queued'}
          onClick={handleRunCrawl}
        >
          {crawlLabel}
        </AdminButton>
        <Link
          href={`/admin/venues/${venue.id}`}
          style={{ textDecoration: 'none' }}
        >
          <AdminButton variant="outline" size="sm" icon={Settings}>
            Edit venue
          </AdminButton>
        </Link>
        <Link
          href={`/admin/venues/${venue.id}`}
          style={{ textDecoration: 'none' }}
        >
          <AdminButton variant="outline" size="sm" icon={ExternalLink}>
            Open detail
          </AdminButton>
        </Link>
        <div style={{ flex: 1 }} />
        <Link
          href={`/admin/crawl?venueId=${venue.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--fg)',
            textDecoration: 'none',
          }}
        >
          Crawl history
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ExternalLink, RefreshCw, Settings, BarChart2 } from 'lucide-react'
import type { VenueWithEventCount } from '@concert-crawl/types'
import { AdminButton } from '@/components/admin/primitives'
import { useTriggerVenueCrawl } from '@/lib/queries/use-admin-crawl-trigger'
import { useState } from 'react'

interface Props {
  venue: VenueWithEventCount
}

function failureColor(count: number): string {
  if (count >= 3) return 'var(--danger)'
  if (count > 0) return 'var(--warning)'
  return 'var(--fg)'
}

export function VenueQuickView({ venue }: Props) {
  const triggerCrawl = useTriggerVenueCrawl()
  const [crawlState, setCrawlState] = useState<
    'idle' | 'triggering' | 'queued' | 'error'
  >('idle')

  async function handleRunCrawl() {
    setCrawlState('triggering')
    try {
      await triggerCrawl.mutateAsync(venue.id)
      setCrawlState('queued')
      setTimeout(() => setCrawlState('idle'), 4000)
    } catch {
      setCrawlState('error')
      setTimeout(() => setCrawlState('idle'), 3000)
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 18,
          marginBottom: 14,
        }}
      >
        {/* Ticket / price URL */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-subtle)',
              marginBottom: 4,
            }}
          >
            Ticket URL
          </div>
          {venue.priceUrl ? (
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
                whiteSpace: 'nowrap' as const,
              }}
            >
              <ExternalLink size={10} />
              {venue.priceUrl.replace(/^https?:\/\//, '')}
            </a>
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

        {/* Consecutive failures */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-subtle)',
              marginBottom: 4,
            }}
          >
            Failures
          </div>
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
              color: 'var(--fg-subtle)',
              marginLeft: 4,
            }}
          >
            of 4
          </span>
        </div>

        {/* Extraction strategy */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-subtle)',
              marginBottom: 4,
            }}
          >
            Strategy
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-muted)',
            }}
          >
            {venue.extractionStrategy ?? 'auto'}
          </span>
        </div>

        {/* Events */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-subtle)',
              marginBottom: 4,
            }}
          >
            Events tracked
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              color: venue.eventCount > 0 ? 'var(--fg)' : 'var(--fg-subtle)',
            }}
          >
            {venue.eventCount}
          </span>
        </div>
      </div>

      {/* Last error strip */}
      {venue.consecutiveFailures > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 14,
            background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
            border:
              '1px solid color-mix(in oklab, var(--danger) 22%, transparent)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--danger)',
              fontWeight: 600,
              marginBottom: venue.crawlNotes ? 4 : 0,
            }}
          >
            {venue.blockedAt
              ? `Blocked since ${new Date(venue.blockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : `${venue.consecutiveFailures} consecutive failure${venue.consecutiveFailures === 1 ? '' : 's'}`}
          </div>
          {venue.crawlNotes && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--fg-muted)',
              }}
            >
              {venue.crawlNotes}
            </div>
          )}
        </div>
      )}

      {/* Action shelf */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
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
          href={`/admin/crawl?venueId=${venue.id}`}
          style={{ textDecoration: 'none' }}
        >
          <AdminButton variant="ghost" size="sm" icon={BarChart2}>
            Crawl history
          </AdminButton>
        </Link>
      </div>
    </div>
  )
}

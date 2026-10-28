'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time'
import { AdminButton } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { pauseCrawling, resumeCrawling } from '@/lib/actions/venues'
import type { CrawlPauseControlProps } from './definitions/types'

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause

/**
 * Stops every crawl of a venue while its shows stay published, for a venue
 * that asked us to stop or one whose source we may not use yet. Distinct from
 * deactivating the venue, which takes its shows off the site.
 */
export const CrawlPauseControl = ({
  venueId,
  crawlPausedAt,
}: CrawlPauseControlProps) => {
  const router = useRouter()
  const reasonId = useId()
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const paused = crawlPausedAt !== null
  const trimmedReason = reason.trim()

  const toggleCrawlPause = () => {
    startTransition(async () => {
      if (paused) {
        await resumeCrawling(venueId)
      } else {
        await pauseCrawling(venueId, trimmedReason)
        setReason('')
      }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {crawlPausedAt !== null
              ? COPY.pausedSince(formatISODate(crawlPausedAt, DENVER_TIME_ZONE))
              : COPY.description}
          </div>
        </div>
        <AdminButton
          variant="outline"
          size="sm"
          icon={paused ? Play : Pause}
          disabled={isPending || (!paused && trimmedReason === '')}
          onClick={toggleCrawlPause}
          type="button"
        >
          {paused ? COPY.resumeButton : COPY.pauseButton}
        </AdminButton>
      </div>
      {!paused && (
        <>
          <label
            htmlFor={reasonId}
            style={{ fontSize: 12, color: 'var(--fg-muted)' }}
          >
            {COPY.reasonLabel}
          </label>
          <input
            id={reasonId}
            type="text"
            value={reason}
            maxLength={500}
            placeholder={COPY.reasonPlaceholder}
            onChange={(event) => setReason(event.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--fg)',
              // 16px or iOS Safari zooms the page when the field takes focus.
              fontSize: 16,
            }}
          />
        </>
      )}
    </div>
  )
}

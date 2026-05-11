'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { CrawlRun } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { formatDurationMs } from '@/lib/time'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { RefreshCw, Loader2 } from 'lucide-react'
import { triggerVenueCrawl, fetchCrawlRun } from './lib/crawl'
import { CRAWL_STATUS_BADGES, POLL_INTERVAL_MS } from './definitions/constants'
import { copy } from './definitions/copy'
import type { TriggerState } from './definitions/types'

interface CrawlTriggerButtonProps {
  venueId: string
}

export const CrawlTriggerButton = ({ venueId }: CrawlTriggerButtonProps) => {
  const { getToken } = useAuth()
  const router = useRouter()
  const [triggerState, setTriggerState] = useState<TriggerState>('idle')
  const [result, setResult] = useState<CrawlRun | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [])

  const startVenueCrawl = async () => {
    setTriggerState('triggering')
    setResult(null)
    setErrorMessage(null)

    try {
      const token = await getToken()
      if (!token) throw new Error(copy.errors.notAuthenticated)

      const { crawlRunId } = await triggerVenueCrawl(venueId, token)

      setTriggerState('polling')

      pollInterval.current = setInterval(async () => {
        try {
          const pollToken = await getToken()
          if (!pollToken) throw new Error(copy.errors.notAuthenticated)

          const run = await fetchCrawlRun(crawlRunId, pollToken)

          if (run.status !== 'in_progress') {
            clearInterval(pollInterval.current!)
            pollInterval.current = null
            setResult(run)
            setTriggerState('done')
            router.refresh()
          }
        } catch (err) {
          clearInterval(pollInterval.current!)
          pollInterval.current = null
          setTriggerState('error')
          setErrorMessage(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : copy.errors.pollFailed,
          )
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setTriggerState('error')
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : copy.errors.triggerFailed,
      )
    }
  }

  const isLoading = triggerState === 'triggering' || triggerState === 'polling'

  const buttonLabel =
    triggerState === 'triggering'
      ? copy.button.triggering
      : triggerState === 'polling'
        ? copy.button.polling
        : copy.button.idle

  const statusBadgeConfig =
    result && result.status in CRAWL_STATUS_BADGES
      ? CRAWL_STATUS_BADGES[result.status as keyof typeof CRAWL_STATUS_BADGES]
      : null

  return (
    <div
      aria-label="Crawl trigger"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AdminButton
          variant="primary"
          size="sm"
          icon={isLoading ? Loader2 : RefreshCw}
          onClick={startVenueCrawl}
          disabled={isLoading}
        >
          {buttonLabel}
        </AdminButton>
        {isLoading && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--fg-muted)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {triggerState === 'triggering'
              ? copy.status.initiating
              : copy.status.waiting}
          </span>
        )}
      </div>

      {triggerState === 'error' && errorMessage && (
        <span
          role="alert"
          style={{
            fontSize: 12,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {errorMessage}
        </span>
      )}

      {triggerState === 'done' && result && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusBadgeConfig && (
              <StatusBadge
                kind={result.status === 'success' ? 'success' : 'danger'}
                dot
              >
                {statusBadgeConfig.label}
              </StatusBadge>
            )}
            <span
              style={{
                fontSize: 12,
                color: 'var(--fg-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {result.eventsFound} found · {result.eventsInserted} inserted ·{' '}
              {formatDurationMs(result.durationMs)}
            </span>
          </div>
          {result.errorMessage && (
            <span
              role="alert"
              style={{
                fontSize: 11,
                color: 'var(--danger)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {result.errorMessage}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

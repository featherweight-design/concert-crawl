'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { CrawlRun } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { formatDurationMs } from '@/lib/time'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { RefreshCw, Loader2 } from 'lucide-react'
import {
  triggerVenueCrawl,
  fetchCrawlTrigger,
  fetchCrawlRun,
} from './lib/crawl'
import { CRAWL_STATUS_BADGES, POLL_INTERVAL_MS } from './definitions/constants'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import type { TriggerState } from './definitions/types'

// Status → StatusKind mapping kept in sync with CrawlHealthTable.STATUS_KIND
// so the same run renders consistently across the dashboard and trigger UI.
// Unknown values fall through to 'danger' at the call site.
const TRIGGER_STATUS_KIND: Record<string, StatusKind> = {
  success: 'success',
  skipped: 'signal',
  partial: 'warning',
  failed: 'danger',
}

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
      if (!token)
        throw new Error(ADMIN_COPY.crawlTriggerButton.errors.notAuthenticated)

      const { triggerId } = await triggerVenueCrawl(venueId, token)

      setTriggerState('polling')

      pollInterval.current = setInterval(async () => {
        try {
          const pollToken = await getToken()
          if (!pollToken)
            throw new Error(
              ADMIN_COPY.crawlTriggerButton.errors.notAuthenticated,
            )

          // The trigger is processed asynchronously by the crawler service,
          // which stamps a terminal status and (once a run row exists) a
          // crawlRunId. Poll the trigger until it settles, then fetch the
          // linked run for the result display.
          const trigger = await fetchCrawlTrigger(triggerId, pollToken)

          if (trigger.status === 'done' || trigger.status === 'failed') {
            clearInterval(pollInterval.current!)
            pollInterval.current = null

            if (trigger.crawlRunId) {
              const run = await fetchCrawlRun(trigger.crawlRunId, pollToken)
              setResult(run)
              setTriggerState('done')
              router.refresh()
            } else {
              setTriggerState('error')
              setErrorMessage(ADMIN_COPY.crawlTriggerButton.errors.crawlFailed)
            }
          }
        } catch (err) {
          clearInterval(pollInterval.current!)
          pollInterval.current = null
          setTriggerState('error')
          setErrorMessage(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : ADMIN_COPY.crawlTriggerButton.errors.pollFailed,
          )
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setTriggerState('error')
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : ADMIN_COPY.crawlTriggerButton.errors.triggerFailed,
      )
    }
  }

  const isLoading = triggerState === 'triggering' || triggerState === 'polling'

  const buttonLabel =
    triggerState === 'triggering'
      ? ADMIN_COPY.crawlTriggerButton.button.triggering
      : triggerState === 'polling'
        ? ADMIN_COPY.crawlTriggerButton.button.polling
        : ADMIN_COPY.crawlTriggerButton.button.idle

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
          variant="outline"
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
              ? ADMIN_COPY.crawlTriggerButton.status.initiating
              : ADMIN_COPY.crawlTriggerButton.status.waiting}
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
                kind={TRIGGER_STATUS_KIND[result.status] ?? 'danger'}
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

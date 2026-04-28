'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { CrawlRun } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { formatISODate, formatDurationMs } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { triggerVenueCrawl, fetchCrawlRun } from './lib/crawl'
import {
  CRAWL_STATUS_BADGES,
  POLL_INTERVAL_MS,
  DEFAULT_TIME_ZONE,
} from './definitions/constants'
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
    <section aria-label="Crawl trigger" className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={startVenueCrawl} disabled={isLoading}>
          {buttonLabel}
        </Button>
        {isLoading && (
          <p className="text-sm text-slate-400">
            {triggerState === 'triggering'
              ? copy.status.initiating
              : copy.status.waiting}
          </p>
        )}
      </div>

      {triggerState === 'error' && errorMessage && (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      )}

      {triggerState === 'done' && result && (
        <article className="rounded-md border p-4 space-y-2 text-sm">
          <header className="flex items-center gap-2 font-medium">
            <span>{copy.result.heading}</span>
            {statusBadgeConfig && (
              <Badge variant={statusBadgeConfig.variant}>
                {statusBadgeConfig.label}
              </Badge>
            )}
          </header>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
            <dt>{copy.result.strategy}</dt>
            <dd>{result.extractionStrategyUsed ?? copy.result.noValue}</dd>
            <dt>{copy.result.eventsFound}</dt>
            <dd>{result.eventsFound}</dd>
            <dt>{copy.result.eventsInserted}</dt>
            <dd>{result.eventsInserted}</dd>
            <dt>{copy.result.duration}</dt>
            <dd>{formatDurationMs(result.durationMs)}</dd>
            <dt>{copy.result.completed}</dt>
            <dd>
              {formatISODate(result.createdAt, DEFAULT_TIME_ZONE)}{' '}
              {copy.result.timeSuffix}
            </dd>
          </dl>
          {result.errorMessage && (
            <p role="alert" className="text-red-500 text-xs">
              {result.errorMessage}
            </p>
          )}
        </article>
      )}
    </section>
  )
}

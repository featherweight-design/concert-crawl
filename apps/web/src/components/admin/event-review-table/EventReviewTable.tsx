'use client'

import { useState } from 'react'
import { COPY } from './definitions/copy'
import { useAuth } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient, ApiError } from '@/lib/api'

type Event = {
  id: string
  venueId: string
  title: string
  artist: string
  date: string
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

type Props = {
  initialEvents: Event[]
}

export const EventReviewTable = ({ initialEvents }: Props) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState(initialEvents)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const approveEvent = async (id: string) => {
    setProcessing(id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
      setEvents((prev) => prev.filter((ev) => ev.id !== id))
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : COPY.errors.approveFailed
      console.error('approveEvent error:', err)
      setError(message)
    } finally {
      setProcessing(null)
    }
  }

  const rejectEvent = async (id: string) => {
    if (!confirm(COPY.confirms.deleteEvent)) return
    setProcessing(id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      await apiClient.delete(`/v1/admin/events/${id}`, token)
      setEvents((prev) => prev.filter((ev) => ev.id !== id))
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : COPY.errors.deleteFailed
      console.error('rejectEvent error:', err)
      setError(message)
    } finally {
      setProcessing(null)
    }
  }

  if (events.length === 0) {
    return <p className="text-sm text-fg-muted">{COPY.empty}</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1">
              <th className="px-4 py-3 text-left font-medium text-fg-muted">
                {COPY.columns.event}
              </th>
              <th className="px-4 py-3 text-left font-medium text-fg-muted">
                {COPY.columns.date}
              </th>
              <th className="px-4 py-3 text-left font-medium text-fg-muted">
                {COPY.columns.flags}
              </th>
              <th className="px-4 py-3 text-left font-medium text-fg-muted">
                {COPY.columns.source}
              </th>
              <th className="px-4 py-3 text-right font-medium text-fg-muted">
                {COPY.columns.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((ev) => {
              const confidenceNum =
                ev.confidenceScore !== null
                  ? parseFloat(ev.confidenceScore)
                  : null
              const isLowConfidence =
                confidenceNum !== null && confidenceNum < 0.7
              const isLlm = ev.extractionStrategy === 'llm'
              const isProcessing = processing === ev.id

              return (
                <tr key={ev.id} className="bg-bg hover:bg-surface-1">
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{ev.title}</p>
                    {ev.artist && (
                      <p className="text-xs text-fg-muted">{ev.artist}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {new Date(ev.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'America/Denver',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {isLlm && <Badge variant="secondary">LLM</Badge>}
                      {isLowConfidence && confidenceNum !== null && (
                        <Badge variant="destructive">
                          {Math.round(confidenceNum * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {ev.sourceUrl ? (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                      >
                        {COPY.source.viewSource}
                      </a>
                    ) : (
                      <span className="text-xs text-fg-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => approveEvent(ev.id)}
                        disabled={isProcessing}
                        aria-label={COPY.actions.approveAriaLabel(ev.title)}
                      >
                        {isProcessing
                          ? COPY.actions.approvePending
                          : COPY.actions.approve}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => rejectEvent(ev.id)}
                        disabled={isProcessing}
                        aria-label={COPY.actions.rejectAriaLabel(ev.title)}
                      >
                        {COPY.actions.reject}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

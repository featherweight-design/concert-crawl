import type { HistoryResponse } from '@concert-crawl/types'
import { ApiError, apiClient } from './api'
import { HISTORY_COPY } from '@/components/consumer/history/definitions/copy'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// The API brands the entitlement 403 with this code so the client can route it
// into the locked takeover instead of an error surface.
export const ENTITLEMENT_REQUIRED_CODE = 'entitlement_required'

export const isEntitlementError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 403 &&
  error.code === ENTITLEMENT_REQUIRED_CODE

// `locked` is the belt-and-braces server verdict: a Free user hitting /history
// directly gets a 403, which is NOT a failure — it's the state the page paints.
// Anything else is a real failure and is left to the caller to surface (the page
// renders the empty state, and the client query retries).
export interface HistoryFetchResult {
  data: HistoryResponse | null
  locked: boolean
}

export async function fetchHistory(token: string): Promise<HistoryFetchResult> {
  try {
    const data = await apiClient.get<HistoryResponse>('/v1/history', token)
    return { data, locked: false }
  } catch (error) {
    if (isEntitlementError(error)) return { data: null, locked: true }
    // Logged here rather than only at the caller: this runs during the server
    // render, where a rethrow becomes a generic error boundary that keeps no
    // trace of which request actually failed.
    console.error('History fetch failed', error)
    throw error
  }
}

// The .ics export returns text/calendar, not the { success, data } JSON envelope
// apiClient unwraps, so it needs a raw fetch. Kept in lib/ rather than the row
// component per the "non-trivial logic lives in lib/" convention.
export async function downloadHistoryIcs(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/history/export.ics`, {
    headers: { Authorization: `Bearer ${token}` },
    // One person's attended shows on a URL that varies only by Authorization
    // header — never let an intermediate or browser cache hold the response.
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new ApiError(res.status, `Export failed with status ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = HISTORY_COPY.calendar.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

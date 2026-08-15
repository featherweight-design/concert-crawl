import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const COPY = CONSUMER_COPY.settings.dataExport

// The refusal is a first-class outcome, not an error: the row paints a
// countdown for it, and a thrown ApiError would collapse it into `failed`.
export class ExportRateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Export rate limited')
    this.name = 'ExportRateLimitedError'
  }
}

// The server sends Retry-After in seconds. Minutes read better for the hour
// this endpoint actually enforces; seconds only ever show on the last leg.
export const formatWait = (seconds: number): string =>
  seconds >= 60
    ? COPY.waitMinutes(Math.ceil(seconds / 60))
    : COPY.waitSeconds(Math.max(1, seconds))

const FALLBACK_RETRY_AFTER_SECONDS = 3600

export async function downloadUserDataExport(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/users/me/export`, {
    headers: { Authorization: `Bearer ${token}` },
    // Every row this account owns, on a URL that varies only by the
    // Authorization header. Nothing between here and the browser may hold it.
    cache: 'no-store',
  })

  if (res.status === 429) {
    const header = Number(res.headers.get('Retry-After'))
    throw new ExportRateLimitedError(
      Number.isFinite(header) && header > 0
        ? header
        : FALLBACK_RETRY_AFTER_SECONDS,
    )
  }

  if (!res.ok) {
    throw new Error(`Export failed with status ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = COPY.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

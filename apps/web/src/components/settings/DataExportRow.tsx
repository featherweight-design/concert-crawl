'use client'

// Download your data (#1573), design_handoff_email_prefs_and_export/email-export.jsx.
//
// Row anatomy is SaveCalendarRow's verbatim: the whole row is the button, the
// detail line carries its own status, and a mono chip sits on the right. What
// differs is the refusal. A rate-limited export is not a failure, so it renders
// as a status line BENEATH the row instead of overwriting the detail line.
//
// No entitlement gate. Handing over your own data is an obligation, not a
// feature of a plan.

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  ExportRateLimitedError,
  downloadUserDataExport,
  formatWait,
} from '@/lib/user-export'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const COPY = CONSUMER_COPY.settings.dataExport

const LIMIT_ID = 'data-export-limit'

const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <path
      d="M8 1.75v8.5m0 0L4.75 7m3.25 3.25L11.25 7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.25 11.5v1.25a1.5 1.5 0 0 0 1.5 1.5h8.5a1.5 1.5 0 0 0 1.5-1.5V11.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const ClockIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8 4.75V8l2.25 1.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const AlertIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8 4.75v3.75M8 11.05v.01"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

const StatusLine = ({
  id,
  tone,
  rail,
  children,
}: {
  id?: string
  tone: 'warning' | 'danger'
  rail: string
  children: string
}) => {
  const danger = tone === 'danger'
  const color = danger ? 'var(--danger)' : 'var(--warning)'
  return (
    <div
      id={id}
      // A failure interrupts. The countdown does not: its text changes every
      // second, so a live region would read the same sentence sixty times over.
      // `aria-live="off"` opts the warning out of the announcement that
      // `role="status"` would otherwise imply, and the disabled button points
      // at it with `aria-describedby` so the reason is still reachable.
      role={danger ? 'alert' : 'status'}
      aria-live={danger ? undefined : 'off'}
      className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5"
      style={{
        background: `color-mix(in oklch, ${color} 8%, var(--surface-1))`,
        border: `1px solid color-mix(in oklch, ${color} 34%, var(--border))`,
      }}
    >
      <span className="mt-px inline-flex shrink-0" style={{ color }}>
        {tone === 'danger' ? <AlertIcon /> : <ClockIcon />}
      </span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color,
          }}
        >
          {rail}
        </span>
        <span
          className="text-pretty"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--fg-muted)',
          }}
        >
          {children}
        </span>
      </span>
    </div>
  )
}

export const DataExportRow = () => {
  const { getToken } = useAuth()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null)
  const limited = waitSeconds !== null
  const disabled = pending || limited

  // The countdown is session-local, so a reload during the hour shows a
  // pressable row that refuses on press and lands back here with a fresh wait.
  // Self-correcting, and cheaper than persisting a limit the server owns.
  useEffect(() => {
    if (!limited) return undefined
    const timer = setInterval(() => {
      setWaitSeconds((prev) => (prev === null || prev <= 1 ? null : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [limited])

  const download = () => {
    setFailed(false)
    setPending(true)
    void (async () => {
      try {
        const token = await getToken()
        if (token === null) {
          setFailed(true)
          return
        }
        await downloadUserDataExport(token)
      } catch (err) {
        if (err instanceof ExportRateLimitedError) {
          setWaitSeconds(err.retryAfterSeconds)
          return
        }
        // The row is the only surface for this failure — no toast system in
        // settings — so the console is the only place the cause survives.
        console.error('Data export failed', err)
        setFailed(true)
      } finally {
        setPending(false)
      }
    })()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={download}
        disabled={disabled}
        aria-busy={pending || undefined}
        aria-describedby={limited ? LIMIT_ID : undefined}
        className="flex min-h-[44px] w-full items-center gap-3.5 rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-left transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden
          className="flex shrink-0 items-center justify-center rounded-lg bg-surface-2"
          style={{
            width: 36,
            height: 36,
            color: pending ? 'var(--fg-muted)' : 'var(--signal)',
          }}
        >
          <DownloadIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              color: 'var(--fg)',
            }}
          >
            {COPY.label}
          </span>
          <span
            className="mt-[3px] block truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              letterSpacing: '0.02em',
              color: 'var(--fg-muted)',
            }}
          >
            {pending ? COPY.pendingDetail : COPY.restDetail}
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 rounded-[3px] px-[7px] py-[3px] uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: pending ? 'var(--fg-subtle)' : 'var(--signal)',
            border: `1px solid color-mix(in oklch, ${
              pending ? 'var(--fg-subtle)' : 'var(--signal)'
            } 50%, transparent)`,
          }}
        >
          {pending ? COPY.chipPending : COPY.chipRest}
        </span>
      </button>
      {waitSeconds !== null && (
        <StatusLine id={LIMIT_ID} tone="warning" rail={COPY.limitedRail}>
          {COPY.limited(formatWait(waitSeconds))}
        </StatusLine>
      )}
      {failed && (
        <StatusLine tone="danger" rail={COPY.failedRail}>
          {COPY.failed}
        </StatusLine>
      )}
    </div>
  )
}

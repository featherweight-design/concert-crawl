'use client'

// The .ics export row (#70), design_handoff_concert_history/history-screens.jsx:262-301.
//
// Gated on 'calendar-export' rather than 'concert-history': the matrix keys them
// separately, so a plan could read history without exporting it. Nothing renders
// while the plan resolves — flashing a locked row at a paying Supporter is the
// documented failure mode on useEntitlement.

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { downloadHistoryIcs } from '@/lib/history'
import { HISTORY_COPY } from './definitions/copy'

const COPY = HISTORY_COPY.calendar

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    <rect
      x="1.75"
      y="3.25"
      width="12.5"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M1.75 6.75h12.5M5.25 1.75v2.5M10.75 1.75v2.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

export const SaveCalendarRow = ({ count }: { count: number }) => {
  const { getToken } = useAuth()
  const { isLoading, active } = useEntitlement('calendar-export')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  if (isLoading || !active) return null

  const empty = count === 0
  const disabled = empty || pending

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
        await downloadHistoryIcs(token)
      } catch (err) {
        // The row is the only surface for this failure — no toast system here —
        // so the console is the only place the cause survives.
        console.error('History .ics export failed', err)
        setFailed(true)
      } finally {
        setPending(false)
      }
    })()
  }

  const detail = failed
    ? COPY.failed
    : pending
      ? COPY.downloading
      : empty
        ? COPY.detailEmpty
        : COPY.detail(count)

  // No aria-label: it would override the accessible name computed from the
  // visible text, hiding the detail line — which is the only place the
  // downloading / failed / count status is announced.
  return (
    <button
      type="button"
      onClick={download}
      disabled={disabled}
      className="history-calendar-row flex min-h-[44px] w-full items-center gap-3.5 rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-left transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-lg bg-surface-2"
        style={{ width: 36, height: 36, color: 'var(--signal)' }}
      >
        <CalendarIcon />
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
            color: failed ? 'var(--danger)' : 'var(--fg-muted)',
          }}
        >
          {detail}
        </span>
      </span>
      <span
        aria-hidden
        className="shrink-0 rounded-[3px] px-[7px] py-[3px]"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
          border:
            '1px solid color-mix(in oklch, var(--signal) 50%, transparent)',
        }}
      >
        {COPY.badge}
      </span>
    </button>
  )
}

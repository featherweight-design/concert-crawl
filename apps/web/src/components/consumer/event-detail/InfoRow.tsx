// The venue / date / doors / ages strip and its icons, shared by the protected
// event detail page and the public share mirror at /e/:id (#72). Lifted
// verbatim out of `app/(protected)/(main)/events/[id]/page.tsx`, where they
// were module-private, so the mirror renders the same rows rather than a
// second, drifting copy of them.
import Link from 'next/link'
import React from 'react'

export function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="8"
        cy="6.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5" />
      <path
        d="M5.5 1.5v3M10.5 1.5v3"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M8 4.5V8l3 1.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="6"
        cy="5"
        r="2.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="11.5"
        cy="5.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
      />
      <path
        d="M12.5 9.5c1.8.4 3 1.6 3 3.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 2h5.2L14 8.8 8.8 14 2 7.2V2Z"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="5" r="1.1" fill="var(--fg-subtle)" />
    </svg>
  )
}

export function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3h-4m4 0v4m0-4L7 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  signal?: boolean
  href?: string
  'data-testid'?: string
}

export function InfoRow({
  icon,
  label,
  value,
  signal = false,
  href,
  'data-testid': dataTestId,
}: InfoRowProps) {
  const inner = (
    <>
      <div className="h-4 w-4 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p
          className="uppercase text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </p>
        <p
          className="mt-[1px] flex min-w-0 items-center gap-0.5 text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {href ? (
            <>
              <span className="min-w-0 truncate">{value}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-fg-subtle"
                aria-hidden
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          ) : (
            value
          )}
        </p>
      </div>
    </>
  )

  const baseClass = 'flex items-center gap-2.5 py-2'

  if (href) {
    return (
      <Link
        href={href}
        data-testid={dataTestId}
        className={`${baseClass} transition-colors hover:text-signal`}
      >
        {inner}
      </Link>
    )
  }
  return (
    <div data-testid={dataTestId} className={baseClass}>
      {inner}
    </div>
  )
}

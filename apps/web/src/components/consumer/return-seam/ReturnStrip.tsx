'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.returnSeam

const VISIBLE_MS = 6000

interface ReturnStripProps {
  /** Null when the pending action could not be replayed — renders nothing. */
  artist: string | null
  href: string
}

/**
 * Confirms an action that was replayed while the visitor was signing up.
 *
 * The filled eye further down the page is the real confirmation, but on a page
 * they have never seen signed-in it does not read as a *change* — this says "that
 * happened while you were away" and then leaves. Not a toast (a toast implies an
 * undo that doesn't exist at this moment), not persistent (it would become
 * chrome and need a dismiss nobody wants), and not fixed or sticky.
 */
export const ReturnStrip = ({ artist, href }: ReturnStripProps) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  if (!artist || !visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: '8px 14px 0',
        padding: '11px 12px',
        borderRadius: 11,
        background: 'color-mix(in oklch, var(--signal) 13%, var(--surface-1))',
        border: '1px solid color-mix(in oklch, var(--signal) 45%, transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Eye
        size={17}
        aria-hidden
        style={{ color: 'var(--signal)', flexShrink: 0 }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 12.5,
            fontWeight: 800,
            color: 'var(--fg)',
          }}
        >
          {copy.heading(artist)}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.subline}
        </span>
      </div>
      <Link
        href={href}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
          textDecoration: 'none',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {copy.viewLink}
      </Link>
    </div>
  )
}

'use client'

// "Alerts for these artists" — a deep link into Settings ▸ Notifications, NOT
// a second control. There is one place notification preferences are set, and
// a toggle here would be a second source of truth for the same flags.
//
// The meta line reads the LIVE preferences. While they are unresolved it is
// omitted entirely rather than guessing: telling someone their alerts are off
// when they are on is worse than telling them nothing.

import Link from 'next/link'
import { useNotificationPreferences } from '@/lib/queries/use-notification-preferences'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import { ALERTS_HREF } from './definitions/constants'
import { GlyphBell, GlyphChevron } from './Glyphs'

const COPY = MY_SHOWS_ARTISTS_COPY.alerts

export const AlertsRow = () => {
  const { data: prefs } = useNotificationPreferences()

  // Push alerts for artists need BOTH the master switch and the artist flag —
  // either one off means nothing arrives, so "on" would be a lie.
  const state =
    prefs === undefined
      ? null
      : COPY.state(
          prefs.masterEnabled && prefs.artistAlertsEnabled,
          prefs.weeklyDigestEnabled,
        )

  return (
    <Link
      href={ALERTS_HREF}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={{
        margin: '18px 16px 0',
        padding: '13px 14px',
        borderRadius: 10,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        textDecoration: 'none',
      }}
    >
      <span aria-hidden style={{ color: 'var(--fg-muted)', display: 'flex' }}>
        <GlyphBell size={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {COPY.title}
        </span>
        {state !== null && (
          <span
            style={{
              display: 'block',
              fontSize: 11.5,
              color: 'var(--fg-subtle)',
              marginTop: 2,
            }}
          >
            {state}
          </span>
        )}
      </span>
      <span aria-hidden style={{ color: 'var(--fg-subtle)', display: 'flex' }}>
        <GlyphChevron size={15} />
      </span>
    </Link>
  )
}

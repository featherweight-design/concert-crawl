'use client'

import Link from 'next/link'
import { ONBOARDING_COPY } from './definitions/copy'
import { DEFAULT_RETURN_PATH } from '@/lib/auth/intent'
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  SEARCH_PICKS_KEY,
  STEP_INDEX_KEY,
  clearPicks,
} from '@/components/consumer/artist-picker'

const copy = ONBOARDING_COPY.nav.skip

/**
 * The mirrors exist for exactly one round-trip: the upgrade that leaves the
 * page and comes back. Leaving on purpose is the opposite of that, so both die
 * here. The rail owns this rather than taking a callback, because a third
 * render site that forgets to pass one would silently reintroduce the leak.
 */
const dropPickMirrors = () => {
  clearPicks(GENRE_PICKS_KEY)
  clearPicks(ARTIST_PICKS_KEY)
  // The step mirror goes with them. It survives the upgrade round trip by
  // design, and skipping is the visitor saying they are done with the tour —
  // leaving it behind reopens /onboarding mid-flow with the picks already
  // dropped, which is the worst of both.
  clearPicks(SEARCH_PICKS_KEY)
  clearPicks(STEP_INDEX_KEY)
}

export type SkipMode =
  /**
   * `href` on every kind, because skipping and finishing land in the same
   * place. A hardcoded default here dropped the pending tier for anyone who
   * left the tour early (#1284).
   */
  | { kind: 'default'; href: string }
  | { kind: 'mid-intent'; destinationLabel: string; href: string }
  /** Entered from the account menu's "How Concert Crawl works" row. */
  | { kind: 'menu' }

const QUIET_LINK: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
  textDecoration: 'none',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  padding: '0 2px',
}

const LOUD_LINK: React.CSSProperties = {
  fontFamily: 'Inter, system-ui',
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--fg)',
  textDecoration: 'none',
  border: '1px solid var(--border-strong)',
  borderRadius: 9,
  padding: '8px 11px',
  minHeight: 36,
  display: 'flex',
  alignItems: 'center',
}

/**
 * Leaving the tour, available in the same rail position on every step — only the
 * weight changes. Two different people are in this flow: someone who signed up
 * on purpose shouldn't have an exit shouting at them, while someone who was
 * three taps from watching a show has a job in progress, and the honest move is
 * to make leaving *more* attractive than continuing. The tour stays reachable
 * from the account menu forever either way.
 */
export const SkipRail = ({ mode }: { mode: SkipMode }) => {
  if (mode.kind === 'mid-intent') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href={mode.href} style={LOUD_LINK} onClick={dropPickMirrors}>
            {copy.midIntent(mode.destinationLabel)}
          </Link>
        </div>
        <div
          role="status"
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'color-mix(in oklch, var(--signal) 8%, transparent)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--signal)',
          }}
        >
          {copy.pending(mode.destinationLabel)}
        </div>
      </div>
    )
  }

  return (
    <Link
      href={mode.kind === 'menu' ? DEFAULT_RETURN_PATH : mode.href}
      style={QUIET_LINK}
      onClick={dropPickMirrors}
    >
      {mode.kind === 'menu' ? copy.menu : copy.default}
    </Link>
  )
}

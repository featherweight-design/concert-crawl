'use client'

// Global broken-Spotify-connection banner on Browse (#763 PR 5,
// spotify-states.jsx RevokeBanner mock). Renders only when the connection
// query reports a broken link — status 'error' (token refresh failed) or
// 'revoked' (unlinked on Spotify's side). "Reconnect" opens the honesty-rail
// handoff sheet; a healthy or absent connection renders nothing.

import { useState } from 'react'
import { useSpotifyConnection } from '@/lib/queries/use-spotify-connection'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'
import { OAuthHandoffSheet } from './OAuthHandoffSheet'

const COPY = SPOTIFY_COPY.revokeBanner

export const SpotifyStatusBanner = () => {
  const { data } = useSpotifyConnection()
  const [handoffOpen, setHandoffOpen] = useState(false)

  if (!data || (data.status !== 'error' && data.status !== 'revoked')) {
    return null
  }

  const variant = data.status === 'error' ? COPY.token : COPY.revoke

  return (
    <section aria-label={COPY.regionAria} className="mb-5">
      <div
        className="flex items-center gap-[11px] rounded-[14px] px-3.5 py-3"
        style={{
          background:
            'color-mix(in oklch, var(--warning) 12%, var(--surface-1))',
          border:
            '1px solid color-mix(in oklch, var(--warning) 36%, var(--border))',
        }}
      >
        <span className="relative shrink-0">
          <SpotifyLogo size={34} />
          <span
            aria-hidden
            className="absolute flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-black"
            style={{
              right: -3,
              bottom: -3,
              background: 'var(--warning)',
              color: 'var(--fg-on-accent)',
            }}
          >
            !
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-fg">
            {variant.head}
          </span>
          <span className="mt-px block text-[11.5px] text-fg-muted">
            {variant.sub}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setHandoffOpen(true)}
          className="shrink-0 cursor-pointer rounded-full border-none px-3 py-[7px] text-[12px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {COPY.cta}
        </button>
      </div>
      <OAuthHandoffSheet
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
      />
    </section>
  )
}

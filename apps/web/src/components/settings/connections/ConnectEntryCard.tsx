'use client'

// Settings ▸ Connections — disconnected Spotify entry card (#763 PR 5).
// Primary connect entry point; the CTA opens the honesty-rail interstitial.

import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SignalButton } from '@/components/consumer/spotify/SpotifyButtons'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const COPY = SPOTIFY_COPY.connectEntry

export const ConnectEntryCard = ({ onConnect }: { onConnect: () => void }) => (
  <div className="flex flex-col">
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        <SpotifyLogo size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold tracking-[-0.01em] text-fg">
            {COPY.serviceName}
          </div>
          <div
            className="mt-0.5 text-[9.5px] uppercase tracking-[0.08em] text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {COPY.notConnected}
          </div>
        </div>
        <span
          aria-hidden
          className="h-[9px] w-[9px] rounded-full opacity-50"
          style={{ background: 'var(--fg-subtle)' }}
        />
      </div>
      <p className="text-[13px] leading-[1.45] text-fg-muted">{COPY.pitch}</p>
      <SignalButton withLogo onClick={onConnect}>
        {COPY.cta}
      </SignalButton>
    </div>
    <p
      className="mt-3.5 text-center text-[9px] font-semibold tracking-[0.1em] text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {COPY.footer}
    </p>
  </div>
)

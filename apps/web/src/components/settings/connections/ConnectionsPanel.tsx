'use client'

// Settings ▸ Connections panel (#763 PR 5) — resolves the Spotify connection
// query into the designed states:
//   disconnected → entry card (opens the honesty-rail interstitial)
//   connected    → connected card (refresh · auto-watch · disconnect)
//   error        → "lost the thread" broken-sync state + Reconnect
//   revoked      → "unlinked on Spotify's side" state + Reconnect
// Shared by the mobile settings route and the desktop panel switcher.

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SpotifyConnectionResponse } from '@concert-crawl/types'
import { OAuthHandoffSheet } from '@/components/consumer/spotify/OAuthHandoffSheet'
import {
  StateBody,
  StateGlyphDisc,
} from '@/components/consumer/spotify/StateBody'
import {
  SignalButton,
  TextButton,
} from '@/components/consumer/spotify/SpotifyButtons'
import { SpotifyStatusBanner } from '@/components/consumer/spotify/SpotifyStatusBanner'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import {
  spotifyConnectionQueryKeyBase,
  useSpotifyConnection,
} from '@/lib/queries/use-spotify-connection'
import { spotifyConnectEnabled } from '@/lib/spotify'
import { ConnectEntryCard } from './ConnectEntryCard'
import { ConnectedCard } from './ConnectedCard'

// Danger "flatline" glyph for the token-refresh failure (handoff mock).
const LostThreadGlyph = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
    <path
      d="M16 3v10M16 22v.5"
      stroke="var(--danger)"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path
      d="M27 27a15 15 0 00-22 0"
      stroke="var(--danger)"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
)

// Severed-link glyph for the external-revoke state (handoff mock).
const CutLinkGlyph = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
    <path
      d="M13 19l6-6m-4.5-3l1.5-1.5a5 5 0 017 7L21 17m-10 0l-1.5 1.5a5 5 0 007 7l1.5-1.5"
      stroke="var(--fg-muted)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 5l22 22"
      stroke="var(--danger)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
)

const BrokenState = ({
  kind,
  onReconnect,
  onDismiss,
}: {
  kind: 'error' | 'revoked'
  onReconnect: () => void
  onDismiss: () => void
}) => {
  const copy =
    kind === 'error'
      ? SPOTIFY_COPY.failTokenRefresh
      : SPOTIFY_COPY.failExternalRevoke
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface-1 px-5 py-7">
      <StateBody
        glyph={
          kind === 'error' ? (
            <StateGlyphDisc tone="danger">
              <LostThreadGlyph />
            </StateGlyphDisc>
          ) : (
            <StateGlyphDisc tone="muted">
              <CutLinkGlyph />
            </StateGlyphDisc>
          )
        }
        eyebrow={copy.eyebrow}
        eyebrowTone={kind === 'error' ? 'danger' : 'muted'}
        title={copy.title}
        body={copy.body}
      >
        <SignalButton withLogo onClick={onReconnect}>
          {copy.primaryCta}
        </SignalButton>
        <TextButton onClick={onDismiss}>{copy.secondaryCta}</TextButton>
      </StateBody>
    </div>
  )
}

const StatusUnavailable = () => {
  const copy = SPOTIFY_COPY.statusUnavailable
  return (
    <section
      aria-label={copy.regionAria}
      className="rounded-2xl border border-border bg-surface-1 px-5 py-4"
    >
      <span className="block text-[13px] font-bold text-fg">{copy.head}</span>
      <span className="mt-px block text-[11.5px] text-fg-muted">
        {copy.sub}
      </span>
    </section>
  )
}

const resolveContent = (
  data: SpotifyConnectionResponse | undefined,
  isPending: boolean,
  openHandoff: () => void,
  brokenCollapsed: boolean,
  collapseBroken: () => void,
): React.ReactNode => {
  if (isPending) {
    return (
      <div
        aria-hidden
        className="h-[180px] animate-pulse rounded-2xl border border-border bg-surface-1"
      />
    )
  }
  if (data?.status === 'disconnected') {
    return spotifyConnectEnabled() ? (
      <ConnectEntryCard onConnect={openHandoff} />
    ) : null
  }
  if (!data) {
    // Query errored, so the status is unknown — this user may well be
    // connected. Connecting is idempotent (the POST returns the existing
    // connection), so the entry card is safe here while the flag is on. With
    // the flag off we must not offer a door we cannot honour, and we must not
    // blank the panel either: that would hide a connected user's disconnect
    // control behind a network blip. SpotifyStatusBanner is not the fallback
    // here — it self-queries and returns null on exactly this `!data` case.
    return spotifyConnectEnabled() ? (
      <ConnectEntryCard onConnect={openHandoff} />
    ) : (
      <StatusUnavailable />
    )
  }
  if (data.status === 'connected') {
    return <ConnectedCard connection={data} />
  }
  // The secondary dismiss ("Not now" / "Leave it unlinked") collapses the
  // full state card to the handoff's compact in-settings banner variant.
  if (brokenCollapsed) {
    return <SpotifyStatusBanner />
  }
  return (
    <BrokenState
      kind={data.status}
      onReconnect={openHandoff}
      onDismiss={collapseBroken}
    />
  )
}

export const ConnectionsPanel = () => {
  const { data, isPending } = useSpotifyConnection()
  const queryClient = useQueryClient()
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [brokenCollapsed, setBrokenCollapsed] = useState(false)

  return (
    <div className="flex flex-col">
      {resolveContent(
        data,
        isPending,
        () => setHandoffOpen(true),
        brokenCollapsed,
        () => setBrokenCollapsed(true),
      )}
      <OAuthHandoffSheet
        open={handoffOpen}
        onClose={() => {
          setHandoffOpen(false)
          // A cancelled/failed handoff changes nothing server-side, but a
          // stale cache after tab-switching is cheap to guard against.
          void queryClient.invalidateQueries({
            queryKey: spotifyConnectionQueryKeyBase,
          })
        }}
      />
    </div>
  )
}

'use client'

// Settings ▸ Connections — connected Spotify card (#763 PR 5): account,
// artist counts, last-synced, on-demand refresh, auto-watch preference and
// disconnect (with confirm sheet). Also covers the refreshing (mid-sync)
// variant from the handoff mock.

import { useState } from 'react'
import type { SpotifyConnectionView } from '@concert-crawl/types'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import {
  useSpotifyDisconnect,
  useSpotifyPatch,
  useSpotifySync,
} from '@/lib/queries/use-spotify-connection'
import { ApiError } from '@/lib/api'
import { formatRelativeTime } from '@/lib/relative-time'
import { ToggleSwitch } from './ToggleSwitch'
import { DisconnectConfirmSheet } from './DisconnectConfirmSheet'

const COPY = SPOTIFY_COPY.connectedCard

const CardRow = ({
  label,
  first = false,
  children,
}: {
  label: string
  first?: boolean
  children: React.ReactNode
}) => (
  <div
    className="flex items-center justify-between gap-3 py-[13px]"
    style={first ? undefined : { borderTop: '1px solid var(--border)' }}
  >
    <span className="text-[13.5px] font-medium text-fg-muted">{label}</span>
    {children}
  </div>
)

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
    <path
      d="M13 7.5a5.5 5.5 0 11-1.6-3.9M13 2v3h-3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const ConnectedCard = ({
  connection,
}: {
  connection: SpotifyConnectionView
}) => {
  const sync = useSpotifySync()
  const patch = useSpotifyPatch()
  const disconnect = useSpotifyDisconnect()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refreshing = sync.isPending
  const rateLimited =
    sync.error instanceof ApiError && sync.error.status === 429

  const account = connection.displayName
    ? `${connection.displayName}${COPY.accountSuffix}`
    : COPY.accountFallback

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
        {/* Header — logo · name · LINKED pill · account */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SpotifyLogo size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[7px]">
              <span className="text-[16px] font-extrabold tracking-[-0.01em] text-fg">
                {COPY.serviceName}
              </span>
              <span
                className="inline-flex items-center gap-[5px] rounded-full px-[7px] py-0.5"
                style={{
                  background:
                    'color-mix(in oklch, var(--signal) 15%, transparent)',
                  border:
                    '1px solid color-mix(in oklch, var(--signal) 32%, transparent)',
                }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: 'var(--signal)',
                    boxShadow: '0 0 6px var(--signal)',
                  }}
                />
                <span
                  className="text-[8.5px] font-bold tracking-[0.1em] text-signal"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {COPY.linkedPill}
                </span>
              </span>
            </div>
            <div
              className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] tracking-[0.04em] text-fg-subtle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {account}
            </div>
          </div>
        </div>

        {/* Stats + preferences */}
        <div className="px-4 pb-1.5 pt-0.5">
          <CardRow label={COPY.artistsLabel} first>
            <span className="text-[14px] font-extrabold text-fg">
              {COPY.artistsValue(connection.artistCount)}
              <span className="font-medium text-fg-muted">
                {COPY.artistsDenverSuffix(connection.denverArtistCount)}
              </span>
            </span>
          </CardRow>
          <CardRow label={COPY.lastSyncedLabel}>
            {refreshing ? (
              <span
                className="inline-flex items-center gap-[7px] text-[11px] text-signal"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span
                  aria-hidden
                  className="inline-block h-[11px] w-[11px] animate-spin rounded-full"
                  style={{
                    border:
                      '2px solid color-mix(in oklch, var(--signal) 30%, transparent)',
                    borderTopColor: 'var(--signal)',
                  }}
                />
                {COPY.syncingValue}
              </span>
            ) : (
              <span
                className="text-[11px] text-fg-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {connection.lastSyncedAt
                  ? formatRelativeTime(connection.lastSyncedAt)
                  : COPY.lastSyncedNever}
              </span>
            )}
          </CardRow>
          <CardRow label={COPY.autoWatchLabel}>
            <ToggleSwitch
              checked={connection.autoWatch}
              onChange={(next) => patch.mutate({ autoWatch: next })}
              ariaLabel={COPY.autoWatchAria}
              disabled={patch.isPending}
            />
          </CardRow>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => sync.mutate()}
            disabled={refreshing}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-[9px] text-[13px] font-extrabold tracking-[-0.01em] text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
            style={{
              background: 'transparent',
              border:
                '1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border))',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <RefreshIcon />
            {refreshing ? COPY.refreshingCta : COPY.refreshCta}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={disconnect.isPending}
            className="cursor-pointer rounded-xl px-3.5 py-[9px] text-[13px] font-bold text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
            style={{
              border: '1px solid var(--border-strong)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {COPY.disconnectCta}
          </button>
        </div>
      </div>

      {/* Rate-limit notice (429 from the sync endpoint) */}
      {rateLimited && (
        <p role="status" className="mt-2.5 px-1 text-[12px] text-warning">
          {COPY.rateLimited}
        </p>
      )}

      {/* Context footer */}
      <p className="mt-3.5 px-1 text-[12px] leading-[1.5] text-fg-subtle">
        {refreshing ? COPY.footerRefreshing : COPY.footerIdle}
      </p>

      <DisconnectConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          disconnect.mutate(undefined, {
            onSuccess: () => setConfirmOpen(false),
          })
        }}
        busy={disconnect.isPending}
      />
    </div>
  )
}

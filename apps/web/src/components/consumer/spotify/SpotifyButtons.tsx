'use client'

// Shared button atoms for the Spotify connect chapter (#763 PR 5).
//
// Color note (design handoff): connect actions use OUR primary token
// (--signal), never Spotify green — --spotify-green exists only inside the
// official logo asset.

import { SpotifyLogo } from '@/components/brand/spotify-logo'

interface ActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

// Solid primary action. `withLogo` renders the official Spotify mark on the
// left — used for actions that hand off to / reconnect Spotify.
export const SignalButton = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  tone = 'solid',
  withLogo = false,
  leftIcon,
}: ActionButtonProps & {
  tone?: 'solid' | 'ghost'
  withLogo?: boolean
  leftIcon?: React.ReactNode
}) => {
  const solid = tone === 'solid'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold tracking-[-0.01em] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
      style={{
        padding: '13px 18px',
        background: solid ? 'var(--signal)' : 'transparent',
        color: solid ? 'var(--fg-on-accent)' : 'var(--signal)',
        border: solid
          ? 'none'
          : '1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border))',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {withLogo && <SpotifyLogo size={18} />}
      {leftIcon}
      {children}
    </button>
  )
}

// Bordered neutral (or danger) secondary action.
export const GhostButton = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  danger = false,
}: ActionButtonProps & { danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
    style={{
      padding: '13px 18px',
      background: 'transparent',
      color: danger ? 'var(--danger)' : 'var(--fg-muted)',
      border: danger
        ? '1px solid color-mix(in oklch, var(--danger) 40%, var(--border))'
        : '1px solid var(--border-strong)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    {children}
  </button>
)

// Borderless text action ("Cancel", "Maybe later", "Not now").
export const TextButton = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
}: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className="cursor-pointer rounded-lg py-2.5 text-center text-[14px] font-bold text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
    style={{ fontFamily: 'var(--font-ui)' }}
  >
    {children}
  </button>
)

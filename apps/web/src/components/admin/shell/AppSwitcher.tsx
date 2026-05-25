'use client'

import Link from 'next/link'
import { LayoutDashboard, ExternalLink } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface AppSwitcherProps {
  size?: 'sm' | 'md'
}

const SIZES = {
  sm: { height: 26, fs: 10, px: 8, gap: 4, iconSize: 12 },
  md: { height: 30, fs: 11, px: 10, gap: 5, iconSize: 13 },
} as const

export const AppSwitcher = ({ size = 'md' }: AppSwitcherProps) => {
  const sz = SIZES[size]

  return (
    <div
      role="tablist"
      aria-label={ADMIN_COPY.shell.appSwitcher.ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        height: sz.height + 4,
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        role="tab"
        aria-selected={false}
        title={ADMIN_COPY.shell.appSwitcher.userAppTitle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sz.gap,
          height: sz.height,
          padding: `0 ${sz.px}px`,
          borderRadius: 6,
          fontFamily: 'var(--admin-font, Inter, sans-serif)',
          fontSize: sz.fs,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          color: 'var(--fg-muted)',
          background: 'transparent',
          textDecoration: 'none',
          transition: 'background .12s, color .12s',
        }}
        onMouseEnter={(evt) => {
          evt.currentTarget.style.color = 'var(--fg)'
        }}
        onMouseLeave={(evt) => {
          evt.currentTarget.style.color = 'var(--fg-muted)'
        }}
      >
        <ExternalLink size={sz.iconSize} />
        <span>{ADMIN_COPY.shell.appSwitcher.userApp}</span>
      </Link>
      <div
        role="tab"
        aria-selected={true}
        title={ADMIN_COPY.shell.appSwitcher.adminTitle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sz.gap,
          height: sz.height,
          padding: `0 ${sz.px}px`,
          borderRadius: 6,
          fontFamily: 'var(--admin-font, Inter, sans-serif)',
          fontSize: sz.fs,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          color: 'var(--fg)',
          background: 'var(--bg-elevated)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border)',
          transition: 'background .12s, color .12s',
        }}
      >
        <LayoutDashboard size={sz.iconSize} color="var(--signal)" />
        <span>{ADMIN_COPY.shell.appSwitcher.admin}</span>
      </div>
    </div>
  )
}

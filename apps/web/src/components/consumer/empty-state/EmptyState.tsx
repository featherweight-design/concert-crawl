import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateCta {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  state?: 'no-data' | 'filtered' | 'error'
  density?: 'default' | 'dense'
  eyebrow: string
  title: string
  body: string
  primaryCta?: EmptyStateCta
  secondaryCta?: EmptyStateCta
  className?: string
}

function EmptyStatePrimary({
  cta,
  dense,
}: {
  cta: EmptyStateCta
  dense: boolean
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--signal)',
    color: 'var(--fg-on-accent)',
    borderRadius: 999,
    padding: dense ? '9px 16px' : '11px 20px',
    fontFamily: 'var(--font-ui)',
    fontSize: dense ? 12.5 : 13.5,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
  }
  if (cta.href) {
    return (
      <Link href={cta.href} style={style}>
        {cta.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={cta.onClick} style={style}>
      {cta.label}
    </button>
  )
}

function EmptyStateSecondary({
  cta,
  dense,
}: {
  cta: EmptyStateCta
  dense: boolean
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    color: 'var(--fg-muted)',
    padding: dense ? '8px 0' : '10px 0',
    fontFamily: 'var(--font-ui)',
    fontSize: dense ? 12 : 13,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    borderBottom: '1px dashed var(--border-strong)',
    borderRadius: 0,
  }
  if (cta.href) {
    return (
      <Link href={cta.href} style={style}>
        {cta.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={cta.onClick} style={style}>
      {cta.label}
    </button>
  )
}

export function EmptyState({
  state = 'no-data',
  density = 'default',
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
  className,
}: EmptyStateProps) {
  const dense = density === 'dense'
  const accent =
    state === 'error'
      ? 'var(--warning)'
      : state === 'filtered'
        ? 'var(--signal)'
        : 'var(--accent)'
  const railRight =
    state === 'error' ? 'err' : state === 'filtered' ? '0 hits' : '0 / 0'

  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: dense ? 10 : 14,
        padding: dense ? '28px 24px' : '52px 28px',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
        maxWidth: dense ? 380 : 460,
        marginInline: 'auto',
        width: '100%',
      }}
    >
      {/* Status rail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: dense ? 9 : 10,
            color: accent,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {eyebrow}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: dense ? 9 : 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {railRight}
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: dense ? 26 : 38,
          fontWeight: 900,
          letterSpacing: dense ? '-0.03em' : '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {title}
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: dense ? 12.5 : 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          maxWidth: 380,
        }}
      >
        {body}
      </div>

      {/* CTAs */}
      {(primaryCta ?? secondaryCta) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: dense ? 4 : 8,
            flexWrap: 'wrap',
          }}
        >
          {primaryCta && <EmptyStatePrimary cta={primaryCta} dense={dense} />}
          {secondaryCta && (
            <EmptyStateSecondary cta={secondaryCta} dense={dense} />
          )}
        </div>
      )}
    </div>
  )
}

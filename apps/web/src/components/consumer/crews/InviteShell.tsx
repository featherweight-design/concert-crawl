import Link from 'next/link'

import { CCMark } from '@/components/brand/cc-mark'
import { CCWordmark } from '@/components/brand/cc-wordmark'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

/**
 * The invite landing's frame. The route sits outside `(protected)/(main)`, so
 * there is no app chrome here at all: just the brand lockup and a centred
 * column, the same shape `/onboarding` uses. Every state on this route (ready,
 * at capacity, dead, loading, error) renders inside it, so nothing shifts as
 * one resolves into another.
 */
export const InviteShell = ({
  children,
  /** The landing opens up at desktop width; the terminal states hold at 18. */
  tightGap = false,
}: {
  children: React.ReactNode
  tightGap?: boolean
}) => (
  <main
    aria-label={COPY.a11y.inviteLanding}
    className={`relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-[18px] overflow-hidden px-[22px] pb-10 pt-[70px] text-center sm:px-10 sm:pt-10 ${
      tightGap ? '' : 'sm:gap-[22px]'
    }`}
    style={{
      background: 'var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    <div className="absolute left-0 right-0 top-[54px] flex items-center justify-center gap-2 sm:top-[22px]">
      <CCMark size={22} />
      <CCWordmark size={14} />
    </div>
    {children}
  </main>
)

interface EyebrowProps {
  /** `count` is the member tally, which the handoff sets a step wider and louder. */
  tone: 'signal' | 'warning' | 'subtle' | 'count'
  children: string
}

const EYEBROW_TONES = {
  signal: { color: 'var(--signal)', fontSize: 9.5, letterSpacing: '0.18em' },
  warning: { color: 'var(--warning)', fontSize: 9.5, letterSpacing: '0.18em' },
  subtle: { color: 'var(--fg-subtle)', fontSize: 9.5, letterSpacing: '0.14em' },
  count: { color: 'var(--fg-muted)', fontSize: 10, letterSpacing: '0.14em' },
} as const

/** Mono meta. The uppercase lives in the string, never in CSS. */
export const InviteEyebrow = ({ tone, children }: EyebrowProps) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      ...EYEBROW_TONES[tone],
    }}
  >
    {children}
  </span>
)

export const InviteTitle = ({ children }: { children: string }) => (
  <h1
    className="text-[25px] sm:text-[32px]"
    style={{
      margin: 0,
      fontWeight: 900,
      letterSpacing: '-0.035em',
      lineHeight: 1.1,
      textWrap: 'balance',
      color: 'var(--fg)',
    }}
  >
    {children}
  </h1>
)

export const InviteBody = ({ children }: { children: string }) => (
  <p
    className="text-[13.5px] sm:text-[15px]"
    style={{
      margin: 0,
      color: 'var(--fg-muted)',
      lineHeight: 1.5,
      textWrap: 'pretty',
    }}
  >
    {children}
  </p>
)

// Geometry from the handoff's shared `Btn` atom, which every other crews
// surface is drawn against. A pill here would make this route the only one
// with a different button.
const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 46,
  padding: '0 18px',
  borderRadius: 10,
  fontFamily: 'var(--font-ui)',
  fontSize: 14.5,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
}

export const ghostButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg)',
}

export const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--signal)',
  border: '1px solid var(--signal)',
  color: 'var(--fg-on-accent)',
}

/**
 * The way out of every terminal state on this route. `wide` is for the
 * at-capacity swap, where it takes the place of a full-width Join and the
 * column would otherwise visibly change shape.
 */
export const BrowseInstead = ({ wide = false }: { wide?: boolean }) => (
  <Link
    href="/events"
    style={
      wide
        ? { ...ghostButtonStyle, display: 'flex', width: '100%' }
        : ghostButtonStyle
    }
  >
    {COPY.linkDead.browse}
  </Link>
)

/** The dimmed mark that stands in for a patch we are not allowed to draw. */
export const DimmedMark = () => (
  <span aria-hidden="true" style={{ opacity: 0.5 }}>
    <CCMark size={76} />
  </span>
)

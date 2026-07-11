// Presentational plan card — renders a resolved PlanCardContent (#780
// lifecycle shell: radial-gradient bg, eyebrow row with tier badge + chip,
// headline, body, mono punchline, status rail, CTA row). Mobile/desktop
// parity is CSS-responsive: same markup, Tailwind sm: sizing, CTAs stack
// on mobile and sit inline on desktop.

import { TierBadge } from '@/components/consumer/tier-picker'
import { PLAN_CARD_COPY } from './definitions/copy'
import type {
  PlanCardContent,
  PlanCardCta,
  PlanCardTone,
} from './definitions/types'

const TONE_ACCENT: Record<PlanCardTone, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  warning: 'var(--warning)',
  muted: 'var(--fg-muted)',
}

const RAIL_ACCENT = {
  signal: 'var(--signal)',
  warning: 'var(--warning)',
  muted: 'var(--fg-muted)',
} as const

interface PlanCardProps {
  content: PlanCardContent
  onCtaClick: (cta: PlanCardCta) => void
  ctaPending: boolean
}

const FreeChip = () => (
  <span
    className="rounded-[4px] px-2 py-[3px] text-[9px] sm:rounded-[5px] sm:px-[9px] sm:py-1 sm:text-[10px]"
    style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 800,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--fg-muted)',
    }}
  >
    {PLAN_CARD_COPY.freeChip}
  </span>
)

export const PlanCard = ({
  content,
  onCtaClick,
  ctaPending,
}: PlanCardProps) => {
  const accent = TONE_ACCENT[content.tone]
  // Past-due keeps a warning shell but its action buttons stay signal (#782).
  const ctaAccent = content.tone === 'warning' ? 'var(--signal)' : accent

  const borderMix = content.emphasis ? 70 : 45

  return (
    <section
      aria-label={PLAN_CARD_COPY.ariaLabel}
      className="relative flex flex-col gap-[11px] overflow-hidden rounded-[14px] p-4 pb-[18px] sm:gap-3.5 sm:px-[22px] sm:pb-[22px] sm:pt-5"
      style={{
        background: `radial-gradient(circle at 100% 0%, color-mix(in oklch, ${accent} 14%, transparent) 0%, transparent 58%), var(--bg-elevated)`,
        border: `1px solid color-mix(in oklch, ${accent} ${borderMix}%, var(--border-strong))`,
        boxShadow: content.emphasis
          ? `0 0 0 1px color-mix(in oklch, ${accent} 22%, transparent), 0 24px 60px -42px color-mix(in oklch, ${accent} 55%, transparent)`
          : content.founderGradient
            ? '0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent), 0 30px 60px -40px color-mix(in oklch, var(--accent) 40%, transparent)'
            : 'none',
        color: 'var(--fg)',
      }}
    >
      {content.emphasis && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
        />
      )}

      {/* eyebrow row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {content.badgeTier ? (
          <TierBadge tier={content.badgeTier} size="sm" />
        ) : (
          <FreeChip />
        )}
        {content.betaChip && (
          <span
            className="rounded-[4px] px-[7px] py-[3px] text-[8.5px] sm:rounded-[5px] sm:px-2 sm:py-1 sm:text-[9px]"
            style={{
              background: 'color-mix(in oklch, var(--accent) 14%, transparent)',
              border:
                '1px solid color-mix(in oklch, var(--accent) 40%, var(--border))',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            {PLAN_CARD_COPY.gifted.betaChip}
          </span>
        )}
        {content.chip && (
          <span
            className="inline-flex items-center gap-[5px] rounded-[4px] px-[7px] py-[3px] text-[8.5px] sm:rounded-[5px] sm:px-2 sm:py-1 sm:text-[9px]"
            style={{
              background: content.chipMuted
                ? 'var(--surface-2)'
                : `color-mix(in oklch, ${accent} 14%, transparent)`,
              border: `1px solid color-mix(in oklch, ${accent} ${content.chipMuted ? 30 : 40}%, var(--border))`,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: content.chipMuted ? 'var(--fg-muted)' : accent,
            }}
          >
            {content.chip}
          </span>
        )}
        <span
          className="text-[9px] uppercase sm:text-[10px]"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--fg-subtle)',
          }}
        >
          {content.eyebrow}
        </span>
      </div>

      <h2
        className="text-[22px] sm:text-[30px]"
        style={{
          fontWeight: 900,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: 0,
        }}
      >
        {content.headline}
      </h2>
      <p
        className="m-0 max-w-[520px] text-[13px] sm:text-[14.5px]"
        style={{
          fontWeight: 500,
          color: 'var(--fg-muted)',
          letterSpacing: '-0.005em',
          lineHeight: 1.5,
        }}
      >
        {content.body}
      </p>
      <span
        className="text-[11.5px] italic sm:text-[12.5px]"
        style={{
          fontFamily: 'var(--font-mono)',
          color: accent,
          letterSpacing: '0.02em',
        }}
      >
        {content.punchline}
      </span>

      {content.rail && (
        <div
          className="mt-0.5 flex items-center gap-2.5 rounded-[10px] px-3 py-[9px]"
          style={{
            background: `color-mix(in oklch, ${RAIL_ACCENT[content.rail.tone]} 9%, var(--surface-1))`,
            border: `1px solid color-mix(in oklch, ${RAIL_ACCENT[content.rail.tone]} 30%, var(--border))`,
          }}
        >
          <span
            aria-hidden
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{
              background: RAIL_ACCENT[content.rail.tone],
              boxShadow: `0 0 8px ${RAIL_ACCENT[content.rail.tone]}`,
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span
              className="text-[12.5px]"
              style={{
                fontWeight: 700,
                color: 'var(--fg)',
                letterSpacing: '-0.005em',
              }}
            >
              {content.rail.label}
            </span>
            {content.rail.sub && (
              <span
                className="text-[9px] uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--fg-subtle)',
                }}
              >
                {content.rail.sub}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CTAs — mobile stacks, desktop inline */}
      <div className="mt-1.5 flex flex-col flex-wrap gap-2.5 sm:flex-row">
        {content.ctas.map((cta) => {
          const isDisabled = ctaPending && cta.action === 'portal'
          return (
            <button
              key={cta.label}
              type="button"
              disabled={isDisabled}
              onClick={() => onCtaClick(cta)}
              className="w-full rounded-[10px] px-4 py-[11px] text-center text-[13.5px] transition-opacity disabled:opacity-60 sm:w-auto"
              style={{
                cursor: isDisabled ? 'default' : 'pointer',
                background:
                  cta.kind === 'primary'
                    ? content.founderGradient
                      ? 'linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))'
                      : ctaAccent
                    : 'transparent',
                color:
                  cta.kind === 'primary'
                    ? 'var(--fg-on-accent)'
                    : 'var(--fg-muted)',
                border:
                  cta.kind === 'primary'
                    ? '1px solid transparent'
                    : '1px solid var(--border-strong)',
                fontWeight: 700,
                letterSpacing: '-0.005em',
                boxShadow:
                  cta.kind === 'primary' && cta.glow
                    ? `0 0 22px color-mix(in oklch, ${content.founderGradient ? 'var(--accent)' : ctaAccent} 32%, transparent)`
                    : 'none',
              }}
            >
              {cta.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

// Gifted / role-comped surface — replaces the whole picker with a
// gratitude panel (design brief §2; handoff GiftedThankYou). No cards,
// no upsell, no management affordance.

import { CCMark } from '@/components/brand/cc-mark'
import { TIER_PICKER_COPY } from './definitions/copy'
import { TierBadge } from './TierBadge'

const GIFTED_COPY = TIER_PICKER_COPY.gifted

interface GiftedThankYouProps {
  variant?: 'mobile' | 'desktop'
  /** The single non-management affordance — discovery, not billing. */
  onDiscover?: () => void
}

export const GiftedThankYou = ({
  variant = 'mobile',
  onDiscover,
}: GiftedThankYouProps) => (
  <div
    data-testid="gifted-thank-you"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      color: 'var(--fg)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          width: 56,
          height: 56,
          borderRadius: 16,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: 22,
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--accent) 40%, transparent), transparent 70%)',
          }}
        />
        <CCMark size={56} />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TierBadge tier="premium" size="lg" />
        <span
          style={{
            padding: '5px 9px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: 5,
              background: 'var(--signal)',
            }}
          />
          {GIFTED_COPY.beta}
        </span>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          fontWeight: 900,
          fontSize: variant === 'desktop' ? 40 : 32,
          letterSpacing: '-0.035em',
          lineHeight: 1.03,
        }}
      >
        {GIFTED_COPY.title}
      </div>
      <div
        style={{
          fontWeight: 500,
          fontSize: variant === 'desktop' ? 15.5 : 14,
          color: 'var(--fg-muted)',
          letterSpacing: '-0.005em',
          lineHeight: 1.5,
          maxWidth: 460,
        }}
      >
        {GIFTED_COPY.body}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
          fontSize: 12.5,
          color: 'var(--accent)',
          letterSpacing: '0.02em',
          marginTop: 2,
        }}
      >
        {GIFTED_COPY.signature}
      </div>
    </div>

    <div
      style={{
        borderRadius: 14,
        padding: 16,
        background: 'color-mix(in oklch, var(--signal) 5%, var(--surface-1))',
        border:
          '1px solid color-mix(in oklch, var(--signal) 30%, var(--border))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--signal)',
        }}
      >
        {GIFTED_COPY.perksEyebrow}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: variant === 'desktop' ? '1fr 1fr' : '1fr',
          gap: 8,
        }}
      >
        {GIFTED_COPY.perks.map((perk) => (
          <div
            key={perk}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 500,
              fontSize: 13,
              color: 'var(--fg)',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 12 12"
              style={{ flexShrink: 0 }}
              aria-hidden
            >
              <path
                d="M2 6 L5 9 L10 3"
                fill="none"
                stroke="var(--signal)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{perk}</span>
          </div>
        ))}
      </div>
    </div>

    <button
      type="button"
      onClick={onDiscover}
      style={{
        // No `all: 'unset'` — it would strip the UA focus outline and make
        // the only interactive control here invisible to keyboard users.
        background: 'transparent',
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'center',
        padding: '12px 16px',
        borderRadius: 11,
        border: '1px solid var(--border-strong)',
        color: 'var(--fg)',
        fontWeight: 700,
        fontSize: 13.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {GIFTED_COPY.discover}
      <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M4.5 2 L8.5 6 L4.5 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>

    <div
      style={{
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {GIFTED_COPY.footer}
    </div>
  </div>
)

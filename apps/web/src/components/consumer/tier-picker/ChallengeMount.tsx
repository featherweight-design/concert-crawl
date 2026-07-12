'use client'

// 3DS / SCA challenge chrome (PR 4.4, design table CHALLENGE_CONFIG).
// Stripe's Payment Element presents the actual bank verification in its
// own overlay while confirmPayment is in flight — this mount is the
// contextual frame around that moment: what's happening, who renders it,
// and a way out. The hosting ModalShell stays a plain dialog (a step,
// not an error — never alertdialog), relabeled via challengeDialogProps.

import { TIER_PICKER_COPY } from './definitions/copy'
import type { ChallengeKind, TierKey } from './definitions/types'
import { TierSummaryLine } from './FailureSurface'

const CHALLENGE_COPY = TIER_PICKER_COPY.challenge

export const challengeHeadlineId = (kind: ChallengeKind) => `chal-h-${kind}`
export const challengeBodyId = (kind: ChallengeKind) => `chal-d-${kind}`

/** ModalShell overrides while the challenge chrome is up. */
export const challengeDialogProps = (kind: ChallengeKind) => ({
  role: 'dialog' as const,
  ariaLabelledBy: challengeHeadlineId(kind),
  ariaDescribedBy: challengeBodyId(kind),
})

const monoLabelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: 'var(--fg-subtle)',
} as const

const StripeChallengeFrame = () => (
  <div
    role="group"
    aria-label={CHALLENGE_COPY.frameLabel}
    style={{
      position: 'relative',
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px dashed var(--border-strong)',
      padding: '26px 18px 22px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 13,
      minHeight: 196,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        position: 'absolute',
        top: 11,
        left: 0,
        padding: '0 13px',
        boxSizing: 'border-box',
      }}
    >
      <span style={monoLabelStyle}>{CHALLENGE_COPY.frameTopLeft}</span>
      <span style={monoLabelStyle}>{CHALLENGE_COPY.frameTopRight}</span>
    </div>
    <div style={{ position: 'relative', width: 54, height: 54, marginTop: 6 }}>
      <svg
        width="54"
        height="54"
        viewBox="0 0 54 54"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'mPaySpin 1.1s linear infinite',
          color: 'var(--signal)',
        }}
      >
        <circle
          cx="27"
          cy="27"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.18"
        />
        <path
          d="M50 27 A23 23 0 0 0 27 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--signal)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <rect
            x="5"
            y="9.5"
            width="12"
            height="8.5"
            rx="1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M7.4 9.5 V7 a3.6 3.6 0 0 1 7.2 0 V9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </div>
    </div>
    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)' }}>
      {CHALLENGE_COPY.waiting}
    </div>
    <span style={{ ...monoLabelStyle, letterSpacing: '0.12em' }}>
      {CHALLENGE_COPY.frameBottom}
    </span>
  </div>
)

export const ChallengeMount = ({
  kind,
  tierKey,
  onCancel,
}: {
  kind: ChallengeKind
  tierKey: Exclude<TierKey, 'free'>
  onCancel: () => void
}) => {
  const config = CHALLENGE_COPY.kinds[kind]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            aria-label={CHALLENGE_COPY.closeLabel}
            onClick={onCancel}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              color: 'var(--fg-muted)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3 L13 13 M13 3 L3 13"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div
          id={challengeHeadlineId(kind)}
          style={{
            fontWeight: 900,
            fontSize: 23,
            letterSpacing: '-0.03em',
            color: 'var(--fg)',
            marginTop: 2,
            lineHeight: 1.1,
            textWrap: 'balance',
          }}
        >
          {config.headline}
        </div>
        <div
          id={challengeBodyId(kind)}
          style={{
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {config.body}
        </div>
      </div>
      <StripeChallengeFrame />
      <TierSummaryLine tierKey={tierKey} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          paddingTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--fg-subtle)',
          }}
        >
          {CHALLENGE_COPY.footerNote}
        </span>
        <button
          type="button"
          onClick={onCancel}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            padding: '6px 8px',
          }}
        >
          {CHALLENGE_COPY.cancel}
        </button>
      </div>
    </div>
  )
}

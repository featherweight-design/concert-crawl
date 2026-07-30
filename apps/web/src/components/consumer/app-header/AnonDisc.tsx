import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.appHeader.anonDisc

interface AnonDiscProps {
  size?: number
}

/**
 * The anonymous account glyph. Always a resolved state — never the loading
 * disc that the signed-in avatar can show. A spinner or hollow ring in the
 * most-looked-at 36px in the app reads as broken rather than as "no account".
 *
 * The 44px floor lives on the outer box so a caller can ask for a 26px disc
 * (bottom nav) without dropping under the touch minimum.
 */
export function AnonDisc({ size = 36 }: AnonDiscProps) {
  return (
    <span
      data-testid={copy.testId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        minHeight: '44px',
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          color: 'var(--fg-muted)',
        }}
      >
        <svg
          width={Math.round(size * 0.5)}
          height={Math.round(size * 0.5)}
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="9"
            cy="6.5"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 16c0-3.314 2.686-5 6-5s6 1.686 6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  )
}

type DeltaStatus = 'noprice' | 'fresh' | 'drop' | 'spike'

function classifyDelta(
  savedPrice: number | null,
  currentPrice: number | null,
): DeltaStatus {
  if (savedPrice === null || currentPrice === null) return 'noprice'
  const delta = currentPrice - savedPrice
  if (Math.abs(delta) < 2) return 'fresh'
  if (delta < 0) return 'drop'
  return 'spike'
}

function formatDelta(saved: number, current: number): string {
  const delta = current - saved
  if (Math.abs(delta) < 1) return 'flat'
  const abs = Math.round(Math.abs(delta))
  // U+2212 minus (not hyphen) for negative
  return delta > 0 ? `+$${abs}` : `−$${abs}`
}

interface DeltaTagProps {
  savedPrice: number | null
  currentPrice: number | null
}

export function DeltaTag({ savedPrice, currentPrice }: DeltaTagProps) {
  const status = classifyDelta(savedPrice, currentPrice)

  if (status === 'noprice') return null

  const deltaText =
    savedPrice !== null && currentPrice !== null
      ? formatDelta(savedPrice, currentPrice)
      : null

  if (status === 'fresh') {
    const freshTitle =
      savedPrice !== null
        ? `Was $${Math.round(savedPrice)} when you saved`
        : undefined
    return (
      <span
        title={freshTitle}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.04em',
          cursor: freshTitle ? 'help' : undefined,
        }}
      >
        flat
      </span>
    )
  }

  const isDropping = status === 'drop'
  const arrowColor = isDropping ? 'var(--success)' : 'var(--fg-muted)'
  const titleText =
    savedPrice !== null
      ? `${isDropping ? 'Down' : 'Up'} from $${Math.round(savedPrice)} when you saved`
      : undefined

  return (
    <span
      title={titleText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: arrowColor,
        letterSpacing: '0.02em',
      }}
    >
      {isDropping ? (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <path
            d="M4 1v6M1.5 4.5L4 7l2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <path
            d="M4 7V1M1.5 3.5L4 1l2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {deltaText}
    </span>
  )
}

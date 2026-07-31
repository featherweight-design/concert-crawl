// The went-dark / ceiling micro-chart. N run counts, the last being the run
// that tripped the condition.
//
// Never the only carrier of the number: the same figures are written out in
// the evidence line beside it, and the whole chart carries an aria-label that
// reads the series aloud. It is `role="img"` for that reason.
//
// The series is between one and seven entries in production — a venue crawled
// twice yields two bars. Widths are `flex: 1` with a 3px floor rather than a
// fixed bar width, so a short series fills the same box instead of leaving a
// gap that reads as missing data.

interface EvidenceBarsProps {
  series: number[]
  /** Severity ink. Tints the final bar only. */
  tone: string
  width: number
  label: string
}

const HEIGHT = 22

export const EvidenceBars = ({
  series,
  tone,
  width,
  label,
}: EvidenceBarsProps) => {
  // `Math.max(...series, 1)` — the seed keeps an all-zero series (a venue
  // that returned nothing on every run in the window) from dividing by zero.
  const max = Math.max(...series, 1)
  const last = series.length - 1

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 2,
        width,
        height: HEIGHT,
        flexShrink: 0,
      }}
    >
      {series.map((value, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            minWidth: 3,
            // 5px floor so a zero-count run is still a visible mark rather
            // than an invisible gap between its neighbours.
            height: `${Math.max(5, (value / max) * HEIGHT)}px`,
            borderRadius: 1.5,
            background: index === last ? tone : 'var(--border-strong)',
            opacity: index === last ? 1 : 0.75,
          }}
        />
      ))}
    </span>
  )
}

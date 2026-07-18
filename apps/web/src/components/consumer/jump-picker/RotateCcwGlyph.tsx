interface RotateCcwGlyphProps {
  size?: number
  color?: string
  strokeWidth?: number
}

/**
 * Shared "snap to today" reset mark used by both the JumpPicker footer chip and
 * the header BackToTodayControl. Deliberately a rotate-ccw glyph, not a plain
 * chevron — a `◂` would collide with the adjacent prev-week chevron.
 */
export const RotateCcwGlyph = ({
  size = 13,
  color = 'var(--accent)',
  strokeWidth = 2.4,
}: RotateCcwGlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <polyline
      points="1 4 1 10 7 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

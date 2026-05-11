const DOT_POSITIONS: [number, number][] = [
  [14, 38],
  [18, 34],
  [22, 30],
  [26, 26],
  [30, 22],
  [34, 18],
  [14, 32],
]

export function MiniMark({
  tokens,
  size = 22,
}: {
  tokens: Record<string, string>
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="10" fill={tokens['surface-2']} />
      <circle cx="34" cy="14" r="9" fill={tokens['accent']} opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill={tokens['accent-2']} opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill={tokens['signal']} />
      {DOT_POSITIONS.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="1.6"
          fill={tokens['fg']}
          opacity={0.45 + idx * 0.07}
        />
      ))}
    </svg>
  )
}

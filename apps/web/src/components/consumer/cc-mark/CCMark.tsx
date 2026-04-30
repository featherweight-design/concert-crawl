interface CCMarkProps {
  size?: number
}

const TRAIL = [
  { cx: 14, cy: 76, radius: 1.5 },
  { cx: 24, cy: 70, radius: 2 },
  { cx: 34, cy: 64, radius: 2.5 },
  { cx: 42, cy: 58, radius: 3 },
  { cx: 50, cy: 50, radius: 4 },
  { cx: 58, cy: 42, radius: 5 },
  { cx: 66, cy: 32, radius: 6 },
]

export function CCMark({ size = 24 }: CCMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
    >
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="var(--signal)" />
      {TRAIL.map((dot, i) => (
        <circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          fill="var(--signal)"
          opacity={0.35 + i * 0.09}
        />
      ))}
    </svg>
  )
}

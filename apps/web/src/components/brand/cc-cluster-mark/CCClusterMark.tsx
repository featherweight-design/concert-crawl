interface CCClusterMarkProps {
  size?: number
  color?: string
  glow?: string | null
  className?: string
  style?: React.CSSProperties
}

export function CCClusterMark({
  size = 32,
  color = 'currentColor',
  glow = null,
  className,
  style,
}: CCClusterMarkProps) {
  const glowColor = glow ?? color
  const trail = [
    { cx: 14, cy: 76, radius: 1.5 },
    { cx: 24, cy: 70, radius: 2 },
    { cx: 34, cy: 64, radius: 2.5 },
    { cx: 42, cy: 58, radius: 3 },
    { cx: 50, cy: 50, radius: 4 },
    { cx: 58, cy: 42, radius: 5 },
    { cx: 66, cy: 32, radius: 6 },
  ]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      style={{ display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      <circle cx="72" cy="24" r="20" fill={glowColor} opacity="0.18" />
      <circle cx="72" cy="24" r="12" fill={glowColor} opacity="0.36" />
      <circle cx="72" cy="24" r="7" fill={color} />
      {trail.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          fill={color}
          opacity={0.35 + idx * 0.09}
        />
      ))}
    </svg>
  )
}

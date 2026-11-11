interface CCMarkProps {
  size?: number;
}

/** The mark's trail, smallest dot first. The pink wave lays it flat. */
export const TRAIL = [
  { cx: 14, cy: 76, radius: 1.5 },
  { cx: 24, cy: 70, radius: 2 },
  { cx: 34, cy: 64, radius: 2.5 },
  { cx: 42, cy: 58, radius: 3 },
  { cx: 50, cy: 50, radius: 4 },
  { cx: 58, cy: 42, radius: 5 },
  { cx: 66, cy: 32, radius: 6 },
] as const;

/** Each trail dot's opacity, rising toward the core. */
export const trailOpacity = (index: number) => 0.35 + index * 0.09;

/** The halo rings around the core, outermost first, and the core itself. */
export const HALO = [
  { radius: 20, opacity: 0.22 },
  { radius: 12, opacity: 0.42 },
] as const;
export const CORE_RADIUS = 7;

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
      {HALO.map((ring) => (
        <circle
          key={ring.radius}
          cx="72"
          cy="24"
          r={ring.radius}
          fill="var(--accent)"
          opacity={ring.opacity}
        />
      ))}
      <circle cx="72" cy="24" r={CORE_RADIUS} fill="var(--signal)" />
      {TRAIL.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          fill="var(--signal)"
          opacity={trailOpacity(idx)}
        />
      ))}
    </svg>
  );
}

import {
  CORE,
  CORE_RADIUS,
  HALO,
  TRAIL,
  trailOpacity,
} from '@/components/brand/cc-mark/CCMark';

// The mark as plain inline SVG, drawn from CCMark's own geometry so it never
// drifts from the real one, and with nothing to load.

/** Trail dots from here on have fallen away from the core. */
const SNAP_AT = 4;
const SNAP_OFFSET = { dx: 6, dy: 16 } as const;

/** The real mark, for the logo and the card rail. */
export const LogoMark = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 96"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      width="96"
      height="96"
      rx="20"
      fill="var(--bg)"
      stroke="var(--border-strong)"
      strokeWidth="3"
    />
    {HALO.map((ring) => (
      <circle
        key={ring.radius}
        {...CORE}
        r={ring.radius}
        fill="var(--accent)"
        opacity={ring.opacity}
      />
    ))}
    <circle {...CORE} r={CORE_RADIUS} fill="var(--signal)" />
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

/** The error's mark: the trail snapped below the core, and the core gone dark. */
export const SnappedMark = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 96"
    aria-hidden="true"
    focusable="false"
  >
    {HALO.map((ring) => (
      <circle
        key={ring.radius}
        {...CORE}
        r={ring.radius}
        fill="var(--danger)"
        opacity={ring.opacity + 0.12}
      />
    ))}
    <circle {...CORE} r={CORE_RADIUS} fill="var(--bg)" />
    {TRAIL.map((dot, idx) => {
      const snapped = idx >= SNAP_AT;
      return (
        <circle
          key={idx}
          cx={dot.cx + (snapped ? SNAP_OFFSET.dx : 0)}
          cy={dot.cy + (snapped ? SNAP_OFFSET.dy : 0)}
          r={dot.radius * (snapped ? 0.8 : 1)}
          fill="var(--signal)"
          opacity={trailOpacity(idx) * 0.85}
        />
      );
    })}
  </svg>
);

export const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M3.5 8.5l3 3 6-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <rect
      x="5"
      y="5"
      width="8.5"
      height="8.5"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

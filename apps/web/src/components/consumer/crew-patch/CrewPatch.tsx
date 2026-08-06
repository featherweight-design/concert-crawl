import { useId } from 'react'

import {
  crewIdentity,
  CREW_CHORD_TOKENS,
  type CrewGround,
  type CrewSigil,
  type CrewWeave,
} from './lib/crew-identity'

export type CrewPatchScale = 'hero' | 'tile' | 'micro'

interface CrewPatchProps {
  crewId: string
  patchSalt?: number
  size?: number
  scale?: CrewPatchScale
}

interface LayerColors {
  pri: string
  sec: string
}

/** Weaves are single-colour by design, so they take the primary alone. */
interface WeaveArgs {
  pri: string
  sw: number
  pid: string
}

/** Wraps n copies of a node in evenly spaced rotations about the patch centre. */
const radial = (count: number, node: (index: number) => React.ReactNode) =>
  Array.from({ length: count }, (_, i) => (
    <g key={i} transform={`rotate(${(360 / count) * i} 50 50)`}>
      {node(i)}
    </g>
  ))

const hexPoints = (radius: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = ((i * 60 - 90) * Math.PI) / 180
    return `${(50 + Math.cos(angle) * radius).toFixed(2)} ${(50 + Math.sin(angle) * radius).toFixed(2)}`
  }).join(' L ')

/** Grounds — the field the sigil sits on. Always the chord's secondary. */
const GROUND_RENDERERS: Record<
  CrewGround,
  (args: LayerColors) => React.ReactNode
> = {
  halo: ({ sec }) => (
    <g>
      {[46, 36, 26].map((radius, i) => (
        <circle
          key={radius}
          cx="50"
          cy="50"
          r={radius}
          fill={sec}
          fillOpacity={0.07 + i * 0.045}
        />
      ))}
    </g>
  ),
  wedges: ({ sec }) => {
    const wedges: string[] = []
    for (let i = 0; i < 6; i += 2) {
      const from = ((i * 60 - 90) * Math.PI) / 180
      const to = (((i + 1) * 60 - 90) * Math.PI) / 180
      const radius = 70
      wedges.push(
        `M50 50 L${(50 + Math.cos(from) * radius).toFixed(2)} ${(50 + Math.sin(from) * radius).toFixed(2)} L${(50 + Math.cos(to) * radius).toFixed(2)} ${(50 + Math.sin(to) * radius).toFixed(2)} Z`,
      )
    }
    return (
      <g>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={sec}
          fillOpacity="0.08"
        />
        {wedges.map((path) => (
          <path key={path} d={path} fill={sec} fillOpacity="0.13" />
        ))}
      </g>
    )
  },
  bands: ({ sec }) => (
    <g>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x="0"
          y={i * 14.3}
          width="100"
          height="7.2"
          fill={sec}
          fillOpacity={i % 2 ? 0.16 : 0.07}
        />
      ))}
    </g>
  ),
}

/**
 * Weaves — the fabric. Three of the four tile as an SVG <pattern> painted
 * through one oversized rect: hand-emitting the lines cost ~50 nodes per patch
 * and saturated the renderer across a full list. Warp is radial so it cannot
 * tile, but it is 15 nodes and stays explicit.
 */
const WEAVE_RENDERERS: Record<CrewWeave, (args: WeaveArgs) => React.ReactNode> =
  {
    twill: ({ pri, sw, pid }) => (
      <g>
        <defs>
          <pattern
            id={pid}
            patternUnits="userSpaceOnUse"
            width="12"
            height="12"
          >
            <line
              x1="0"
              y1="12"
              x2="12"
              y2="0"
              stroke={pri}
              strokeWidth={sw}
              strokeOpacity="0.26"
            />
            <line
              x1="0"
              y1="0"
              x2="12"
              y2="12"
              stroke={pri}
              strokeWidth={sw * 0.7}
              strokeOpacity="0.15"
            />
          </pattern>
        </defs>
        <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`} />
      </g>
    ),
    warp: ({ pri, sw }) => (
      <g>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={(50 + Math.cos(angle) * 80).toFixed(2)}
              y2={(50 + Math.sin(angle) * 80).toFixed(2)}
              stroke={pri}
              strokeWidth={sw}
              strokeOpacity="0.22"
            />
          )
        })}
        {[20, 32, 44].map((radius) => (
          <circle
            key={radius}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={pri}
            strokeWidth={sw * 0.8}
            strokeOpacity="0.18"
          />
        ))}
      </g>
    ),
    braid: ({ pri, sw, pid }) => (
      <g>
        <defs>
          <pattern
            id={pid}
            patternUnits="userSpaceOnUse"
            width="13"
            height="13"
          >
            <path
              d="M0 9.5 L6.5 3 L13 9.5"
              fill="none"
              stroke={pri}
              strokeWidth={sw}
              strokeOpacity="0.24"
            />
          </pattern>
        </defs>
        <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`} />
      </g>
    ),
    knot: ({ pri, sw, pid }) => (
      <g>
        <defs>
          <pattern
            id={pid}
            patternUnits="userSpaceOnUse"
            width="16"
            height="16"
          >
            <line
              x1="0"
              y1="16"
              x2="16"
              y2="0"
              stroke={pri}
              strokeWidth={sw}
              strokeOpacity="0.24"
              strokeDasharray="7 5"
            />
            <line
              x1="0"
              y1="0"
              x2="16"
              y2="16"
              stroke={pri}
              strokeWidth={sw}
              strokeOpacity="0.24"
              strokeDasharray="7 5"
            />
          </pattern>
        </defs>
        <rect x="-20" y="-20" width="140" height="140" fill={`url(#${pid})`} />
      </g>
    ),
  }

/** Sigils — the crest. Upright at every size; the chord's primary carries it. */
const SIGIL_RENDERERS: Record<
  CrewSigil,
  (args: LayerColors) => React.ReactNode
> = {
  triad: ({ pri, sec }) => (
    <g>
      <circle
        cx="50"
        cy="50"
        r="21"
        fill="none"
        stroke={pri}
        strokeWidth="3.2"
      />
      {radial(3, () => (
        <circle cx="50" cy="29" r="6.4" fill={pri} />
      ))}
      <circle cx="50" cy="50" r="6" fill={sec} />
    </g>
  ),
  bloom: ({ pri, sec }) => (
    <g>
      {radial(6, () => (
        <ellipse cx="50" cy="34" rx="6" ry="13" fill={pri} fillOpacity="0.92" />
      ))}
      <circle cx="50" cy="50" r="8" fill={sec} />
      <circle cx="50" cy="50" r="8" fill="none" stroke={pri} strokeWidth="2" />
    </g>
  ),
  beacon: ({ pri, sec }) => (
    <g>
      <rect x="47" y="42" width="6" height="26" rx="3" fill={pri} />
      <circle cx="50" cy="33" r="7.5" fill={sec} />
      <path
        d="M32 40a24 24 0 0 1 36 0"
        fill="none"
        stroke={pri}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M25 48a34 34 0 0 1 50 0"
        fill="none"
        stroke={pri}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </g>
  ),
  keystone: ({ pri, sec }) => (
    <g>
      <path
        d={`M ${hexPoints(24)} Z`}
        fill="none"
        stroke={pri}
        strokeWidth="3.2"
      />
      <path d={`M ${hexPoints(13)} Z`} fill={sec} />
      {radial(3, () => (
        <rect x="48.6" y="17" width="2.8" height="8" rx="1.4" fill={pri} />
      ))}
    </g>
  ),
  tangle: ({ pri, sec }) => (
    <g>
      {radial(3, () => (
        <circle
          cx="50"
          cy="41"
          r="13"
          fill="none"
          stroke={pri}
          strokeWidth="3.2"
        />
      ))}
      <circle cx="50" cy="50" r="4.5" fill={sec} />
    </g>
  ),
}

const SQUIRCLE_RADIUS = 28

/**
 * The generated emblem for a crew: a sew-on patch, not a poster. Every colour
 * is a theme token, so a patch reskins with the theme and a new theme costs
 * nothing. Decorative by definition — the crew's name is the accessible label
 * and always sits outside the patch.
 */
export function CrewPatch({
  crewId,
  patchSalt = 0,
  size = 96,
  scale = 'hero',
}: CrewPatchProps) {
  const identity = crewIdentity(crewId, patchSalt)
  // useId, not a module-scope counter: server and client counters diverge under
  // SSR and hydrate the clipPath/pattern refs onto ids that do not exist.
  const uid = `cp${useId().replace(/:/g, '')}`
  const chord = CREW_CHORD_TOKENS[identity.chord]
  const pri = `var(${chord.primary})`
  const sec = `var(${chord.secondary})`
  // micro drops the weave and the stitch: at 24-28px they turn to mud, and the
  // sigil plus chord is what makes a crew recognisable in a picker.
  const showWeave = scale !== 'micro'
  const showStitch = scale === 'hero'
  const sw = scale === 'hero' ? 1.6 : 2.2

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx={SQUIRCLE_RADIUS}
            ry={SQUIRCLE_RADIUS}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx={SQUIRCLE_RADIUS}
          ry={SQUIRCLE_RADIUS}
          fill="var(--surface-2)"
        />
        {GROUND_RENDERERS[identity.ground]({ pri, sec })}
        {showWeave && (
          <g transform={`rotate(${identity.spin} 50 50)`}>
            {WEAVE_RENDERERS[identity.weave]({ pri, sw, pid: `${uid}-w` })}
          </g>
        )}
        {SIGIL_RENDERERS[identity.sigil]({ pri, sec })}
      </g>
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx={SQUIRCLE_RADIUS}
        ry={SQUIRCLE_RADIUS}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="2"
      />
      {showStitch && (
        <rect
          x="7.5"
          y="7.5"
          width="85"
          height="85"
          rx={SQUIRCLE_RADIUS - 5}
          ry={SQUIRCLE_RADIUS - 5}
          fill="none"
          stroke="var(--fg-subtle)"
          strokeWidth="1.1"
          strokeDasharray="3 4.5"
          strokeOpacity="0.55"
        />
      )}
    </svg>
  )
}

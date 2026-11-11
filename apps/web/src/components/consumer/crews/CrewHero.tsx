import {
  CrewPatch,
  CREW_CHORD_TOKENS,
  crewIdentity,
} from '@/components/consumer/crew-patch';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

interface CrewHeroProps {
  crewId: string;
  name: string;
  patchSalt: number;
  memberCount: number;
  isKeeper: boolean;
  muted: boolean;
  wide: boolean;
  /** The invite and options controls, mounted by the home. */
  actions?: React.ReactNode;
}

const Dot = () => (
  <span
    aria-hidden="true"
    style={{
      width: 3,
      height: 3,
      borderRadius: 3,
      background: 'currentColor',
      opacity: 0.7,
      flexShrink: 0,
    }}
  />
);

const RINGS = [70, 120, 175, 235, 300, 370];
const SPOKES = 16;

/**
 * The patch's own motif, carried out across the hero card (B+ rule 1): its
 * rings and spokes in the crew's two chord colours, centred on the patch. This
 * is the card's identity in place of a glow. Decorative, and static, so there
 * is nothing for reduced motion to guard.
 */
const PatchRings = ({
  crewId,
  patchSalt,
  cx,
  cy,
}: {
  crewId: string;
  patchSalt: number;
  cx: number;
  cy: number;
}) => {
  const chord = CREW_CHORD_TOKENS[crewIdentity(crewId, patchSalt).chord];
  const pri = `var(${chord.primary})`;
  const sec = `var(${chord.secondary})`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      // No viewBox: user units are CSS pixels, so the centre lands on the
      // patch whatever the card's height.
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g fill="none" strokeWidth="1">
        {RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={index === 1 ? sec : pri}
            strokeOpacity={index === 1 ? 0.35 : 0.16}
          />
        ))}
        {Array.from({ length: SPOKES }, (_, i) => {
          const angle = (i * 2 * Math.PI) / SPOKES;
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * 60}
              y1={cy + Math.sin(angle) * 60}
              x2={cx + Math.cos(angle) * 420}
              y2={cy + Math.sin(angle) * 420}
              stroke={pri}
              strokeOpacity="0.12"
            />
          );
        })}
      </g>
    </svg>
  );
};

/**
 * The crew's identity. The host line reads off `isKeeper` alone (Host is the
 * B+ name; the identifier stays) — there is no "started it", because the host
 * moves on handoff and the creator does not, so naming the creator would go
 * stale the first time it changed hands.
 */
export const CrewHero = ({
  crewId,
  name,
  patchSalt,
  memberCount,
  isKeeper,
  muted,
  wide,
  actions,
}: CrewHeroProps) => {
  const patchSize = wide ? 100 : 76;
  return (
    <header
      className="relative overflow-hidden"
      style={{
        borderRadius: 20,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: wide ? '22px 24px' : '18px 16px',
      }}
    >
      <PatchRings
        crewId={crewId}
        patchSalt={patchSalt}
        cx={wide ? 24 + patchSize / 2 : 16 + patchSize / 2}
        cy={wide ? 22 + patchSize / 2 : 18 + patchSize / 2}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" style={{ flexShrink: 0 }}>
            <CrewPatch
              crewId={crewId}
              patchSalt={patchSalt}
              size={patchSize}
              scale="hero"
            />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 7,
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--signal)',
              }}
            >
              <span>{COPY.detail.spots(memberCount)}</span>
              {isKeeper && (
                <>
                  <Dot />
                  <span>{COPY.detail.hostEyebrow}</span>
                </>
              )}
              {muted && (
                <>
                  <Dot />
                  <span style={{ color: 'var(--warning)' }}>
                    {COPY.detail.mutedEyebrow}
                  </span>
                </>
              )}
            </span>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: wide ? 36 : 26,
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                textWrap: 'balance',
                overflowWrap: 'anywhere',
                color: 'var(--fg)',
              }}
            >
              {name}
            </h1>
            {wide && actions !== undefined && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
        {/* On a phone the controls drop below the patch, full width, so two
            44px pills fit a 320px card side by side. */}
        {!wide && actions !== undefined && (
          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">{actions}</div>
        )}
      </div>
    </header>
  );
};

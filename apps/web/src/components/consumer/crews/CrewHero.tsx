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
// The ring layer's square: the longest spoke plus a margin, either side.
const SPOKE_REACH = 420;
const LAYER = SPOKE_REACH * 2 + 20;
const MID = LAYER / 2;

/**
 * The patch's own motif, carried out across the hero card (B+ rule 1): its
 * rings and spokes in the crew's two chord colours, centred on the patch. This
 * is the card's identity in place of a glow. Decorative, and static, so there
 * is nothing for reduced motion to guard.
 */
const PatchRings = ({
  crewId,
  patchSalt,
}: {
  crewId: string;
  patchSalt: number;
}) => {
  const chord = CREW_CHORD_TOKENS[crewIdentity(crewId, patchSalt).chord];
  const pri = `var(${chord.primary})`;
  const sec = `var(${chord.secondary})`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      // Centred on the patch's own wrapper rather than on card coordinates,
      // so it stays on the patch however tall the text column makes the row.
      // The card's overflow clips what spills past its edge.
      width={LAYER}
      height={LAYER}
      viewBox={`0 0 ${LAYER} ${LAYER}`}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <g fill="none" strokeWidth="1">
        {RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={MID}
            cy={MID}
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
              x1={MID + Math.cos(angle) * 60}
              y1={MID + Math.sin(angle) * 60}
              x2={MID + Math.cos(angle) * SPOKE_REACH}
              y2={MID + Math.sin(angle) * SPOKE_REACH}
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
      className="relative isolate overflow-hidden"
      style={{
        borderRadius: 20,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: wide ? '22px 24px' : '18px 16px',
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="relative shrink-0">
            <PatchRings crewId={crewId} patchSalt={patchSalt} />
            <span className="relative z-[1] block">
              <CrewPatch
                crewId={crewId}
                patchSalt={patchSalt}
                size={patchSize}
                scale="hero"
              />
            </span>
          </span>
          {/* The name comes first in the DOM so a screen reader hears it
              first; `order` lifts the count line above it on screen. */}
          <div className="relative z-[1] flex min-w-0 flex-col gap-2">
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
            <span
              style={{
                order: -1,
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
            {wide && actions !== undefined && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
        {/* On a phone the controls drop below the patch, side by side as the
            board draws them; the home trims their padding so both labels hold
            one line in a 320px card. */}
        {!wide && actions !== undefined && (
          <div className="relative z-[1] grid grid-cols-2 gap-2 [&>*]:min-w-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

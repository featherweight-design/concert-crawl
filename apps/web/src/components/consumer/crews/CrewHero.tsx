import { CrewPatch } from '@/components/consumer/crew-patch'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface CrewHeroProps {
  crewId: string
  name: string
  patchSalt: number
  memberCount: number
  isKeeper: boolean
  muted: boolean
  wide: boolean
  /** The invite and options controls, mounted by the home. */
  actions?: React.ReactNode
}

const Dot = () => (
  <span
    aria-hidden="true"
    style={{
      width: 3,
      height: 3,
      borderRadius: 3,
      background: 'var(--fg-subtle)',
      flexShrink: 0,
    }}
  />
)

/**
 * The crew's identity. The keeper line reads off `isKeeper` alone — there is
 * no "started it", because the keeper moves on handoff and the creator does
 * not, so naming the creator would go stale the first time it changed hands.
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
}: CrewHeroProps) => (
  <header className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <span aria-hidden="true" style={{ flexShrink: 0 }}>
        <CrewPatch
          crewId={crewId}
          patchSalt={patchSalt}
          size={wide ? 92 : 72}
          scale="hero"
        />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: wide ? 34 : 25,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            textWrap: 'balance',
            color: 'var(--fg)',
          }}
        >
          {name}
        </h1>
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
            color: 'var(--fg-subtle)',
          }}
        >
          <span>{COPY.detail.spots(memberCount)}</span>
          {isKeeper && (
            <>
              <Dot />
              <span>{COPY.detail.keeperEyebrow}</span>
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
      </div>
    </div>
    {actions !== undefined && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </header>
)

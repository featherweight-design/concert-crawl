import type { CrewMemberPreview } from '@concert-crawl/types'

import { CREWS_COPY } from './definitions/copy'

const initialFor = (handle: string): string =>
  handle
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 1)
    .toUpperCase()

interface MemberDotProps {
  member: CrewMemberPreview
  size: number
}

/**
 * One member. A member without a handle is counted and drawn, never given an
 * invented name: the dashed letterless disc is the honest rendering of "we
 * don't know what to call them yet" (the #762 contract).
 */
export const MemberDot = ({ member, size }: MemberDotProps) => {
  const named = member.handle !== null && member.handle !== ''
  const tone = member.avatarColor ?? 'signal'

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: named ? 'var(--surface-3)' : 'transparent',
        border: named
          ? '1.5px solid var(--border-strong)'
          : '1.5px dashed var(--border-strong)',
        color: named ? `var(--${tone})` : 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: size * 0.42,
        letterSpacing: '-0.02em',
        boxShadow: '0 0 0 2px var(--bg)',
      }}
    >
      {named && member.handle !== null ? (
        initialFor(member.handle)
      ) : (
        <span
          style={{
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: size,
            background: 'var(--fg-subtle)',
            opacity: 0.7,
          }}
        />
      )}
    </span>
  )
}

interface MemberClusterProps {
  members: CrewMemberPreview[]
  memberCount: number
  size: number
  max: number
}

export const MemberCluster = ({
  members,
  memberCount,
  size,
  max,
}: MemberClusterProps) => {
  const shown = members.slice(0, max)
  // Count, not the preview length: the API caps `members` at five, so a crew
  // of nine must still say nine.
  const extra = memberCount - shown.length

  return (
    // `isolation: isolate` is load-bearing. The overlapping dots need z-index
    // to stack front to back, and a z-index on a flex item applies even without
    // positioning, so without a local stacking context those dots paint above
    // later siblings entirely, scrims and sheets included.
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <span className="sr-only">
        {CREWS_COPY.list.memberCount(memberCount)}
      </span>
      <span
        style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 3 }}
      >
        {shown.map((member, index) => (
          <span
            key={member.userId}
            style={{
              marginLeft: index ? -size * 0.32 : 0,
              zIndex: shown.length - index,
            }}
          >
            <MemberDot member={member} size={size} />
          </span>
        ))}
      </span>
      {extra > 0 && (
        <span
          aria-hidden="true"
          style={{
            marginLeft: -size * 0.22,
            zIndex: 0,
            width: size,
            height: size,
            borderRadius: size,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-strong)',
            boxShadow: '0 0 0 2px var(--bg)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: size * 0.36,
            color: 'var(--fg-muted)',
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}

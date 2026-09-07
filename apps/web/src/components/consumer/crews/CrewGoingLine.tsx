'use client'

// Crew presence on event detail (#1226, handoff crew-social-rail.jsx).
//
// It is NOT a bordered rail of its own. The CTA pass's governing rule is that a
// status line belongs to the control it describes: the watcher crawl belongs to
// the eye, and crew attendance belongs to Going. Two bordered social blocks
// stacked is exactly the "two competing rails" this replaced.

import { useLayoutEffect, useRef, useState } from 'react'
import type { CrewMemberPreview } from '@concert-crawl/types'
import { useCrewGoing } from '@/lib/queries/use-crew-going'
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'
import { LensGlyph } from './CrewLens'
import { MemberDot } from './MemberCluster'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

/**
 * Below this the faces are spending width the names need. Measured, not
 * guessed: the stack (74) + chip (58) + gaps (18) leave 146px, and one handle
 * plus a "+ N more" tail needs ~170.
 */
export const CREW_FACES_MIN_WIDTH = 296

/** Past the last text rung the "going" suffix is dropped rather than a name. */
const SUFFIX_LEVEL = 3

const handleOf = (member: CrewMemberPreview): string | null =>
  member.handle === null || member.handle === '' ? null : member.handle

const DiscStack = ({
  members,
  size,
  max = 3,
}: {
  members: CrewMemberPreview[]
  size: number
  max?: number
}) => {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    // `isolation: isolate` for the same reason MemberCluster carries it: the
    // overlapping discs need z-index, and without a local stacking context they
    // paint over later siblings, scrims included.
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        isolation: 'isolate',
        flexShrink: 0,
        paddingLeft: 2,
      }}
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
      {extra > 0 && (
        <span
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
          {`+${extra}`}
        </span>
      )}
    </span>
  )
}

interface CrewGoingLineProps {
  going: CrewMemberPreview[]
  /** Desktop widths get a third name and slightly larger discs. */
  wide?: boolean
}

/**
 * The degradation ladder runs on two different boxes, deliberately:
 *
 * - 2 names -> 1 name -> drop the "going" suffix is measured on the TEXT span,
 *   because those rungs only change text inside the observed box.
 * - faces give way to the names is measured on the ROW, because dropping the
 *   faces removes a sibling and so widens the span the measurement was taken
 *   on. Gating that on the span reproduces the oscillation already fixed twice
 *   in WhenWhere and MetaRow (drop faces, span widens, observer resets, faces
 *   return). A row's width cannot be changed by what is inside it, so this gate
 *   is stable by construction.
 *
 * The ladder drops names for width, never for privacy: an sr-only span carries
 * the full named list plus the unnamed remainder at every rung.
 */
export const CrewGoingLine = ({ going, wide = false }: CrewGoingLineProps) => {
  const textRef = useRef<HTMLSpanElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const lastWidth = useRef(-1)
  const [level, setLevel] = useState(0)
  const [roomForFaces, setRoomForFaces] = useState(true)

  const names = going.flatMap((member) => {
    const handle = handleOf(member)
    return handle === null ? [] : [handle]
  })
  const anonymous = names.length === 0
  const maxNames = Math.min(names.length, wide ? 3 : 2)

  useLayoutEffect(() => {
    setLevel(0)
  }, [going.length, wide])

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || anonymous) return
    // The half-pixel slack keeps a sub-pixel rounding difference from reading
    // as an overflow and stepping the ladder forever.
    if (el.scrollWidth > el.clientWidth + 0.5 && level < SUFFIX_LEVEL) {
      setLevel((current) => current + 1)
    }
  }, [level, going.length, wide, anonymous, roomForFaces])

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    lastWidth.current = el.clientWidth
    const observer = new ResizeObserver(() => {
      const width = el.clientWidth
      if (Math.abs(width - lastWidth.current) > 1) {
        lastWidth.current = width
        setLevel(0)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const measure = () =>
      setRoomForFaces(row.clientWidth >= CREW_FACES_MIN_WIDTH)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])

  // Below every hook: a crew line that loses its last member must not change
  // the hook count between renders.
  if (going.length === 0) return null

  const shownCount = Math.max(1, maxNames - Math.min(level, maxNames - 1))
  const shownNames = names.slice(0, shownCount)
  const extra = going.length - shownNames.length
  const suffix = level < SUFFIX_LEVEL ? COPY.goingLine.suffix : ''
  const text = anonymous
    ? COPY.goingLine.unnamed(going.length)
    : `${shownNames.join(', ')}${extra > 0 ? COPY.goingLine.more(extra) : ''}${suffix}`

  const unnamed = going.length - names.length
  const srFull = anonymous ? null : COPY.a11y.goingList(names, unnamed)

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        paddingTop: wide ? 9 : 8,
      }}
    >
      {!anonymous && roomForFaces ? (
        <DiscStack members={going} size={wide ? 26 : 23} />
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: 7,
            flexShrink: 0,
            background: 'var(--signal)',
            boxShadow: '0 0 8px var(--signal)',
          }}
        />
      )}
      <span
        ref={textRef}
        aria-hidden={srFull === null ? undefined : 'true'}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
          fontSize: wide ? 12.5 : 12,
          letterSpacing: '-0.005em',
          lineHeight: 1.4,
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {text}
      </span>
      {srFull !== null && <span className="sr-only">{srFull}</span>}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 7px',
          borderRadius: 5,
          color: 'var(--signal)',
          background: 'color-mix(in oklch, var(--signal) 12%, transparent)',
          border:
            '1px solid color-mix(in oklch, var(--signal) 34%, transparent)',
        }}
      >
        <LensGlyph size={10} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          {COPY.goingLine.chip}
        </span>
      </span>
    </div>
  )
}

/**
 * The connected half. Event detail is server-rendered and crew membership is
 * per-viewer, so the line is fetched on the client. It renders nothing at all
 * while loading or on failure: the line is an aside on someone else's decision,
 * and a skeleton or an error strip above "I'm going!" would be louder than the
 * fact it carries.
 */
export const CrewGoingZone = ({
  eventId,
  wide,
}: {
  eventId: string
  wide?: boolean
}) => {
  const { enabled: crewsEnabled } = useFeatureFlag('crews')
  const { data } = useCrewGoing(eventId)
  // The connected half is the only render site, so gating it covers every
  // caller of the presentational line below it.
  if (!crewsEnabled || !data) return null
  return <CrewGoingLine going={data.going} wide={wide ?? false} />
}

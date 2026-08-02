import React from 'react'
import Link from 'next/link'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  formatMoreCount,
  SEPARATORS,
  supportingA11yLabel,
  type SeparatorKey,
} from './lib/supportingLine'

type Surface = 'card' | 'hero' | 'detail'

const RAMP: Record<Surface, { lead: number; name: number }> = {
  card: { lead: 10, name: 12 },
  hero: { lead: 11, name: 13 },
  detail: { lead: 13, name: 16 },
}

interface SupportingLineProps {
  artists: string[]
  surface?: Surface
  separator?: SeparatorKey
  maxInline?: number | null
  dim?: boolean
  /**
   * #1115 PR-G — artist-page slugs, positionally aligned with `artists`:
   * index i of one is index i of the other, `null` where that name has no
   * `artists` row. Ignored entirely unless `linkArtists` is set.
   */
  slugs?: Array<string | null> | null
  /**
   * Opt-in. Only the event-detail surface turns this on; card and hero render
   * exactly the markup they always have, whether slugs are available or not.
   */
  linkArtists?: boolean
}

export const SupportingLine = ({
  artists,
  surface = 'card',
  separator = 'middot',
  maxInline = null,
  dim = false,
  slugs = null,
  linkArtists = false,
}: SupportingLineProps): React.JSX.Element | null => {
  if (artists.length === 0) return null
  const ramp = RAMP[surface]
  const sep = SEPARATORS[separator]
  const lead = CONSUMER_COPY.eventTitle.lead
  const limit = maxInline == null ? artists.length : Math.max(1, maxInline)
  const shown = artists.slice(0, limit)
  const hidden = artists.length - shown.length
  const nameColor = dim ? 'text-fg-subtle' : 'text-fg-muted'
  // `detail` shows the full roster and may wrap to multiple lines (no clipping);
  // `card`/`hero` stay one line via `truncate`. Mirrors EventTitleBlock's headliner.
  const runClass = surface === 'detail' ? 'whitespace-normal' : 'truncate'

  const linkedSlugs = linkArtists ? (slugs ?? []) : []
  const hasAnyLink = shown.some(
    (_, index) => (linkedSlugs[index] ?? null) !== null,
  )

  // A focusable link must never sit inside an `aria-hidden` subtree — a keyboard
  // user would tab to something no screen reader can announce. So the run is
  // hidden from AT only while it contains nothing focusable (every card and
  // hero, and any detail bill whose names have no pages); the moment a name
  // becomes a link the run is exposed, and the decorative bits (lead-in,
  // separators, "+N more") carry their own aria-hidden instead. The group's
  // composed aria-label is byte-identical either way.
  const hideRunFromAt = !hasAnyLink

  // One shared style object so a linked name and a plain one sit on exactly the
  // same RAMP — the affordance is hover/focus underline, never a size change.
  const nameStyle: React.CSSProperties = {
    fontSize: ramp.name,
    letterSpacing: '-0.005em',
  }

  return (
    <div
      role="group"
      aria-label={supportingA11yLabel(lead, artists)}
      className="flex min-w-0 items-baseline"
      style={{ lineHeight: 1.35 }}
    >
      <span
        aria-hidden="true"
        className="relative mr-1.5 shrink-0 font-mono text-fg-subtle"
        style={{ fontSize: ramp.lead, letterSpacing: '0.04em', top: '-0.02em' }}
      >
        {lead}
      </span>
      <span
        className={`min-w-0 ${runClass}`}
        {...(hideRunFromAt ? { 'aria-hidden': true } : {})}
      >
        {shown.map((name, index) => {
          const slug = linkedSlugs[index] ?? null
          return (
            <span key={`${name}-${index}`}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="px-1.5 font-normal text-fg-subtle"
                  style={{ fontSize: ramp.name }}
                >
                  {sep}
                </span>
              )}
              {slug === null ? (
                <span
                  className={`font-semibold ${nameColor}`}
                  style={nameStyle}
                >
                  {name}
                </span>
              ) : (
                <Link
                  href={`/artists/${slug}`}
                  className={`font-semibold underline-offset-2 hover:underline focus-visible:underline ${nameColor}`}
                  style={nameStyle}
                >
                  {name}
                </Link>
              )}
            </span>
          )
        })}
        {hidden > 0 && (
          <span aria-hidden="true">
            <span
              className="px-1.5 text-fg-subtle"
              style={{ fontSize: ramp.name }}
            >
              {sep}
            </span>
            <span
              className="whitespace-nowrap font-mono font-medium text-fg-subtle"
              style={{ fontSize: ramp.name - 1.5, letterSpacing: '0.01em' }}
            >
              {formatMoreCount(hidden)}
            </span>
          </span>
        )}
      </span>
    </div>
  )
}

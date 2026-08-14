import React from 'react'
import Link from 'next/link'
import type { EventStatus } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { StatusPill } from '@/components/consumer/StatusPill'
import { SupportingLine } from './SupportingLine'

type Surface = 'card' | 'hero' | 'detail'

const RAMP: Record<Surface, { head: number; tour: number; gap: number }> = {
  card: { head: 15.5, tour: 9, gap: 3 },
  hero: { head: 22, tour: 10, gap: 3 },
  detail: { head: 34, tour: 12, gap: 5 },
}

interface EventTitleBlockProps {
  headliner: string
  supportingArtists: string[] | null
  tourName: string | null
  fallbackTitle?: string | null
  surface?: Surface
  status?: EventStatus
  maxInline?: number | null
  headlinerAs?: 'h1' | 'div'
  /** Row-only: the ≤360px step of the card ramp. */
  narrow?: boolean
  /**
   * #1115 PR-G — the headliner's artist-page slug, or null when the projection
   * has no row for that name. Ignored unless `linkArtists` is set.
   */
  artistSlug?: string | null
  /** Positionally aligned with `supportingArtists`. See SupportingLine. */
  supportingArtistSlugs?: Array<string | null> | null
  /**
   * Opt-in artist-page links. Off everywhere but the event-detail surface, so
   * cards and heroes keep their whole-card tap target intact — a nested link
   * inside a card link is both invalid markup and a bad tap target.
   */
  linkArtists?: boolean
}

export const EventTitleBlock = ({
  headliner,
  supportingArtists,
  tourName,
  fallbackTitle,
  surface = 'card',
  status = 'upcoming',
  maxInline = null,
  headlinerAs = 'div',
  narrow = false,
  artistSlug = null,
  supportingArtistSlugs = null,
  linkArtists = false,
}: EventTitleBlockProps): React.JSX.Element => {
  const isRow = surface === 'card'
  const ramp = RAMP[surface]
  const headSize = isRow && narrow ? 14.5 : ramp.head
  const dim = status !== 'upcoming'
  const openers = supportingArtists ?? []
  const hasOpeners = openers.length > 0
  // `null` marks a legacy/pre-recrawl row (the crawler never wrote this field);
  // `[]` means the crawler ran and found no openers. Only legacy rows get the
  // run-on `fallbackTitle` — a freshly extracted solo show (`[]`) shows the
  // headliner alone, never the legacy title. Strict `=== null`: `null` is the
  // sole legacy marker, and the prop is required so `undefined` cannot reach here.
  const isLegacyRow = supportingArtists === null
  // The pill itself decides whether to render; this only drives whether the
  // row that would contain it exists at all.
  const hasPill = status !== 'upcoming'
  const Headliner = headlinerAs
  const showLegacyFallback =
    isLegacyRow && !!fallbackTitle && fallbackTitle !== headliner

  return (
    <div className="flex min-w-0 flex-col" style={{ gap: ramp.gap }}>
      {(hasPill || tourName) && (
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ marginBottom: 1 }}
        >
          <StatusPill status={status} fontSize={ramp.tour} />
          {tourName && (
            <div
              aria-label={CONSUMER_COPY.eventTitle.tourAriaLabel(tourName)}
              className={`truncate font-mono uppercase tracking-[0.14em] ${dim ? 'text-fg-subtle' : 'text-fg-muted'}`}
              style={{ fontSize: ramp.tour }}
            >
              {tourName}
            </div>
          )}
        </div>
      )}

      <Headliner
        // `detail` wraps to as many lines as needed (no `truncate`); `card`/`hero`
        // stay one line via `truncate` (which sets overflow-hidden + ellipsis +
        // whitespace-nowrap). Applying `truncate` on `detail` too would clip a
        // multi-line title, so it is scoped to the non-detail surfaces only.
        className={`m-0 min-w-0 ${dim ? 'text-fg-muted' : 'text-fg transition-colors group-hover/eventtitle:text-signal'} ${surface === 'detail' ? 'whitespace-normal' : 'truncate'}`}
        style={{
          fontSize: headSize,
          fontWeight: surface === 'detail' ? 900 : isRow ? 700 : 800,
          letterSpacing:
            surface === 'detail' ? '-0.03em' : isRow ? '-0.01em' : '-0.02em',
          // 1.35 on the row is load-bearing, not taste: `truncate` clips to the
          // line box, so a tighter leading shears accented caps and descenders.
          lineHeight: isRow ? 1.35 : 1.12,
          ...(status === 'cancelled'
            ? {
                textDecoration: 'line-through',
                textDecorationColor: 'var(--danger)',
                textDecorationThickness: 2,
              }
            : {}),
        }}
      >
        {/* The link lives INSIDE the heading so the h1 keeps its text and its
            place in the document outline; wrapping the heading would move the
            landmark. Sizing is inherited, so the RAMP is untouched. */}
        {linkArtists && artistSlug !== null ? (
          <Link
            href={`/artists/${artistSlug}`}
            className="underline-offset-4 hover:underline focus-visible:underline"
          >
            {headliner}
          </Link>
        ) : (
          headliner
        )}
      </Headliner>

      {hasOpeners && (
        <SupportingLine
          artists={openers}
          surface={surface}
          narrow={narrow}
          maxInline={maxInline}
          dim={dim}
          slugs={supportingArtistSlugs}
          linkArtists={linkArtists}
        />
      )}

      {showLegacyFallback && (
        <p
          className={`truncate font-medium ${dim ? 'text-fg-subtle' : 'text-fg-muted'}`}
          style={{ fontSize: RAMP[surface].tour + 3 }}
        >
          {fallbackTitle}
        </p>
      )}
    </div>
  )
}

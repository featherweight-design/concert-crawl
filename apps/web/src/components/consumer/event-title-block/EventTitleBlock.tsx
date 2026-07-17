import React from 'react'
import type { EventStatus } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SupportingLine } from './SupportingLine'

type Surface = 'card' | 'hero' | 'detail'

const RAMP: Record<Surface, { head: number; tour: number; gap: number }> = {
  card: { head: 15, tour: 9, gap: 2 },
  hero: { head: 22, tour: 10, gap: 3 },
  detail: { head: 34, tour: 12, gap: 5 },
}

// Labels come from CONSUMER_COPY (copy-rule). The pill span carries the
// `uppercase` class, so 'Cancelled'/'Postponed' still render all-caps.
const STATUS_PILL: Record<
  Exclude<EventStatus, 'upcoming'>,
  { label: string; tone: string }
> = {
  cancelled: {
    label: CONSUMER_COPY.cancelledLabel,
    tone: 'text-danger border-danger',
  },
  postponed: {
    label: CONSUMER_COPY.postponedLabel,
    tone: 'text-warning border-warning',
  },
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
}: EventTitleBlockProps): React.JSX.Element => {
  const ramp = RAMP[surface]
  const dim = status !== 'upcoming'
  const openers = supportingArtists ?? []
  const hasOpeners = openers.length > 0
  // `null` marks a legacy/pre-recrawl row (the crawler never wrote this field);
  // `[]` means the crawler ran and found no openers. Only legacy rows get the
  // run-on `fallbackTitle` — a freshly extracted solo show (`[]`) shows the
  // headliner alone, never the legacy title. Strict `=== null`: `null` is the
  // sole legacy marker, and the prop is required so `undefined` cannot reach here.
  const isLegacyRow = supportingArtists === null
  const pill = status !== 'upcoming' ? STATUS_PILL[status] : null
  const Headliner = headlinerAs
  const showLegacyFallback =
    isLegacyRow && !!fallbackTitle && fallbackTitle !== headliner

  return (
    <div className="flex min-w-0 flex-col" style={{ gap: ramp.gap }}>
      {(pill || tourName) && (
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ marginBottom: 1 }}
        >
          {pill && (
            <span
              className={`inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-widest ${pill.tone}`}
              style={{ fontSize: ramp.tour, padding: '2px 7px', lineHeight: 1 }}
            >
              {pill.label}
            </span>
          )}
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
          fontSize: ramp.head,
          fontWeight: surface === 'detail' ? 900 : 800,
          letterSpacing: surface === 'detail' ? '-0.03em' : '-0.02em',
          lineHeight: 1.12,
          ...(status === 'cancelled'
            ? {
                textDecoration: 'line-through',
                textDecorationColor: 'var(--danger)',
                textDecorationThickness: 2,
              }
            : {}),
        }}
      >
        {headliner}
      </Headliner>

      {hasOpeners && (
        <SupportingLine
          artists={openers}
          surface={surface}
          maxInline={maxInline}
          dim={dim}
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

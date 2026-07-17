import React from 'react'
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
}

export const SupportingLine = ({
  artists,
  surface = 'card',
  separator = 'middot',
  maxInline = null,
  dim = false,
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
      <span className={`min-w-0 ${runClass}`} aria-hidden="true">
        {shown.map((name, index) => (
          <span key={`${name}-${index}`}>
            {index > 0 && (
              <span
                className="px-1.5 font-normal text-fg-subtle"
                style={{ fontSize: ramp.name }}
              >
                {sep}
              </span>
            )}
            <span
              className={`font-semibold ${nameColor}`}
              style={{ fontSize: ramp.name, letterSpacing: '-0.005em' }}
            >
              {name}
            </span>
          </span>
        ))}
        {hidden > 0 && (
          <>
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
          </>
        )}
      </span>
    </div>
  )
}

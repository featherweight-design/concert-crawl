import type { SourceCategory } from '@concert-crawl/types'
import { CCTip, type TipContent } from '@/components/ui/cc-tip'
import { CONSUMER_COPY } from '../definitions/copy'

const copy = CONSUMER_COPY.watching.sourcePill

interface SourcePillProps {
  // Null is a crawled price with no corroborated submission — no pill.
  priceSourceCategory: SourceCategory | null
}

const PILL: Record<SourceCategory, { label: string; color: string }> = {
  boxoffice: { label: copy.boxofficeLabel, color: 'var(--success)' },
  standard: { label: copy.standardLabel, color: 'var(--signal)' },
  resale: { label: copy.resaleLabel, color: 'var(--warning)' },
}

const TIP: Record<SourceCategory, TipContent> = {
  boxoffice: {
    variant: 'text',
    label: copy.boxofficeLabel,
    body: copy.boxofficeTooltip,
  },
  standard: {
    variant: 'text',
    label: copy.standardLabel,
    body: copy.standardTooltip,
  },
  resale: {
    variant: 'text',
    label: copy.resaleLabel,
    body: copy.resaleTooltip,
  },
}

export function SourcePill({ priceSourceCategory }: SourcePillProps) {
  if (!priceSourceCategory) return null

  const { label, color } = PILL[priceSourceCategory]

  return (
    // The whole Watching row navigates on click, so the tip's trigger has to
    // swallow the event or opening the tip would push the event route instead.
    <span
      onClick={(ev) => ev.stopPropagation()}
      style={{ display: 'inline-flex' }}
    >
      <CCTip tip={TIP[priceSourceCategory]} triggerLabel={label}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color,
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '1px 4px',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </CCTip>
    </span>
  )
}

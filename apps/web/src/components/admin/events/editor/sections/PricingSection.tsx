'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'
import { SrcTag } from '../SrcTag'

export interface PricingSectionEvent {
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  extractionStrategy: string | null
  updatedAt: string | null
}

export interface PricingSectionProps {
  event: PricingSectionEvent
}

const formatPriceValue = (price: string | null): string => {
  if (!price) return ''
  const parsed = parseFloat(price)
  if (Number.isNaN(parsed)) return ''
  return String(Math.round(parsed))
}

const formatUpdatedAt = (iso: string | null): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  return date.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const PricingSection = ({ event }: PricingSectionProps) => {
  const { sections, fields } = ADMIN_COPY.editor
  return (
    <EditSection number={sections.pricingNumber} title={sections.pricingTitle}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <EditField
          label={fields.priceLow}
          type="number"
          prefix="$"
          value={formatPriceValue(event.ticketPriceMin)}
          placeholder={fields.priceLowPlaceholder}
        />
        <EditField
          label={fields.priceHigh}
          type="number"
          prefix="$"
          value={formatPriceValue(event.ticketPriceMax)}
          placeholder={fields.priceHighPlaceholder}
        />
        <EditField
          label={fields.priceSource}
          type="readonly"
          value={<SrcTag source={event.extractionStrategy} />}
        />
        <EditField
          label={fields.priceUpdated}
          type="mono"
          value={formatUpdatedAt(event.updatedAt)}
        />
      </div>
    </EditSection>
  )
}

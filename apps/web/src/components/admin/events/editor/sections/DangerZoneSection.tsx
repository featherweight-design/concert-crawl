'use client'

import { Flag, Trash2 } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { EditSection } from '../EditSection'

export interface DangerZoneSectionProps {
  onMarkNonConcert: () => void
  onDelete: () => void
  disabled?: boolean
}

const COPY = ADMIN_COPY.editor.dangerZone

export const DangerZoneSection = ({
  onMarkNonConcert,
  onDelete,
  disabled = false,
}: DangerZoneSectionProps) => (
  <EditSection
    number={ADMIN_COPY.editor.sections.dangerNumber}
    title={COPY.title}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'color-mix(in oklab, var(--danger) 6%, transparent)',
        border: '1px solid color-mix(in oklab, var(--danger) 22%, transparent)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        {COPY.body}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AdminButton
          type="button"
          variant="outline"
          icon={Flag}
          onClick={onMarkNonConcert}
          disabled={disabled}
        >
          {COPY.markNonConcert}
        </AdminButton>
        <AdminButton
          type="button"
          variant="danger"
          icon={Trash2}
          onClick={onDelete}
          disabled={disabled}
        >
          {COPY.deleteEvent}
        </AdminButton>
      </div>
    </div>
  </EditSection>
)

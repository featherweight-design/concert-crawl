'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditSection } from '../EditSection'

export interface ArtSectionProps {
  artist: string | null
}

export const ArtSection = ({ artist }: ArtSectionProps) => {
  const { sections, art } = ADMIN_COPY.editor
  return (
    <EditSection number={sections.artNumber} title={sections.artTitle}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 12,
            flexShrink: 0,
            background:
              'repeating-linear-gradient(135deg, var(--surface-1) 0 10px, var(--surface-2) 10px 20px)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {art.placeholderLabel}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            lineHeight: 1.6,
            maxWidth: 460,
          }}
        >
          {art.bodyPrefix}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--fg)',
            }}
          >
            {art.bodyArtistPrefix}
            {artist ?? '—'}
          </span>
          {art.bodySuffix}
        </div>
      </div>
    </EditSection>
  )
}

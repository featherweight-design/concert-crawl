'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'

export interface ClassificationSectionProps {
  genre: string[] | null
}

export const ClassificationSection = ({
  genre,
}: ClassificationSectionProps) => {
  const { sections, fields, classification } = ADMIN_COPY.editor
  const tags = genre ?? []
  return (
    <EditSection
      number={sections.classificationNumber}
      title={sections.classificationTitle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tags.length === 0 ? (
          <EditField
            label={fields.genreTags}
            type="tags"
            tags={tags}
            help={fields.genreEmptyHelp}
          />
        ) : (
          <EditField label={fields.genreTags} type="tags" tags={tags} />
        )}
        {/* Mark non-concert hint panel — the action button itself lands in
            PR 9; PR 3 ships the informational scaffolding only. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 14px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 9,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              {classification.markNonConcertTitle}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginTop: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexWrap: 'wrap',
              }}
            >
              <span>{classification.markNonConcertBodyBefore}</span>
              <StatusBadge kind="neutral" mono>
                {classification.markNonConcertTag}
              </StatusBadge>
              <span>{classification.markNonConcertBodyAfter}</span>
            </div>
          </div>
        </div>
      </div>
    </EditSection>
  )
}

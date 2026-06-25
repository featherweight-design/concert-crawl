'use client'

import { Eye, EyeOff, Flag } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'

export interface ClassificationSectionProps {
  genre: string[] | null
  hiddenFromConsumer: boolean
  isConcertReviewNeeded: boolean
  onMarkNonConcert: () => void
  onMarkAsConcert: () => void
  disabled?: boolean
}

export const ClassificationSection = ({
  genre,
  hiddenFromConsumer,
  isConcertReviewNeeded,
  onMarkNonConcert,
  onMarkAsConcert,
  disabled = false,
}: ClassificationSectionProps) => {
  const { sections, fields, classification } = ADMIN_COPY.editor
  const tags = genre ?? []
  return (
    <EditSection
      number={sections.classificationNumber}
      title={sections.classificationTitle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <EditField
          label={fields.genreTags}
          type="tags"
          tags={tags}
          help={tags.length === 0 ? fields.genreEmptyHelp : undefined}
        />

        {isConcertReviewNeeded && (
          <div
            title={classification.reviewNeededPillTooltip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              padding: '4px 10px',
              background:
                'color-mix(in oklab, var(--warning) 12%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 36%, transparent)',
              borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg)',
            }}
          >
            <Flag size={12} />
            {classification.reviewNeededPillLabel}
          </div>
        )}

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
              {hiddenFromConsumer
                ? classification.markAsConcertTitle
                : classification.markNonConcertTitle}
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
              {hiddenFromConsumer ? (
                <span>{classification.markAsConcertBody}</span>
              ) : (
                <>
                  <span>{classification.markNonConcertBodyBefore}</span>
                  <StatusBadge kind="neutral" mono>
                    {classification.markNonConcertTag}
                  </StatusBadge>
                  <span>{classification.markNonConcertBodyAfter}</span>
                </>
              )}
            </div>
          </div>
          {hiddenFromConsumer ? (
            <AdminButton
              type="button"
              variant="outline"
              icon={Eye}
              onClick={onMarkAsConcert}
              disabled={disabled}
            >
              {classification.markAsConcertButton}
            </AdminButton>
          ) : (
            <AdminButton
              type="button"
              variant="outline"
              icon={EyeOff}
              onClick={onMarkNonConcert}
              disabled={disabled}
            >
              {classification.markNonConcertButton}
            </AdminButton>
          )}
        </div>
      </div>
    </EditSection>
  )
}

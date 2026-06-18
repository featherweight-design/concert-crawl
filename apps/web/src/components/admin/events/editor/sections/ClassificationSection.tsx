'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditField } from '../EditField'
import { EditSection } from '../EditSection'

export interface ClassificationSectionProps {
  genre: string[] | null
}

export const ClassificationSection = ({
  genre,
}: ClassificationSectionProps) => {
  const { sections, fields } = ADMIN_COPY.editor
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
      </div>
    </EditSection>
  )
}

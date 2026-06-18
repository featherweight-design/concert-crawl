'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface SrcTagProps {
  source: string | null
}

type Kind = 'signal' | 'accent' | 'warning' | 'neutral' | 'danger'

const SOURCE_KIND_MAP: Record<string, Kind> = {
  structured: 'signal',
  crawled: 'signal',
  llm: 'accent',
  community: 'accent',
  admin: 'warning',
}

export const SrcTag = ({ source }: SrcTagProps) => {
  if (!source) {
    return (
      <StatusBadge kind="danger" variant="outline" mono>
        {ADMIN_COPY.editor.fields.noSource}
      </StatusBadge>
    )
  }
  const kind = SOURCE_KIND_MAP[source] ?? 'neutral'
  return (
    <StatusBadge kind={kind} variant="outline" mono>
      {source}
    </StatusBadge>
  )
}

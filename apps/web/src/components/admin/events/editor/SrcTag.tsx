'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface SrcTagProps {
  source: string | null
}

type Kind = 'signal' | 'accent' | 'warning' | 'neutral' | 'danger'

// Mirrors crawler-core/crawl.ts extraction strategy values:
// - 'structured_data' for JSON-LD / microdata
// - 'llm' for Haiku extraction
// - 'platform:<name>' for venue-platform fetchers (treated as structured)
// - 'community' / 'admin' for human-submitted data (review surfaces)
// - 'structured' / 'crawled' kept for back-compat with older rows
const resolveKind = (source: string): Kind => {
  if (source.startsWith('platform:')) return 'signal'
  switch (source) {
    case 'structured_data':
    case 'structured':
    case 'crawled':
      return 'signal'
    case 'llm':
    case 'community':
      return 'accent'
    case 'admin':
      return 'warning'
    default:
      return 'neutral'
  }
}

export const SrcTag = ({ source }: SrcTagProps) => {
  if (!source) {
    return (
      <StatusBadge kind="danger" variant="outline" mono>
        {ADMIN_COPY.editor.fields.noSource}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge kind={resolveKind(source)} variant="outline" mono>
      {source}
    </StatusBadge>
  )
}

'use client'

import { type MissingClassification } from '@concert-crawl/types'
import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const CLUSTER_THRESHOLD = 3

const classificationBadge: Record<
  MissingClassification,
  { label: string; kind: 'danger' | 'warning' | 'neutral' }
> = {
  removed: {
    label: ADMIN_COPY.review.missing.classificationRemoved,
    kind: 'danger',
  },
  crawl_gap: {
    label: ADMIN_COPY.review.missing.classificationCrawlGap,
    kind: 'warning',
  },
  duplicate: {
    label: ADMIN_COPY.review.missing.classificationDuplicate,
    kind: 'neutral',
  },
  moved: {
    label: ADMIN_COPY.review.missing.classificationMoved,
    kind: 'warning',
  },
}

export interface MissingChipsProps {
  missedCount: number
  classification: MissingClassification
  clusterCount: number
  venueName: string | null
}

export const MissingChips = ({
  missedCount,
  classification,
  clusterCount,
  venueName,
}: MissingChipsProps) => {
  const missedKind = missedCount >= 4 ? 'danger' : 'warning'
  const cls = classificationBadge[classification]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <StatusBadge kind={cls.kind} variant="outline" mono>
        {cls.label}
      </StatusBadge>
      <StatusBadge kind={missedKind} variant="outline" mono>
        {ADMIN_COPY.review.missing.chipMissed(missedCount)}
      </StatusBadge>
      <StatusBadge kind="neutral" mono>
        {ADMIN_COPY.review.missing.chipCadence}
      </StatusBadge>
      {clusterCount >= CLUSTER_THRESHOLD && (
        <StatusBadge kind="warning" mono>
          {ADMIN_COPY.review.missing.clusterBadge(
            clusterCount,
            venueName ?? '—',
          )}
        </StatusBadge>
      )}
    </div>
  )
}

import { EmptyState } from '@/components/consumer/empty-state'
import { copy } from '@/components/consumer/definitions/copy'

export function WatchingEmpty() {
  return (
    <EmptyState
      state="no-data"
      eyebrow={copy.watchingEmptyEyebrow}
      title={copy.watchingEmptyTitle}
      body={copy.watchingEmptyBody}
      primaryCta={{ label: copy.watchingEmptyCta, href: '/events' }}
    />
  )
}

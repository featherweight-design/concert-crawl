import { EmptyState } from '@/components/consumer/empty-state'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

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

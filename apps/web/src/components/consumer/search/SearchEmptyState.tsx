import { EmptyState } from '../empty-state/EmptyState'
import { copy } from '../definitions/copy'

interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query: _query }: SearchEmptyStateProps) {
  return (
    <EmptyState
      state="filtered"
      density="default"
      eyebrow={copy.searchNoResultsEyebrow}
      title={copy.searchNoResultsTitle}
      body={copy.searchNoResultsBody}
      primaryCta={{ label: copy.searchNoResultsCta, href: '/events' }}
    />
  )
}

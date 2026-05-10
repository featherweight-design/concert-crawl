import { EmptyState } from '../empty-state/EmptyState'
import { copy } from '../definitions/copy'

interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <EmptyState
      state="filtered"
      density="default"
      eyebrow={copy.searchNoResultsEyebrow}
      title={`Nothing for "${query}".`}
      body={copy.searchNoResultsBody}
      primaryCta={{ label: copy.searchNoResultsCta, href: '/events' }}
    />
  )
}

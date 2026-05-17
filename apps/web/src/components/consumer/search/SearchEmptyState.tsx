import { EmptyState } from '../empty-state/EmptyState'
import { copy } from '../definitions/copy'

interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  const title = query.trim()
    ? `Nothing called "${query.trim()}".`
    : copy.searchNoResultsTitle

  return (
    <EmptyState
      state="filtered"
      density="default"
      eyebrow={copy.searchNoResultsEyebrow}
      title={title}
      body={copy.searchNoResultsBody}
      primaryCta={{ label: copy.searchNoResultsCta, href: '/events' }}
    />
  )
}

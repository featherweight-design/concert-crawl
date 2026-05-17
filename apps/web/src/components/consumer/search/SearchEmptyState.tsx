import { EmptyState } from '../empty-state/EmptyState'
import { copy } from '../definitions/copy'

interface SearchEmptyStateProps {
  query: string
  onCtaClick?: () => void
}

export function SearchEmptyState({ query, onCtaClick }: SearchEmptyStateProps) {
  const trimmedQuery = query.trim()
  const title = trimmedQuery
    ? `No results for "${trimmedQuery}".`
    : copy.searchNoResultsTitle

  return (
    <EmptyState
      state="filtered"
      density="default"
      eyebrow={copy.searchNoResultsEyebrow}
      title={title}
      body={copy.searchNoResultsBody}
      primaryCta={{
        label: copy.searchNoResultsCta,
        href: '/events',
        ...(onCtaClick ? { onClick: onCtaClick } : {}),
      }}
    />
  )
}

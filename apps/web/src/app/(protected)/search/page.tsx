'use client'

import { useSearch } from '../../../lib/search/useSearch'
import { SearchBar } from '../../../components/consumer/search/SearchBar'
import { SearchDefaultState } from '../../../components/consumer/search/SearchDefaultState'
import { SearchResultsState } from '../../../components/consumer/search/SearchResultsState'
import { SearchEmptyState } from '../../../components/consumer/search/SearchEmptyState'
import { SearchLoadingState } from '../../../components/consumer/search/SearchLoadingState'

export default function SearchPage() {
  const {
    query,
    setQuery,
    clearQuery,
    recentSearches,
    popularEvents,
    artistResults,
    venueResults,
    isLoading,
    navigateTo,
  } = useSearch()

  const hasResults = artistResults.length > 0 || venueResults.length > 0

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 62,
      }}
    >
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={clearQuery}
        showBack
        autoFocus
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {query.trim() === '' && (
          <SearchDefaultState
            recentSearches={recentSearches}
            popularEvents={popularEvents}
            onPickQuery={setQuery}
            onPickEvent={navigateTo}
          />
        )}
        {query.trim() !== '' && isLoading && <SearchLoadingState />}
        {query.trim() !== '' && !isLoading && hasResults && (
          <SearchResultsState
            artistResults={artistResults}
            venueResults={venueResults}
            onNavigateTo={navigateTo}
          />
        )}
        {query.trim() !== '' && !isLoading && !hasResults && (
          <SearchEmptyState query={query} />
        )}
      </div>
    </div>
  )
}

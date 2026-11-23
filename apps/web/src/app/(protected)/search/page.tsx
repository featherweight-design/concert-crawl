'use client';

import { useSearch } from '../../../lib/search/useSearch';
import { SearchBar } from '../../../components/consumer/search/SearchBar';
import { SearchDefaultState } from '../../../components/consumer/search/SearchDefaultState';
import { SearchKeepTyping } from '../../../components/consumer/search/SearchKeepTyping';
import { SearchTypedBody } from '../../../components/consumer/search/SearchTypedBody';

export default function SearchPage() {
  const search = useSearch();
  const { query, setQuery, clearQuery, navigateTo } = search;
  const trimmed = query.trim();

  return (
    <div
      // The phone layout holds to 1023 inside a centred 640 column (tablet option A).
      className="mx-auto w-full max-w-[640px] lg:max-w-none"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
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
        {trimmed.length < 2 && (
          <>
            <SearchDefaultState
              recentSearches={search.recentSearches}
              popularEvents={search.popularEvents}
              onPickQuery={setQuery}
              onPickEvent={navigateTo}
              onRemoveRecent={search.removeRecent}
            />
            {trimmed.length === 1 && <SearchKeepTyping />}
          </>
        )}
        {trimmed.length >= 2 && (
          <SearchTypedBody
            search={search}
            withExplainerRail
            onNavigateTo={navigateTo}
          />
        )}
      </div>
    </div>
  );
}

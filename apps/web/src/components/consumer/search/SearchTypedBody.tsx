'use client';

import type { ArtistSearchAllResult } from '@concert-crawl/types';
import type { useSearch } from '../../../lib/search/useSearch';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchFailedState } from './SearchFailedState';
import { SearchLoadingState } from './SearchLoadingState';
import { SearchResultsState } from './SearchResultsState';

type SearchHandle = ReturnType<typeof useSearch>;

interface SearchTypedBodyProps {
  search: SearchHandle;
  withExplainerRail?: boolean;
  selectedIdx?: number;
  onHover?: (idx: number) => void;
  onNavigateTo: React.ComponentProps<typeof SearchResultsState>['onNavigateTo'];
  /** The palette closes itself when the empty state's CTA is taken. */
  onCtaClick?: () => void;
  useVenueFirst?: boolean;
  /** The palette drills into a MusicBrainz-only act instead of a sheet. */
  onOpenPreview?: (artist: ArtistSearchAllResult) => void;
  onFollowed?: (mbid: string, slug: string | null) => void;
}

/**
 * What two typed letters or more show, shared by `/search` and the palette
 * (addendum 12): loading, failed (never drawn as "none"), the lists, or none.
 * A request that failed while the other half answered still shows what came.
 */
export function SearchTypedBody({
  search,
  withExplainerRail = false,
  selectedIdx,
  onHover,
  onNavigateTo,
  onCtaClick,
  useVenueFirst = false,
  onOpenPreview,
  onFollowed,
}: SearchTypedBodyProps) {
  const { artistList, artistResults, venueResults, venueFirst, query } = search;
  const hasResults =
    artistList.length > 0 ||
    artistResults.length > 0 ||
    venueResults.length > 0;

  if (search.isLoading) return <SearchLoadingState />;
  if (!hasResults && search.failed) {
    return <SearchFailedState onRetry={search.retry} />;
  }
  if (!hasResults) {
    return <SearchEmptyState {...(onCtaClick ? { onCtaClick } : {})} />;
  }
  return (
    <SearchResultsState
      artistList={artistList}
      artistResults={artistResults}
      venueResults={venueResults}
      venueFirst={useVenueFirst && venueFirst}
      withExplainerRail={withExplainerRail}
      {...(selectedIdx === undefined ? {} : { selectedIdx })}
      {...(onHover ? { onHover } : {})}
      query={query}
      onNavigateTo={onNavigateTo}
      {...(onOpenPreview ? { onOpenPreview } : {})}
      {...(onFollowed ? { onFollowed } : {})}
    />
  );
}

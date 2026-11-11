import { Search } from 'lucide-react';
import { StateCard } from '../empty-state/StateCard';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY;

interface SearchEmptyStateProps {
  query: string;
  onCtaClick?: () => void;
}

/** No results (B+ `06-states/bp-s-empty_search_m`): the one empty pattern. */
export function SearchEmptyState({ query, onCtaClick }: SearchEmptyStateProps) {
  const trimmedQuery = query.trim();
  const title = trimmedQuery
    ? `No results for "${trimmedQuery}".`
    : copy.searchNoResultsTitle;

  return (
    <div style={{ padding: '10px 16px 20px' }}>
      <StateCard
        role="status"
        icon={<Search size={26} strokeWidth={1.75} />}
        eyebrow={copy.searchNoResultsEyebrow}
        title={title}
        body={copy.searchNoResultsBody}
        action={{
          label: copy.searchNoResultsCta,
          href: '/events',
          onClick: onCtaClick,
        }}
      />
    </div>
  );
}

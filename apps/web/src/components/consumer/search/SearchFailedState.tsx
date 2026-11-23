'use client';

import { AlertTriangle } from 'lucide-react';
import { StateCard } from '../empty-state/StateCard';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY;

interface SearchFailedStateProps {
  onRetry: () => void;
}

/**
 * The search request failed (addendum 12, `01/search-error-320`). Never drawn
 * as "nobody by that name": a failure says so and offers another go.
 */
export function SearchFailedState({ onRetry }: SearchFailedStateProps) {
  return (
    <div style={{ padding: '10px 16px 20px' }}>
      <StateCard
        role="alert"
        tone="danger"
        framed={false}
        icon={<AlertTriangle size={26} strokeWidth={1.75} />}
        eyebrow={copy.searchFailedEyebrow}
        title={copy.searchFailedTitle}
        body={copy.searchFailedBody}
        action={{ label: copy.searchFailedRetry, onClick: onRetry }}
      />
    </div>
  );
}

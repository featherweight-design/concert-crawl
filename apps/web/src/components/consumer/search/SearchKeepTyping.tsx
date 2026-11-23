import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { RESULT_META_STYLE } from './ResultParts';

/** One letter is not a search yet (addendum 12, `01/search-one-320`). */
export function SearchKeepTyping() {
  return (
    <p
      role="status"
      style={{ ...RESULT_META_STYLE, margin: 0, padding: '12px 24px' }}
    >
      {CONSUMER_COPY.search.keepTyping}
    </p>
  );
}

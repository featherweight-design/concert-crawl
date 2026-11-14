import { describe, expect, it } from 'vitest';
import { AUDIT_ACTION_KEYS } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

// The log search sends the action keys whose sentences match the typed words,
// and the API refuses any key outside AUDIT_ACTION_KEYS. A sentence added here
// without its key there would turn every search that matches it into a 400.
describe('the Activity log sentence table', () => {
  it('names exactly the action keys the API accepts', () => {
    expect(Object.keys(ADMIN_COPY.operations.log.sentences).sort()).toEqual(
      [...AUDIT_ACTION_KEYS].sort(),
    );
  });
});

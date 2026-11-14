import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.pricesSubmitted.reject;

describe('the reject dialog body', () => {
  it("names the submitter's handle, as the board draws it", () => {
    expect(COPY.body('dlo')).toBe(
      'The price comes off the show. @dlo sees it as closed in Submitted prices, replaced by a newer price.',
    );
  });

  it('falls back to "The fan" only when the submitter has no handle', () => {
    expect(COPY.body(null)).toBe(
      'The price comes off the show. The fan sees it as closed in Submitted prices, replaced by a newer price.',
    );
  });
});

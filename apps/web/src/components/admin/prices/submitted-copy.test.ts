import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.pricesSubmitted.reject;

describe('the reject dialog body', () => {
  it("names the submitter's handle, as the board draws it", () => {
    expect(COPY.body('dlo')).toBe(
      'The price comes off the show, and @dlo sees it as Not used in Submitted prices, with your reason.',
    );
  });

  it('falls back to "the fan" only when the submitter has no handle', () => {
    expect(COPY.body(null)).toBe(
      'The price comes off the show, and the fan sees it as Not used in Submitted prices, with your reason.',
    );
  });
});

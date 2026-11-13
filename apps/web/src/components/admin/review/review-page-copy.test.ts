import { describe, it, expect } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

describe('reviewPageClient mobile subtitle (#711)', () => {
  const subtitle = ADMIN_COPY.review.reviewPageClient.mobileSubtitle;

  // The subtitle reads the Needs you decision count (the sidebar badge's
  // source), not the retired Review tabs' counts.
  it('states the decision count', () => {
    expect(subtitle(5)).toBe('5 decisions waiting.');
  });

  it('uses the singular when the count is 1', () => {
    expect(subtitle(1)).toBe('1 decision waiting.');
  });

  it('pluralises 0 the same as N != 1', () => {
    expect(subtitle(0)).toBe('0 decisions waiting.');
  });
});

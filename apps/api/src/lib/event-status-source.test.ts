import { describe, it, expect } from 'vitest';
import { deriveStatusSource } from './event-status-source.js';

const when = new Date('2026-11-01T00:00:00Z');

describe('deriveStatusSource', () => {
  it('is null for an upcoming show, whatever else is set', () => {
    expect(
      deriveStatusSource({
        status: 'upcoming',
        delistedAt: null,
        hasPromotedReport: false,
      }),
    ).toBeNull();
    expect(
      deriveStatusSource({
        status: 'upcoming',
        delistedAt: when,
        hasPromotedReport: true,
      }),
    ).toBeNull();
  });

  it("is 'sweep' when delisted_at is set", () => {
    expect(
      deriveStatusSource({
        status: 'cancelled',
        delistedAt: when,
        hasPromotedReport: false,
      }),
    ).toBe('sweep');
  });

  it("is 'report' for a promoted fan report on cancelled or postponed", () => {
    for (const status of ['cancelled', 'postponed']) {
      expect(
        deriveStatusSource({
          status,
          delistedAt: null,
          hasPromotedReport: true,
        }),
      ).toBe('report');
    }
  });

  it("is 'admin' when neither the sweep nor a report explains the status", () => {
    for (const status of ['cancelled', 'postponed']) {
      expect(
        deriveStatusSource({
          status,
          delistedAt: null,
          hasPromotedReport: false,
        }),
      ).toBe('admin');
    }
  });
});

import { describe, it, expect } from 'vitest';

import {
  REJECTION_REASON_PREFIX,
  REPLACED_BY_ADMIN_REASON,
  fanStoredStatus,
  submissionClosedReason,
  submissionDisplayStatus,
  tallySubmissionCounts,
} from './index.js';

describe('submissionClosedReason', () => {
  it('names why a closed status closed, and only for those', () => {
    expect(submissionClosedReason('stale')).toBe('stale');
    expect(submissionClosedReason('archived')).toBe('archived');
    expect(submissionClosedReason('rejected')).toBe('rejected');
    expect(submissionClosedReason('corroborated')).toBeUndefined();
    expect(submissionClosedReason('pending')).toBeUndefined();
  });

  it('agrees with submissionDisplayStatus: a status closes exactly when it has a reason', () => {
    for (const stored of [
      'pending',
      'corroborated',
      'disputed',
      'stale',
      'archived',
      'rejected',
      'something-new',
    ]) {
      expect(submissionDisplayStatus(stored) === 'closed').toBe(
        submissionClosedReason(stored) !== undefined,
      );
    }
  });
});

describe('fanStoredStatus', () => {
  it('reads each archive reason as what the fan should see', () => {
    // Replaced by an admin's Edit price: as before, confirmed.
    expect(fanStoredStatus('archived', REPLACED_BY_ADMIN_REASON)).toBe(
      'corroborated',
    );
    // Rejected by an admin: its own closed line, never "replaced".
    expect(
      fanStoredStatus('archived', `${REJECTION_REASON_PREFIX}wrong-show`),
    ).toBe('rejected');
    expect(
      fanStoredStatus('archived', `${REJECTION_REASON_PREFIX}other|a note`),
    ).toBe('rejected');
    expect(
      submissionClosedReason(fanStoredStatus('archived', 'rejected:resale')),
    ).toBe('rejected');
    // Any other archive (a newer price, a lost Price check): replaced.
    expect(fanStoredStatus('archived', null)).toBe('archived');
    expect(fanStoredStatus('archived', 'Newer AXS price')).toBe('archived');
    // Reasons only matter on archived rows.
    expect(fanStoredStatus('stale', `${REJECTION_REASON_PREFIX}other`)).toBe(
      'stale',
    );
  });
});

describe('submissionDisplayStatus', () => {
  it.each([
    ['corroborated', 'confirmed'],
    ['pending', 'pending'],
    ['disputed', 'disputed'],
    ['stale', 'closed'],
    ['archived', 'closed'],
    ['something-new', 'pending'],
  ] as const)('reads %s as %s', (stored, shown) => {
    expect(submissionDisplayStatus(stored)).toBe(shown);
  });
});

describe('tallySubmissionCounts', () => {
  // The audit account that surfaced the bug: 7 rows, 1 live, 2 closed. The
  // menu said 7 live, the delete sheet 7, the Settings card and the page 5.
  const audit = [
    'corroborated',
    'pending',
    'pending',
    'disputed',
    'stale',
    'archived',
    'pending',
  ];

  it('counts every row in total and each status once', () => {
    const counts = tallySubmissionCounts(
      audit.map((stored) => ({ status: submissionDisplayStatus(stored) })),
    );

    expect(counts).toEqual({
      total: 7,
      live: 1,
      pending: 3,
      priceChecks: 1,
      closed: 2,
    });
  });

  it('keeps closed rows out of every filter count, in the total only', () => {
    const counts = tallySubmissionCounts([{ status: 'closed', count: 4 }]);

    expect(counts).toEqual({
      total: 4,
      live: 0,
      pending: 0,
      priceChecks: 0,
      closed: 4,
    });
  });

  it('accepts grouped rows (a status with its row count)', () => {
    const counts = tallySubmissionCounts([
      { status: 'confirmed', count: 2 },
      { status: 'pending', count: 5 },
    ]);

    expect(counts.total).toBe(7);
    expect(counts.live).toBe(2);
  });

  it('is all zero for an account with no submissions', () => {
    expect(tallySubmissionCounts([])).toEqual({
      total: 0,
      live: 0,
      pending: 0,
      priceChecks: 0,
      closed: 0,
    });
  });
});

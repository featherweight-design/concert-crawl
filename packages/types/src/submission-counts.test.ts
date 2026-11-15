import { describe, it, expect } from 'vitest';

import {
  REJECTION_REASON_PREFIX,
  REJECTION_REASONS,
  REPLACED_BY_ADMIN_REASON,
  encodeRejection,
  fanStoredStatus,
  parseRejection,
  submissionClosedReason,
  submissionDisplayStatus,
  tallySubmissionCounts,
} from './index.js';

describe('submissionClosedReason', () => {
  it('names why a closed status closed, and only for those', () => {
    expect(submissionClosedReason('stale')).toBe('stale');
    expect(submissionClosedReason('archived')).toBe('archived');
    expect(submissionClosedReason('not_used')).toBe('not_used');
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
      'not_used',
      'something-new',
    ]) {
      expect(submissionDisplayStatus(stored) === 'closed').toBe(
        submissionClosedReason(stored) !== undefined,
      );
    }
  });
});

describe('fanStoredStatus', () => {
  it.each([false, true])(
    'reads an admin-replaced price as confirmed (unusedCheck %s)',
    (unusedCheck) => {
      expect(
        fanStoredStatus('archived', REPLACED_BY_ADMIN_REASON, unusedCheck),
      ).toBe('corroborated');
    },
  );

  it.each([false, true])(
    'reads every rejection as not used, never replaced (unusedCheck %s)',
    (unusedCheck) => {
      for (const reason of REJECTION_REASONS) {
        expect(
          fanStoredStatus(
            'archived',
            encodeRejection(reason, undefined),
            unusedCheck,
          ),
        ).toBe('not_used');
        expect(
          fanStoredStatus(
            'archived',
            encodeRejection(reason, 'a note'),
            unusedCheck,
          ),
        ).toBe('not_used');
      }
      expect(
        submissionClosedReason(
          fanStoredStatus('archived', encodeRejection('resale', undefined)),
        ),
      ).toBe('not_used');
    },
  );

  it('reads an unknown rejection code as the admin side does: no rejection', () => {
    const unknown = `${REJECTION_REASON_PREFIX}because`;
    expect(
      parseRejection({ status: 'archived', archivedReason: unknown }),
    ).toBe(null);
    expect(fanStoredStatus('archived', unknown)).toBe('archived');
    // Unless it was an unused Price check, which is not used either way.
    expect(fanStoredStatus('archived', unknown, true)).toBe('not_used');
  });

  it('reads an unused Price check as not used, and any other archive as replaced', () => {
    for (const reason of [null, 'Listed price stood', 'Newer AXS price']) {
      expect(fanStoredStatus('archived', reason, true)).toBe('not_used');
      expect(fanStoredStatus('archived', reason, false)).toBe('archived');
      expect(fanStoredStatus('archived', reason)).toBe('archived');
    }
  });

  it.each([false, true])(
    'reads only archived rows by their reason (unusedCheck %s)',
    (unusedCheck) => {
      for (const status of ['stale', 'pending', 'corroborated', 'disputed']) {
        expect(
          fanStoredStatus(
            status,
            encodeRejection('other', undefined),
            unusedCheck,
          ),
        ).toBe(status);
        expect(
          fanStoredStatus(status, REPLACED_BY_ADMIN_REASON, unusedCheck),
        ).toBe(status);
      }
    },
  );
});

describe('parseRejection', () => {
  it('round-trips encodeRejection, note included', () => {
    expect(
      parseRejection({
        status: 'archived',
        archivedReason: encodeRejection('fees-included', 'a|b'),
      }),
    ).toEqual({ reason: 'fees-included', note: 'a|b' });
    expect(
      parseRejection({
        status: 'archived',
        archivedReason: encodeRejection('wrong-show', undefined),
      }),
    ).toEqual({ reason: 'wrong-show', note: null });
  });

  it('reads no rejection off a row that is no longer archived', () => {
    expect(
      parseRejection({
        status: 'corroborated',
        archivedReason: encodeRejection('resale', undefined),
      }),
    ).toBe(null);
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

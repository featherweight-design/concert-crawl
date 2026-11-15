import { describe, expect, it } from 'vitest';
import {
  backedPill,
  isRejectionReason,
  isSubmissionState,
  stateWords,
  ticketHost,
} from './submitted-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

// Hugh's prod report: a 1-fan price read "Waiting for you" though nothing
// held it for the admin.
describe('stateWords', () => {
  const STATES = ADMIN_COPY.pricesSubmitted.states;
  it("reads Waiting for you only for a price that's yours to decide", () => {
    expect(stateWords({ state: 'waiting', forYou: true }, STATES)).toBe(
      'Waiting for you',
    );
    expect(stateWords({ state: 'waiting', forYou: false }, STATES)).toBe(
      'Pending',
    );
  });

  it('leaves every other state as it was, yours or not', () => {
    expect(stateWords({ state: 'published', forYou: false }, STATES)).toBe(
      'Published',
    );
    expect(stateWords({ state: 'stale', forYou: true }, STATES)).toBe('Stale');
  });
});

describe('backedPill', () => {
  it('is green for two or more fans and amber for one', () => {
    expect(backedPill(2, 'published')).toEqual({ tone: 'green', fans: 2 });
    expect(backedPill(1, 'waiting')).toEqual({ tone: 'amber', fans: 1 });
  });

  it('is red, with no fan count, for a Price check', () => {
    expect(backedPill(3, 'price-check')).toEqual({ tone: 'red', fans: null });
  });
});

describe('guards', () => {
  it('knows the five states and the five reasons', () => {
    expect(isSubmissionState('not-used')).toBe(true);
    expect(isSubmissionState('disputed')).toBe(false);
    expect(isRejectionReason('fees-included')).toBe(true);
    expect(isRejectionReason('because')).toBe(false);
  });
});

describe('ticketHost', () => {
  it('reads the host of a ticket page without www, as the Open ticket hint draws it', () => {
    expect(ticketHost('https://www.axs.com/events/123')).toBe('axs.com');
    expect(ticketHost('http://tickets.example.com/x')).toBe(
      'tickets.example.com',
    );
  });

  it('is null for no ticket page or one that isn’t http(s)', () => {
    expect(ticketHost(null)).toBeNull();
    expect(ticketHost('javascript:alert(1)')).toBeNull();
    expect(ticketHost('not a url')).toBeNull();
  });
});

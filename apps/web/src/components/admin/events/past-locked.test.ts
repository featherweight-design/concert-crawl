import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  duplicateShowMessage,
  notOnSaleMessage,
  pastLockedMessage,
} from './past-locked';

describe('notOnSaleMessage', () => {
  const copy = ADMIN_COPY.events.errors.notOnSale;
  const refusal = (reason?: string) =>
    new ApiError(409, 'not_on_sale', undefined, undefined, reason);

  it('names each reason a show is not on sale', () => {
    expect(notOnSaleMessage(refusal('cancelled'))).toBe(copy.cancelled);
    expect(notOnSaleMessage(refusal('postponed'))).toBe(copy.postponed);
    expect(notOnSaleMessage(refusal('delisted'))).toBe(copy.delisted);
    expect(notOnSaleMessage(refusal())).toBe(copy.fallback);
  });

  it('leaves any other failure to the caller', () => {
    expect(notOnSaleMessage(new ApiError(409, 'past_locked'))).toBeNull();
    expect(notOnSaleMessage(new ApiError(400, 'not_on_sale'))).toBeNull();
    expect(notOnSaleMessage(new Error('not_on_sale'))).toBeNull();
  });
});

describe('pastLockedMessage', () => {
  it('maps a 409 past_locked to its sentence', () => {
    expect(pastLockedMessage(new ApiError(409, 'past_locked'))).toBe(
      ADMIN_COPY.events.errors.pastLocked,
    );
  });

  it('leaves any other failure to the caller', () => {
    expect(pastLockedMessage(new ApiError(409, 'duplicate_show'))).toBeNull();
    expect(pastLockedMessage(new ApiError(500, 'past_locked'))).toBeNull();
    expect(pastLockedMessage(new Error('past_locked'))).toBeNull();
  });
});

describe('duplicateShowMessage', () => {
  it('maps a 409 duplicate_show to its sentence', () => {
    expect(duplicateShowMessage(new ApiError(409, 'duplicate_show'))).toBe(
      ADMIN_COPY.events.errors.duplicateShow,
    );
  });

  it('leaves any other failure to the caller', () => {
    expect(duplicateShowMessage(new ApiError(409, 'past_locked'))).toBeNull();
    expect(
      duplicateShowMessage(new ApiError(400, 'duplicate_show')),
    ).toBeNull();
    expect(duplicateShowMessage(new Error('duplicate_show'))).toBeNull();
  });
});

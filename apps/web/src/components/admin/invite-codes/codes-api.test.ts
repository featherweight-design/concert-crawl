import { describe, expect, it } from 'vitest';
import { adminInviteCodeFrom, inviteCodeFrom } from './codes-api';

const wire = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'REDROCKS',
  createdBy: 'user_1',
  usedBy: null,
  usedAt: null,
  expiresAt: null,
  revokedAt: null,
  revokedBy: null,
  createdAt: '2026-10-01T18:00:00Z',
  maxUses: 50,
  useCount: 0,
  label: null,
};

describe('inviteCodeFrom', () => {
  it('keeps a member code’s kind', () => {
    expect(inviteCodeFrom({ ...wire, kind: 'member' })?.kind).toBe('member');
  });

  it('reads an older API with no kind as an admin code', () => {
    expect(inviteCodeFrom(wire)?.kind).toBe('admin');
  });

  it('refuses a kind this build does not know', () => {
    expect(inviteCodeFrom({ ...wire, kind: 'venue' })).toBeNull();
  });
});

describe('adminInviteCodeFrom', () => {
  const row = { ...wire, createdByHandle: 'mira', lastUsedAt: null };

  it('keeps the list row’s kind, and defaults a missing one', () => {
    expect(adminInviteCodeFrom({ ...row, kind: 'member' })?.kind).toBe(
      'member',
    );
    expect(adminInviteCodeFrom(row)?.kind).toBe('admin');
  });

  it('refuses a row without its maker field', () => {
    expect(
      adminInviteCodeFrom({ ...wire, kind: 'admin', lastUsedAt: null }),
    ).toBeNull();
  });
});

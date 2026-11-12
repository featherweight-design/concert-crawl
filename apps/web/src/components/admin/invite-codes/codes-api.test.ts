import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminInviteCodeFrom, codesApi, inviteCodeFrom } from './codes-api';

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

  it('keeps a kind this build does not know, as unknown', () => {
    expect(inviteCodeFrom({ ...wire, kind: 'venue' })?.kind).toBe('unknown');
  });

  it('refuses a kind that is not a string', () => {
    expect(inviteCodeFrom({ ...wire, kind: 7 })).toBeNull();
  });
});

describe('codesApi.list', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const listOf = async (rows: unknown[]) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: true, data: rows }), {
            status: 200,
          }),
      ),
    );
    return codesApi(async () => 'token').list();
  };
  const row = { ...wire, createdByHandle: 'mira', lastUsedAt: null };

  it('keeps the whole list when one row has an unknown kind', async () => {
    const codes = await listOf([
      { ...row, kind: 'admin' },
      { ...row, id: 'b', kind: 'venue' },
    ]);
    expect(codes.map((code) => code.kind)).toEqual(['admin', 'unknown']);
  });

  it('reads a list with no kinds at all (a pre-member API) as admin codes', async () => {
    const codes = await listOf([row]);
    expect(codes[0]?.kind).toBe('admin');
  });

  it('still fails the list on a malformed row', async () => {
    await expect(listOf([{ ...row, code: 7 }])).rejects.toThrow();
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

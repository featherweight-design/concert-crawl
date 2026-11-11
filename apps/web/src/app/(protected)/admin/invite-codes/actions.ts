'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { apiClient } from '@/lib/api';

interface MintOptions {
  expiresIn: '7d' | '30d' | '90d' | 'never';
  /** Where a poster code goes, e.g. "Hi-Dive bathroom, Nov". */
  label?: string;
  /** How many people the code admits; the API defaults to 1. */
  maxUses?: number;
}

const EXPIRY_DAYS: Record<MintOptions['expiresIn'], number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  never: null,
};

export async function mintInviteCodeWithOptions(
  opts: MintOptions,
): Promise<{ ok: boolean; id?: string; code?: string; error?: string }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return { ok: false, error: 'Not authenticated' };

  const days = EXPIRY_DAYS[opts.expiresIn];
  const expiresAt =
    days === null
      ? undefined
      : new Date(Date.now() + days * 86400_000).toISOString();

  try {
    const result = await apiClient.post<{ id: string; code: string }>(
      '/v1/admin/invite-codes',
      token,
      {
        expiresAt,
        label: opts.label?.trim() || undefined,
        maxUses: opts.maxUses,
      },
    );
    // The Codes and Posters tabs both list codes.
    revalidatePath('/admin/invite-codes', 'layout');
    return { ok: true, id: result.id, code: result.code };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Mint failed',
    };
  }
}

export async function mintInviteCode() {
  await mintInviteCodeWithOptions({ expiresIn: '30d' });
}

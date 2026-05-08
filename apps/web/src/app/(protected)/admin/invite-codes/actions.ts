'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'

interface MintOptions {
  expiresIn: '7d' | '30d' | 'never'
}

export async function mintInviteCodeWithOptions(
  opts: MintOptions,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')

  const expiresAt =
    opts.expiresIn === '7d'
      ? new Date(Date.now() + 7 * 86400_000).toISOString()
      : opts.expiresIn === '30d'
        ? new Date(Date.now() + 30 * 86400_000).toISOString()
        : undefined

  try {
    const result = await apiClient.post<{ code: string }>(
      '/v1/admin/invite-codes',
      token,
      { expiresAt },
    )
    revalidatePath('/admin/invite-codes')
    return { ok: true, code: result.code }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Mint failed',
    }
  }
}

export async function mintInviteCode() {
  await mintInviteCodeWithOptions({ expiresIn: '30d' })
}

'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function generateInviteCode(formData: FormData): Promise<void> {
  const token = await getToken()
  const expiresAt = formData.get('expiresAt') as string | null

  await apiClient.post<InviteCode>('/v1/admin/invite-codes', token, {
    expiresAt: expiresAt || undefined,
  })

  revalidatePath('/admin/invite-codes')
}

export async function revokeInviteCode(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.post(`/v1/admin/invite-codes/${id}/revoke`, token, {})
  revalidatePath('/admin/invite-codes')
}

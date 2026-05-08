'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'

export async function mintInviteCode() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  await apiClient.post('/v1/admin/invite-codes', token, {})
  revalidatePath('/admin/invite-codes')
}
